import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from './middleware/auth.js';
import { prisma } from './prisma.js';

// Map<userId, Set<WebSocket>>
const clients = new Map();

export function isUserOnline(userId) {
  const sockets = clients.get(userId);
  return Boolean(sockets && sockets.size > 0);
}

function sendToUser(userId, payload) {
  const sockets = clients.get(userId);
  if (!sockets) return;
  const serialized = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(serialized);
    }
  }
}

function broadcastPresence(userId, online) {
  const serialized = JSON.stringify({ type: 'presence', userId, online });
  for (const sockets of clients.values()) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(serialized);
      }
    }
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Authentication token required');
      return;
    }

    let user;
    try {
      user = verifyToken(token);
    } catch {
      ws.close(1008, 'Invalid or expired token');
      return;
    }

    const userId = user.userId;
    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    const wasOffline = clients.get(userId).size === 0;
    clients.get(userId).add(ws);

    if (wasOffline) {
      broadcastPresence(userId, true);
    }

    ws.on('message', async (raw) => {
      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (data.type !== 'message') return;

      const receiverId = data.receiverId;
      const content = typeof data.content === 'string' ? data.content.trim() : '';
      if (!receiverId || !content) return;

      try {
        const message = await prisma.message.create({
          data: {
            senderId: userId,
            receiverId,
            content,
          },
          select: {
            id: true,
            content: true,
            senderId: true,
            receiverId: true,
            createdAt: true,
          },
        });

        const event = { type: 'message', message };
        sendToUser(userId, event);
        if (receiverId !== userId) {
          sendToUser(receiverId, event);
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({ type: 'error', error: 'Failed to send message' }));
      }
    });

    ws.on('close', () => {
      const sockets = clients.get(userId);
      if (!sockets) return;
      sockets.delete(ws);
      if (sockets.size === 0) {
        clients.delete(userId);
        broadcastPresence(userId, false);
      }
    });
  });

  return wss;
}
