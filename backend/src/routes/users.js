import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { isUserOnline } from '../ws.js';

const router = Router();

router.use(authMiddleware);

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.user.userId } },
      select: { id: true, email: true, createdAt: true },
      orderBy: { email: 'asc' },
    });

    const usersWithStatus = users.map((u) => ({
      ...u,
      online: isUserOnline(u.id),
    }));

    return res.json({ users: usersWithStatus });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/messages/:peerId', async (req, res) => {
  const { peerId } = req.params;
  const currentUserId = req.user.userId;

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: peerId },
          { senderId: peerId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        senderId: true,
        receiverId: true,
        createdAt: true,
      },
    });

    return res.json({ messages });
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
