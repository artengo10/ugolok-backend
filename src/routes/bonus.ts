import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /bonus — баланс и история
router.get('/', async (req: AuthRequest, res) => {
  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { bonusPoints: true },
    }),
    prisma.bonusTransaction.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  if (!user) { res.status(404).json({ error: 'Not found' }); return; }

  res.json({ balance: user.bonusPoints, transactions });
});

export default router;
