import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import { attachWebSocketServer } from './ws.js';

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const corsOrigin =
  CLIENT_ORIGIN === '*'
    ? true
    : CLIENT_ORIGIN.split(',').map((o) => o.trim());

const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);

const server = http.createServer(app);
attachWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
