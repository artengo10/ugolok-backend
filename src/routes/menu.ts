import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /menu?category=pizza
router.get('/', async (req, res) => {
  const { category } = req.query;

  const items = await prisma.menuItem.findMany({
    where: {
      available: true,
      ...(category ? { category: { slug: String(category) } } : {}),
    },
    include: { category: true },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
  });

  res.json(items);
});

// GET /menu/categories
router.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(categories);
});

// GET /menu/:id
router.get('/:id', async (req, res) => {
  const item = await prisma.menuItem.findUnique({
    where: { id: req.params.id },
    include: { category: true },
  });
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(item);
});

export default router;
