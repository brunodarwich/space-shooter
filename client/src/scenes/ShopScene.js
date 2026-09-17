import Phaser from 'phaser';
import { Storage } from '../services/storage.js';
import { Api } from '../services/api.js';
import { SoundFX } from '../audio/SoundFX.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data) {
    this.returnToGame = data?.returnToGame || false;
  }

  create() {
    const { width, height } = this.scale;
    const player = Storage.getData();

    // Fundo escuro com vinheta cyberpunk
    this.add.rectangle(width / 2, height / 2, width, height, 0x050711, 0.98);

    // Linhas decorativas de grade cibernética no topo e rodapé
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x00f0ff, 0.12);
    for (let y = 0; y < height; y += 40) {
      gridGraphics.lineBetween(0, y, width, y);
    }

    // --- CABEÇALHO DA LOJA ---
    // Badge superior
    const tagBg = this.add.rectangle(width / 2, 36, 260, 24, 0x0c1527).setStrokeStyle(1, 0x00f0ff, 0.7);
    this.add.text(width / 2, 36, '⚡ MERCADO PAGO // CYBER SHOP', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: '#00f0ff'
    }).setOrigin(0.5);

    // Título Principal
    this.add.text(width / 2, 72, 'LOJA DE POWER-UPS & PILLS', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '22px',
      fontStyle: '900',
      color: '#ffffff',
      shadow: { color: '#00f0ff', blur: 14, fill: true }
    }).setOrigin(0.5);

    // Barra de Saldo do Jogador (Card estilizado)
    const balanceCard = this.add.rectangle(width / 2, 114, 460, 34, 0x0c1527, 0.9).setStrokeStyle(1.5, 0xfcee0a, 0.8);
    this.balanceText = this.add.text(width / 2, 114, `SEU SALDO:  💊 ${player.pills.toLocaleString('pt-BR')} PILLS   |   ⚡ ${player.solBombs} SOL BOMBS`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      letterSpacing: 1,
      color: '#fcee0a',
      shadow: { color: '#fcee0a', blur: 8, fill: true }
    }).setOrigin(0.5);

    // --- SEÇÃO 1: PACOTES PIX ---
    this.createSectionDivider(width / 2, 154, '⚡ PACOTES PIX // LIBERAÇÃO INSTANTÂNEA', 0xff003c);

    let startY = 198;
    const pixItems = [
      {
        key: 'pills_500',
        title: 'PACOTE BIKER',
        desc: '+500 Pills p/ Melhorias e Upgrades',
        price: 2.00,
        color: 0x00f0ff,
        textColor: '#00f0ff',
        icon: 'shop_pack_biker'
      },
      {
        key: 'pills_1500',
        title: 'PACOTE GANG LEADER',
        desc: '+1.500 Pills + 1 Carga Raio SOL',
        price: 5.00,
        color: 0xfcee0a,
        textColor: '#fcee0a',
        icon: 'shop_pack_leader'
      },
      {
        key: 'pills_4000',
        title: 'NEO-TOKYO OVERLORD',
        desc: '+4.000 Pills + 3 SOL + Moto Dourada',
        price: 10.00,
        color: 0xff003c,
        textColor: '#ff4d6d',
        icon: 'shop_pack_overlord'
      },
      {
        key: 'sol_pack_3',
        title: '3x CARGAS RAIO SOL',
        desc: '3 Raios orbitais destruidores de tela',
        price: 2.50,
        color: 0xb026ff,
        textColor: '#d8b4fe',
        icon: 'shop_pack_sol'
      }
    ];

    pixItems.forEach((item, index) => {
      this.createPixShopItem(width / 2, startY + (index * 82), item);
    });

    // --- SEÇÃO 2: GASTAR PILLS ---
    const pillsY = startY + (pixItems.length * 82) + 24;
    this.createSectionDivider(width / 2, pillsY - 14, '💊 TROCA DIRETA COM PILLS', 0x00f0ff);

    this.createPillsExchangeItem(width / 2, pillsY + 32, '1x CARGA DE SATÉLITE SOL', 250, () => {
      if (Storage.spendPills(250)) {
        Storage.addSolBombs(1);
        SoundFX.coinSuccess();
        Api.showToast('+1 Carga SOL adquirida!', '⚡');
        this.updateBalanceUI();
      } else {
        Api.showToast('Pills insuficientes! Compre um pacote Pix.', '❌');
      }
    });

    // --- BOTÃO VOLTAR / FECHAR ---
    const closeBtn = this.add.container(width / 2, height - 52);
    const bgClose = this.add.rectangle(0, 0, 360, 48, 0x0f172a, 0.95).setStrokeStyle(1.8, 0x38bdf8);
    const lblClose = this.add.text(0, 0, this.returnToGame ? '◀  VOLTAR AO JOGO' : '◀  VOLTAR AO MENU PRINCIPAL', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      letterSpacing: 2,
      color: '#ffffff'
    }).setOrigin(0.5);

    closeBtn.add([bgClose, lblClose]);
    closeBtn.setSize(360, 48);
    closeBtn.setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => {
      bgClose.setFillStyle(0x1e293b);
      bgClose.setStrokeStyle(2, 0xfcee0a);
      lblClose.setColor('#fcee0a');
      this.tweens.add({ targets: closeBtn, scaleX: 1.03, scaleY: 1.03, duration: 150 });
    });

    closeBtn.on('pointerout', () => {
      bgClose.setFillStyle(0x0f172a);
      bgClose.setStrokeStyle(1.8, 0x38bdf8);
      lblClose.setColor('#ffffff');
      this.tweens.add({ targets: closeBtn, scaleX: 1.0, scaleY: 1.0, duration: 150 });
    });

    closeBtn.on('pointerdown', () => {
      SoundFX.laser();
      if (this.returnToGame) {
        this.scene.stop();
        this.scene.resume('GameScene');
      } else {
        this.scene.start('MenuScene');
      }
    });
  }

  createSectionDivider(x, y, text, colorHex) {
    const dividerContainer = this.add.container(x, y);
    const lineGfx = this.add.graphics();
    lineGfx.lineStyle(1.5, colorHex, 0.4);
    lineGfx.lineBetween(-240, 0, 240, 0);

    const badge = this.add.rectangle(0, 0, 310, 22, 0x050711).setStrokeStyle(1, colorHex, 0.8);
    const label = this.add.text(0, 0, text, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 1.5,
      color: Phaser.Display.Color.IntegerToColor(colorHex).rgba
    }).setOrigin(0.5);

    dividerContainer.add([lineGfx, badge, label]);
  }

  createPixShopItem(x, y, item) {
    const container = this.add.container(x, y);
    
    // Fundo do Card Estilizado
    const bg = this.add.rectangle(0, 0, 490, 74, 0x0d1424, 0.96)
      .setStrokeStyle(2, item.color, 0.85);

    // Miniatura do Pacote / Insígnia Cyberpunk
    const iconFrame = this.add.rectangle(-200, 0, 56, 56, 0x050712)
      .setStrokeStyle(1.5, item.color, 0.9);
    
    let iconImg = null;
    if (this.textures.exists(item.icon)) {
      iconImg = this.add.image(-200, 0, item.icon).setDisplaySize(50, 50);
    }

    // Título do Pacote (Grande e nítido)
    const title = this.add.text(-160, -20, item.title, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '15px',
      fontStyle: '900',
      color: '#ffffff',
      shadow: { color: item.textColor, blur: 6, fill: true }
    });

    // Descrição legível e em alto contraste
    const desc = this.add.text(-160, 6, item.desc, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#e2e8f0'
    });

    // Botão de Compra PIX
    const btnBuy = this.add.container(165, 0);
    const btnBg = this.add.rectangle(0, 0, 130, 44, item.color);
    
    // Efeito de texto com alto contraste
    const btnLabel = this.add.text(0, 0, `PIX  R$ ${item.price.toFixed(2).replace('.', ',')}`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      letterSpacing: 1,
      color: '#050714'
    }).setOrigin(0.5);

    btnBuy.add([btnBg, btnLabel]);
    btnBuy.setSize(130, 44);
    btnBuy.setInteractive({ useHandCursor: true });

    btnBuy.on('pointerover', () => {
      this.tweens.add({ targets: btnBuy, scaleX: 1.06, scaleY: 1.06, duration: 120 });
      btnBg.setFillStyle(0xffffff);
      btnLabel.setColor('#000000');
    });

    btnBuy.on('pointerout', () => {
      this.tweens.add({ targets: btnBuy, scaleX: 1.0, scaleY: 1.0, duration: 120 });
      btnBg.setFillStyle(item.color);
      btnLabel.setColor('#050714');
    });

    btnBuy.on('pointerdown', () => {
      SoundFX.laser(1200);
      Api.openPixPayment(item.key, item.title, item.price, () => {
        this.updateBalanceUI();
      });
    });

    const elements = [bg, iconFrame, iconImg, title, desc, btnBuy].filter(Boolean);
    container.add(elements);
  }

  createPillsExchangeItem(x, y, titleText, pillCost, onBuy) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 490, 70, 0x0d1424, 0.96).setStrokeStyle(2, 0x00f0ff, 0.85);

    const iconFrame = this.add.rectangle(-200, 0, 54, 54, 0x050712).setStrokeStyle(1.5, 0x00f0ff, 0.9);
    let iconImg = null;
    if (this.textures.exists('powerup_sol')) {
      iconImg = this.add.image(-200, 0, 'powerup_sol').setDisplaySize(46, 46);
    }

    const title = this.add.text(-160, -18, titleText, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '14px',
      fontStyle: '900',
      color: '#ffffff',
      shadow: { color: '#00f0ff', blur: 6, fill: true }
    });

    const desc = this.add.text(-160, 6, 'Ataque orbital devastador em tela cheia', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#93c5fd'
    });

    const btnBuy = this.add.container(165, 0);
    const btnBg = this.add.rectangle(0, 0, 130, 40, 0x00f0ff);
    const btnLabel = this.add.text(0, 0, `💊 ${pillCost} PILLS`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      letterSpacing: 1,
      color: '#050714'
    }).setOrigin(0.5);

    btnBuy.add([btnBg, btnLabel]);
    btnBuy.setSize(130, 40);
    btnBuy.setInteractive({ useHandCursor: true });

    btnBuy.on('pointerover', () => {
      this.tweens.add({ targets: btnBuy, scaleX: 1.06, scaleY: 1.06, duration: 120 });
      btnBg.setFillStyle(0xffffff);
    });

    btnBuy.on('pointerout', () => {
      this.tweens.add({ targets: btnBuy, scaleX: 1.0, scaleY: 1.0, duration: 120 });
      btnBg.setFillStyle(0x00f0ff);
    });

    btnBuy.on('pointerdown', onBuy);

    const elements = [bg, iconFrame, iconImg, title, desc, btnBuy].filter(Boolean);
    container.add(elements);
  }

  updateBalanceUI() {
    const player = Storage.getData();
    if (this.balanceText) {
      this.balanceText.setText(`SEU SALDO:  💊 ${player.pills.toLocaleString('pt-BR')} PILLS   |   ⚡ ${player.solBombs} SOL BOMBS`);
    }
  }
}
