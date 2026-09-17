import math
import os
from PIL import Image, ImageDraw

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "sprites")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def create_enemy_biker_sheet():
    """4 frames de 48x64: Frame 0 (Bank Left), Frame 1 (Cruising A), Frame 2 (Exhaust Burst), Frame 3 (Bank Right)"""
    fw, fh = 48, 64
    num_frames = 4
    sheet = Image.new("RGBA", (fw * num_frames, fh), (0, 0, 0, 0))

    for f in range(num_frames):
        img = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Configurações por frame
        lean = 0
        exhaust_len = 8
        if f == 0:
            lean = -5  # inclinando à esquerda
            exhaust_len = 10
        elif f == 1:
            lean = 0
            exhaust_len = 7
        elif f == 2:
            lean = 0
            exhaust_len = 14  # pulso de nitro
        elif f == 3:
            lean = 5  # inclinando à direita
            exhaust_len = 10

        cx = fw // 2 + lean
        cy = fh // 2

        # Sombra
        draw.ellipse([cx - 14, cy + 18, cx + 14, cy + 26], fill=(0, 0, 0, 90))

        # Roda Traseira e Pneu
        draw.rounded_rectangle([cx - 5, cy + 12, cx + 5, cy + 24], radius=3, fill=(20, 20, 30, 255), outline=(60, 60, 80, 255))
        # Roda Dianteira
        draw.rounded_rectangle([cx - 4, cy - 24, cx + 4, cy - 14], radius=2, fill=(20, 20, 30, 255), outline=(60, 60, 80, 255))

        # Chamas de Escape Neon (Verde tóxico / Ciano)
        ex_color = (57, 255, 20, 240) if f % 2 == 0 else (0, 240, 255, 255)
        draw.polygon([(cx - 4, cy + 23), (cx + 4, cy + 23), (cx, cy + 23 + exhaust_len)], fill=ex_color)
        draw.polygon([(cx - 2, cy + 23), (cx + 2, cy + 23), (cx, cy + 23 + exhaust_len - 3)], fill=(255, 255, 255, 230))

        # Chassi da Moto (Roxo Clowns)
        body_poly = [
            (cx, cy - 22),       # Bico
            (cx + 12, cy - 4),   # Ombro direito
            (cx + 8, cy + 18),   # Traseira direita
            (cx - 8, cy + 18),   # Traseira esquerda
            (cx - 12, cy - 4),   # Ombro esquerdo
        ]
        draw.polygon(body_poly, fill=(121, 40, 202, 255), outline=(57, 255, 20, 255))

        # Carenagem Interna e Detalhes Verdes Neon
        draw.polygon([(cx, cy - 14), (cx + 6, cy), (cx - 6, cy)], fill=(57, 255, 20, 255))
        draw.rectangle([cx - 2, cy + 2, cx + 2, cy + 14], fill=(20, 10, 35, 255))

        # Máscara do Palhaço (Capacete / Farol Frontal)
        draw.ellipse([cx - 5, cy - 18, cx + 5, cy - 10], fill=(255, 255, 255, 255), outline=(255, 0, 60, 255))
        draw.ellipse([cx - 2, cy - 16, cx + 2, cy - 12], fill=(255, 0, 60, 255)) # Nariz vermelho

        # Guidão com manoplas fluorescentes
        draw.line([(cx - 14, cy - 6), (cx + 14, cy - 6)], fill=(80, 80, 100, 255), width=2)
        draw.rectangle([cx - 15, cy - 8, cx - 13, cy - 4], fill=(57, 255, 20, 255))
        draw.rectangle([cx + 13, cy - 8, cx + 15, cy - 4], fill=(57, 255, 20, 255))

        sheet.paste(img, (f * fw, 0))

    dest = os.path.join(OUTPUT_DIR, "enemy_biker_sheet.png")
    sheet.save(dest)
    print(f"Salvo: {dest} ({sheet.size})")


