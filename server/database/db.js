import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data.json');

// Estrutura inicial do banco
let db = {
  players: {},
  payments: {},
  leaderboard: []
};

// Carrega dados salvos
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
    }
  } catch (err) {
    console.error('[DB] Erro ao carregar banco:', err);
  }
}

// Salva dados no disco
function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Erro ao salvar banco:', err);
  }
}

loadDb();

export const Database = {
  // Retorna ou inicializa o jogador
  getPlayer(playerId, defaultNick = 'Kaneda') {
    if (!db.players[playerId]) {
      db.players[playerId] = {
        id: playerId,
        nickname: defaultNick,
        pills: 100, // Saldo inicial de cortesia
        solBombs: 1, // 1 carga de satélite SOL inicial
        unlockedBikes: ['kaneda_red'],
        selectedBike: 'kaneda_red',
        stats: {
          highScore: 0,
          totalKills: 0,
          gamesPlayed: 0
        },
        createdAt: new Date().toISOString()
      };
      saveDb();
    }
    return db.players[playerId];
  },

  // Atualiza dados do jogador
  updatePlayer(playerId, updates) {
    const player = this.getPlayer(playerId);
    Object.assign(player, updates);
    saveDb();
    return player;
  },

  // Adiciona Pills / Itens ao jogador
  creditPlayer(playerId, { pills = 0, solBombs = 0, unlockBike = null }) {
    const player = this.getPlayer(playerId);
    if (pills > 0) player.pills += pills;
    if (solBombs > 0) player.solBombs += solBombs;
    if (unlockBike && !player.unlockedBikes.includes(unlockBike)) {
      player.unlockedBikes.push(unlockBike);
    }
    saveDb();
    return player;
  },

  // Registra um novo pagamento criado
  createPaymentRecord({ paymentId, playerId, itemKey, amount, title, qrCode, qrCodeBase64, status = 'pending' }) {
    db.payments[paymentId] = {
      paymentId,
      playerId,
      itemKey,
      amount,
      title,
      qrCode,
      qrCodeBase64,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveDb();
    return db.payments[paymentId];
  },

  // Busca pagamento pelo ID
  getPayment(paymentId) {
    return db.payments[paymentId] || null;
  },

  // Atualiza status do pagamento
  updatePaymentStatus(paymentId, status) {
    if (db.payments[paymentId]) {
      db.payments[paymentId].status = status;
      db.payments[paymentId].updatedAt = new Date().toISOString();
      saveDb();
      return db.payments[paymentId];
    }
    return null;
  },

  // Salva score na tabela de líderes
  recordScore(playerId, nickname, score, kills) {
    const player = this.getPlayer(playerId, nickname);
    if (score > player.stats.highScore) {
      player.stats.highScore = score;
    }
    player.stats.totalKills += kills || 0;
    player.stats.gamesPlayed += 1;

    db.leaderboard.push({
      playerId,
      nickname: player.nickname,
      score,
      kills,
      date: new Date().toISOString()
    });

    // Mantém os top 50
    db.leaderboard.sort((a, b) => b.score - a.score);
    db.leaderboard = db.leaderboard.slice(0, 50);

    saveDb();
    return player;
  },

  getLeaderboard() {
    return db.leaderboard;
  }
};
