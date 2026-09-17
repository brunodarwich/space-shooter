# 🏍️ Neo-Tokyo: Akira Protocol (Roguelite Shmup + Mercado Pago PIX)

Jogo de tiro vertical arcade (*Shoot 'em Up / Roguelite*) ambientado no universo cyberpunk de **Akira** (Neo-Tokyo), jogável diretamente no navegador (Desktop e Celular), com sistema de loja integrado ao **Mercado Pago** para recebimento de pagamentos **PIX** e liberação instantânea de itens in-game.

---

## ⚡ Como Rodar o Projeto

### 1. Pré-requisitos
- Node.js instalado (v18 ou superior)

### 2. Instalar todas as dependências
```bash
npm run install:all
```

### 3. Rodar Cliente e Servidor simultaneamente
```bash
npm run dev
```

- **Frontend (Jogo)**: `http://localhost:5173`
- **Backend (API & Pix)**: `http://localhost:3001`

---

## 💳 Configurando o Mercado Pago (PIX Real)

1. Acesse o [Painel de Desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app).
2. Crie uma aplicação ou acesse suas credenciais de Produção ou Teste.
3. Copie o seu **Access Token** (`APP_USR-...` ou `TEST-...`).
4. Abra o arquivo `server/.env` e cole o seu token:
   ```env
   MERCADO_PAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN_AQUI
   PORT=3001
   ALLOW_DEV_SIMULATION=true
   ```
5. Quando o jogador comprar qualquer pacote Pix na loja, o QR Code oficial do Banco Central gerado pelo Mercado Pago será exibido na tela do jogo junto com o código Copia e Cola.
6. Assim que o pagamento for confirmado no banco, o jogo recebe a notificação em tempo real via **Server-Sent Events (SSE)** e adiciona as Pills / Vidas / Power-ups na hora!

> 💡 **Dica para Testes Locais**: Se você ainda não configurou o token ou quer testar a experiência sem gastar dinheiro real, o jogo possui um botão **"⚡ [TESTE] Simular Aprovação Imediata"** no modal Pix que simula o webhook e aprova a compra instantaneamente.

---

## 🎮 Controles

| Ação | Teclado (PC) | Mouse / Touch (Mobile) |
| :--- | :--- | :--- |
| **Mover Moto** | `W`, `A`, `S`, `D` ou `Setas` | Arrastar o dedo / cursor na tela |
| **Disparo Laser** | Automático contínuo | Automático contínuo |
| **Raio Orbital SOL** | Tecla `B` ou `Espaço` | Botão tático vermelho `SOL` no HUD |
| **Acessar Loja** | Botão `🛒 Loja` no menu/HUD | Toque no botão de loja |

---

## 🛠️ Tecnologias Utilizadas

- **Phaser 3**: Motor de jogos 2D com física Arcade Physics e aceleração WebGL.
- **Vite**: Bundler ultra-rápido para o frontend.
- **Web Audio API**: Sintetizador sonoro procedural para trilha sonora Synthwave e efeitos de laser/explosões sem dependências externas de áudio.
- **Node.js + Express**: Servidor de backend seguro para processamento de Pix.
- **Mercado Pago SDK Oficial (`mercadopago`)**: Geração e consulta de cobranças Pix.
- **Server-Sent Events (SSE)**: Atualização em tempo real do status de pagamento sem necessidade de recarregar a página.