def create_enemy_interceptor_sheet():
    """4 frames de 54x64: Sirenes policiais alternadas (Vermelho/Ciano) + Propulsores hover pulsantes"""
    fw, fh = 54, 64
    num_frames = 4
    sheet = Image.new("RGBA", (fw * num_frames, fh), (0, 0, 0, 0))

    for f in range(num_frames):
        img = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        cx, cy = fw // 2, fh // 2

        # Sombra hover futurista
        draw.ellipse([cx - 18, cy + 16, cx + 18, cy + 26], fill=(0, 0, 0, 100))

        # Propulsores Laterais Hover (Turbinas anti-gravidade pulsantes)
        p_intensity = 3 + (f % 2) * 4
        # Propulsor Esquerdo
        draw.rounded_rectangle([cx - 24, cy - 2, cx - 17, cy + 16], radius=2, fill=(15, 25, 45, 255), outline=(0, 240, 255, 255))
        draw.ellipse([cx - 23, cy + 14, cx - 18, cy + 17 + p_intensity], fill=(0, 240, 255, 240))
        # Propulsor Direito
        draw.rounded_rectangle([cx + 17, cy - 2, cx + 24, cy + 16], radius=2, fill=(15, 25, 45, 255), outline=(0, 240, 255, 255))
        draw.ellipse([cx + 18, cy + 14, cx + 23, cy + 17 + p_intensity], fill=(0, 240, 255, 240))

        # Chassi Blindado Cyberpunk (Azul Noite / Aço Metálico)
        hull = [
            (cx, cy - 25),       # Bico aerodinâmico
            (cx + 16, cy - 10),  # Lateral frontal
            (cx + 15, cy + 20),  # Traseira direita
            (cx - 15, cy + 20),  # Traseira esquerda
            (cx - 16, cy - 10),  # Lateral frontal esquerda
        ]
        draw.polygon(hull, fill=(24, 30, 52, 255), outline=(70, 95, 145, 255))

        # Cockpit de Policiamento Tático (Vidro fumê escuro)
        cockpit = [(cx, cy - 16), (cx + 8, cy - 4), (cx + 6, cy + 6), (cx - 6, cy + 6), (cx - 8, cy - 4)]
        draw.polygon(cockpit, fill=(8, 12, 22, 255), outline=(0, 240, 255, 180))

        # Faixa policial POLICE / KANJI
        draw.rectangle([cx - 12, cy + 8, cx + 12, cy + 11], fill=(220, 225, 240, 255))
        draw.rectangle([cx - 3, cy + 8, cx + 3, cy + 11], fill=(255, 0, 60, 255))

        # Barra de Sirene Policial Cyberpunk (Alternância de luzes)
        s_y = cy - 2
        if f < 2:
            left_color = (255, 0, 60, 255)
            right_color = (0, 240, 255, 255)
            draw.ellipse([cx - 14, s_y - 2, cx - 4, s_y + 6], fill=(255, 0, 60, 100))
        else:
            left_color = (0, 240, 255, 255)
            right_color = (255, 0, 60, 255)
            draw.ellipse([cx + 4, s_y - 2, cx + 14, s_y + 6], fill=(0, 240, 255, 100))

        draw.rectangle([cx - 11, s_y, cx - 3, s_y + 4], fill=left_color)
        draw.rectangle([cx + 3, s_y, cx + 11, s_y + 4], fill=right_color)
        draw.rectangle([cx - 2, s_y, cx + 2, s_y + 4], fill=(255, 255, 255, 240))

        # Canhões Duplos Frontais
        draw.rectangle([cx - 10, cy - 27, cx - 8, cy - 20], fill=(160, 170, 190, 255))
        draw.rectangle([cx + 8, cy - 27, cx + 10, cy - 20], fill=(160, 170, 190, 255))

        sheet.paste(img, (f * fw, 0))

    dest = os.path.join(OUTPUT_DIR, "enemy_interceptor_sheet.png")
    sheet.save(dest)
    print(f"Salvo: {dest} ({sheet.size})")


