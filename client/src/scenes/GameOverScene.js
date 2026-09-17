import Phaser from 'phaser';
import { Storage } from '../services/storage.js';
import { Api } from '../services/api.js';
import { SoundFX } from '../audio/SoundFX.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.score = data.score || 0;
    this.kills = data.kills || 0;
    this.pillsCollected = data.pillsCollected || 0;
  }

  create() {
    const { width, height } = this.scale;
    const player = Storage.getData();

    // Fundo de Neo-Tokyo com iluminação de emergência vermelha
    if (this.textures.exists('menu_hero_bg')) {
      const bg = this.add.image(width / 2, height / 2, 'menu_hero_bg');
      bg.setDisplaySize(width, height);
      bg.setTint(0x771122);
    }
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a050c, 0.82);

    // Título GAME OVER estilo anime
    this.add.text(width / 2, 85, '緊急事態 // NEO-TOKYO EMERGENCY', {
      fontFamily: 'Rajdhani',
      fontSize: '14px',
      letterSpacing: 4,
      color: '#ff003c'
    }).setOrigin(0.5);

    const title = this.add.text(width / 2, 135, 'MOTO DESTRUÍDA', {
      fontFamily: 'Orbitron',
      fontSize: '32px',
      fontStyle: '900',
      color: '#ff003c',
      stroke: '#ffffff',
      strokeThickness: 2,
      shadow: { color: '#ff003c', blur: 22, fill: true }
    }).setOrigin(0.5);

    // Card de Resultados da Partida
    this.createResultsCard(width / 2, 270, player);

    // Botão 1: Reviver com Pix (R$ 1,00)
    this.createActionButton(width / 2, 420, '⚡ REVIVER COM PIX (R$ 1,00)', 0x00f0ff, () => {
      Api.openPixPayment('instant_revive', 'Reviver na Partida', 1.00, () => {
        Api.showToast('Revivido com sucesso! Retornando ao combate...', '🚀');
        this.scene.start('GameScene', {
          revived: true,
          score: this.score,
          kills: this.kills
        });
      });
    });

    // Botão 2: Reviver com Pills (200 Pills)
    const canReviveWithPills = player.pills >= 200;
    const pillsBtnText = canReviveWithPills ? '💊 REVIVER COM 200 PILLS' : '💊 REVIVER (200 PILLS - INSUFICIENTE)';
    this.createActionButton(width / 2, 495, pillsBtnText, canReviveWithPills ? 0xfcee0a : 0x555566, () => {
      if (Storage.spendPills(200)) {
        SoundFX.coinSuccess();
        Api.showToast('Revivido com Pills! Boa sorte.', '💊');
        this.scene.start('GameScene', {
          revived: true,
          score: this.score,
          kills: this.kills
        });
      } else {
        Api.showToast('Pills insuficientes! Compre no Pix ou recomece.', '❌');
      }
    });

    // Botão 3: Nova Partida
    this.createActionButton(width / 2, 570, '🔄 NOVA PARTIDA', 0xff003c, () => {
      SoundFX.laser();
      this.scene.start('GameScene', { revived: false, score: 0, kills: 0 });
    });

    // Botão 4: Menu Principal
    this.createActionButton(width / 2, 645, '🏠 MENU PRINCIPAL', 0x8899bb, () => {
      this.scene.start('MenuScene');
    });
  }

  createResultsCard(x, y, player) {
    const card = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 440, 160, 0x0d1124, 0.9)
      .setStrokeStyle(1.5, 0x00f0ff);

    const scoreLbl = this.add.text(0, -50, `PONTUAÇÃO FINAL: ${this.score.toLocaleString()} PTS`, {
      fontFamily: 'Orbitron',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#00f0ff'
    }).setOrigin(0.5);

    const killsLbl = this.add.text(0, -15, `💀 INIMIGOS ELIMINADOS: ${this.kills}`, {
      fontFamily: 'Orbitron',
      fontSize: '13px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const pillsLbl = this.add.text(0, 15, `💊 PILLS COLETADAS: +${this.pillsCollected}`, {
      fontFamily: 'Orbitron',
      fontSize: '13px',
      color: '#fcee0a'
    }).setOrigin(0.5);

    const recordLbl = this.add.text(0, 45, `🏆 SEU RECORDE: ${player.highScore.toLocaleString()} PTS`, {
      fontFamily: 'Orbitron',
      fontSize: '13px',
      color: '#ff003c'
    }).setOrigin(0.5);

    card.add([bg, scoreLbl, killsLbl, pillsLbl, recordLbl]);
  }

  createActionButton(x, y, text, color, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 420, 52, 0x0c0f20, 0.95)
      .setStrokeStyle(2, color);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Orbitron',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      shadow: { color: color, blur: 8, fill: true }
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(420, 52);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.fillColor = color;
      label.setColor('#000000');
      container.setScale(1.02);
    });

    container.on('pointerout', () => {
      bg.fillColor = 0x0c0f20;
      label.setColor('#ffffff');
      container.setScale(1);
    });

    container.on('pointerdown', onClick);
  }
}
