import { GAME_CONFIG } from '../config.js';
import { Storage } from './storage.js';
import { SoundFX } from '../audio/SoundFX.js';

let sseSource = null;
let currentPaymentId = null;
let onPaymentSuccessCallback = null;

export const Api = {
  // Notificação Toast na tela (limitada para não poluir o jogo)
  showToast(message, icon = '💊', duration = 2200) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Mantém no máximo 2 avisos simultâneos
    while (container.children.length >= 2) {
      container.removeChild(container.firstChild);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span style="font-size: 16px;">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-15px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Inicializa a conexão SSE para escutar pagamentos em tempo real
  initSSE(playerId) {
    if (sseSource) {
      sseSource.close();
    }

    try {
      sseSource = new EventSource(`${GAME_CONFIG.apiBaseUrl}/pix/events/${playerId}`);
      
      sseSource.addEventListener('payment_approved', (event) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] Pagamento aprovado recebido:', data);

        // Aplica recompensas
        if (data.rewards) {
          if (data.rewards.pills) Storage.addPills(data.rewards.pills);
          if (data.rewards.solBombs) Storage.addSolBombs(data.rewards.solBombs);
          if (data.rewards.unlockBike) {
            const current = Storage.getData();
            if (!current.unlockedBikes.includes(data.rewards.unlockBike)) {
              current.unlockedBikes.push(data.rewards.unlockBike);
              Storage.saveData(current);
            }
          }
        }

        // Toca som triunfal e mostra toast
        SoundFX.coinSuccess();
        this.showToast(data.message || 'Pagamento Pix Aprovado!', '⚡');

        // Fecha o modal se for o pagamento atual
        this.closePixModal();

        if (onPaymentSuccessCallback) {
          onPaymentSuccessCallback(data);
        }
      });
    } catch (err) {
      console.warn('[SSE] Não foi possível conectar ao SSE:', err);
    }
  },

  // Abre o modal Pix e gera a cobrança no Mercado Pago
  async openPixPayment(itemKey, title, price, onApproved) {
    onPaymentSuccessCallback = onApproved;
    const player = Storage.getData();
    const modal = document.getElementById('pix-modal');
    const titleEl = document.getElementById('pix-modal-title');
    const amountEl = document.getElementById('pix-modal-amount');
    const qrImg = document.getElementById('pix-qr-image');
    const spinner = document.getElementById('pix-loading-spinner');
    const copyInput = document.getElementById('pix-copy-input');
    const statusText = document.getElementById('pix-status-text');

    modal.classList.remove('hidden');
    titleEl.innerText = title.toUpperCase();
    amountEl.innerText = `R$ ${price.toFixed(2).replace('.', ',')}`;
    qrImg.style.display = 'none';
    spinner.style.display = 'block';
    copyInput.value = 'Gerando PIX no Mercado Pago...';
    statusText.innerText = 'Conectando com o Mercado Pago...';

    try {
      const res = await fetch(`${GAME_CONFIG.apiBaseUrl}/pix/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemKey,
          playerId: player.playerId,
          playerNick: player.nickname
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar cobrança');

      currentPaymentId = data.paymentId;
      copyInput.value = data.qrCode;

      if (data.qrCodeBase64) {
        qrImg.src = `data:image/png;base64,${data.qrCodeBase64}`;
        qrImg.style.display = 'block';
        spinner.style.display = 'none';
      }

      statusText.innerText = 'Aguardando confirmação bancária...';
      this.startStatusPolling(data.paymentId);
    } catch (err) {
      console.error('[Pix Create]', err);
      statusText.innerText = `Erro: ${err.message}`;
      spinner.style.display = 'none';
      copyInput.value = 'Falha ao gerar PIX. Tente novamente.';
    }
  },

  // Polling como garantia secundária caso o SSE oscile
  startStatusPolling(paymentId) {
    const interval = setInterval(async () => {
      const modal = document.getElementById('pix-modal');
      if (modal.classList.contains('hidden') || currentPaymentId !== paymentId) {
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`${GAME_CONFIG.apiBaseUrl}/pix/status/${paymentId}`);
        const data = await res.json();
        if (data.payment && data.payment.status === 'approved') {
          clearInterval(interval);
          this.closePixModal();
        }
      } catch (e) {
        // Silêncio
      }
    }, 2500);
  },

  closePixModal() {
    const modal = document.getElementById('pix-modal');
    if (modal) modal.classList.add('hidden');
    currentPaymentId = null;
  },

  // Simulação de aprovação para testes rápidos no ambiente dev
  async simulateApproval() {
    if (!currentPaymentId) return;
    try {
      await fetch(`${GAME_CONFIG.apiBaseUrl}/pix/simulate-approval/${currentPaymentId}`, {
        method: 'POST'
      });
    } catch (e) {
      console.error('Erro na simulação:', e);
    }
  },

  // Envia pontuação ao servidor
  async submitScore(score, kills) {
    const player = Storage.getData();
    try {
      const res = await fetch(`${GAME_CONFIG.apiBaseUrl}/player/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.playerId,
          nickname: player.nickname,
          score,
          kills
        })
      });
      return await res.json();
    } catch (e) {
      console.warn('Erro ao sincronizar score com backend:', e);
      return null;
    }
  }
};

// Configura ouvintes dos botões do Modal PIX
window.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('pix-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => Api.closePixModal());
  }

  const copyBtn = document.getElementById('pix-copy-btn');
  const copyInput = document.getElementById('pix-copy-input');
  if (copyBtn && copyInput) {
    copyBtn.addEventListener('click', () => {
      copyInput.select();
      navigator.clipboard.writeText(copyInput.value);
      copyBtn.innerText = 'COPIADO!';
      setTimeout(() => copyBtn.innerText = 'COPIAR', 2000);
      Api.showToast('Código Pix copiado para a área de transferência!', '📋');
    });
  }

  const devBtn = document.getElementById('pix-dev-approve-btn');
  if (devBtn) {
    devBtn.addEventListener('click', () => Api.simulateApproval());
  }
});