def create_enemy_heli_sheet():
    """4 frames de 64x64: Rotação contínua das hélices em 0°, 45°, 90°, 135° + Sensor de busca"""
    fw, fh = 64, 64
    num_frames = 4
    sheet = Image.new("RGBA", (fw * num_frames, fh), (0, 0, 0, 0))

    for f in range(num_frames):
        img = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        cx, cy = fw // 2, fh // 2

        # Sombra no solo
        draw.ellipse([cx - 20, cy + 18, cx + 20, cy + 28], fill=(0, 0, 0, 80))

        # Cauda do Helicóptero com estabilizador
        draw.rectangle([cx - 3, cy + 10, cx + 3, cy + 28], fill=(45, 55, 45, 255), outline=(30, 40, 30, 255))
        draw.polygon([(cx - 10, cy + 24), (cx + 10, cy + 24), (cx, cy + 28)], fill=(35, 45, 35, 255))
        # Hélice de cauda girando
        tail_blade_y = cy + 26
        tb_offset = 5 if f % 2 == 0 else -5
        draw.line([(cx + 4, tail_blade_y - tb_offset), (cx + 4, tail_blade_y + tb_offset)], fill=(200, 255, 200, 220), width=2)

        # Fuselagem Blindada Militar (Verde Militar / Gunmetal)
        draw.ellipse([cx - 16, cy - 14, cx + 16, cy + 16], fill=(55, 70, 55, 255), outline=(75, 95, 75, 255))

        # Cabine / Cockpit de Vidro Fumê com Reflexo Hexagonal
        draw.ellipse([cx - 9, cy - 12, cx + 9, cy + 2], fill=(15, 28, 25, 255), outline=(0, 240, 255, 220))
        draw.line([(cx - 5, cy - 8), (cx + 5, cy - 8)], fill=(0, 240, 255, 200), width=1)

        # Pods de Armamento Laterais (Mini-guns / Mísseis)
        draw.rectangle([cx - 24, cy - 2, cx - 16, cy + 8], fill=(30, 35, 30, 255), outline=(20, 25, 20, 255))
        draw.rectangle([cx + 16, cy - 2, cx + 24, cy + 8], fill=(30, 35, 30, 255), outline=(20, 25, 20, 255))
        # Canos das armas
        draw.rectangle([cx - 22, cy + 8, cx - 18, cy + 14], fill=(200, 50, 50, 255))
        draw.rectangle([cx + 18, cy + 8, cx + 22, cy + 14], fill=(200, 50, 50, 255))

        # Sensor de Busca / Farol Dianteiro Neon (Pulso cíclico)
        sensor_color = (255, 0, 60, 255) if f % 2 == 0 else (252, 238, 10, 255)
        draw.ellipse([cx - 3, cy - 15, cx + 3, cy - 9], fill=sensor_color)

        # Hélice Principal Giratória (4 ângulos: 0, 45, 90, 135 graus)
        angle_deg = f * 45
        rad = math.radians(angle_deg)
        blade_len = 28
        b_color = (210, 245, 210, 230)
        blur_color = (180, 230, 180, 90)

        # Desenhamos 4 pás com rastro suave de desfoque de movimento
        for k in range(4):
            cur_rad = rad + k * (math.pi / 2)
            bx = cx + math.cos(cur_rad) * blade_len
            by = cy + math.sin(cur_rad) * blade_len
            # Rastro de desfoque
            prev_rad = cur_rad - 0.22
            pbx = cx + math.cos(prev_rad) * (blade_len - 2)
            pby = cy + math.sin(prev_rad) * (blade_len - 2)
            draw.line([(cx, cy), (pbx, pby)], fill=blur_color, width=4)
            # Pá nítida
            draw.line([(cx, cy), (bx, by)], fill=b_color, width=2)
            draw.ellipse([bx - 2, by - 2, bx + 2, by + 2], fill=(255, 255, 255, 240))

        # Cubo Central da Hélice
        draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(20, 25, 20, 255), outline=(255, 255, 255, 255))

        sheet.paste(img, (f * fw, 0))

    dest = os.path.join(OUTPUT_DIR, "enemy_heli_sheet.png")
    sheet.save(dest)
    print(f"Salvo: {dest} ({sheet.size})")


