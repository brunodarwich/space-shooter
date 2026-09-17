export const GAME_CONFIG = {
  width: 540,
  height: 960,
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  player: {
    baseSpeed: 380,
    maxHp: 3,
    shootDelay: 160, // ms
    solChargeMax: 100, // 100% carga necessária para o Raio SOL
  },
  colors: {
    neonRed: '#ff003c',
    neonCyan: '#00f0ff',
    neonYellow: '#fcee0a',
    neonPurple: '#b026ff',
    darkBg: '#05050d'
  }
};
