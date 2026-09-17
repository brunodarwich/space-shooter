import { MercadoPagoConfig, Payment } from 'mercadopago';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

// Catálogo oficial de itens vendidos no jogo via PIX
export const SHOP_CATALOG = {
  pills_500: {
    key: 'pills_500',
    title: 'Pacote Biker - 500 Pills',
    description: '500 Cápsulas de energia para upgrades na garagem',
    price: 2.00,
    rewards: { pills: 500, solBombs: 0 }
  },
  pills_1500: {
    key: 'pills_1500',
    title: 'Pacote Gang Leader - 1500 Pills + 1 SOL',
    description: '1.500 Pills + 1 Carga extra do Raio Orbital SOL',
    price: 5.00,
    rewards: { pills: 1500, solBombs: 1 }
  },
  pills_4000: {
    key: 'pills_4000',
    title: 'Pacote Neo-Tokyo Overlord - 4000 Pills + Moto Dourada',
    description: '4.000 Pills + 3 Cargas SOL + Skin Exclusiva Hoverbike Dourada',
    price: 10.00,
    rewards: { pills: 4000, solBombs: 3, unlockBike: 'kaneda_gold' }
  },
  sol_pack_3: {
    key: 'sol_pack_3',
    title: 'Pacote Tático SOL (3 Cargas de Satélite)',
    description: '3 Cargas devastadoras de Raio Orbital SOL',
    price: 2.50,
    rewards: { pills: 100, solBombs: 3 }
  },
  instant_revive: {
    key: 'instant_revive',
    title: 'Reviver Imediato na Partida',
    description: 'Volta ao combate com 5s de Escudo de Força e Bomba Ativada',
    price: 1.00,
    rewards: { instantRevive: true, solBombs: 1 }
  }
};

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
let client = null;
let paymentClient = null;

if (accessToken && accessToken.length > 10 && !accessToken.startsWith('TEST-00000000')) {
  try {
    client = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
    paymentClient = new Payment(client);
    console.log('[Mercado Pago] SDK configurado com Access Token ativo.');
  } catch (err) {
    console.error('[Mercado Pago] Erro ao inicializar SDK:', err.message);
  }
} else {
  console.log('[Mercado Pago] Modo de Simulação Ativo (Insira seu Access Token no server/.env para transações reais).');
}

export const MercadoPagoService = {
  // Cria cobrança PIX para o item selecionado
  async createPixPayment({ itemKey, playerId, playerNick = 'Biker' }) {
    const item = SHOP_CATALOG[itemKey];
    if (!item) {
      throw new Error(`Item "${itemKey}" não encontrado no catálogo.`);
    }

    const externalReference = `NEO_${playerId.slice(0, 8)}_${Date.now()}`;
    const idempotencyKey = uuidv4();

    // Se temos credenciais reais do Mercado Pago
    if (paymentClient) {
      try {
        const webhookUrl = process.env.WEBHOOK_BASE_URL 
          ? `${process.env.WEBHOOK_BASE_URL}/api/pix/webhook` 
          : undefined;

        const body = {
          transaction_amount: Number(item.price.toFixed(2)),
          description: `Neo-Tokyo Shmup: ${item.title}`,
          payment_method_id: 'pix',
          payer: {
            email: `${playerId.slice(0, 10)}@neotokyo.game`,
            first_name: playerNick || 'Kaneda',
            last_name: 'Shooter'
          },
          external_reference: externalReference,
          notification_url: webhookUrl
        };

        const response = await paymentClient.create({ body, requestOptions: { idempotencyKey } });
        const paymentData = response.body || response;

        const pixData = paymentData.point_of_interaction?.transaction_data;
        const qrCode = pixData?.qr_code || '';
        let qrCodeBase64 = pixData?.qr_code_base64 || '';

        // Se a API não retornou base64 do QR code diretamente, geramos com a lib local
        if (!qrCodeBase64 && qrCode) {
          qrCodeBase64 = (await QRCode.toDataURL(qrCode)).replace(/^data:image\/png;base64,/, '');
        }

        return {
          paymentId: String(paymentData.id),
          status: paymentData.status || 'pending',
          itemKey,
          title: item.title,
          amount: item.price,
          qrCode,
          qrCodeBase64,
          isSimulated: false,
          rewards: item.rewards
        };
      } catch (err) {
        console.error('[Mercado Pago API] Erro ao criar pagamento Pix:', err?.message || err);
        // Fallback gracioso para modo simulação se a chave for inválida ou ambiente de dev
        if (process.env.ALLOW_DEV_SIMULATION === 'true') {
          console.warn('[Mercado Pago] Usando fallback de simulação dev após erro da API.');
          return this.createSimulatedPixPayment(item, playerId);
        }
        throw err;
      }
    }

    // Modo de Desenvolvimento / Simulação sem credenciais ativas
    return this.createSimulatedPixPayment(item, playerId);
  },

  // Gera um Pix simulado realista para testes locais rápidos
  async createSimulatedPixPayment(item, playerId) {
    const fakePaymentId = 'sim_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const fakePixPayload = `00020126580014br.gov.bcb.pix0136neotokyo-${playerId.slice(0, 8)}520400005303986540${item.price.toFixed(2)}5802BR5909NEO-TOKYO6009SAO_PAULO62070503***6304ABCD`;
    
    const qrCodeBase64 = (await QRCode.toDataURL(fakePixPayload)).replace(/^data:image\/png;base64,/, '');

    return {
      paymentId: fakePaymentId,
      status: 'pending',
      itemKey: item.key,
      title: item.title,
      amount: item.price,
      qrCode: fakePixPayload,
      qrCodeBase64,
      isSimulated: true,
      rewards: item.rewards
    };
  },

  // Consulta o status de um pagamento na API do Mercado Pago
  async getPaymentStatus(paymentId) {
    if (paymentClient && !paymentId.startsWith('sim_')) {
      try {
        const res = await paymentClient.get({ id: paymentId });
        const data = res.body || res;
        return {
          paymentId: String(data.id),
          status: data.status, // 'pending', 'approved', 'rejected', etc.
          statusDetail: data.status_detail
        };
      } catch (err) {
        console.error(`[Mercado Pago] Erro ao consultar pagamento ${paymentId}:`, err.message);
      }
    }
    return null;
  }
};