def create_boss_clown_sheet():
    """4 frames de 128x160: Caminhão Blindado Clown com olhos neon piscantes, dentes e turbinas ardendo"""
    fw, fh = 128, 160
    num_frames = 4
    sheet = Image.new("RGBA", (fw * num_frames, fh), (0, 0, 0, 0))

    for f in range(num_frames):
        img = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        cx, cy = fw // 2, fh // 2

        # Sombra Pesada
        draw.ellipse([cx - 50, cy + 50, cx + 50, cy + 74], fill=(0, 0, 0, 110))

        # Chamas dos Exaustores Superiores Traseiros
        flame_h = 10 + (f * 5) % 18
        draw.polygon([(cx - 36, cy + 62), (cx - 26, cy + 62), (cx - 31, cy + 62 + flame_h)], fill=(255, 100, 0, 240))
        draw.polygon([(cx + 26, cy + 62), (cx + 36, cy + 62), (cx + 31, cy + 62 + flame_h)], fill=(255, 100, 0, 240))
        draw.polygon([(cx - 34, cy + 62), (cx - 28, cy + 62), (cx - 31, cy + 62 + flame_h - 4)], fill=(252, 238, 10, 255))
        draw.polygon([(cx + 28, cy + 62), (cx + 34, cy + 62), (cx + 31, cy + 62 + flame_h - 4)], fill=(252, 238, 10, 255))

        # Chassi Blindado Retangular
        draw.rounded_rectangle([cx - 48, cy - 65, cx + 48, cy + 62], radius=8, fill=(45, 18, 75, 255), outline=(57, 255, 20, 255), width=3)
        # Placas de Blindagem de Aço Reforçado
        draw.rectangle([cx - 42, cy - 60, cx + 42, cy - 50], fill=(28, 10, 48, 255), outline=(90, 40, 130, 255))
        draw.rectangle([cx - 42, cy + 38, cx + 42, cy + 54], fill=(28, 10, 48, 255), outline=(90, 40, 130, 255))

        # Enorme Máscara / Caveira do Palhaço Cibernético no Centro
        draw.ellipse([cx - 30, cy - 35, cx + 30, cy + 25], fill=(240, 240, 250, 255), outline=(30, 10, 40, 255), width=2)

        # Olhos Neon da Caveira (Pulsam entre verde e vermelho neon furioso)
        eye_color = (57, 255, 20, 255) if f % 2 == 0 else (255, 0, 60, 255)
        eye_glow = (57, 255, 20, 100) if f % 2 == 0 else (255, 0, 60, 100)
        draw.ellipse([cx - 22, cy - 14, cx - 6, cy + 2], fill=eye_glow)
        draw.ellipse([cx + 6, cy - 14, cx + 22, cy + 2], fill=eye_glow)
        draw.ellipse([cx - 18, cy - 10, cx - 10, cy - 2], fill=eye_color)
        draw.ellipse([cx + 10, cy - 10, cx + 18, cy - 2], fill=eye_color)
        draw.ellipse([cx - 15, cy - 7, cx - 13, cy - 5], fill=(255, 255, 255, 255))
        draw.ellipse([cx + 13, cy - 7, cx + 15, cy - 5], fill=(255, 255, 255, 255))

        # Nariz e Boca com Sorriso Grotesco de Dentes Afiados
        draw.ellipse([cx - 5, cy - 2, cx + 5, cy + 6], fill=(255, 0, 60, 255))
        draw.arc([cx - 20, cy + 2, cx + 20, cy + 20], start=0, end=180, fill=(30, 10, 40, 255), width=3)
        # Dentes serrilhados
        for tx in range(cx - 15, cx + 16, 6):
            draw.polygon([(tx - 2, cy + 12), (tx + 2, cy + 12), (tx, cy + 17)], fill=(255, 255, 255, 255))

        # Canhões Pesados Duplos nas Extremidades Inferiores
        c_glow = (255, 50, 50, 255) if f == 2 else (180, 50, 50, 255)
        draw.rectangle([cx - 44, cy + 44, cx - 34, cy + 68], fill=(20, 20, 25, 255), outline=(57, 255, 20, 255))
        draw.rectangle([cx + 34, cy + 44, cx + 44, cy + 68], fill=(20, 20, 25, 255), outline=(57, 255, 20, 255))
        draw.ellipse([cx - 43, cy + 65, cx - 35, cy + 71], fill=c_glow)
        draw.ellipse([cx + 35, cy + 65, cx + 43, cy + 71], fill=c_glow)

        # Lança-mísseis laterais nos ombros
        draw.rectangle([cx - 48, cy - 42, cx - 36, cy - 18], fill=(15, 15, 22, 255), outline=(0, 240, 255, 255))
        draw.rectangle([cx + 36, cy - 42, cx + 48, cy - 18], fill=(15, 15, 22, 255), outline=(0, 240, 255, 255))
        for my in range(cy - 38, cy - 18, 7):
            draw.ellipse([cx - 44, my, cx - 40, my + 4], fill=(252, 238, 10, 255))
            draw.ellipse([cx + 40, my, cx + 44, my + 4], fill=(252, 238, 10, 255))

        sheet.paste(img, (f * fw, 0))

    dest = os.path.join(OUTPUT_DIR, "boss_clown_sheet.png")
    sheet.save(dest)
    print(f"Salvo: {dest} ({sheet.size})")


