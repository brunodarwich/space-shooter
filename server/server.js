import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pixRouter } from './routes/pix.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api', pixRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'online', service: 'Neo-Tokyo Shmup API', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [Neo-Tokyo Server] Rodando na porta http://localhost:${PORT}`);
  console.log(`💳 [Mercado Pago PIX] Rotas de pagamento prontas.`);
  console.log(`🎮 [Game API] Health check em http://localhost:${PORT}/health`);
  console.log(`======================================================\n`);
});
