import Phaser from 'phaser';
import { Storage } from '../services/storage.js';
import { Api } from '../services/api.js';
import { SoundFX } from '../audio/SoundFX.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    const player = Storage.getData();

    // Inicia conexão SSE com o backend
    Api.initSSE(player.playerId);

    // Fundo Épico de Neo-Tokyo (Arte Conceitual Anime 1988)
    if (this.textures.exists('menu_hero_bg')) {
      this.bg = this.add.image(width / 2, height / 2, 'menu_hero_bg');
      this.bg.setDisplaySize(width, height);
      // Efeito de respiração lenta na imagem de fundo
      this.tweens.add({
        targets: this.bg,
        scaleX: this.bg.scaleX * 1.03,
        scaleY: this.bg.scaleY * 1.03,
        duration: 8000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.bg = this.add.tileSprite(width / 2, height / 2, width, height, 'bg_highway_road');
    }

    // Overlay escuro com vinheta para legibilidade perfeita
    this.add.rectangle(width / 2, height / 2, width, height, 0x050714, 0.52);

    // Título Principal Estilo Akira
    const titleKanji = this.add.text(width / 2, 85, 'ネオ東京 2026', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      letterSpacing: 8,
      color: '#ff003c',
      shadow: { color: '#ff003c', blur: 15, fill: true }
    }).setOrigin(0.5);

    const titleMain = this.add.text(width / 2, 125, 'AKIRA', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '56px',
      fontStyle: '900',
      color: '#ff003c',
      stroke: '#ffffff',
      strokeThickness: 3,
      shadow: { color: '#ff003c', blur: 25, fill: true }
    }).setOrigin(0.5);

    const subTitle = this.add.text(width / 2, 172, 'PROTOCOL // SHMUP ROGUELITE', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '13px',
      letterSpacing: 4,
      color: '#00f0ff'
    }).setOrigin(0.5);

    // Card do Jogador & Estatísticas
    this.createPlayerStatsCard(width / 2, 235, player);

    // Sombra / Brilho Neon sob a Moto de Kaneda
    const glowColor = player.selectedBike === 'kaneda_gold' ? 0xb026ff : 0xff003c;
    this.bikeGlow = this.add.ellipse(width / 2, 395, 95, 24, glowColor, 0.45);

    // Preview da Moto Selecionada (Visão 2.5D com Piloto Kaneda Ampliada)
    const bikeTexture = player.selectedBike === 'kaneda_gold' ? 'player_bike_gold' : 'player_bike_red';
    this.bikePreview = this.add.image(width / 2, 345, bikeTexture)
      .setScale(1.8);
    
    // Efeito de motor ligado / flutuação suave na moto
    this.tweens.add({
      targets: this.bikePreview,
      y: 338,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: this.bikeGlow,
      scaleX: 1.15,
      alpha: 0.6,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Botões Principais com Toque Anime
    this.createCyberButton(width / 2, 465, '▶ 作戦開始 // INICIAR MISSÃO', 0xff003c, () => {
      SoundFX.laser();
      SoundFX.startBGM();
      this.scene.start('GameScene');
    });

    this.createCyberButton(width / 2, 540, '🛒 闇市場 // LOJA PIX (MERCADO PAGO)', 0x00f0ff, () => {
      SoundFX.coinSuccess();
      this.scene.start('ShopScene');
    });

    this.createCyberButton(width / 2, 615, '🏆 階級表 // CLASSIFICAÇÃO GLOBAL', 0xfcee0a, () => {
      this.showLeaderboardModal();
    });

    // Seletor de Skins da Moto
    this.createBikeSelector(width / 2, 700, player);

    // Rodapé / Botão de Mudo e Controles
    this.createFooter(width, height);
  }

  update() {
    if (this.bg && this.bg.tilePositionY !== undefined) {
      this.bg.tilePositionY -= 2;
    }
  }

  createPlayerStatsCard(x, y, player) {
    const card = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 440, 60, 0x0a0c1a, 0.9)
      .setStrokeStyle(1.5, 0x00f0ff);

    const nickText = this.add.text(-200, -14, `PILOTO: ${player.nickname.toUpperCase()}`, {
      fontFamily: 'Orbitron',
      fontSize: '13px',
      color: '#ffffff'
    });

    const pillsText = this.add.text(-200, 8, `💊 PILLS: ${player.pills}`, {
      fontFamily: 'Orbitron',
      fontSize: '13px',
      color: '#fcee0a'
    });

    const solText = this.add.text(60, -14, `⚡ SOL: ${player.solBombs}`, {
      fontFamily: 'Orbitron',
      fontSize: '13px',
      color: '#ff003c'
    });

    const recordText = this.add.text(60, 8, `🏆 RECORDE: ${player.highScore}`, {
      fontFamily: 'Orbitron',
      fontSize: '13px',
      color: '#00f0ff'
    });

    card.add([bg, nickText, pillsText, solText, recordText]);
  }

  createBikeSelector(x, y, player) {
    const isGoldUnlocked = player.unlockedBikes.includes('kaneda_gold');
    const isGoldSelected = player.selectedBike === 'kaneda_gold';

    const text = isGoldSelected 
      ? '★ MOTO DOURADA ATIVA' 
      : (isGoldUnlocked ? 'SELECIONAR MOTO DOURADA' : '🔒 MOTO DOURADA (PACOTE PIX)');

    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 360, 40, isGoldSelected ? 0x221a00 : 0x111122, 0.9)
      .setStrokeStyle(1, isGoldSelected ? 0xfcee0a : 0x555577);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Orbitron',
      fontSize: '11px',
      color: isGoldSelected ? '#fcee0a' : (isGoldUnlocked ? '#00f0ff' : '#888888')
    }).setOrigin(0.5);

    btn.add([bg, label]);
    btn.setSize(360, 40);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      if (!isGoldUnlocked) {
        Api.showToast('Desbloqueie a Moto Dourada no Pacote Overlord na Loja!', '🔒');
        this.scene.start('ShopScene');
      } else {
        const next = isGoldSelected ? 'kaneda_red' : 'kaneda_gold';
        Storage.update({ selectedBike: next });
        this.scene.restart();
      }
    });
  }

  createCyberButton(x, y, text, color, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 380, 56, 0x0c0f20, 0.95)
      .setStrokeStyle(2, color);

    const glow = this.add.rectangle(0, 0, 380, 56, color, 0.05);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Orbitron',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      shadow: { color: color, blur: 10, fill: true }
    }).setOrigin(0.5);

    container.add([bg, glow, label]);
    container.setSize(380, 56);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.fillColor = color;
      label.setColor('#000000');
      container.setScale(1.03);
    });

    container.on('pointerout', () => {
      bg.fillColor = 0x0c0f20;
      label.setColor('#ffffff');
      container.setScale(1);
    });

    container.on('pointerdown', onClick);
  }

  createFooter(width, height) {
    // Botão de Som Mute
    const isMuted = SoundFX.muted;
    const soundBtn = this.add.text(width / 2, height - 60, isMuted ? '🔇 SOM: DESATIVADO' : '🔊 SOM: ATIVADO', {
      fontFamily: 'Orbitron',
      fontSize: '12px',
      color: '#8890b5'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    soundBtn.on('pointerdown', () => {
      const muted = SoundFX.toggleMute();
      soundBtn.setText(muted ? '🔇 SOM: DESATIVADO' : '🔊 SOM: ATIVADO');
    });

    // Instruções de controle
    this.add.text(width / 2, height - 30, 'WASD / SETAS / MOUSE / TOUCH NO CELULAR', {
      fontFamily: 'Rajdhani',
      fontSize: '11px',
      letterSpacing: 2,
      color: '#556688'
    }).setOrigin(0.5);
  }

  async showLeaderboardModal() {
    try {
      const res = await fetch(`${Api.apiBaseUrl || 'http://localhost:3001/api'}/leaderboard`);
      const data = await res.json();
      const top = (data.leaderboard || []).slice(0, 5);

      let msg = '🏆 TOP PILOTOS DE NEO-TOKYO:\n\n';
      if (top.length === 0) msg += '1. Kaneda - 12.500 pts\n2. Tetsuo - 8.400 pts';
      else {
        top.forEach((p, idx) => {
          msg += `${idx + 1}. ${p.nickname} - ${p.score.toLocaleString()} pts (${p.kills || 0} kills)\n`;
        });
      }
      alert(msg);
    } catch (e) {
      alert('Ranking: Jogue agora para registrar seu recorde!');
    }
  }
}