def create_boss_tank_sheet():
    """4 frames de 144x160: Mech Tank experimental com 4 esteiras móveis e reator central pulsante"""
    fw, fh = 144, 160
    num_frames = 4
    sheet = Image.new("RGBA", (fw * num_frames, fh), (0, 0, 0, 0))

    for f in range(num_frames):
        img = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        cx, cy = fw // 2, fh // 2

        # Sombra de apoio
        draw.ellipse([cx - 62, cy + 50, cx + 62, cy + 74], fill=(0, 0, 0, 120))

        # 4 Módulos de Esteiras Lagarta (Deslocam-se 3px a cada frame para dar ilusão de rolagem)
        tread_shift = (f * 4) % 12
        treads = [
            (cx - 62, cy - 65, cx - 44, cy - 10), # Dianteira Esquerda
            (cx + 44, cy - 65, cx + 62, cy - 10), # Dianteira Direita
            (cx - 62, cy + 10, cx - 44, cy + 65), # Traseira Esquerda
            (cx + 44, cy + 10, cx + 62, cy + 65), # Traseira Direita
        ]

        for (tx1, ty1, tx2, ty2) in treads:
            draw.rounded_rectangle([tx1, ty1, tx2, ty2], radius=4, fill=(18, 22, 32, 255), outline=(50, 65, 90, 255), width=2)
            # Ranhuras móveis da esteira
            for sy in range(ty1 + tread_shift, ty2, 8):
                if sy + 2 <= ty2:
                    draw.line([(tx1 + 2, sy), (tx2 - 2, sy)], fill=(90, 110, 140, 255), width=2)

        # Chassi Blindado Hexagonal
        hull = [
            (cx - 40, cy - 50),
            (cx + 40, cy - 50),
            (cx + 48, cy + 30),
            (cx + 34, cy + 56),
            (cx - 34, cy + 56),
            (cx - 48, cy + 30),
        ]
        draw.polygon(hull, fill=(45, 54, 72, 255), outline=(0, 240, 255, 255), width=3)

        # Escotilhas e Duto de Exaustão de Alta Voltagem
        draw.rectangle([cx - 32, cy - 42, cx - 18, cy - 25], fill=(25, 30, 42, 255), outline=(100, 120, 150, 255))
        draw.rectangle([cx + 18, cy - 42, cx + 32, cy - 25], fill=(25, 30, 42, 255), outline=(100, 120, 150, 255))

        # Reator de Plasma Nuclear / Núcleo Central
        core_r = 18 + (f % 3) * 2
        draw.ellipse([cx - core_r - 6, cy - 6 - core_r - 6, cx + core_r + 6, cy - 6 + core_r + 6], fill=(0, 240, 255, 60))
        draw.ellipse([cx - core_r, cy - 6 - core_r, cx + core_r, cy - 6 + core_r], fill=(0, 240, 255, 180), outline=(255, 255, 255, 255), width=2)
        draw.ellipse([cx - (core_r - 6), cy - 6 - (core_r - 6), cx + (core_r - 6), cy - 6 + (core_r - 6)], fill=(255, 255, 255, 240))

        # Canhão Pesado de Plasma Frontal
        draw.rectangle([cx - 10, cy + 26, cx + 10, cy + 74], fill=(20, 24, 34, 255), outline=(252, 238, 10, 255), width=2)
        draw.rectangle([cx - 12, cy + 62, cx + 12, cy + 66], fill=(252, 238, 10, 255))
        draw.rectangle([cx - 12, cy + 70, cx + 12, cy + 74], fill=(255, 0, 60, 255))

        # Luzes de Mira e Aviso
        warn_color = (255, 0, 60, 255) if f % 2 == 0 else (252, 238, 10, 255)
        draw.ellipse([cx - 28, cy + 20, cx - 22, cy + 26], fill=warn_color)
        draw.ellipse([cx + 22, cy + 20, cx + 28, cy + 26], fill=warn_color)

        sheet.paste(img, (f * fw, 0))

    dest = os.path.join(OUTPUT_DIR, "boss_tank_sheet.png")
    sheet.save(dest)
    print(f"Salvo: {dest} ({sheet.size})")


