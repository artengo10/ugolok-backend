import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /profile
router.get('/', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, phone: true, bonusPoints: true, createdAt: true },
  });
  if (!user) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(user);
});

// PUT /profile
router.put('/', async (req: AuthRequest, res) => {
  const data = z.object({ name: z.string().min(2).optional(), phone: z.string().optional() }).parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data,
    select: { id: true, email: true, name: true, phone: true, bonusPoints: true },
  });
  res.json(user);
});

// PUT /profile/push-token
router.put('/push-token', async (req: AuthRequest, res) => {
  const { token } = z.object({ token: z.string() }).parse(req.body);
  await prisma.user.update({ where: { id: req.user!.userId }, data: { pushToken: token } });
  res.json({ ok: true });
});

// GET /profile/addresses
router.get('/addresses', async (req: AuthRequest, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.userId },
    orderBy: { isDefault: 'desc' },
  });
  res.json(addresses);
});

// POST /profile/addresses
router.post('/addresses', async (req: AuthRequest, res) => {
  const data = z.object({ label: z.string().optional(), value: z.string().min(3), isDefault: z.boolean().optional() }).parse(req.body);

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.userId }, data: { isDefault: false } });
  }

  const address = await prisma.address.create({ data: { ...data, userId: req.user!.userId } });
  res.status(201).json(address);
});

// DELETE /profile/addresses/:id
router.delete('/addresses/:id', async (req: AuthRequest, res) => {
  await prisma.address.deleteMany({ where: { id: String(req.params.id), userId: req.user!.userId } });
  res.json({ ok: true });
});

export default router;
