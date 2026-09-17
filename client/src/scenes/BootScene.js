import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.createLoadingUI();

    // Carregamento de Sprites e Imagens Anime de Neo-Tokyo
    this.load.image('menu_hero_bg', 'assets/backgrounds/menu_hero_bg.jpg');
    this.load.image('bg_skyline', 'assets/backgrounds/bg_skyline.png');
    this.load.image('bg_highway_mid', 'assets/backgrounds/bg_highway_mid.png');

    // Objetos e Destroços Urbanos da Rodovia (Inspirados no anime Akira)
    this.load.image('prop_drum_hazard', 'assets/sprites/prop_drum_hazard.png');
    this.load.image('prop_cone_neon', 'assets/sprites/prop_cone_neon.png');
    this.load.image('prop_barrier_jersey', 'assets/sprites/prop_barrier_jersey.png');
    this.load.image('prop_wreck_bike', 'assets/sprites/prop_wreck_bike.png');
    this.load.image('prop_overpass_gantry', 'assets/sprites/prop_overpass_gantry.png');

    this.load.image('player_bike_red', 'assets/sprites/player_bike_red.png');
    this.load.image('player_bike_gold', 'assets/sprites/player_bike_gold.png');
    this.load.spritesheet('player_bike_red_sheet', 'assets/sprites/player_bike_red_sheet.png', { frameWidth: 64, frameHeight: 96 });
    this.load.spritesheet('player_bike_gold_sheet', 'assets/sprites/player_bike_gold_sheet.png', { frameWidth: 64, frameHeight: 96 });
    this.load.image('enemy_biker', 'assets/sprites/enemy_biker.png');
    this.load.image('enemy_interceptor', 'assets/sprites/enemy_interceptor.png');
    this.load.image('enemy_heli', 'assets/sprites/enemy_heli.png');
    this.load.image('boss_clown', 'assets/sprites/boss_clown.png');
    this.load.image('boss_tank', 'assets/sprites/boss_tank.png');
    this.load.image('boss_tetsuo', 'assets/sprites/boss_tetsuo.png');

    // Spritesheets Animados de Inimigos e Chefes Neo-Tokyo
    this.load.spritesheet('enemy_biker_sheet', 'assets/sprites/enemy_biker_sheet.png', { frameWidth: 48, frameHeight: 64 });
    this.load.spritesheet('enemy_interceptor_sheet', 'assets/sprites/enemy_interceptor_sheet.png', { frameWidth: 54, frameHeight: 64 });
    this.load.spritesheet('enemy_heli_sheet', 'assets/sprites/enemy_heli_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('boss_clown_sheet', 'assets/sprites/boss_clown_sheet.png', { frameWidth: 144, frameHeight: 160 });
    this.load.spritesheet('boss_tank_sheet', 'assets/sprites/boss_tank_sheet.png', { frameWidth: 150, frameHeight: 160 });
    this.load.spritesheet('boss_tetsuo_sheet', 'assets/sprites/boss_tetsuo_sheet.png', { frameWidth: 160, frameHeight: 180 });
    this.load.spritesheet('boss_explosion_sheet', 'assets/sprites/boss_explosion_sheet.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('hit_spark_sheet', 'assets/sprites/hit_spark_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('hit_spark', 'assets/sprites/hit_spark.png');
    this.load.image('powerup_pill', 'assets/sprites/powerup_pill.png');
    this.load.image('powerup_shield', 'assets/sprites/powerup_shield.png');
    this.load.image('powerup_weapon', 'assets/sprites/powerup_weapon.png');
    this.load.image('powerup_sol', 'assets/sprites/powerup_sol.png');
    this.load.image('escort_drone', 'assets/sprites/escort_drone.png');

    // Ícones da Loja Cyberpunk & Badges
    this.load.image('shop_pack_biker', 'assets/icons/shop_pack_biker.png');
    this.load.image('shop_pack_leader', 'assets/icons/shop_pack_leader.png');
    this.load.image('shop_pack_overlord', 'assets/icons/shop_pack_overlord.png');
    this.load.image('shop_pack_sol', 'assets/icons/shop_pack_sol.png');

    // Ícones de Interface e HUD
    this.load.image('icon_hud_shop', 'assets/icons/icon_hud_shop.png');
    this.load.image('icon_hud_sol', 'assets/icons/icon_hud_sol.png');
  }

  createLoadingUI() {
    const { width, height } = this.scale;
    const barW = 320;
    const barH = 18;
    const bgBar = this.add.rectangle(width / 2, height / 2, barW, barH, 0x080c18).setStrokeStyle(2, 0x00f0ff);
    const progressBar = this.add.rectangle(width / 2 - barW / 2 + 3, height / 2, 0, barH - 6, 0xff003c).setOrigin(0, 0.5);

    const kanjiTitle = this.add.text(width / 2, height / 2 - 80, 'ネオ東京 2026 // AKIRA PROTOCOL', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      letterSpacing: 4,
      color: '#ff003c'
    }).setOrigin(0.5);

    const titleText = this.add.text(width / 2, height / 2 - 45, 'CARREGANDO SISTEMAS', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#00f0ff'
    }).setOrigin(0.5);

    const statusText = this.add.text(width / 2, height / 2 + 40, 'SINCRONIZANDO COM A REDE...', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#fcee0a'
    }).setOrigin(0.5);

    // Eventos do Loader do Phaser
    this.load.on('progress', (value) => {
      progressBar.width = (barW - 6) * value;
      const pct = Math.round(value * 100);
      statusText.setText(`CARREGANDO DADOS: ${pct}%`);
    });

    this.load.on('loaderror', (fileObj) => {
      console.warn(`[BootScene] Falha ao carregar asset: ${fileObj.key}. Usando fallback procedural.`);
    });

    this.load.on('complete', () => {
      statusText.setText('SISTEMAS OPERACIONAIS // INICIANDO');
      this.time.delayedCall(300, () => {
        this.createSeamlessRoadTexture();
        this.generateProceduralTextures();
        this.createGlobalAnimations();
        this.scene.start('MenuScene');
      });
    });
  }

  // Gera uma versão da rodovia anime perfeitamente contínua (sem cortes ao rolar)
  createSeamlessRoadTexture() {
    if (!this.textures.exists('bg_highway_road_raw')) return;
    const rawTex = this.textures.get('bg_highway_road_raw');
    const rawImg = rawTex?.getSourceImage();
    if (!rawImg || !rawImg.width) return;

    const canvas = document.createElement('canvas');
    canvas.width = 540;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');

    // 1. Desenha a textura anime na resolução de gameplay (540x960)
    ctx.drawImage(rawImg, 0, 0, 540, 960);

    // 2. Transição vertical contínua para evitar qualquer emenda perceptível
    const blendH = 120;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 540;
    tempCanvas.height = blendH;
    const tempCtx = tempCanvas.getContext('2d');

    // Copia a faixa final da imagem
    tempCtx.drawImage(canvas, 0, 960 - blendH, 540, blendH, 0, 0, 540, blendH);

    // Mescla progressivamente com o início da imagem usando gradiente de transparência
    for (let y = 0; y < blendH; y++) {
      const alpha = Math.pow(1 - (y / blendH), 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(tempCanvas, 0, y, 540, 1, 0, y, 540, 1);
      ctx.restore();
    }

    if (this.textures.exists('bg_highway_road')) {
      this.textures.remove('bg_highway_road');
    }
    this.textures.addCanvas('bg_highway_road', canvas);
  }

  // Gera todas as texturas pixel-art ricas no Canvas
  generateProceduralTextures() {
    // 1. Moto Vermelha de Kaneda (Player)
    this.drawCanvasTexture('player_bike_red', 48, 72, (ctx) => {
      // Sombra
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(24, 60, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpo da moto (vermelho icônico com brilho)
      ctx.fillStyle = '#ff003c';
      ctx.beginPath();
      ctx.moveTo(24, 4);  // Bico frontal
      ctx.lineTo(38, 30); // Lateral direita
      ctx.lineTo(34, 64); // Traseira direita
      ctx.lineTo(14, 64); // Traseira esquerda
      ctx.lineTo(10, 30); // Lateral esquerda
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#990022';
      ctx.stroke();

      // Para-brisa preto fumê / cockpit
      ctx.fillStyle = '#0a0d18';
      ctx.beginPath();
      ctx.moveTo(24, 14);
      ctx.lineTo(31, 32);
      ctx.lineTo(17, 32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Detalhes brancos / Adesivos
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(21, 38, 6, 8);
      ctx.fillStyle = '#fcee0a';
      ctx.fillRect(15, 48, 4, 10);
      ctx.fillRect(29, 48, 4, 10);

      // Farol dianteiro de laser azul
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(24, 8, 4, 0, Math.PI * 2);
      ctx.fill();

      // Propulsores traseiros neon
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(16, 62, 5, 4);
      ctx.fillRect(27, 62, 5, 4);
    });

    // 2. Moto Dourada Exclusiva (Kaneda Gold Edition)
    this.drawCanvasTexture('player_bike_gold', 48, 72, (ctx) => {
      // Sombra
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(24, 60, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpo Dourado
      ctx.fillStyle = '#fcee0a';
      ctx.beginPath();
      ctx.moveTo(24, 4);
      ctx.lineTo(38, 30);
      ctx.lineTo(34, 64);
      ctx.lineTo(14, 64);
      ctx.lineTo(10, 30);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#b89f00';
      ctx.stroke();

      // Cockpit Roxo Neon
      ctx.fillStyle = '#220033';
      ctx.beginPath();
      ctx.moveTo(24, 14);
      ctx.lineTo(31, 32);
      ctx.lineTo(17, 32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b026ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Farol Roxo
      ctx.fillStyle = '#b026ff';
      ctx.beginPath();
      ctx.arc(24, 8, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Drone de Escolta (Mini Moto de Apoio)
    this.drawCanvasTexture('escort_drone', 28, 40, (ctx) => {
      ctx.fillStyle = '#ff003c';
      ctx.beginPath();
      ctx.moveTo(14, 2);
      ctx.lineTo(24, 20);
      ctx.lineTo(20, 36);
      ctx.lineTo(8, 36);
      ctx.lineTo(4, 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(11, 10, 6, 8);
    });

    // 4. Projéteis com Alto Contraste Shmup
    this.drawCanvasTexture('laser_red', 12, 26, (ctx) => {
      // Glow ciano/vermelho com núcleo brilhante
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(2, 0, 8, 26);
      ctx.fillStyle = '#ff77aa';
      ctx.fillRect(4, 2, 4, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 4, 2, 18);
    });

    this.drawCanvasTexture('laser_cyan', 14, 28, (ctx) => {
      // Ciano cristalino com núcleo branco intenso
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.fillRect(1, 0, 12, 28);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(3, 1, 8, 26);
      ctx.fillStyle = '#e0ffff';
      ctx.fillRect(5, 3, 4, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 5, 2, 18);
    });

    // Projétil Inimigo de Alta Visibilidade (Laranja/Vermelho Neon com Centro Branco)
    this.drawCanvasTexture('bullet_enemy', 16, 16, (ctx) => {
      // Halo externo vermelho neon pulsante
      ctx.fillStyle = 'rgba(255, 0, 60, 0.45)';
      ctx.beginPath();
      ctx.arc(8, 8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Anel médio laranja neon intenso
      ctx.fillStyle = '#ff5500';
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0, Math.PI * 2);
      ctx.fill();

      // Anel interno amarelo ouro
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(8, 8, 4, 0, Math.PI * 2);
      ctx.fill();

      // Núcleo branco puro de alto contraste
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(8, 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Inimigo: Biker Gang Clowns (Moto Verde/Roxa)
    this.drawCanvasTexture('enemy_biker', 40, 56, (ctx) => {
      ctx.fillStyle = '#7928ca';
      ctx.beginPath();
      ctx.moveTo(20, 52);
      ctx.lineTo(6, 24);
      ctx.lineTo(12, 4);
      ctx.lineTo(28, 4);
      ctx.lineTo(34, 24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Máscara do Palhaço / Farol
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(20, 16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff003c';
      ctx.fillRect(18, 14, 4, 4);
    });

    // 6. Inimigo: Viatura de Choque Hover (Police Interceptor)
    this.drawCanvasTexture('enemy_interceptor', 50, 60, (ctx) => {
      ctx.fillStyle = '#1a1f38';
      ctx.fillRect(8, 6, 34, 48);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(12, 10, 8, 6);
      ctx.fillStyle = '#ff003c';
      ctx.fillRect(30, 10, 8, 6);
      ctx.strokeStyle = '#556699';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 6, 34, 48);
    });

    // 7. Inimigo: Helicóptero Militar de Ataque
    this.drawCanvasTexture('enemy_heli', 56, 56, (ctx) => {
      ctx.fillStyle = '#334433';
      ctx.beginPath();
      ctx.arc(28, 28, 18, 0, Math.PI * 2);
      ctx.fill();
      // Hélices
      ctx.fillStyle = 'rgba(200, 240, 200, 0.7)';
      ctx.fillRect(2, 26, 52, 4);
      ctx.fillRect(26, 2, 4, 52);
      // Canhão
      ctx.fillStyle = '#ff003c';
      ctx.fillRect(26, 44, 4, 10);
    });

    // 8. Chefe 1: Caminhão Blindado dos Clowns (Clown Assault Rig)
    this.drawCanvasTexture('boss_clown', 120, 150, (ctx) => {
      ctx.fillStyle = '#2d114d';
      ctx.fillRect(10, 10, 100, 130);
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 100, 130);

      // Decalque de Caveira Neon
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(60, 50, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillRect(50, 44, 6, 6);
      ctx.fillRect(64, 44, 6, 6);
      ctx.fillRect(54, 58, 12, 6);

      // Canhões frontais duplos
      ctx.fillStyle = '#ff003c';
      ctx.fillRect(20, 136, 16, 14);
      ctx.fillRect(84, 136, 16, 14);
    });

    // 9. Chefe 2: Tanque Andante Militar Experimental (Mech Tank)
    this.drawCanvasTexture('boss_tank', 140, 160, (ctx) => {
      ctx.fillStyle = '#3a4454';
      ctx.fillRect(20, 20, 100, 120);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 100, 120);

      // 4 Esteiras / Patas
      ctx.fillStyle = '#111622';
      ctx.fillRect(6, 10, 14, 40);
      ctx.fillRect(120, 10, 14, 40);
      ctx.fillRect(6, 110, 14, 40);
      ctx.fillRect(120, 110, 14, 40);

      // Canhão Pesado Central
      ctx.fillStyle = '#fcee0a';
      ctx.fillRect(62, 130, 16, 28);
      ctx.fillStyle = '#ff003c';
      ctx.beginPath();
      ctx.arc(70, 70, 18, 0, Math.PI * 2);
      ctx.fill();
    });

    // 10. Chefe 3: Mutação Psíquica do Tetsuo (Biomassa Telecinética)
    this.drawCanvasTexture('boss_tetsuo', 160, 180, (ctx) => {
      // Aura Psíquica Pulsante
      const grad = ctx.createRadialGradient(80, 90, 20, 80, 90, 78);
      grad.addColorStop(0, 'rgba(255, 0, 60, 0.8)');
      grad.addColorStop(0.5, 'rgba(176, 38, 255, 0.6)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(80, 90, 78, 0, Math.PI * 2);
      ctx.fill();

      // Biomassa grotesca
      ctx.fillStyle = '#c72c48';
      ctx.beginPath();
      ctx.arc(80, 90, 50, 0, Math.PI * 2);
      ctx.arc(50, 70, 30, 0, Math.PI * 2);
      ctx.arc(110, 70, 32, 0, Math.PI * 2);
      ctx.arc(80, 130, 36, 0, Math.PI * 2);
      ctx.fill();

      // Olhos e veias telecinéticas
      ctx.fillStyle = '#fcee0a';
      ctx.beginPath();
      ctx.arc(70, 80, 8, 0, Math.PI * 2);
      ctx.arc(95, 85, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillRect(68, 78, 4, 4);
      ctx.fillRect(93, 83, 3, 3);
    });

    // 11. Power-Ups (Pill Capsule, Shield, Upgrade, SOL)
    // Cápsula Akira (Metade Vermelha, Metade Azul/Branca)
    this.drawCanvasTexture('powerup_pill', 24, 24, (ctx) => {
      ctx.fillStyle = '#ff003c';
      ctx.beginPath();
      ctx.arc(12, 7, 6, Math.PI, 0, false);
      ctx.rect(6, 7, 12, 5);
      ctx.fill();

      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.rect(6, 12, 12, 5);
      ctx.arc(12, 17, 6, 0, Math.PI, false);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(6, 6, 12, 12);
    });

    // Escudo de Força
    this.drawCanvasTexture('powerup_shield', 26, 26, (ctx) => {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(13, 13, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Upgrade de Tiro (W)
    this.drawCanvasTexture('powerup_weapon', 24, 24, (ctx) => {
      ctx.fillStyle = '#fcee0a';
      ctx.fillRect(2, 2, 20, 20);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('W', 12, 12);
    });

    // Carga SOL
    this.drawCanvasTexture('powerup_sol', 26, 26, (ctx) => {
      ctx.fillStyle = '#ff003c';
      ctx.beginPath();
      ctx.arc(13, 13, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SOL', 13, 13);
    });

    // 12. Textura da Rodovia de Neo-Tokyo de Alta Legibilidade (Asfalto Escuro e Faixas Neon Limpas)
    const drawHighwayRoad = (ctx) => {
      // 1. Acostamento externo escuro com grade sutil de alta tecnologia
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 0, 540, 960);

      // Linhas finas de perspectiva cibernética nas margens
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 40; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 960);
        ctx.stroke();
      }
      for (let x = 500; x <= 540; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 960);
        ctx.stroke();
      }

      // 2. Pista Central de Asfalto com Iluminação Suave e Fundo Escuro Perfeito para Contraste
      const roadGrad = ctx.createLinearGradient(44, 0, 496, 0);
      roadGrad.addColorStop(0, '#090c17');
      roadGrad.addColorStop(0.2, '#0f1322');
      roadGrad.addColorStop(0.5, '#131728');
      roadGrad.addColorStop(0.8, '#0f1322');
      roadGrad.addColorStop(1, '#090c17');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(44, 0, 452, 960);

      // 3. Guard-Rails Neon Akira (Glow contínuo nas bordas da rodovia)
      // Guard-Rail Esquerdo (x = 44)
      ctx.fillStyle = 'rgba(255, 0, 60, 0.22)';
      ctx.fillRect(38, 0, 10, 960);
      ctx.fillStyle = '#ff003c';
      ctx.fillRect(43, 0, 3, 960);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(44, 0, 1, 960);

      // Guard-Rail Direito (x = 496)
      ctx.fillStyle = 'rgba(255, 0, 60, 0.22)';
      ctx.fillRect(492, 0, 10, 960);
      ctx.fillStyle = '#ff003c';
      ctx.fillRect(494, 0, 3, 960);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(495, 0, 1, 960);

      // Faixas de aviso zebradas sutis estritamente dentro do guard-rail
      ctx.fillStyle = 'rgba(252, 238, 10, 0.12)';
      for (let y = 0; y < 960; y += 40) {
        ctx.fillRect(36, y, 6, 16);
        ctx.fillRect(498, y, 6, 16);
      }

      // 4. Faixas Divisórias Pontilhadas Limpas e Elegantes (Sem poluição ou números confusos)
      // Faixa Lateral Esquerda (x = 195)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([36, 44]);
      ctx.beginPath();
      ctx.moveTo(195, 0);
      ctx.lineTo(195, 960);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Faixa Lateral Direita (x = 345)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(345, 0);
      ctx.lineTo(345, 960);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Linha Guia Central Suave (x = 270)
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([12, 68]);
      ctx.beginPath();
      ctx.moveTo(270, 0);
      ctx.lineTo(270, 960);
      ctx.stroke();

      ctx.setLineDash([]);
    };

    this.drawCanvasTexture('bg_highway_road', 540, 960, drawHighwayRoad);
    this.drawCanvasTexture('bg_highway', 540, 960, drawHighwayRoad);

    // 13. Partículas e Efeitos Visuais (Impactos de Tiros e Explosões)
    this.drawCanvasTexture('particle_spark', 6, 6, (ctx) => {
      ctx.fillStyle = '#ff003c';
      ctx.fillRect(0, 0, 6, 6);
    });
    this.drawCanvasTexture('particle_cyan', 6, 6, (ctx) => {
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(0, 0, 6, 6);
    });
    this.drawCanvasTexture('particle_yellow', 8, 8, (ctx) => {
      ctx.fillStyle = '#fcee0a';
      ctx.beginPath();
      ctx.arc(4, 4, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    this.drawCanvasTexture('particle_spark_orange', 8, 8, (ctx) => {
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(1, 1, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 3, 2, 2);
    });
    this.drawCanvasTexture('particle_spark_magenta', 8, 8, (ctx) => {
      ctx.fillStyle = '#b026ff';
      ctx.fillRect(1, 1, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 3, 2, 2);
    });
    this.drawCanvasTexture('particle_spark_white', 6, 6, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 1, 4, 4);
    });

    // Clarão de Impacto Estelar / Diamante Neon (Hit Flash)
    this.drawCanvasTexture('fx_hit_flash', 32, 32, (ctx) => {
      const cx = 16;
      const cy = 16;
      // Brilho difuso
      const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 15);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(0, 240, 255, 0.9)');
      grad.addColorStop(0.7, 'rgba(255, 0, 60, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fill();

      // Cruz / Starburst incandescente
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx + 3, cy - 3);
      ctx.lineTo(32, cy);
      ctx.lineTo(cx + 3, cy + 3);
      ctx.lineTo(cx, 32);
      ctx.lineTo(cx - 3, cy + 3);
      ctx.lineTo(0, cy);
      ctx.lineTo(cx - 3, cy - 3);
      ctx.closePath();
      ctx.fill();
    });

    // Anel de Onda de Choque Neon (Shockwave Ring)
    this.drawCanvasTexture('fx_shockwave_ring', 64, 64, (ctx) => {
      const cx = 32;
      const cy = 32;
      const rad = 28;
      ctx.lineWidth = 4;
      const grad = ctx.createRadialGradient(cx, cy, rad - 6, cx, cy, rad + 4);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.8, 'rgba(255, 0, 60, 0.9)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Bola de Fogo de Plasma para Explosão (Fireball)
    this.drawCanvasTexture('fx_fireball', 48, 48, (ctx) => {
      const cx = 24;
      const cy = 24;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 23);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.25, 'rgba(252, 238, 10, 0.95)');
      grad.addColorStop(0.55, 'rgba(255, 85, 0, 0.85)');
      grad.addColorStop(0.85, 'rgba(255, 0, 60, 0.5)');
      grad.addColorStop(1, 'rgba(20, 0, 30, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 23, 0, Math.PI * 2);
      ctx.fill();
    });

    // Fumaça Volumétrica Estilizada Cyberpunk (Smoke Puff)
    this.drawCanvasTexture('fx_smoke', 36, 36, (ctx) => {
      const cx = 18;
      const cy = 18;
      const grad = ctx.createRadialGradient(cx, cy, 3, cx, cy, 17);
      grad.addColorStop(0, 'rgba(80, 50, 90, 0.8)');
      grad.addColorStop(0.6, 'rgba(30, 25, 45, 0.5)');
      grad.addColorStop(1, 'rgba(10, 12, 20, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      ctx.fill();
    });

    // Estilhaço Metálico / Fragmento Cibernético (Debris Shard)
    this.drawCanvasTexture('fx_debris_shard', 14, 14, (ctx) => {
      ctx.fillStyle = '#ff003c';
      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.lineTo(12, 4);
      ctx.lineTo(9, 12);
      ctx.lineTo(3, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 4, 3, 3);
    });
  }

  // Utilitário para desenhar no Canvas e registrar como textura no Phaser (apenas se não carregada por PNG)
  drawCanvasTexture(key, width, height, drawFn) {
    if (this.textures.exists(key)) {
      const tex = this.textures.get(key);
      if (tex && tex.key !== '__MISSING' && tex.source && tex.source[0] && tex.source[0].width > 1) {
        return;
      }
      this.textures.remove(key);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx);
    this.textures.addCanvas(key, canvas);
  }

  // Utilitário para gerar spritesheet em Canvas caso o PNG falhe
  drawCanvasSpriteSheet(key, frameWidth, frameHeight, numFrames, drawFrameFn) {
    if (this.textures.exists(key)) {
      const tex = this.textures.get(key);
      if (tex && tex.key !== '__MISSING' && tex.source && tex.source[0] && tex.source[0].width > 1) {
        return;
      }
      this.textures.remove(key);
    }
    const canvas = document.createElement('canvas');
    canvas.width = frameWidth * numFrames;
    canvas.height = frameHeight;
    const ctx = canvas.getContext('2d');
    for (let f = 0; f < numFrames; f++) {
      ctx.save();
      ctx.translate(f * frameWidth, 0);
      drawFrameFn(ctx, f, frameWidth, frameHeight);
      ctx.restore();
    }
    this.textures.addSpriteSheet(key, canvas, { frameWidth, frameHeight });
  }

  // Registra as animações globais do Phaser para os inimigos e chefões
  createGlobalAnimations() {
    // 1. Inimigo Biker (Cruzeiro em alta velocidade com oscilação do escape neon)
    if (this.textures.exists('enemy_biker_sheet') && !this.anims.exists('anim_enemy_biker_cruise')) {
      this.anims.create({
        key: 'anim_enemy_biker_cruise',
        frames: this.anims.generateFrameNumbers('enemy_biker_sheet', { frames: [1, 2] }),
        frameRate: 8,
        repeat: -1
      });
    }

    // 2. Viatura Interceptor (Sirenes policiais e propulsores hover)
    if (this.textures.exists('enemy_interceptor_sheet') && !this.anims.exists('anim_enemy_interceptor')) {
      this.anims.create({
        key: 'anim_enemy_interceptor',
        frames: this.anims.generateFrameNumbers('enemy_interceptor_sheet', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
      });
    }

    // 3. Helicóptero Militar (Giro contínuo de alta velocidade das pás da hélice)
    if (this.textures.exists('enemy_heli_sheet') && !this.anims.exists('anim_enemy_heli')) {
      this.anims.create({
        key: 'anim_enemy_heli',
        frames: this.anims.generateFrameNumbers('enemy_heli_sheet', { start: 0, end: 3 }),
        frameRate: 18,
        repeat: -1
      });
    }

    // 4. Chefe 1: Clown Assault Rig
    if (this.textures.exists('boss_clown_sheet')) {
      if (!this.anims.exists('anim_boss_clown')) {
        this.anims.create({
          key: 'anim_boss_clown',
          frames: this.anims.generateFrameNumbers('boss_clown_sheet', { frames: [0, 1] }),
          frameRate: 6,
          repeat: -1
        });
      }
      if (!this.anims.exists('anim_boss_clown_prep')) {
        this.anims.create({
          key: 'anim_boss_clown_prep',
          frames: this.anims.generateFrameNumbers('boss_clown_sheet', { frames: [2] }),
          frameRate: 1,
          repeat: 0
        });
      }
      if (!this.anims.exists('anim_boss_clown_attack')) {
        this.anims.create({
          key: 'anim_boss_clown_attack',
          frames: this.anims.generateFrameNumbers('boss_clown_sheet', { frames: [3] }),
          frameRate: 1,
          repeat: 0
        });
      }
      if (!this.anims.exists('anim_boss_clown_hit')) {
        this.anims.create({
          key: 'anim_boss_clown_hit',
          frames: this.anims.generateFrameNumbers('boss_clown_sheet', { frames: [4] }),
          frameRate: 1,
          repeat: 0
        });
      }
      if (!this.anims.exists('anim_boss_clown_rage')) {
        this.anims.create({
          key: 'anim_boss_clown_rage',
          frames: this.anims.generateFrameNumbers('boss_clown_sheet', { frames: [0, 1, 5] }),
          frameRate: 10,
          repeat: -1
        });
      }
    }

    // 5. Chefe 2: Tanque Mech Experimental
    if (this.textures.exists('boss_tank_sheet')) {
      if (!this.anims.exists('anim_boss_tank')) {
        this.anims.create({
          key: 'anim_boss_tank',
          frames: this.anims.generateFrameNumbers('boss_tank_sheet', { frames: [0, 1] }),
          frameRate: 6,
          repeat: -1
        });
      }
      if (!this.anims.exists('anim_boss_tank_prep')) {
        this.anims.create({
          key: 'anim_boss_tank_prep',
          frames: this.anims.generateFrameNumbers('boss_tank_sheet', { frames: [2] }),
          frameRate: 1,
          repeat: 0
        });
      }
      if (!this.anims.exists('anim_boss_tank_attack')) {
        this.anims.create({
          key: 'anim_boss_tank_attack',
          frames: this.anims.generateFrameNumbers('boss_tank_sheet', { frames: [3] }),
          frameRate: 1,
          repeat: 0
        });
      }
      if (!this.anims.exists('anim_boss_tank_hit')) {
        this.anims.create({
          key: 'anim_boss_tank_hit',
          frames: this.anims.generateFrameNumbers('boss_tank_sheet', { frames: [4] }),
          frameRate: 1,
          repeat: 0
        });
      }
      if (!this.anims.exists('anim_boss_tank_rage')) {
        this.anims.create({
          key: 'anim_boss_tank_rage',
          frames: this.anims.generateFrameNumbers('boss_tank_sheet', { frames: [0, 1, 5] }),
          frameRate: 10,
          repeat: -1
        });
      }
    }

    // 6. Chefe 3: Tetsuo Biomassa Psíquica
    if (this.textures.exists('boss_tetsuo_sheet')) {
      if (!this.anims.exists('anim_boss_tetsuo')) {
        this.anims.create({
          key: 'anim_boss_tetsuo',
          frames: this.anims.generateFrameNumbers('boss_tetsuo_sheet', { frames: [0, 1] }),
          frameRate: 5,
          repeat: -1
        });
      }
      if (!this.anims.exists('anim_boss_tetsuo_charge')) {
        this.anims.create({
          key: 'anim_boss_tetsuo_charge',
          frames: this.anims.generateFrameNumbers('boss_tetsuo_sheet', { frames: [2] }),
          frameRate: 1,
          repeat: 0
        });
      }
      if (!this.anims.exists('anim_boss_tetsuo_nova')) {
        this.anims.create({
          key: 'anim_boss_tetsuo_nova',
          frames: this.anims.generateFrameNumbers('boss_tetsuo_sheet', { frames: [3] }),
          frameRate: 1,
          repeat: 0
        });
      }
      if (!this.anims.exists('anim_boss_tetsuo_hit')) {
        this.anims.create({
          key: 'anim_boss_tetsuo_hit',
          frames: this.anims.generateFrameNumbers('boss_tetsuo_sheet', { frames: [4] }),
          frameRate: 1,
          repeat: 0
        });
      }
      if (!this.anims.exists('anim_boss_tetsuo_rage')) {
        this.anims.create({
          key: 'anim_boss_tetsuo_rage',
          frames: this.anims.generateFrameNumbers('boss_tetsuo_sheet', { frames: [0, 1, 5] }),
          frameRate: 8,
          repeat: -1
        });
      }
    }

    // 7. Efeito de Explosão Épica dos Chefões Anime
    if (this.textures.exists('boss_explosion_sheet') && !this.anims.exists('anim_boss_explosion')) {
      this.anims.create({
        key: 'anim_boss_explosion',
        frames: this.anims.generateFrameNumbers('boss_explosion_sheet', { start: 0, end: 7 }),
        frameRate: 14,
        repeat: 0
      });
    }

    // 8. Efeito de Impacto / Hit Spark Anime
    if (this.textures.exists('hit_spark_sheet') && !this.anims.exists('anim_hit_spark')) {
      this.anims.create({
        key: 'anim_hit_spark',
        frames: this.anims.generateFrameNumbers('hit_spark_sheet', { start: 0, end: 3 }),
        frameRate: 20,
        repeat: 0
      });
    }
  }
}
