import { Router } from 'express';
import { Database } from '../database/db.js';
import { MercadoPagoService, SHOP_CATALOG } from '../services/mercadopago.js';

export const pixRouter = Router();

// Mapa de conexões SSE ativas por playerId
const sseClients = new Map();

// Helper para enviar evento SSE para um jogador específico
export function notifyPlayer(playerId, eventType, data) {
  const clients = sseClients.get(playerId);
  if (clients && clients.size > 0) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
      res.write(payload);
    }
  }
}

// Retorna catálogo de itens da loja
pixRouter.get('/catalog', (req, res) => {
  res.json({ items: Object.values(SHOP_CATALOG) });
});

// Perfil do jogador (saldo de Pills, inventário, etc.)
pixRouter.get('/player/:playerId', (req, res) => {
  const { playerId } = req.params;
  const nickname = req.query.nickname || 'Kaneda';
  const player = Database.getPlayer(playerId, nickname);
  res.json({ player });
});

// Atualiza dados do jogador (ex: moto selecionada, apelido)
pixRouter.post('/player/update', (req, res) => {
  const { playerId, selectedBike, nickname } = req.body;
  if (!playerId) return res.status(400).json({ error: 'Player ID obrigatório' });
  const updates = {};
  if (selectedBike) updates.selectedBike = selectedBike;
  if (nickname) updates.nickname = nickname;
  const player = Database.updatePlayer(playerId, updates);
  res.json({ player });
});

// Salva pontuação ao final da partida
pixRouter.post('/player/score', (req, res) => {
  const { playerId, nickname, score, kills } = req.body;
  if (!playerId) return res.status(400).json({ error: 'Player ID obrigatório' });
  const player = Database.recordScore(playerId, nickname, score || 0, kills || 0);
  res.json({ success: true, player, leaderboard: Database.getLeaderboard().slice(0, 10) });
});

// Leaderboard global
pixRouter.get('/leaderboard', (req, res) => {
  res.json({ leaderboard: Database.getLeaderboard() });
});

// Cria um novo pagamento PIX
pixRouter.post('/pix/create', async (req, res) => {
  try {
    const { itemKey, playerId, playerNick } = req.body;
    if (!itemKey || !playerId) {
      return res.status(400).json({ error: 'itemKey e playerId são obrigatórios' });
    }

    const pixData = await MercadoPagoService.createPixPayment({ itemKey, playerId, playerNick });

    // Salva no banco local
    Database.createPaymentRecord({
      paymentId: pixData.paymentId,
      playerId,
      itemKey,
      amount: pixData.amount,
      title: pixData.title,
      qrCode: pixData.qrCode,
      qrCodeBase64: pixData.qrCodeBase64,
      status: pixData.status
    });

    res.json(pixData);
  } catch (err) {
    console.error('[API /pix/create] Erro:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar Pix' });
  }
});

// Consulta status de um pagamento
pixRouter.get('/pix/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const record = Database.getPayment(paymentId);
    if (!record) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    // Se ainda está pendente e temos integração do Mercado Pago ativa
    if (record.status === 'pending' && !paymentId.startsWith('sim_')) {
      const mpStatus = await MercadoPagoService.getPaymentStatus(paymentId);
      if (mpStatus && mpStatus.status !== record.status) {
        record.status = mpStatus.status;
        Database.updatePaymentStatus(paymentId, mpStatus.status);

        if (mpStatus.status === 'approved') {
          // Credita o jogador
          const item = SHOP_CATALOG[record.itemKey];
          if (item) {
            Database.creditPlayer(record.playerId, item.rewards);
            notifyPlayer(record.playerId, 'payment_approved', {
              paymentId,
              itemKey: record.itemKey,
              rewards: item.rewards,
              message: `Pagamento aprovado! +${item.rewards.pills || 0} Pills adicionadas.`
            });
          }
        }
      }
    }

    res.json({ payment: record });
  } catch (err) {
    console.error('[API /pix/status] Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook do Mercado Pago para receber aprovação instantânea
pixRouter.post('/pix/webhook', async (req, res) => {
  try {
    const { type, action, data } = req.body;
    console.log('[Webhook Mercado Pago recebido]', { type, action, data });

    const paymentId = data?.id || req.query['data.id'] || req.query.id;
    if (paymentId) {
      const mpStatus = await MercadoPagoService.getPaymentStatus(paymentId);
      if (mpStatus) {
        const record = Database.getPayment(String(paymentId));
        if (record && record.status !== mpStatus.status) {
          Database.updatePaymentStatus(paymentId, mpStatus.status);

          if (mpStatus.status === 'approved') {
            const item = SHOP_CATALOG[record.itemKey];
            if (item) {
              const updatedPlayer = Database.creditPlayer(record.playerId, item.rewards);
              console.log(`[PIX APROVADO] Jogador ${record.playerId} creditado com:`, item.rewards);

              notifyPlayer(record.playerId, 'payment_approved', {
                paymentId,
                itemKey: record.itemKey,
                rewards: item.rewards,
                player: updatedPlayer,
                message: `Pagamento Pix aprovado com sucesso! ${item.title} ativado.`
              });
            }
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[Webhook] Erro ao processar:', err);
    res.status(500).send('ERROR');
  }
});

// Rota de Simulação (Ideal para testes locais no botão de testar Pix)
pixRouter.post('/pix/simulate-approval/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const record = Database.getPayment(paymentId);
  if (!record) {
    return res.status(404).json({ error: 'Pagamento não encontrado' });
  }

  Database.updatePaymentStatus(paymentId, 'approved');
  const item = SHOP_CATALOG[record.itemKey];
  let updatedPlayer = null;
  if (item) {
    updatedPlayer = Database.creditPlayer(record.playerId, item.rewards);
  }

  notifyPlayer(record.playerId, 'payment_approved', {
    paymentId,
    itemKey: record.itemKey,
    rewards: item ? item.rewards : {},
    player: updatedPlayer,
    message: `[Simulação] Pagamento Pix aprovado com sucesso! ${item ? item.title : ''}`
  });

  res.json({ success: true, payment: record, player: updatedPlayer });
});

// Stream SSE em tempo real para o jogador
pixRouter.get('/pix/events/:playerId', (req, res) => {
  const { playerId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Conectado ao canal de pagamentos Neo-Tokyo' })}\n\n`);

  if (!sseClients.has(playerId)) {
    sseClients.set(playerId, new Set());
  }
  sseClients.get(playerId).add(res);

  req.on('close', () => {
    const clients = sseClients.get(playerId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(playerId);
    }
  });
});