def create_boss_tetsuo_sheet():
    """6 frames de 160x180: Biomassa grotesca com tentáculos se contorcendo, múltiplos olhos e aura psíquica ondulante"""
    fw, fh = 160, 180
    num_frames = 6
    sheet = Image.new("RGBA", (fw * num_frames, fh), (0, 0, 0, 0))

    for f in range(num_frames):
        img = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        cx, cy = fw // 2, fh // 2

        # 1. Aura Psíquica Telecinética Ondulante
        phase = (f / num_frames) * math.pi * 2
        aura_r = 72 + int(math.sin(phase) * 6)
        aura_color = (176, 38, 255, 60 + int(math.sin(phase) * 30))
        aura_ring = (255, 0, 60, 140 + int(math.cos(phase) * 40))

        draw.ellipse([cx - aura_r, cy - aura_r, cx + aura_r, cy + aura_r], fill=aura_color, outline=aura_ring, width=2)
        draw.ellipse([cx - aura_r + 14, cy - aura_r + 14, cx + aura_r - 14, cy + aura_r - 14], outline=(0, 240, 255, 120), width=1)

        # 2. Tentáculos e Protrusões Orgânicas Mutantes
        tentacles = [
            (-45, -30, 24, phase),
            (45, -35, 26, phase + 1.2),
            (-55, 20, 28, phase + 2.4),
            (55, 15, 30, phase + 3.6),
            (0, 52, 34, phase + 4.8),
            (0, -50, 22, phase + 0.8),
        ]
        for (ox, oy, tr, tp) in tentacles:
            drift_x = int(math.cos(tp) * 8)
            drift_y = int(math.sin(tp) * 8)
            cur_x = cx + ox + drift_x
            cur_y = cy + oy + drift_y
            draw.ellipse([cur_x - tr, cur_y - tr, cur_x + tr, cur_y + tr], fill=(160, 25, 55, 255), outline=(90, 15, 30, 255), width=2)
            draw.line([(cx, cy), (cur_x, cur_y)], fill=(0, 240, 255, 140), width=2)

        # 3. Núcleo Principal de Biomassa
        draw.ellipse([cx - 48, cy - 42, cx + 48, cy + 48], fill=(195, 35, 68, 255), outline=(130, 20, 45, 255), width=3)
        draw.ellipse([cx - 36, cy - 30, cx + 36, cy + 34], fill=(225, 55, 88, 255))

        # 4. Restos Mecânicos e Tubos Cirúrgicos
        draw.line([(cx - 24, cy - 36), (cx - 40, cy - 10)], fill=(70, 75, 85, 255), width=4)
        draw.line([(cx + 20, cy - 34), (cx + 38, cy - 8)], fill=(70, 75, 85, 255), width=4)
        draw.line([(cx - 15, cy + 32), (cx - 28, cy + 48)], fill=(0, 240, 255, 200), width=3)

        # 5. Múltiplos Olhos Psíquicos com Pupilas Dilatadas
        eye1_blink = (f == 2)
        if not eye1_blink:
            draw.ellipse([cx - 16, cy - 18, cx + 16, cy + 6], fill=(252, 238, 10, 255), outline=(30, 5, 10, 255), width=2)
            p_offset = int(math.sin(phase) * 3)
            draw.ellipse([cx - 5 + p_offset, cy - 12, cx + 5 + p_offset, cy], fill=(0, 0, 0, 255))
            draw.ellipse([cx - 2 + p_offset, cy - 9, cx + 2 + p_offset, cy - 5], fill=(255, 255, 255, 255))
        else:
            draw.line([(cx - 16, cy - 6), (cx + 16, cy - 6)], fill=(60, 10, 20, 255), width=3)

        eye2_blink = (f == 4)
        if not eye2_blink:
            draw.ellipse([cx - 36, cy - 4, cx - 20, cy + 12], fill=(252, 238, 10, 255), outline=(0, 0, 0, 255))
            draw.ellipse([cx - 30, cy, cx - 26, cy + 8], fill=(0, 0, 0, 255))
        else:
            draw.line([(cx - 36, cy + 4), (cx - 20, cy + 4)], fill=(60, 10, 20, 255), width=2)

        eye3_blink = (f == 5)
        if not eye3_blink:
            draw.ellipse([cx + 18, cy - 2, cx + 34, cy + 14], fill=(255, 0, 60, 255), outline=(0, 0, 0, 255))
            draw.ellipse([cx + 24, cy + 2, cx + 28, cy + 10], fill=(255, 255, 255, 255))
        else:
            draw.line([(cx + 18, cy + 6), (cx + 34, cy + 6)], fill=(60, 10, 20, 255), width=2)

        # Faíscas e Raios Psíquicos
        if f % 2 == 1:
            draw.line([(cx - 20, cy - 40), (cx - 10, cy - 52), (cx - 24, cy - 62)], fill=(0, 240, 255, 240), width=2)
            draw.line([(cx + 25, cy + 20), (cx + 42, cy + 34), (cx + 56, cy + 26)], fill=(255, 0, 60, 240), width=2)

        sheet.paste(img, (f * fw, 0))

    dest = os.path.join(OUTPUT_DIR, "boss_tetsuo_sheet.png")
    sheet.save(dest)
    print(f"Salvo: {dest} ({sheet.size})")


if __name__ == "__main__":
    print("Iniciando renderização dos spritesheets animados...")
    create_enemy_biker_sheet()
    create_enemy_interceptor_sheet()
    create_enemy_heli_sheet()
    create_boss_clown_sheet()
    create_boss_tank_sheet()
    create_boss_tetsuo_sheet()
    print("Todos os spritesheets foram gerados com sucesso!")
