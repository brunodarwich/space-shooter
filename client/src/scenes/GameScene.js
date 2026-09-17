import Phaser from 'phaser';
import { Storage } from '../services/storage.js';
import { SoundFX } from '../audio/SoundFX.js';
import { Api } from '../services/api.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.isRevived = data?.revived || false;
    this.inheritedScore = data?.score || 0;
    this.inheritedKills = data?.kills || 0;
  }

  create() {
    const { width, height } = this.scale;
    const playerStore = Storage.getData();

    // Estado do jogo
    this.score = this.inheritedScore;
    this.kills = this.inheritedKills;
    this.pillsCollected = 0;
    this.hp = 3;
    this.maxHp = 3;
    this.weaponLevel = 1;
    this.hasShield = this.isRevived;
    this.solGauge = 100; // Começa carregado
    this.solBombs = playerStore.solBombs || 1;
    this.speed = 100;
    this.isGameOver = false;
    this.bossActive = false;
    this.bossDefeatedCount = 0;
    this.invulnerable = this.isRevived;

    // Sistema de Parallax em 3 Camadas de Neo-Tokyo com Profundidade Suave
    this.bgSkyline = this.add.tileSprite(width / 2, height / 2, width, height, 'bg_skyline').setDepth(0).setAlpha(0.6);
    this.bgMid = this.add.tileSprite(width / 2, height / 2, width, height, 'bg_highway_mid').setDepth(1).setAlpha(0.65);
    this.bgRoad = this.add.tileSprite(width / 2, height / 2, width, height, 'bg_highway_road').setDepth(2);
    this.bg = this.bgRoad; // Compatibilidade com referências existentes

    // Rastro de Luz Neon da Moto (Akira Light Trail)
    this.lightTrail = [];
    this.trailGraphics = this.add.graphics().setDepth(3);

    // Sistema de Mira e Telegrafia Neon de Ataques Inimigos
    this.activeTelegraphs = [];
    this.telegraphGraphics = this.add.graphics().setDepth(4);

    // Indicadores Táticos de Ameaça e Sombras dos Inimigos (Identificação Imediata)
    this.enemyIndicatorGraphics = this.add.graphics().setDepth(6);

    // Grupos de Física
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.roadProps = this.physics.add.group();

    // Criação do Jogador (Kaneda em Perspectiva 2.5D com Spritesheet de Curva)
    this.selectedBikeSkin = playerStore.selectedBike || 'kaneda_red';
    const sheetKey = this.selectedBikeSkin === 'kaneda_gold' ? 'player_bike_gold_sheet' : 'player_bike_red_sheet';
    this.hasBikeSheet = this.textures.exists(sheetKey);
    const bikeTexture = this.hasBikeSheet
      ? sheetKey
      : (this.selectedBikeSkin === 'kaneda_gold' ? 'player_bike_gold' : 'player_bike_red');

    // Inicia no frame 1 (Centro/Neutro) com Escala Ampliada para Visualização de Arte (+35%)
    this.player = this.physics.add.sprite(width / 2, height - 140, bikeTexture, this.hasBikeSheet ? 1 : undefined);
    this.player.setScale(1.35);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(30, 56);
    this.player.setOffset(17, 18);
    this.player.setDepth(10);

    // Escudo visual ampliado
    this.shieldSprite = this.add.image(this.player.x, this.player.y, 'powerup_shield')
      .setDisplaySize(116, 116)
      .setDepth(12)
      .setVisible(this.hasShield);

    // Drones de Escolta ampliados
    this.drones = [
      this.add.image(this.player.x - 52, this.player.y + 12, 'escort_drone').setDisplaySize(42, 50).setDepth(9).setVisible(false),
      this.add.image(this.player.x + 52, this.player.y + 12, 'escort_drone').setDisplaySize(42, 50).setDepth(9).setVisible(false)
    ];

    // Controles (Teclado)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      sol: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B)
    };

    // Suporte a Mouse e Touch Drag no Mobile
    this.pointerIsDown = false;
    this.input.on('pointerdown', (pointer) => {
      // Ignora clique nos botões do HUD
      if (pointer.y > height - 100 && (pointer.x < 110 || pointer.x > width - 110)) return;
      this.pointerIsDown = true;
    });
    this.input.on('pointerup', () => this.pointerIsDown = false);
    this.input.on('pointerupoutside', () => this.pointerIsDown = false);
    this.sys.events.on('resume', () => {
      this.pointerIsDown = false;
    });

    // Timers de Disparo e Spawner
    this.lastShootTime = 0;
    this.shootInterval = 150; // ms

    this.time.addEvent({
      delay: 1400,
      callback: this.spawnEnemyWave,
      callbackScope: this,
      loop: true
    });

    // Spawner de Objetos e Destroços da Rodovia de Akira
    this.time.addEvent({
      delay: 1600,
      callback: this.spawnRoadProp,
      callbackScope: this,
      loop: true
    });

    // Colisões
    this.physics.add.overlap(this.playerBullets, this.enemies, this.handleBulletHitEnemy, null, this);
    this.physics.add.overlap(this.playerBullets, this.roadProps, (bullet, prop) => {
      if (prop.isDestructible) {
        this.createBulletImpact(bullet.x, bullet.y, bullet.texture?.key, bullet.damage > 1);
        bullet.destroy();
        prop.hp -= 1;
        prop.setTint(0xffffff);
        this.time.delayedCall(60, () => { if (prop.active) prop.clearTint(); });
        if (prop.hp <= 0) {
          this.createExplosion(prop.x, prop.y, 'small');
          this.score += prop.scoreValue || 50;
          this.showFloatingCombatText(prop.x, prop.y, `+${prop.scoreValue || 50} 💥`, '#fcee0a');
          this.updateHUD();
          prop.destroy();
        }
      }
    }, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.handlePlayerHit, null, this);
    this.physics.add.overlap(this.enemies, this.player, this.handlePlayerCrash, null, this);
    this.physics.add.overlap(this.pickups, this.player, this.handlePickup, null, this);

    // Criação do HUD Cyberpunk
    this.createHUD(width, height);

    // Se reviveu, pisca a moto
    if (this.isRevived) {
      this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        duration: 150,
        yoyo: true,
        repeat: 12,
        onComplete: () => {
          this.player.setAlpha(1);
          this.invulnerable = false;
        }
      });
    }

    // Inicia a música
    SoundFX.startBGM();
  }

  update(time, delta) {
    if (this.isGameOver) return;

    // Rolagem do Parallax em velocidades distintas (Sensação de Alta Velocidade)
    const baseSpeed = 8 + (this.speed / 20);
    if (this.bgSkyline) this.bgSkyline.tilePositionY -= baseSpeed * 0.22;
    if (this.bgMid) this.bgMid.tilePositionY -= baseSpeed * 0.70;
    if (this.bgRoad) this.bgRoad.tilePositionY -= baseSpeed;

    // Atualiza rolagem e limpeza dos objetos da rodovia (props urbanos de Akira)
    const propVy = baseSpeed * 58;
    this.roadProps.getChildren().forEach(prop => {
      if (!prop || !prop.active) return;
      prop.setVelocityY(propVy);
      if (prop.y > this.scale.height + 90) {
        prop.destroy();
      }
    });

    // Atualiza Rastro de Luz Neon da Moto (Akira Light Trail)
    this.updateLightTrail(time);

    // Atualiza Linhas de Mira e Telegrafia dos Inimigos
    this.updateTelegraphs(time);

    // Atualiza Indicadores Táticos Hostis e Sombras dos Inimigos (Diferenciação Nítida Inimigo vs Cenário)
    this.updateEnemyIndicators(time);

    // Atualiza Comportamentos Dinâmicos e Animações dos Inimigos
    this.updateEnemyBehaviors(time, delta);

    // Atualiza velocímetro do cockpit
    if (this.speedometerText && this.player && this.player.body) {
      const vx = Math.abs(this.player.body.velocity.x);
      const vy = Math.abs(this.player.body.velocity.y);
      const dynamicSpeed = Math.floor(180 + vy * 0.15 + vx * 0.12);
      this.speedometerText.setText(`${dynamicSpeed} KM/H`);
    }

    // Atualiza posição do escudo e drones
    if (this.shieldSprite && this.shieldSprite.visible) {
      this.shieldSprite.setPosition(this.player.x, this.player.y);
      this.shieldSprite.rotation += 0.05;
    }

    if (this.drones[0].visible) {
      this.drones[0].setPosition(this.player.x - 52, this.player.y + 12);
      this.drones[1].setPosition(this.player.x + 52, this.player.y + 12);
    }

    // Movimentação do Jogador
    this.handlePlayerMovement();

    // Disparo Automático / Contínuo
    if (time > this.lastShootTime + this.shootInterval) {
      this.firePlayerLaser();
      this.lastShootTime = time;
    }

    // Gatilho do Super Poder (SOL) pelo teclado (Tecla B ou Espaço)
    if (Phaser.Input.Keyboard.JustDown(this.wasd.sol) || Phaser.Input.Keyboard.JustDown(this.wasd.space)) {
      this.triggerSolLaser();
    }

    // Checagem de Spawner de Chefe
    this.checkBossTriggers();

    // Limpa projéteis fora da tela
    this.cleanupOffscreenObjects();
  }

  updateLightTrail(time) {
    if (!this.player || !this.player.active || this.isGameOver) {
      if (this.trailGraphics) this.trailGraphics.clear();
      return;
    }

    const tailX = this.player.x;
    const tailY = this.player.y + 46; // Posição exata da lanterna traseira da moto ampliada
    const now = time;
    this.lightTrail.unshift({ x: tailX, y: tailY, time: now });

    // Mantém pontos dos últimos 380ms
    while (this.lightTrail.length > 0 && now - this.lightTrail[this.lightTrail.length - 1].time > 380) {
      this.lightTrail.pop();
    }

    this.trailGraphics.clear();
    if (this.lightTrail.length > 1) {
      const isGold = this.selectedBikeSkin === 'kaneda_gold';
      const trailColor = isGold ? 0xb026ff : 0xff003c;

      for (let i = 0; i < this.lightTrail.length - 1; i++) {
        const p1 = this.lightTrail[i];
        const p2 = this.lightTrail[i + 1];
        const ageRatio = Math.max(0, 1 - (now - p1.time) / 380);
        const alpha = ageRatio;
        const ribbonWidth = Math.max(1.5, 12 * ageRatio);

        // 1. Brilho externo difuso de néon
        this.trailGraphics.lineStyle(ribbonWidth + 8, trailColor, alpha * 0.35);
        this.trailGraphics.lineBetween(p1.x, p1.y, p2.x, p2.y);

        // 2. Faixa intensa de cor de laser
        this.trailGraphics.lineStyle(ribbonWidth, trailColor, alpha * 0.85);
        this.trailGraphics.lineBetween(p1.x, p1.y, p2.x, p2.y);

        // 3. Núcleo branco incandescente de energia pura
        this.trailGraphics.lineStyle(Math.max(1, ribbonWidth * 0.35), 0xffffff, alpha * 0.95);
        this.trailGraphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
      }
    }
  }

  handlePlayerMovement() {
    const speed = 360;
    this.player.setVelocity(0, 0);

    let turning = 0; // -1: esquerda, 0: centro, 1: direita

    // Teclado
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.player.setVelocityX(-speed);
      turning = -1;
      if (Math.random() < 0.25) this.emitTireSparks(this.player.x + 8, this.player.y + 36);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.player.setVelocityX(speed);
      turning = 1;
      if (Math.random() < 0.25) this.emitTireSparks(this.player.x - 8, this.player.y + 36);
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      this.player.setVelocityY(speed);
    }

    // Mouse / Touch Follow suave com velocidade constante
    if (this.pointerIsDown) {
      const pointer = this.input.activePointer;
      const targetX = pointer.x;
      const targetY = pointer.y - 40; // Leve offset acima do dedo para visualização limpa

      const dx = targetX - this.player.x;
      const dy = targetY - this.player.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 8) {
        const moveSpeed = Math.min(speed, dist * 10);
        const vx = (dx / dist) * moveSpeed;
        const vy = (dy / dist) * moveSpeed;
        this.player.setVelocity(vx, vy);

        if (dx > 12) turning = 1;
        else if (dx < -12) turning = -1;
        else turning = 0;

        if (Math.abs(dx) > 20 && Math.random() < 0.25) {
          this.emitTireSparks(this.player.x, this.player.y + 36);
        }
      }
    }

    // Atualiza frame do spritesheet (0: esquerda, 1: centro, 2: direita)
    if (this.hasBikeSheet) {
      const targetFrame = turning === -1 ? 0 : (turning === 1 ? 2 : 1);
      this.player.setFrame(targetFrame);
      // Leve inclinação angular sutil (-4° / +4°) para reforçar a física de banking
      this.player.setAngle(turning * 4);
    } else {
      this.player.setAngle(turning * 8);
    }
  }

  emitTireSparks(x, y) {
    const p = this.add.image(x + Phaser.Math.Between(-4, 4), y, 'particle_yellow')
      .setScale(Phaser.Math.FloatBetween(0.6, 1.1))
      .setDepth(4);

    this.tweens.add({
      targets: p,
      x: x + Phaser.Math.Between(-20, 20),
      y: y + Phaser.Math.Between(15, 35),
      alpha: 0,
      scale: 0.2,
      duration: 220,
      onComplete: () => p.destroy()
    });
  }

  firePlayerLaser() {
    const x = this.player.x;
    const y = this.player.y - 30;
    const bulletSpeed = -750;

    switch (this.weaponLevel) {
      case 1:
        this.spawnPlayerBullet(x, y, 0, bulletSpeed, 'laser_red');
        SoundFX.laser(880);
        break;
      case 2:
        this.spawnPlayerBullet(x - 12, y, 0, bulletSpeed, 'laser_red');
        this.spawnPlayerBullet(x + 12, y, 0, bulletSpeed, 'laser_red');
        SoundFX.laser(960);
        break;
      case 3:
        this.spawnPlayerBullet(x, y - 4, 0, bulletSpeed, 'laser_cyan');
        this.spawnPlayerBullet(x - 16, y, -140, bulletSpeed, 'laser_red');
        this.spawnPlayerBullet(x + 16, y, 140, bulletSpeed, 'laser_red');
        SoundFX.heavyLaser();
        break;
      case 4:
        this.spawnPlayerBullet(x - 14, y, -80, bulletSpeed, 'laser_cyan');
        this.spawnPlayerBullet(x + 14, y, 80, bulletSpeed, 'laser_cyan');
        this.spawnPlayerBullet(x - 28, y + 10, -180, bulletSpeed, 'laser_red');
        this.spawnPlayerBullet(x + 28, y + 10, 180, bulletSpeed, 'laser_red');
        SoundFX.heavyLaser();
        break;
      default: // Nível 5 (Máximo com Drones)
        this.spawnPlayerBullet(x - 10, y - 6, 0, bulletSpeed - 100, 'laser_cyan');
        this.spawnPlayerBullet(x + 10, y - 6, 0, bulletSpeed - 100, 'laser_cyan');
        this.spawnPlayerBullet(x - 24, y, -120, bulletSpeed, 'laser_red');
        this.spawnPlayerBullet(x + 24, y, 120, bulletSpeed, 'laser_red');
        // Tiros dos Drones laterais
        this.spawnPlayerBullet(x - 42, y + 10, -50, bulletSpeed, 'laser_red');
        this.spawnPlayerBullet(x + 42, y + 10, 50, bulletSpeed, 'laser_red');
        SoundFX.heavyLaser();
        break;
    }
  }

  spawnPlayerBullet(x, y, vx, vy, texture) {
    const bullet = this.playerBullets.create(x, y, texture);
    bullet.setScale(1.35);
    bullet.setVelocity(vx, vy);
    bullet.setSize(10, 24);
    bullet.setDepth(9);
    bullet.damage = texture === 'laser_cyan' ? 2 : 1;
  }

  // Spawner de Objetos e Destroços Urbanos da Rodovia (Inspirados no Anime Akira)
  spawnRoadProp() {
    if (this.isGameOver) return;
    const { width } = this.scale;
    const baseSpeed = 8 + (this.speed / 20);
    const propVy = baseSpeed * 58;

    const propTypes = [
      { key: 'prop_drum_hazard', destructible: true, hp: 2, score: 50, depth: 3 },
      { key: 'prop_cone_neon', destructible: true, hp: 1, score: 25, depth: 3 },
      { key: 'prop_barrier_jersey', destructible: true, hp: 3, score: 75, depth: 3 },
      { key: 'prop_wreck_bike', destructible: true, hp: 4, score: 100, depth: 3 }
    ];

    // 22% de chance de Pórtico Aéreo com sinalização japonesa atravessando por cima da rodovia
    if (Math.random() < 0.22) {
      const gantry = this.roadProps.create(width / 2, -60, 'prop_overpass_gantry');
      gantry.setDepth(15); // Passa por cima da moto e dos inimigos criando efeito cinematográfico
      gantry.setAlpha(0.6); // Semitransparência para nunca ofuscar os tiros ou o combate
      gantry.setScale(1.2);
      gantry.setVelocityY(propVy);
      gantry.isDestructible = false;
      return;
    }

    // Objetos estritamente no acostamento/margens da pista (fora das faixas de combate)
    const choice = Phaser.Math.Between(0, propTypes.length - 1);
    const cfg = propTypes[choice];
    const onLeft = Math.random() < 0.5;
    const posX = onLeft ? Phaser.Math.Between(18, 38) : Phaser.Math.Between(502, 522);

    const prop = this.roadProps.create(posX, -40, cfg.key);
    prop.setDepth(cfg.depth);
    prop.setScale(1.35);
    prop.setVelocityY(propVy);
    prop.isDestructible = cfg.destructible;
    prop.hp = cfg.hp;
    prop.scoreValue = cfg.score;
  }

  // Indicadores Táticos de Ameaça, Sombras e Barras de Vida dos Inimigos
  updateEnemyIndicators(time) {
    if (!this.enemyIndicatorGraphics) return;
    this.enemyIndicatorGraphics.clear();
    if (this.isGameOver) return;

    const pulse = Math.sin(time * 0.008) * 0.25;

    this.enemies.getChildren().forEach(enemy => {
      if (!enemy || !enemy.active) return;

      const w = enemy.displayWidth || enemy.width || 40;
      const h = enemy.displayHeight || enemy.height || 40;
      const shadowY = enemy.y + h * 0.38;

      // 1. Sombra suave de contato no asfalto (Perspectiva 2.5D de elevação)
      this.enemyIndicatorGraphics.fillStyle(0x000000, 0.45);
      this.enemyIndicatorGraphics.fillEllipse(enemy.x, shadowY, Math.max(24, w * 0.75), 10);

      // 2. Indicador Tático de Hostilidade (Aura / Retículo Vermelho Neon sob o Inimigo)
      if (!enemy.isBoss) {
        // Anel de mira neon vermelho suave indicando unidade hostil
        this.enemyIndicatorGraphics.lineStyle(1.5, 0xff003c, 0.55 + pulse);
        this.enemyIndicatorGraphics.strokeEllipse(enemy.x, shadowY, Math.max(28, w * 0.85), 12);

        // Marcadores de mira cibernéticos (chevrons laterais discretos)
        const markerW = w * 0.55;
        this.enemyIndicatorGraphics.lineStyle(1.5, 0xff003c, 0.75 + pulse);
        this.enemyIndicatorGraphics.lineBetween(enemy.x - markerW - 4, shadowY - 4, enemy.x - markerW, shadowY);
        this.enemyIndicatorGraphics.lineBetween(enemy.x - markerW, shadowY, enemy.x - markerW - 4, shadowY + 4);
        this.enemyIndicatorGraphics.lineBetween(enemy.x + markerW + 4, shadowY - 4, enemy.x + markerW, shadowY);
        this.enemyIndicatorGraphics.lineBetween(enemy.x + markerW, shadowY, enemy.x + markerW + 4, shadowY + 4);
      }

      // 3. Mini Barra de Vida para Inimigos que aguentam múltiplos tiros (interceptor, heli, etc.)
      const maxHp = enemy.maxHp || (enemy.enemyType === 'interceptor' ? 5 : (enemy.enemyType === 'heli' ? 9 : 2));
      if (!enemy.isBoss && maxHp > 1 && (enemy.hp < maxHp || enemy.enemyType === 'heli' || enemy.enemyType === 'interceptor')) {
        const barW = Math.min(48, Math.max(28, w * 0.7));
        const barH = 3;
        const barX = enemy.x - barW / 2;
        const barY = enemy.y - h * 0.5 - 7;
        const hpRatio = Math.max(0, Math.min(1, enemy.hp / maxHp));

        // Fundo da barra
        this.enemyIndicatorGraphics.fillStyle(0x0a0c16, 0.85);
        this.enemyIndicatorGraphics.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        this.enemyIndicatorGraphics.lineStyle(1, 0x334466, 0.8);
        this.enemyIndicatorGraphics.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // Preenchimento de HP (Vermelho/Laranja/Ciano conforme vida)
        const hpColor = hpRatio > 0.5 ? 0xff003c : (hpRatio > 0.25 ? 0xff6600 : 0xfcee0a);
        this.enemyIndicatorGraphics.fillStyle(hpColor, 0.95);
        this.enemyIndicatorGraphics.fillRect(barX, barY, barW * hpRatio, barH);
      }
    });
  }

  // Sistema de Telegrafia e Avisos Visuais de Ataques
  addTelegraphLine(x1, y1, x2, y2, duration = 600, color = 0xff003c, width = 2) {
    const expireTime = this.time.now + duration;
    this.activeTelegraphs.push({
      type: 'line',
      x1, y1, x2, y2,
      duration,
      startTime: this.time.now,
      expireTime,
      color,
      width
    });
    SoundFX.telegraphWarning();
  }

  addTelegraphCircle(x, y, radius, duration = 700, color = 0xb026ff) {
    const expireTime = this.time.now + duration;
    this.activeTelegraphs.push({
      type: 'circle',
      x, y, radius,
      duration,
      startTime: this.time.now,
      expireTime,
      color
    });
    SoundFX.telegraphWarning();
  }

  updateTelegraphs(time) {
    if (!this.telegraphGraphics) return;
    this.telegraphGraphics.clear();
    const now = time;
    this.activeTelegraphs = this.activeTelegraphs.filter(t => t.expireTime > now);

    this.activeTelegraphs.forEach(t => {
      const progress = Math.min(1, (now - t.startTime) / t.duration);
      const pulse = 0.5 + Math.sin(now * 0.03) * 0.5;
      const alpha = Math.min(1, 0.4 + pulse * 0.6);

      if (t.type === 'line') {
        // Brilho difuso exterior
        this.telegraphGraphics.lineStyle(t.width + 4, t.color, alpha * 0.35);
        this.telegraphGraphics.lineBetween(t.x1, t.y1, t.x2, t.y2);

        // Linha central incandescente
        this.telegraphGraphics.lineStyle(t.width, 0xffffff, alpha * 0.9);
        this.telegraphGraphics.lineBetween(t.x1, t.y1, t.x2, t.y2);

        // Mira animada no ponto de destino
        this.telegraphGraphics.fillStyle(t.color, alpha);
        this.telegraphGraphics.fillCircle(t.x2, t.y2, 4 + pulse * 2);
        this.telegraphGraphics.strokeCircle(t.x2, t.y2, 10 + pulse * 4);
      } else if (t.type === 'circle') {
        const curR = t.radius * (0.3 + progress * 0.7);
        this.telegraphGraphics.lineStyle(3, t.color, alpha * 0.85);
        this.telegraphGraphics.strokeCircle(t.x, t.y, curR);
        this.telegraphGraphics.fillStyle(t.color, alpha * 0.2);
        this.telegraphGraphics.fillCircle(t.x, t.y, curR);
      }
    });
  }

  // Atualização em tempo real do comportamento dos inimigos
  updateEnemyBehaviors(time, delta) {
    if (this.isGameOver) return;

    this.enemies.getChildren().forEach(enemy => {
      if (!enemy || !enemy.active) return;

      // 1. Biker: Zigue-zague senoidal, banking dinâmico nos frames e fagulhas nas curvas
      if (enemy.enemyType === 'biker') {
        const targetX = enemy.baseX + Math.sin(time * enemy.freq + enemy.phase) * enemy.amplitude;
        const dx = targetX - enemy.x;
        enemy.setVelocityX(dx * 8);

        if (enemy.hasSheet) {
          if (dx < -3.5) {
            enemy.setFrame(0); // Banking esquerda
            if (Math.random() < 0.15) this.emitTireSparks(enemy.x + 8, enemy.y + 24);
          } else if (dx > 3.5) {
            enemy.setFrame(3); // Banking direita
            if (Math.random() < 0.15) this.emitTireSparks(enemy.x - 8, enemy.y + 24);
          } else {
            if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== 'anim_enemy_biker_cruise') {
              enemy.play('anim_enemy_biker_cruise', true);
            }
          }
        }
      }

      // 2. Interceptor: Fagulhas de nitro durante a investida turbo
      else if (enemy.enemyType === 'interceptor') {
        if (enemy.isDashing && Math.random() < 0.35) {
          this.emitTireSparks(enemy.x + Phaser.Math.Between(-10, 10), enemy.y - 8);
        }
      }

      // 3. Helicóptero: Estabilização de voo e perseguição lateral suave
      else if (enemy.enemyType === 'heli') {
        if (enemy.isHovering && this.player && this.player.active) {
          const diffX = this.player.x - enemy.x;
          enemy.setVelocityX(Phaser.Math.Clamp(diffX * 1.6, -130, 130));
        }
      }

      // 4. Chefões: Movimentação Dinâmica, Inclinação e Efeitos de Sobrecarga
      else if (enemy.isBoss) {
        // Chefe 1: Clown Rig (Inclinação de direção e fumaça na fase 2)
        if (enemy.bossType === 'boss_clown') {
          const vx = (enemy.x - (enemy.lastX || enemy.x)) / (delta || 16);
          enemy.lastX = enemy.x;
          enemy.setAngle(Phaser.Math.Clamp(vx * 6, -8, 8));

          if (enemy.phase2Active && Math.random() < 0.25) {
            this.emitBossDamageSmoke(enemy.x + Phaser.Math.Between(-40, 40), enemy.y + Phaser.Math.Between(-30, 30));
          }
        }
        // Chefe 2: Tank Mech (Vibração sutil de esteiras e faíscas no reator superaquecido)
        else if (enemy.bossType === 'boss_tank') {
          const vx = (enemy.x - (enemy.lastX || enemy.x)) / (delta || 16);
          enemy.lastX = enemy.x;
          enemy.setAngle(Phaser.Math.Clamp(vx * 4, -4, 4));

          if (enemy.phase2Active && Math.random() < 0.3) {
            this.emitBossDamageSmoke(enemy.x + Phaser.Math.Between(-45, 45), enemy.y + Phaser.Math.Between(-20, 40));
          }
        }
        // Chefe 3: Tetsuo (Flutuação senoidal contínua em curva de Lissajous + pulso psíquico de escala)
        else if (enemy.bossType === 'boss_tetsuo' && enemy.isHovering) {
          const t = time * 0.0018;
          const targetX = (this.scale.width / 2) + Math.sin(t) * 140;
          const targetY = 175 + Math.sin(t * 2) * 35;
          enemy.setPosition(targetX, targetY);

          // Pulsação orgânica biomórfica de escala
          const scaleMod = 1.3 + Math.sin(time * 0.004) * 0.04;
          enemy.setScale(scaleMod);

          if (enemy.phase2Active && Math.random() < 0.35) {
            const p = this.add.image(enemy.x + Phaser.Math.Between(-50, 50), enemy.y + Phaser.Math.Between(-50, 50), 'particle_spark_cyan')
              .setDepth(9)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setScale(Phaser.Math.FloatBetween(0.8, 1.4));
            this.tweens.add({
              targets: p,
              y: p.y - Phaser.Math.Between(20, 50),
              alpha: 0,
              scale: 0.1,
              duration: 350,
              onComplete: () => p.destroy()
            });
          }
        }
      }
    });
  }

  // Fumaça de avaria e curto-circuito na carcaça do chefe danificado
  emitBossDamageSmoke(x, y) {
    const smoke = this.add.image(x, y, 'fx_smoke')
      .setDepth(9)
      .setAlpha(0.7)
      .setScale(0.4);

    this.tweens.add({
      targets: smoke,
      x: x + Phaser.Math.Between(-15, 15),
      y: y - Phaser.Math.Between(25, 55),
      scaleX: 1.1,
      scaleY: 1.1,
      alpha: 0,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => smoke.destroy()
    });

    if (Math.random() < 0.4) {
      const spark = this.add.image(x, y, 'particle_yellow')
        .setDepth(10)
        .setScale(0.8);
      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-25, 25),
        y: y + Phaser.Math.Between(-15, 25),
        alpha: 0,
        duration: 200,
        onComplete: () => spark.destroy()
      });
    }
  }

  spawnEnemyWave() {
    if (this.bossActive || this.isGameOver) return;

    const { width } = this.scale;
    const waveType = Phaser.Math.Between(1, 3);

    if (waveType === 1) {
      // Esquadrão em V de Motos Biker Clowns Animadas com Banking
      const startX = Phaser.Math.Between(110, width - 110);
      const sheetKey = this.textures.exists('enemy_biker_sheet') ? 'enemy_biker_sheet' : 'enemy_biker';
      const hasSheet = sheetKey === 'enemy_biker_sheet';

      for (let i = 0; i < 3; i++) {
        const offset = (i - 1) * 52;
        const enemy = this.enemies.create(startX + offset, -45 - Math.abs(offset), sheetKey, hasSheet ? 1 : undefined);
        enemy.setScale(1.35);
        enemy.setSize(34, 52);
        enemy.setOffset(7, 6);
        enemy.setDepth(7);
        enemy.hp = 2;
        enemy.maxHp = 2;
        enemy.scoreValue = 120;
        enemy.enemyType = 'biker';
        enemy.hasSheet = hasSheet;
        enemy.baseX = startX + offset;
        enemy.phase = i * 1.3 + Math.random();
        enemy.amplitude = Phaser.Math.Between(45, 75);
        enemy.freq = 0.0035;
        enemy.setVelocityY(210);
        enemy.customTimers = [];

        if (hasSheet) {
          enemy.play('anim_enemy_biker_cruise');
        }

        // Disparos duplos ritmados
        const timer = this.time.addEvent({
          delay: 1100,
          callback: () => {
            if (!enemy.active || this.isGameOver) return;
            this.fireEnemyBulletDual(enemy);
          },
          loop: true
        });
        enemy.shootTimer = timer;
        enemy.customTimers.push(timer);
      }
    } else if (waveType === 2) {
      // Viatura Interceptor com Sirenes Animadas e Investida Turbo Telegrafada
      const sheetKey = this.textures.exists('enemy_interceptor_sheet') ? 'enemy_interceptor_sheet' : 'enemy_interceptor';
      const hasSheet = sheetKey === 'enemy_interceptor_sheet';
      const enemy = this.enemies.create(Phaser.Math.Between(90, width - 90), -55, sheetKey, hasSheet ? 0 : undefined);
      enemy.setScale(1.35);
      enemy.setSize(42, 56);
      enemy.setOffset(6, 4);
      enemy.setDepth(7);
      enemy.hp = 5;
      enemy.maxHp = 5;
      enemy.scoreValue = 280;
      enemy.enemyType = 'interceptor';
      enemy.hasSheet = hasSheet;
      enemy.isDashing = false;
      enemy.setVelocity(Phaser.Math.Between(-30, 30), 160);
      enemy.customTimers = [];

      if (hasSheet) {
        enemy.play('anim_enemy_interceptor');
      }

      // Ciclo: Patrulha -> Telegrafa Linha Vermelha -> Investida Turbo com Disparos Duplos
      const dashEvent = this.time.addEvent({
        delay: 2400,
        callback: () => {
          if (!enemy.active || this.isGameOver || !this.player || !this.player.active) return;

          const targetX = this.player.x;
          const targetY = this.player.y;
          this.addTelegraphLine(enemy.x, enemy.y, targetX, targetY, 600, 0xff003c, 3);
          enemy.setTint(0xff5555);

          const execTimer = this.time.delayedCall(600, () => {
            if (!enemy.active || this.isGameOver) return;
            enemy.clearTint();
            enemy.isDashing = true;

            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
            const speed = 400;
            enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

            this.fireEnemyBulletOffset(enemy, -16, 24);
            this.fireEnemyBulletOffset(enemy, 16, 24);

            const resetTimer = this.time.delayedCall(1000, () => {
              if (enemy.active) {
                enemy.isDashing = false;
                enemy.setVelocity(Phaser.Math.Between(-40, 40), 180);
              }
            });
            enemy.customTimers.push(resetTimer);
          });
          enemy.customTimers.push(execTimer);
        },
        loop: true
      });
      enemy.shootTimer = dashEvent;
      enemy.customTimers.push(dashEvent);
    } else if (waveType === 3) {
      // Helicóptero Militar Pesado com Hélices Animadas e Rajada Gatling Telegrafada
      const sheetKey = this.textures.exists('enemy_heli_sheet') ? 'enemy_heli_sheet' : 'enemy_heli';
      const hasSheet = sheetKey === 'enemy_heli_sheet';
      const startX = Phaser.Math.Between(100, width - 100);
      const enemy = this.enemies.create(startX, -65, sheetKey, hasSheet ? 0 : undefined);
      enemy.setScale(1.35);
      enemy.setSize(52, 52);
      enemy.setOffset(6, 6);
      enemy.setDepth(7);
      enemy.hp = 9;
      enemy.maxHp = 9;
      enemy.scoreValue = 450;
      enemy.enemyType = 'heli';
      enemy.hasSheet = hasSheet;
      enemy.isHovering = false;
      enemy.burstCount = 0;
      enemy.customTimers = [];

      if (hasSheet) {
        enemy.play('anim_enemy_heli');
      }

      // Desce até altitude de combate (y = 150..220) e começa a pairar
      const targetHoverY = Phaser.Math.Between(130, 210);
      enemy.setVelocity(0, 150);

      const hoverCheck = this.time.addEvent({
        delay: 100,
        callback: () => {
          if (!enemy.active) return;
          if (enemy.y >= targetHoverY && !enemy.isHovering) {
            enemy.isHovering = true;
            enemy.setVelocityY(0);
          }
        },
        repeat: 30
      });
      enemy.customTimers.push(hoverCheck);

      // Rotina de Tiro: Farol Ciano Telegrafado -> Rajada Gatling de 5 tiros rápidos
      const attackTimer = this.time.addEvent({
        delay: 2500,
        callback: () => {
          if (!enemy.active || this.isGameOver || !this.player || !this.player.active) return;

          const px = this.player.x;
          const py = this.player.y;
          this.addTelegraphLine(enemy.x, enemy.y + 16, px, py, 500, 0x00f0ff, 2);

          const burstTimer = this.time.delayedCall(500, () => {
            if (!enemy.active || this.isGameOver) return;
            for (let b = 0; b < 5; b++) {
              const shotTimer = this.time.delayedCall(b * 75, () => {
                if (!enemy.active || this.isGameOver) return;
                const bullet = this.enemyBullets.create(enemy.x, enemy.y + 24, 'bullet_enemy');
                bullet.setDepth(8);
                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, px + (b - 2) * 10, py);
                const spd = 290;
                bullet.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
              });
              enemy.customTimers.push(shotTimer);
            }

            enemy.burstCount++;
            if (enemy.burstCount >= 3) {
              enemy.isHovering = false;
              enemy.setVelocity(0, 180);
            }
          });
          enemy.customTimers.push(burstTimer);
        },
        loop: true
      });
      enemy.shootTimer = attackTimer;
      enemy.customTimers.push(attackTimer);
    }
  }

  fireEnemyBullet(enemy) {
    if (!enemy.active || this.isGameOver || !this.player || !this.player.active) return;
    const bullet = this.enemyBullets.create(enemy.x, enemy.y + 20, 'bullet_enemy');
    bullet.setScale(1.35);
    bullet.setDepth(8);
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const speed = 260;
    bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  fireEnemyBulletDual(enemy) {
    if (!enemy.active || this.isGameOver || !this.player || !this.player.active) return;
    const offsets = [-12, 12];
    offsets.forEach(ox => {
      const bullet = this.enemyBullets.create(enemy.x + ox, enemy.y + 20, 'bullet_enemy');
      bullet.setScale(1.35);
      bullet.setDepth(8);
      const angle = Phaser.Math.Angle.Between(enemy.x + ox, enemy.y + 20, this.player.x, this.player.y);
      const speed = 250;
      bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    });
  }

  fireEnemyBulletOffset(enemy, ox, oy) {
    if (!enemy.active || this.isGameOver) return;
    const bullet = this.enemyBullets.create(enemy.x + ox, enemy.y + oy, 'bullet_enemy');
    bullet.setScale(1.35);
    bullet.setDepth(8);
    bullet.setVelocity(0, 310);
  }

  fireEnemyBulletSpread(enemy) {
    if (!enemy.active || this.isGameOver) return;
    const angles = [-0.3, 0, 0.3];
    angles.forEach(offset => {
      const bullet = this.enemyBullets.create(enemy.x, enemy.y + 20, 'bullet_enemy');
      bullet.setScale(1.35);
      bullet.setDepth(8);
      const baseAngle = Math.PI / 2 + offset;
      bullet.setVelocity(Math.cos(baseAngle) * 240, Math.sin(baseAngle) * 240);
    });
  }

  fireRingOfBullets(centerX, centerY, count = 8, speed = 190) {
    if (this.isGameOver) return;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const b = this.enemyBullets.create(centerX, centerY, 'bullet_enemy');
      b.setScale(1.35);
      b.setDepth(8);
      b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  // Lógica dos Chefões Neo-Tokyo
  checkBossTriggers() {
    if (this.bossActive) return;

    if (this.score >= 5000 && this.bossDefeatedCount === 0) {
      this.spawnBoss('boss_clown', 'LÍDER DOS CLOWNS', 70);
    } else if (this.score >= 15000 && this.bossDefeatedCount === 1) {
      this.spawnBoss('boss_tank', 'TANQUE ANDANTE EXPERIMENTAL', 140);
    } else if (this.score >= 30000 && this.bossDefeatedCount === 2) {
      this.spawnBoss('boss_tetsuo', 'TETSUO: MUTAÇÃO PSÍQUICA', 260);
    }
  }

  // Alerta Cinematográfico de Chefe em Tela Cheia com Invulnerabilidade
  showFullScreenBossWarning(bossName, onComplete) {
    const { width, height } = this.scale;

    // 1. Limpa balas inimigas e telegrafias existentes para uma transição limpa
    this.enemyBullets.clear(true, true);
    this.activeTelegraphs = [];
    if (this.telegraphGraphics) this.telegraphGraphics.clear();

    // 2. Destrói inimigos comuns restantes na pista
    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.isBoss) {
        enemy.destroy();
      }
    });

    // 3. Invulnerabilidade do jogador com indicador luminoso
    this.invulnerable = true;
    if (this.player) {
      this.player.setTint(0x00f0ff);
    }

    // 4. Som e Efeito dramático de alerta
    SoundFX.bossWarning();
    this.cameras.main.shake(1800, 0.005);
    this.cameras.main.flash(350, 255, 0, 60);

    // 5. Container de Alerta em Tela Cheia (Profundidade 200)
    const alertContainer = this.add.container(0, 0).setDepth(200);

    // Fundo escuro translúcido para focar a atenção
    const bgOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x050612, 0.85);

    // Faixas de Perigo Superior e Inferior
    const topBar = this.add.rectangle(width / 2, 44, width, 38, 0x1a050e).setStrokeStyle(1.5, 0xff003c);
    const topText = this.add.text(width / 2, 44, '/// ALERTA TÁTICO MÁXIMO // NÍVEL CRÍTICO ///', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '11px',
      letterSpacing: 2,
      color: '#ff003c'
    }).setOrigin(0.5);

    const btmBar = this.add.rectangle(width / 2, height - 48, width, 38, 0x1a050e).setStrokeStyle(1.5, 0xff003c);
    const btmText = this.add.text(width / 2, height - 48, '/// SISTEMA DE INTERCEPTAÇÃO HOSTIL ATIVADO ///', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '11px',
      letterSpacing: 2,
      color: '#ff003c'
    }).setOrigin(0.5);

    // Caixa de Destaque Central Holográfica
    const centerBox = this.add.rectangle(width / 2, height / 2 - 30, width - 40, 160, 0x0c0616, 0.92)
      .setStrokeStyle(2, 0xff003c);

    const warnTag = this.add.text(width / 2, height / 2 - 82, '⚠ APROXIMAÇÃO DE CHEFÃO ⚠', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fcee0a'
    }).setOrigin(0.5);

    const bossTitle = this.add.text(width / 2, height / 2 - 38, bossName.toUpperCase(), {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      align: 'center',
      color: '#ffffff',
      stroke: '#ff003c',
      strokeThickness: 3
    }).setOrigin(0.5);

    const kanjiSub = this.add.text(width / 2, height / 2 + 2, 'ネオ東京 // 侵入者迎撃シークエンス', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      letterSpacing: 3,
      color: '#ff0055'
    }).setOrigin(0.5);

    const statusCountdown = this.add.text(width / 2, height / 2 + 28, 'INICIANDO COMBATE EM INSTANTES...', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '10px',
      color: '#00f0ff'
    }).setOrigin(0.5);

    alertContainer.add([bgOverlay, topBar, topText, btmBar, btmText, centerBox, warnTag, bossTitle, kanjiSub, statusCountdown]);

    // Animação de pulso e sirene visual do alerta
    this.tweens.add({
      targets: [warnTag, centerBox],
      alpha: 0.65,
      duration: 250,
      yoyo: true,
      repeat: 4
    });

    // Duração do alerta: 2.5s antes de entrar no combate real
    this.time.delayedCall(2500, () => {
      this.tweens.add({
        targets: alertContainer,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          alertContainer.destroy();
          if (this.player && this.player.active) {
            this.player.clearTint();
            this.invulnerable = false;
          }
          if (onComplete) onComplete();
        }
      });
    });
  }

  spawnBoss(bossType, bossName, maxHp) {
    this.bossActive = true;
    const { width } = this.scale;

    // Dispara o alerta cinematográfico em tela cheia (2.5s) com imunidade e sem o chefe em tela
    this.showFullScreenBossWarning(bossName, () => {
      if (this.isGameOver) return;

      const sheetKey = bossType + '_sheet';
      const hasSheet = this.textures.exists(sheetKey);
      const texture = hasSheet ? sheetKey : bossType;

      this.boss = this.physics.add.sprite(width / 2, -120, texture, hasSheet ? 0 : undefined);
      this.boss.setScale(1.3);
      this.boss.setDepth(8);
      this.boss.maxHp = maxHp;
      this.boss.hp = maxHp;
      this.boss.isBoss = true;
      this.boss.name = bossName;
      this.boss.bossType = bossType;
      this.boss.hasSheet = hasSheet;
      this.boss.phase2Active = false;
      this.boss.customTimers = [];
      this.enemies.add(this.boss);

      if (hasSheet) {
        const animKey = 'anim_' + bossType;
        if (this.anims.exists(animKey)) {
          this.boss.play(animKey);
        }
      }

      this.tweens.add({
        targets: this.boss,
        y: 175,
        duration: 1800,
        ease: 'Power2',
        onComplete: () => {
          this.startBossBehavior(bossType);
        }
      });

      this.createBossHealthBar(bossName, maxHp);
    });
  }

  createBossHealthBar(name, maxHp) {
    const { width } = this.scale;
    this.bossHpContainer = this.add.container(width / 2, 70);
    const bg = this.add.rectangle(0, 0, 340, 16, 0x111122).setStrokeStyle(1.5, 0xff003c);
    this.bossHpBar = this.add.rectangle(-168, 0, 336, 12, 0xff003c).setOrigin(0, 0.5);
    const title = this.add.text(0, -18, `CHEFE: ${name}`, {
      fontFamily: 'Orbitron',
      fontSize: '11px',
      color: '#ff003c'
    }).setOrigin(0.5);

    this.bossHpContainer.add([bg, this.bossHpBar, title]);
  }

  startBossBehavior(bossType) {
    if (!this.boss || !this.boss.active) return;

    if (bossType === 'boss_clown') {
      this.startClownBehavior();
    } else if (bossType === 'boss_tank') {
      this.startTankBehavior();
    } else if (bossType === 'boss_tetsuo') {
      this.startTetsuoBehavior();
    }
  }

  // Comportamento do Chefe 1: Clown Assault Rig
  startClownBehavior() {
    this.bossMovementTween = this.tweens.add({
      targets: this.boss,
      x: { from: 110, to: this.scale.width - 110 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Canhões pesados alternados com animação de preparação e recuo
    let altGun = 0;
    this.bossAttackTimer = this.time.addEvent({
      delay: 850,
      callback: () => {
        if (!this.boss || !this.boss.active || this.isGameOver || this.boss.isDying) return;
        
        // 1. Windup / Preparação do canhão
        if (this.anims.exists('anim_boss_clown_prep') && !this.boss.phase2Active) {
          this.boss.play('anim_boss_clown_prep');
        }

        this.time.delayedCall(120, () => {
          if (!this.boss || !this.boss.active || this.isGameOver || this.boss.isDying) return;

          // 2. Disparo com Recuo Físico e Muzzle Flash Animado
          if (this.anims.exists('anim_boss_clown_attack') && !this.boss.phase2Active) {
            this.boss.play('anim_boss_clown_attack');
          }

          // Recuo físico para trás
          const origY = this.boss.y;
          this.tweens.add({
            targets: this.boss,
            y: origY - 6,
            duration: 60,
            yoyo: true,
            ease: 'Quad.easeOut'
          });

          const ox = altGun === 0 ? -38 : 38;
          altGun = 1 - altGun;
          const b = this.enemyBullets.create(this.boss.x + ox, this.boss.y + 60, 'bullet_enemy');
          b.setVelocity(0, 290);
          SoundFX.heavyLaser();

          // 3. Retorno ao cruzeiro após o tiro
          this.time.delayedCall(160, () => {
            if (!this.boss || !this.boss.active || this.boss.isDying) return;
            const loopAnim = this.boss.phase2Active ? 'anim_boss_clown_rage' : 'anim_boss_clown';
            if (this.anims.exists(loopAnim)) {
              this.boss.play(loopAnim, true);
            }
          });
        });
      },
      loop: true
    });

    // Granadas / Morteiro de Dispersão a cada 3.5s
    const mortarTimer = this.time.addEvent({
      delay: 3500,
      callback: () => {
        if (!this.boss || !this.boss.active || this.isGameOver || this.boss.isDying) return;
        const targetX = this.scale.width / 2 + Phaser.Math.Between(-80, 80);
        const targetY = 460;
        this.addTelegraphCircle(targetX, targetY, 40, 800, 0x39ff14);

        this.time.delayedCall(800, () => {
          if (this.isGameOver) return;
          this.createExplosion(targetX, targetY, 'normal');
          this.fireRingOfBullets(targetX, targetY, 8, 210);
        });
      },
      loop: true
    });
    this.boss.customTimers.push(mortarTimer);
  }

  // Comportamento do Chefe 2: Tanque Mech Experimental
  startTankBehavior() {
    this.bossMovementTween = this.tweens.add({
      targets: this.boss,
      x: { from: 130, to: this.scale.width - 130 },
      duration: 3200,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeInOut'
    });

    // Canhão Duplo Central + Mísseis em Arco com Animações de Railgun
    this.bossAttackTimer = this.time.addEvent({
      delay: 1200,
      callback: () => {
        if (!this.boss || !this.boss.active || this.isGameOver || this.boss.isDying) return;

        // 1. Carga do Railgun (Arcos elétricos azuis)
        if (this.anims.exists('anim_boss_tank_prep') && !this.boss.phase2Active) {
          this.boss.play('anim_boss_tank_prep');
        }

        this.time.delayedCall(180, () => {
          if (!this.boss || !this.boss.active || this.isGameOver || this.boss.isDying) return;

          // 2. Disparo do Railgun + Abertura de Escotilhas
          if (this.anims.exists('anim_boss_tank_attack') && !this.boss.phase2Active) {
            this.boss.play('anim_boss_tank_attack');
          }

          // Recuo mecânico pesado
          const origY = this.boss.y;
          this.tweens.add({
            targets: this.boss,
            y: origY - 8,
            duration: 80,
            yoyo: true,
            ease: 'Quad.easeOut'
          });

          // Canhão central
          const b1 = this.enemyBullets.create(this.boss.x - 12, this.boss.y + 65, 'bullet_enemy');
          const b2 = this.enemyBullets.create(this.boss.x + 12, this.boss.y + 65, 'bullet_enemy');
          b1.setVelocity(-30, 290);
          b2.setVelocity(30, 290);

          // Mísseis em arco lateral
          const m1 = this.enemyBullets.create(this.boss.x - 52, this.boss.y + 30, 'bullet_enemy');
          const m2 = this.enemyBullets.create(this.boss.x + 52, this.boss.y + 30, 'bullet_enemy');
          m1.setVelocity(-120, 210);
          m2.setVelocity(120, 210);
          SoundFX.laser(1050);

          // 3. Retorno ao ciclo normal
          this.time.delayedCall(200, () => {
            if (!this.boss || !this.boss.active || this.boss.isDying) return;
            const loopAnim = this.boss.phase2Active ? 'anim_boss_tank_rage' : 'anim_boss_tank';
            if (this.anims.exists(loopAnim)) {
              this.boss.play(loopAnim, true);
            }
          });
        });
      },
      loop: true
    });
  }

  // Comportamento do Chefe 3: Tetsuo Biomassa Psíquica
  startTetsuoBehavior() {
    this.boss.isHovering = true;

    // Espiral de Projéteis Telecinéticos com Pulsações Psíquicas
    let spiralStep = 0;
    this.bossAttackTimer = this.time.addEvent({
      delay: 320,
      callback: () => {
        if (!this.boss || !this.boss.active || this.isGameOver || this.boss.isDying) return;
        spiralStep++;
        const angle = spiralStep * 0.45;
        const b = this.enemyBullets.create(this.boss.x, this.boss.y + 20, 'bullet_enemy');
        b.setVelocity(Math.cos(angle) * 240, Math.sin(angle) * 240);

        // Flash nos olhos e tentáculos a cada 5 disparos
        if (spiralStep % 5 === 0 && !this.boss.phase2Active) {
          if (this.anims.exists('anim_boss_tetsuo_charge')) {
            this.boss.play('anim_boss_tetsuo_charge');
            this.time.delayedCall(120, () => {
              if (this.boss && this.boss.active && !this.boss.isDying) {
                const loopAnim = this.boss.phase2Active ? 'anim_boss_tetsuo_rage' : 'anim_boss_tetsuo';
                if (this.anims.exists(loopAnim)) this.boss.play(loopAnim, true);
              }
            });
          }
        }
      },
      loop: true
    });
  }

  showPhase2Banner(text) {
    const { width } = this.scale;
    const banner = this.add.text(width / 2, 95, text, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ff003c',
      backgroundColor: 'rgba(10, 5, 18, 0.9)',
      padding: { x: 12, y: 4 },
      stroke: '#ffffff',
      strokeThickness: 1
    }).setOrigin(0.5).setDepth(35);

    this.tweens.add({
      targets: banner,
      scale: 1.1,
      alpha: 0,
      duration: 1400,
      ease: 'Power2',
      onComplete: () => banner.destroy()
    });
  }

  // Transição para a Fase 2 (Enraged / Sobrecarga com Novos Frames Anime)
  triggerBossPhase2(boss) {
    SoundFX.bossWarning();
    this.cameras.main.flash(400, 255, 0, 60);

    if (boss.bossType === 'boss_clown') {
      this.showPhase2Banner('⚠ SOBRECARGA: MOTOR DOS CLOWNS NO MÁXIMO!');
      if (this.bossMovementTween) {
        this.bossMovementTween.timeScale = 1.8;
      }
      if (this.anims.exists('anim_boss_clown_rage')) {
        boss.play('anim_boss_clown_rage', true);
      }

      // Spawna 2 Motos Biker de escolta
      const sheetKey = this.textures.exists('enemy_biker_sheet') ? 'enemy_biker_sheet' : 'enemy_biker';
      const escort1 = this.enemies.create(boss.x - 80, boss.y, sheetKey);
      const escort2 = this.enemies.create(boss.x + 80, boss.y, sheetKey);
      [escort1, escort2].forEach(esc => {
        esc.setDepth(7);
        esc.hp = 3;
        esc.enemyType = 'biker';
        esc.hasSheet = sheetKey === 'enemy_biker_sheet';
        esc.baseX = esc.x;
        esc.phase = Math.random();
        esc.amplitude = 40;
        esc.freq = 0.004;
        esc.setVelocityY(160);
      });

      // Ataque Telegrafado de Varredura Laser com Chamas nas Turbinas
      const sweepTimer = this.time.addEvent({
        delay: 3200,
        callback: () => {
          if (!boss.active || this.isGameOver || !this.player || !this.player.active || boss.isDying) return;
          const targetX = this.player.x;
          this.addTelegraphLine(boss.x, boss.y + 60, targetX, this.scale.height, 700, 0xff003c, 4);

          this.time.delayedCall(700, () => {
            if (!boss.active || this.isGameOver || boss.isDying) return;
            for (let i = 0; i < 7; i++) {
              const b = this.enemyBullets.create(boss.x + (i - 3) * 16, boss.y + 65, 'bullet_enemy');
              b.setVelocity((i - 3) * 35, 330);
            }
          });
        },
        loop: true
      });
      boss.customTimers.push(sweepTimer);
    } else if (boss.bossType === 'boss_tank') {
      this.showPhase2Banner('⚠ SOBRECARGA: REATOR DE PLASMA NO MÁXIMO!');
      if (this.anims.exists('anim_boss_tank_rage')) {
        boss.play('anim_boss_tank_rage', true);
      }

      // Mega Railgun Telegrafado com Raio Devastador
      const railgunTimer = this.time.addEvent({
        delay: 3000,
        callback: () => {
          if (!boss.active || this.isGameOver || !this.player || !this.player.active || boss.isDying) return;
          const px = this.player.x;
          const py = this.player.y;
          this.addTelegraphLine(boss.x, boss.y + 70, px, py, 900, 0x00f0ff, 5);

          // Carga visual
          if (this.anims.exists('anim_boss_tank_prep')) {
            boss.play('anim_boss_tank_prep');
          }

          this.time.delayedCall(900, () => {
            if (!boss.active || this.isGameOver || boss.isDying) return;
            this.cameras.main.shake(250, 0.02);
            SoundFX.laser(1300);

            if (this.anims.exists('anim_boss_tank_attack')) {
              boss.play('anim_boss_tank_attack');
            }

            // Feixe concentrado triplo
            const angle = Phaser.Math.Angle.Between(boss.x, boss.y + 70, px, py);
            for (let i = -1; i <= 1; i++) {
              const b = this.enemyBullets.create(boss.x, boss.y + 70, 'laser_red');
              b.setDepth(9);
              const spd = 480;
              b.setVelocity(Math.cos(angle + i * 0.08) * spd, Math.sin(angle + i * 0.08) * spd);
            }

            // Parede de dispersão em 7 leques
            for (let f = -3; f <= 3; f++) {
              const wallBullet = this.enemyBullets.create(boss.x, boss.y + 70, 'bullet_enemy');
              wallBullet.setVelocity(f * 70, 260);
            }

            this.time.delayedCall(250, () => {
              if (boss.active && !boss.isDying && this.anims.exists('anim_boss_tank_rage')) {
                boss.play('anim_boss_tank_rage', true);
              }
            });
          });
        },
        loop: true
      });
      boss.customTimers.push(railgunTimer);
    } else if (boss.bossType === 'boss_tetsuo') {
      this.showPhase2Banner('⚠ INSTABILIDADE TELECINÉTICA TOTAL!');
      if (this.anims.exists('anim_boss_tetsuo_rage')) {
        boss.play('anim_boss_tetsuo_rage', true);
      }

      // Choque Psíquico e Nova Conquêntrica Telegrafada
      const novaTimer = this.time.addEvent({
        delay: 3200,
        callback: () => {
          if (!boss.active || this.isGameOver || boss.isDying) return;
          this.addTelegraphCircle(boss.x, boss.y, 140, 800, 0xb026ff);

          if (this.anims.exists('anim_boss_tetsuo_charge')) {
            boss.play('anim_boss_tetsuo_charge');
          }

          this.time.delayedCall(800, () => {
            if (!boss.active || this.isGameOver || boss.isDying) return;
            this.cameras.main.flash(250, 176, 38, 255);
            SoundFX.explosion(true);

            if (this.anims.exists('anim_boss_tetsuo_nova')) {
              boss.play('anim_boss_tetsuo_nova');
            }

            // Nova de 16 projéteis psíquicos
            this.fireRingOfBullets(boss.x, boss.y, 16, 220);

            // Pulso que repele o jogador
            if (this.player && this.player.active) {
              this.player.setVelocityY(260);
            }

            this.time.delayedCall(300, () => {
              if (boss.active && !boss.isDying && this.anims.exists('anim_boss_tetsuo_rage')) {
                boss.play('anim_boss_tetsuo_rage', true);
              }
            });
          });
        },
        loop: true
      });
      boss.customTimers.push(novaTimer);
    }
  }

  // Super Poder: Raio Orbital SOL
  triggerSolLaser() {
    if (this.solGauge < 100 && this.solBombs <= 0) {
      this.showFloatingCombatText(this.player.x, this.player.y - 30, 'SOL DESCARREGADO! ⚡', '#ff003c');
      return;
    }

    if (this.solGauge >= 100) {
      this.solGauge = 0;
    } else {
      this.solBombs -= 1;
      Storage.useSolBomb();
    }

    this.updateHUD();
    SoundFX.solBeam();

    // Efeito Visual do Laser Vindo do Espaço
    const { width, height } = this.scale;
    this.cameras.main.shake(1200, 0.035);
    this.cameras.main.flash(400, 255, 255, 255);

    const beam = this.add.rectangle(width / 2, height / 2, width, height, 0x00f0ff, 0.75);
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 900,
      onComplete: () => beam.destroy()
    });

    // Limpa todos os projéteis inimigos
    this.enemyBullets.clear(true, true);

    // Destrói todos os inimigos normais e causa dano massivo ao Chefe
    const targets = [...this.enemies.getChildren()];
    targets.forEach(enemy => {
      if (enemy && enemy.active) {
        if (enemy.isBoss) {
          enemy.hp -= 40;
          this.updateBossHp(enemy);
        } else {
          this.destroyEnemy(enemy, false);
        }
      }
    });

    this.showFloatingCombatText(width / 2, 220, '⚡ RAIO ORBITAL DISPARADO! 🛰️', '#00f0ff');
  }

  handleBulletHitEnemy(bullet, enemy) {
    this.createBulletImpact(bullet.x, bullet.y, bullet.texture?.key, bullet.damage > 1);
    bullet.destroy();
    enemy.hp -= bullet.damage || 1;

    // Flash branco e micro-deformação cinética de impacto no alvo
    enemy.setTint(0xffffff);
    this.time.delayedCall(60, () => {
      if (enemy.active) enemy.clearTint();
    });

    // Animação de impacto nos chefões (Hit State temporário)
    if (enemy.isBoss && enemy.active && !enemy.isDying) {
      const hitAnim = 'anim_' + enemy.bossType + '_hit';
      if (this.anims.exists(hitAnim) && !enemy.isHitReacting) {
        enemy.isHitReacting = true;
        enemy.play(hitAnim);
        this.time.delayedCall(90, () => {
          if (enemy.active && !enemy.isDying) {
            enemy.isHitReacting = false;
            const loopAnim = enemy.phase2Active ? ('anim_' + enemy.bossType + '_rage') : ('anim_' + enemy.bossType);
            if (this.anims.exists(loopAnim)) {
              enemy.play(loopAnim, true);
            }
          }
        });
      }
    }

    if (!enemy.isBoss && enemy.active) {
      const origScaleX = enemy.scaleX;
      const origScaleY = enemy.scaleY;
      this.tweens.add({
        targets: enemy,
        scaleX: origScaleX * 1.08,
        scaleY: origScaleY * 0.94,
        duration: 45,
        yoyo: true,
        onComplete: () => {
          if (enemy.active) enemy.setScale(origScaleX, origScaleY);
        }
      });
    }

    if (enemy.isBoss) {
      this.updateBossHp(enemy);
    }

    if (enemy.hp <= 0 && !enemy.isDying) {
      if (enemy.isBoss) {
        this.updateBossHp(enemy);
      } else {
        this.destroyEnemy(enemy, true);
      }
    }
  }

  updateBossHp(boss) {
    if (this.bossHpBar) {
      const pct = Math.max(0, boss.hp / boss.maxHp);
      this.bossHpBar.width = 336 * pct;
    }

    // Ativação da Fase 2 de Sobrecarga (HP <= 50%)
    if (boss.hp <= boss.maxHp * 0.5 && !boss.phase2Active) {
      boss.phase2Active = true;
      this.triggerBossPhase2(boss);
    }

    if (boss.hp <= 0 && !boss.isDying) {
      boss.isDying = true;
      this.bossDefeatedCount++;
      this.bossActive = false;
      if (this.bossMovementTween) this.bossMovementTween.stop();
      if (this.bossAttackTimer) this.bossAttackTimer.remove();
      if (boss.customTimers) {
        boss.customTimers.forEach(t => { if (t && t.remove) t.remove(); });
      }
      if (this.bossHpContainer) this.bossHpContainer.destroy();

      this.triggerBossDestructionSequence(boss, () => {
        this.kills++;
        this.score += 5000;
        this.solGauge = Math.min(100, this.solGauge + 50);
        this.updateHUD();
        this.showFloatingCombatText(boss.x, boss.y, '🏆 CHEFE DESTRUÍDO! +5000', '#fcee0a');

        // Drop garantido de recompensas ricas
        this.spawnPickup(boss.x - 30, boss.y, 'powerup_weapon', 'weapon');
        this.spawnPickup(boss.x + 30, boss.y, 'powerup_shield', 'shield');
        this.spawnPickup(boss.x, boss.y - 20, 'powerup_sol', 'sol');
        for (let i = 0; i < 4; i++) {
          this.time.delayedCall(i * 120, () => {
            this.spawnPickup(boss.x + Phaser.Math.Between(-50, 50), boss.y + Phaser.Math.Between(-30, 30), 'powerup_pill', 'pill');
          });
        }
      });
    }
  }

  destroyEnemy(enemy, dropLoot = true) {
    const scaleType = (enemy.enemyType === 'heli' || enemy.enemyType === 'interceptor') ? 'large' : 'normal';
    this.createExplosion(enemy.x, enemy.y, scaleType, enemy.enemyType);

    this.kills++;
    this.score += enemy.scoreValue || 100;

    // Carrega a barra do SOL gradualmente
    this.solGauge = Math.min(100, this.solGauge + (enemy.isBoss ? 50 : 6));
    this.updateHUD();

    if (dropLoot) {
      // Chance de Drop
      const rand = Math.random();
      if (rand < 0.42) {
        this.spawnPickup(enemy.x, enemy.y, 'powerup_pill', 'pill');
      } else if (rand < 0.58) {
        this.spawnPickup(enemy.x, enemy.y, 'powerup_weapon', 'weapon');
      } else if (rand < 0.70) {
        this.spawnPickup(enemy.x, enemy.y, 'powerup_shield', 'shield');
      } else if (rand < 0.78) {
        this.spawnPickup(enemy.x, enemy.y, 'powerup_sol', 'sol');
      }
    }

    if (enemy.shootTimer) enemy.shootTimer.remove();
    if (enemy.customTimers && enemy.customTimers.length > 0) {
      enemy.customTimers.forEach(t => { if (t && t.remove) t.remove(); });
    }
    enemy.destroy();
  }

  spawnPickup(x, y, texture, type) {
    const pickup = this.pickups.create(x, y, texture);
    pickup.pickupType = type;
    pickup.setDepth(6);
    pickup.setDisplaySize(48, 48);
    pickup.setVelocityY(130);

    // Efeito suave de pulso luminoso no pickup
    this.tweens.add({
      targets: pickup,
      scaleX: pickup.scaleX * 1.18,
      scaleY: pickup.scaleY * 1.18,
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // Texto Flutuante de Combate Rápido e Discreto (Substitui os toasts bloqueadores de visão)
  showFloatingCombatText(x, y, text, color = '#fcee0a') {
    const fText = this.add.text(x, y - 10, text, {
      fontFamily: 'Orbitron, Rajdhani, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: color,
      stroke: '#05070e',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: fText,
      y: y - 48,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => fText.destroy()
    });
  }

  handlePickup(player, pickup) {
    if (pickup.pickupType === 'pill') {
      this.pillsCollected += 10;
      Storage.addPills(10);
      SoundFX.pillPickup();
      this.showFloatingCombatText(pickup.x, pickup.y, '+10 💊', '#fcee0a');
    } else if (pickup.pickupType === 'weapon') {
      if (this.weaponLevel < 5) {
        this.weaponLevel++;
        if (this.weaponLevel === 5) {
          this.drones[0].setVisible(true);
          this.drones[1].setVisible(true);
        }
      }
      SoundFX.coinSuccess();
      this.showFloatingCombatText(this.player.x, this.player.y - 25, `ARMA LV${this.weaponLevel} 🔫`, '#00f0ff');
    } else if (pickup.pickupType === 'shield') {
      this.hasShield = true;
      this.shieldSprite.setVisible(true);
      SoundFX.coinSuccess();
      this.showFloatingCombatText(this.player.x, this.player.y - 25, 'ESCUDO ATIVO 🛡️', '#00f0ff');
    } else if (pickup.pickupType === 'sol') {
      this.solGauge = Math.min(100, this.solGauge + 35);
      Storage.addSolBombs(1);
      this.solBombs = Storage.getData().solBombs;
      SoundFX.coinSuccess();
      this.showFloatingCombatText(this.player.x, this.player.y - 25, '+1 CARGA SOL ⚡', '#ff003c');
    }

    pickup.destroy();
    this.updateHUD();
  }

  handlePlayerHit(player, bullet) {
    bullet.destroy();
    this.applyPlayerDamage();
  }

  handlePlayerCrash(player, enemy) {
    if (!enemy.isBoss) {
      this.destroyEnemy(enemy, false);
    }
    this.applyPlayerDamage();
  }

  applyPlayerDamage() {
    if (this.invulnerable || this.isGameOver) return;

    // Se tiver escudo, absorve o golpe
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldSprite.setVisible(false);
      SoundFX.shieldHit();
      this.createBulletImpact(this.player.x, this.player.y, 'laser_cyan', true);
      this.cameras.main.flash(200, 0, 240, 255);
      this.showFloatingCombatText(this.player.x, this.player.y - 25, 'ESCUDO ROMPIDO! ⚠', '#ff003c');
      return;
    }

    this.hp -= 1;
    this.createExplosion(this.player.x, this.player.y, 'normal');
    this.cameras.main.shake(400, 0.02);
    this.cameras.main.flash(200, 255, 0, 60);

    // Rebaixa nível de arma
    if (this.weaponLevel > 1) {
      this.weaponLevel--;
      if (this.weaponLevel < 5) {
        this.drones[0].setVisible(false);
        this.drones[1].setVisible(false);
      }
    }

    this.updateHUD();

    if (this.hp <= 0) {
      this.triggerGameOver();
    } else {
      this.invulnerable = true;
      this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        duration: 120,
        yoyo: true,
        repeat: 8,
        onComplete: () => {
          this.player.setAlpha(1);
          this.invulnerable = false;
        }
      });
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    this.createExplosion(this.player.x, this.player.y, 'large');
    this.player.setVisible(false);

    Api.submitScore(this.score, this.kills);

    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        kills: this.kills,
        pillsCollected: this.pillsCollected
      });
    });
  }

  // Efeito Visual e Sonoro de Impacto dos Tiros no Alvo (com Hit Sparks Animados)
  createBulletImpact(x, y, bulletTexture = 'laser_red', isHeavy = false) {
    SoundFX.hit(isHeavy);

    // 1. Hit Spark Anime Animado em Spritesheet
    if (this.textures.exists('hit_spark_sheet') && this.anims.exists('anim_hit_spark')) {
      const sparkAnim = this.add.sprite(x, y, 'hit_spark_sheet')
        .setDepth(27)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(isHeavy ? 1.4 : 0.95)
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

      sparkAnim.play('anim_hit_spark');
      sparkAnim.on('animationcomplete', () => sparkAnim.destroy());
    }

    // 2. Clarão estelar de impacto (Hit Flash)
    const flash = this.add.image(x, y, 'fx_hit_flash')
      .setDepth(26)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(isHeavy ? 1.5 : 1.0)
      .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

    this.tweens.add({
      targets: flash,
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy()
    });

    // 3. Anel de onda de choque rápida
    const ring = this.add.image(x, y, 'fx_shockwave_ring')
      .setDepth(25)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.12)
      .setAlpha(0.9);

    this.tweens.add({
      targets: ring,
      scaleX: isHeavy ? 0.65 : 0.38,
      scaleY: isHeavy ? 0.65 : 0.38,
      alpha: 0,
      duration: 130,
      onComplete: () => ring.destroy()
    });

    // 4. Fagulhas direcionais e radiais neon
    const isCyan = bulletTexture === 'laser_cyan' || isHeavy;
    const sparkKeys = isCyan
      ? ['particle_spark_cyan', 'particle_spark_white', 'particle_cyan']
      : ['particle_spark_orange', 'particle_spark_white', 'particle_spark', 'particle_yellow'];

    const sparkCount = isHeavy ? 7 : 4;
    for (let i = 0; i < sparkCount; i++) {
      const key = Phaser.Utils.Array.GetRandom(sparkKeys);
      const spark = this.add.image(x, y, key)
        .setDepth(25)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.2));

      const angle = Phaser.Math.FloatBetween(-Math.PI * 0.9, -Math.PI * 0.1);
      const speed = Phaser.Math.Between(120, isHeavy ? 340 : 250);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * (speed * 0.18),
        y: y + Math.sin(angle) * (speed * 0.18),
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(130, 230),
        onComplete: () => spark.destroy()
      });
    }
  }

  // Sistema Robusto de Explosões Multi-Camadas com Animações de Spritesheet Anime
  createExplosion(x, y, scaleType = 'normal', enemyType = '') {
    const isBoss = scaleType === 'boss';
    const isLarge = scaleType === 'large' || enemyType === 'heli' || enemyType === 'interceptor';
    const isSmall = scaleType === 'small';

    SoundFX.explosion(isBoss, isLarge);

    // Impacto Cinético na Câmera
    if (isBoss) {
      this.cameras.main.shake(700, 0.035);
      this.cameras.main.flash(300, 255, 255, 255);
    } else if (isLarge) {
      this.cameras.main.shake(250, 0.015);
      this.cameras.main.flash(120, 255, 150, 50);
    } else if (isSmall) {
      this.cameras.main.shake(100, 0.005);
    } else {
      this.cameras.main.shake(160, 0.008);
    }

    // Camada Principal: Spritesheet de Explosão Épica Anime
    if (this.textures.exists('boss_explosion_sheet') && this.anims.exists('anim_boss_explosion')) {
      const expSprite = this.add.sprite(x, y, 'boss_explosion_sheet')
        .setDepth(27)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(isBoss ? 2.3 : (isLarge ? 1.4 : 0.95))
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

      expSprite.play('anim_boss_explosion');
      expSprite.on('animationcomplete', () => expSprite.destroy());
    }

    // Camada 1: Ondas de Choque Neon Radiantes (Shockwave Rings)
    const ringCount = isBoss ? 3 : (isLarge ? 2 : 1);
    for (let r = 0; r < ringCount; r++) {
      const ring = this.add.image(x, y, 'fx_shockwave_ring')
        .setDepth(23)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.15)
        .setAlpha(1.0);

      const maxScale = isBoss ? (2.8 + r * 0.8) : (isLarge ? (1.6 + r * 0.5) : 1.2);
      this.tweens.add({
        targets: ring,
        scaleX: maxScale,
        scaleY: maxScale,
        alpha: 0,
        delay: r * 70,
        duration: isBoss ? 480 : (isLarge ? 360 : 260),
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
      });
    }

    // Camada 2: Núcleo de Fogo e Plasma
    const fireballCount = isBoss ? 8 : (isLarge ? 4 : 2);
    for (let f = 0; f < fireballCount; f++) {
      const ox = Phaser.Math.Between(isBoss ? -30 : -12, isBoss ? 30 : 12);
      const oy = Phaser.Math.Between(isBoss ? -30 : -12, isBoss ? 30 : 12);
      const fb = this.add.image(x + ox, y + oy, 'fx_fireball')
        .setDepth(24)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.3)
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

      const targetScale = isBoss ? Phaser.Math.FloatBetween(2.0, 3.2) : (isLarge ? Phaser.Math.FloatBetween(1.4, 2.0) : Phaser.Math.FloatBetween(0.9, 1.4));
      this.tweens.add({
        targets: fb,
        scaleX: targetScale,
        scaleY: targetScale,
        alpha: 0,
        delay: f * 35,
        duration: Phaser.Math.Between(260, isBoss ? 520 : 400),
        ease: 'Quad.easeOut',
        onComplete: () => fb.destroy()
      });
    }

    // Camada 3: Estilhaços e Fragmentos Cibernéticos Voadores
    const shardCount = isBoss ? 24 : (isLarge ? 14 : 7);
    for (let s = 0; s < shardCount; s++) {
      const shard = this.add.image(x, y, 'fx_debris_shard')
        .setDepth(25)
        .setScale(Phaser.Math.FloatBetween(0.8, isBoss ? 1.6 : 1.2))
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(130, isBoss ? 450 : (isLarge ? 320 : 240));
      const dist = speed * Phaser.Math.FloatBetween(0.35, 0.65);

      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        rotation: shard.rotation + Phaser.Math.FloatBetween(-6, 6),
        alpha: 0,
        duration: Phaser.Math.Between(380, isBoss ? 750 : 550),
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy()
      });
    }

    // Camada 4: Centelhas e Fagulhas Explosivas em 360 Graus
    const sparkCount = isBoss ? 42 : (isLarge ? 24 : 12);
    const sparkKeys = ['particle_spark_orange', 'particle_spark_white', 'particle_yellow', 'particle_spark'];
    for (let sp = 0; sp < sparkCount; sp++) {
      const key = Phaser.Utils.Array.GetRandom(sparkKeys);
      const p = this.add.image(x, y, key)
        .setDepth(26)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.4));

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(100, isBoss ? 400 : 280);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * (speed * 0.35),
        y: y + Math.sin(angle) * (speed * 0.35),
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(240, isBoss ? 600 : 450),
        onComplete: () => p.destroy()
      });
    }

    // Camada 5: Nuvens de Fumaça Dissipante Volumétrica
    const smokeCount = isBoss ? 8 : (isLarge ? 5 : 3);
    for (let sm = 0; sm < smokeCount; sm++) {
      const ox = Phaser.Math.Between(-16, 16);
      const oy = Phaser.Math.Between(-16, 16);
      const smoke = this.add.image(x + ox, y + oy, 'fx_smoke')
        .setDepth(21)
        .setAlpha(0.65)
        .setScale(0.5);

      const targetScale = isBoss ? Phaser.Math.FloatBetween(2.0, 3.0) : Phaser.Math.FloatBetween(1.2, 1.8);
      this.tweens.add({
        targets: smoke,
        x: smoke.x + Phaser.Math.Between(-25, 25),
        y: smoke.y - Phaser.Math.Between(20, 55),
        scaleX: targetScale,
        scaleY: targetScale,
        alpha: 0,
        delay: sm * 40,
        duration: Phaser.Math.Between(550, isBoss ? 1100 : 800),
        ease: 'Sine.easeOut',
        onComplete: () => smoke.destroy()
      });
    }
  }

  // Sequência Cinematográfica de Destruição em Cadeia dos Chefes (com Múltiplas Explosões Anime)
  triggerBossDestructionSequence(boss, onComplete) {
    if (!boss) return;
    boss.setVelocity(0, 0);

    // Efeito dramático de curto-circuito e tremor violento
    this.tweens.add({
      targets: boss,
      tint: 0xff003c,
      alpha: 0.6,
      yoyo: true,
      repeat: 10,
      duration: 110
    });

    const halfW = (boss.displayWidth || 120) * 0.45;
    const halfH = (boss.displayHeight || 140) * 0.45;

    // 12 mini-detonações em cadeia percorrendo a carcaça do chefe
    const explosionsTotal = 12;
    for (let i = 0; i < explosionsTotal; i++) {
      this.time.delayedCall(i * 120, () => {
        if (!boss.active) return;
        const ex = boss.x + Phaser.Math.Between(-halfW, halfW);
        const ey = boss.y + Phaser.Math.Between(-halfH, halfH);
        this.createExplosion(ex, ey, 'normal');
      });
    }

    // Detonação Mega Climax Final com Onda de Choque e Destruição Total
    this.time.delayedCall(explosionsTotal * 120 + 80, () => {
      const bx = boss.x;
      const by = boss.y;
      this.createExplosion(bx, by, 'boss');
      boss.destroy();
      if (onComplete) onComplete();
    });
  }

  cleanupOffscreenObjects() {
    const { height } = this.scale;
    this.playerBullets.getChildren().forEach(b => {
      if (b.y < -30 || b.y > height + 30 || b.x < -30 || b.x > this.scale.width + 30) b.destroy();
    });
    this.enemyBullets.getChildren().forEach(b => {
      if (b.y > height + 30 || b.y < -30) b.destroy();
    });
    this.enemies.getChildren().forEach(e => {
      if (e.y > height + 80 || e.x < -100 || e.x > this.scale.width + 100) {
        if (e.shootTimer) e.shootTimer.remove();
        if (e.customTimers && e.customTimers.length > 0) {
          e.customTimers.forEach(t => { if (t && t.remove) t.remove(); });
        }
        e.destroy();
      }
    });
    this.pickups.getChildren().forEach(p => {
      if (p.y > height + 30) p.destroy();
    });
  }

  // HUD
  // HUD Estilo Cockpit da Moto de Kaneda
  createHUD(width, height) {
    this.hudContainer = this.add.container(0, 0).setDepth(40);

    // Painel Superior de Carbono / Vidro Fumê (Duas Linhas de Telemetria)
    const topBg = this.add.rectangle(width / 2, 40, width, 80, 0x060814, 0.94)
      .setStrokeStyle(1.5, 0x00f0ff);

    // Borda inferior com dentes cibernéticos
    const decoLine = this.add.rectangle(width / 2, 80, width - 20, 2, 0xff003c);

    // 1. Score com Kanji (得点)
    this.scoreKanji = this.add.text(18, 10, '得点 // SCORE', {
      fontFamily: 'Rajdhani',
      fontSize: '11px',
      letterSpacing: 2,
      color: '#ff003c'
    });

    this.scoreText = this.add.text(18, 23, `${this.score.toLocaleString()}`, {
      fontFamily: 'Orbitron',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#00f0ff'
    });

    // 2. Velocímetro Digital CRT Verde Central (Painel de Moto)
    const speedBox = this.add.rectangle(width / 2, 26, 126, 38, 0x031408, 0.95)
      .setStrokeStyle(1.5, 0x39ff14);

    this.speedKanji = this.add.text(width / 2, 13, '速度 // SPEED', {
      fontFamily: 'Rajdhani',
      fontSize: '9px',
      letterSpacing: 2,
      color: '#39ff14'
    }).setOrigin(0.5);

    this.speedometerText = this.add.text(width / 2, 30, '180 KM/H', {
      fontFamily: 'Orbitron',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#39ff14',
      shadow: { color: '#39ff14', blur: 8, fill: true }
    }).setOrigin(0.5);

    // 3. Pílulas Coletadas (💊 カプセル)
    this.pillsKanji = this.add.text(width - 120, 10, '薬 // CAPSULE', {
      fontFamily: 'Rajdhani',
      fontSize: '11px',
      letterSpacing: 2,
      color: '#fcee0a'
    });

    this.pillsText = this.add.text(width - 120, 23, `💊 ${this.pillsCollected}`, {
      fontFamily: 'Orbitron',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fcee0a'
    });

    // --- SEGUNDA LINHA DO HUD: TELEMETRIA COMPLETA DO JOGADOR ---

    // 4. Indicador de Blindagem (LED Armor Bars)
    const armorLabel = this.add.text(18, 52, '装甲 // ARMOR', {
      fontFamily: 'Rajdhani',
      fontSize: '10px',
      letterSpacing: 1,
      color: '#8899bb'
    });

    this.hpBars = [];
    for (let i = 0; i < this.maxHp; i++) {
      const bar = this.add.rectangle(100 + i * 26, 58, 22, 9, 0xff003c)
        .setStrokeStyle(1, 0x00f0ff);
      this.hpBars.push(bar);
    }

    // 5. Nível da Arma (武器 // WEAPON LV. 1..5)
    const weaponLabel = this.add.text(190, 52, '武器 // WEAPON', {
      fontFamily: 'Rajdhani',
      fontSize: '10px',
      letterSpacing: 1,
      color: '#00f0ff'
    });

    this.weaponLevelText = this.add.text(268, 51, `LV.${this.weaponLevel}`, {
      fontFamily: 'Orbitron',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff'
    });

    this.weaponBars = [];
    for (let i = 0; i < 5; i++) {
      const wBar = this.add.rectangle(310 + i * 14, 58, 11, 9, 0x00f0ff)
        .setStrokeStyle(1, 0x00f0ff);
      this.weaponBars.push(wBar);
    }

    // 6. Status do Escudo de Força (防壁 // SHIELD)
    const shieldLabel = this.add.text(395, 52, '防壁 // SHIELD', {
      fontFamily: 'Rajdhani',
      fontSize: '10px',
      letterSpacing: 1,
      color: '#fcee0a'
    });

    this.shieldStatusBadge = this.add.text(465, 52, this.hasShield ? 'ATIVO' : 'OFF', {
      fontFamily: 'Orbitron',
      fontSize: '11px',
      fontStyle: 'bold',
      color: this.hasShield ? '#00f0ff' : '#666677'
    });

    // Botão Tático do SOL no canto inferior direito
    this.createSolHUDButton(width - 65, height - 65);

    // Botão de Loja Rápida no canto inferior esquerdo
    this.createQuickShopButton(65, height - 65);

    this.hudContainer.add([
      topBg, decoLine,
      this.scoreKanji, this.scoreText,
      speedBox, this.speedKanji, this.speedometerText,
      this.pillsKanji, this.pillsText,
      armorLabel, ...this.hpBars,
      weaponLabel, this.weaponLevelText, ...this.weaponBars,
      shieldLabel, this.shieldStatusBadge
    ]);

    this.updateHUD();
  }

  createSolHUDButton(x, y) {
    const btn = this.add.container(x, y).setDepth(20);
    const circleBg = this.add.circle(0, 0, 36, 0x140308).setStrokeStyle(2, 0xff003c);
    this.solGaugeBar = this.add.circle(0, 0, 32, 0xff003c, 0.4);

    let solIcon = null;
    if (this.textures.exists('icon_hud_sol')) {
      solIcon = this.add.image(0, -1, 'icon_hud_sol').setDisplaySize(36, 36).setAlpha(0.6);
    }

    const kanjiLabel = this.add.text(0, -14, '衛星砲', {
      fontFamily: 'Rajdhani',
      fontSize: '10px',
      color: '#ff003c'
    }).setOrigin(0.5);

    const label = this.add.text(0, -1, 'SOL', {
      fontFamily: 'Orbitron',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      shadow: { color: '#ff003c', blur: 6, fill: true }
    }).setOrigin(0.5);

    this.solCountText = this.add.text(0, 14, `${this.solGauge}%`, {
      fontFamily: 'Orbitron',
      fontSize: '10px',
      color: '#fcee0a'
    }).setOrigin(0.5);

    // Badge com número de cargas de satélite SOL disponíveis
    this.solChargesBadge = this.add.text(22, -22, `x${this.solBombs}`, {
      fontFamily: 'Orbitron',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#00f0ff',
      backgroundColor: '#0a0510',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    const elements = [circleBg, this.solGaugeBar, solIcon, kanjiLabel, label, this.solCountText, this.solChargesBadge].filter(Boolean);
    btn.add(elements);
    btn.setSize(72, 72);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.triggerSolLaser());
  }

  createQuickShopButton(x, y) {
    const btn = this.add.container(x, y).setDepth(20);
    const bg = this.add.circle(0, 0, 34, 0x051525).setStrokeStyle(2, 0x00f0ff);

    const kanjiLabel = this.add.text(0, -14, '闇市場', {
      fontFamily: 'Rajdhani',
      fontSize: '10px',
      color: '#00f0ff'
    }).setOrigin(0.5);

    const icon = this.textures.exists('icon_hud_shop')
      ? this.add.image(0, -1, 'icon_hud_shop').setDisplaySize(24, 24)
      : this.add.text(0, -1, '🛒', { fontSize: '15px' }).setOrigin(0.5);

    const label = this.add.text(0, 14, 'LOJA', {
      fontFamily: 'Orbitron',
      fontSize: '9px',
      color: '#00f0ff'
    }).setOrigin(0.5);

    btn.add([bg, kanjiLabel, icon, label]);
    btn.setSize(68, 68);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.scene.pause();
      this.scene.launch('ShopScene', { returnToGame: true });
    });
  }

  updateHUD() {
    if (this.scoreText) this.scoreText.setText(`${this.score.toLocaleString()}`);
    if (this.pillsText) this.pillsText.setText(`💊 ${this.pillsCollected}`);

    // Atualiza Barra de Vida / Armadura
    if (this.hpBars) {
      this.hpBars.forEach((bar, idx) => {
        if (idx < this.hp) {
          bar.setFillStyle(0xff003c, 1);
          bar.setStrokeStyle(1, 0x00f0ff);
        } else {
          bar.setFillStyle(0x1a060d, 0.4);
          bar.setStrokeStyle(1, 0x331118);
        }
      });
    }

    // Atualiza Nível da Arma (1 a 5) com blocos LED
    if (this.weaponLevelText) {
      const isMax = this.weaponLevel >= 5;
      this.weaponLevelText.setText(isMax ? 'MAX' : `LV.${this.weaponLevel}`);
      this.weaponLevelText.setColor(isMax ? '#fcee0a' : '#ffffff');
    }
    if (this.weaponBars) {
      this.weaponBars.forEach((bar, idx) => {
        if (idx < this.weaponLevel) {
          bar.setFillStyle(this.weaponLevel >= 5 ? 0xfcee0a : 0x00f0ff, 1);
          bar.setStrokeStyle(1, 0xffffff);
        } else {
          bar.setFillStyle(0x06141a, 0.4);
          bar.setStrokeStyle(1, 0x113344);
        }
      });
    }

    // Atualiza Status do Escudo de Força
    if (this.shieldStatusBadge) {
      if (this.hasShield) {
        this.shieldStatusBadge.setText('ATIVO');
        this.shieldStatusBadge.setColor('#00f0ff');
      } else {
        this.shieldStatusBadge.setText('OFF');
        this.shieldStatusBadge.setColor('#666677');
      }
    }

    // Atualiza Indicador do Satélite SOL
    if (this.solCountText) {
      const txt = this.solGauge >= 100 ? 'PRONTO!' : `${Math.floor(this.solGauge)}%`;
      this.solCountText.setText(txt);
      if (this.solGaugeBar) {
        this.solGaugeBar.setScale(Math.max(0.1, this.solGauge / 100));
        this.solGaugeBar.setFillStyle(this.solGauge >= 100 ? 0x00f0ff : 0xff003c, this.solGauge >= 100 ? 0.7 : 0.4);
      }
    }

    if (this.solChargesBadge) {
      this.solChargesBadge.setText(`x${this.solBombs}`);
    }
  }
}
