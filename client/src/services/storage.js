// Gerenciamento de persistência local (LocalStorage)
const STORAGE_KEY = 'NEO_TOKYO_PLAYER_DATA';

export const Storage = {
  getData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Erro ao ler localStorage', e);
    }

    // Cria perfil padrão
    const defaultData = {
      playerId: 'neo_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      nickname: 'Kaneda',
      pills: 200, // Começa com 200 Pills
      solBombs: 2, // 2 cargas de satélite
      unlockedBikes: ['kaneda_red'],
      selectedBike: 'kaneda_red',
      highScore: 0,
      totalKills: 0,
      soundMuted: false
    };

    this.saveData(defaultData);
    return defaultData;
  },

  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao salvar no localStorage', e);
    }
  },

  update(updates) {
    const data = this.getData();
    Object.assign(data, updates);
    this.saveData(data);
    return data;
  },

  addPills(amount) {
    const data = this.getData();
    data.pills = (data.pills || 0) + amount;
    this.saveData(data);
    return data.pills;
  },

  spendPills(amount) {
    const data = this.getData();
    if ((data.pills || 0) >= amount) {
      data.pills -= amount;
      this.saveData(data);
      return true;
    }
    return false;
  },

  addSolBombs(amount) {
    const data = this.getData();
    data.solBombs = (data.solBombs || 0) + amount;
    this.saveData(data);
    return data.solBombs;
  },

  useSolBomb() {
    const data = this.getData();
    if ((data.solBombs || 0) > 0) {
      data.solBombs -= 1;
      this.saveData(data);
      return true;
    }
    return false;
  }
};
