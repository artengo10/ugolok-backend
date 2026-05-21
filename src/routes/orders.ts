import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { sendMaxMessage } from '../lib/max';

const router = Router();

const BONUS_EARN_RATE = 0.05;
const BONUS_SPEND_MAX = 0.30;

const orderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  type: z.enum(['DELIVERY', 'PICKUP']),
  name: z.string().min(2),
  phone: z.string().min(7),
  address: z.string().optional(),
  district: z.string().optional(),
  pickupTime: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  delivery: z.number().int().min(0).optional().default(0),
  bonusToSpend: z.number().int().min(0).optional().default(0),
  prepayment: z.number().int().min(0).optional().default(0),
  source: z.enum(['website', 'app']).optional().default('website'),
  note: z.string().optional(),
});

// POST /orders — создать заказ (auth optional)
router.post('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const data = createOrderSchema.parse(req.body);

    const subtotal = data.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const delivery = data.delivery;

    let bonusUsed = 0;
    if (req.user && data.bonusToSpend > 0) {
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      const maxSpend = Math.floor(subtotal * BONUS_SPEND_MAX);
      bonusUsed = Math.min(data.bonusToSpend, user.bonusPoints, maxSpend);
    }

    const total = subtotal + delivery - bonusUsed;
    const bonusEarned = req.user ? Math.floor(total * BONUS_EARN_RATE) : 0;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          type: data.type,
          name: data.name,
          phone: data.phone,
          address: data.address,
          district: data.district,
          pickupTime: data.pickupTime,
          note: data.note,
          subtotal,
          delivery,
          total,
          bonusUsed,
          bonusEarned,
          userId: req.user?.userId ?? null,
          items: {
            create: data.items.map((i) => ({
              name: i.name,
              price: i.price,
              quantity: i.quantity,
              menuItemId: i.id,
            })),
          },
        },
        include: { items: true },
      });

      if (req.user) {
        const delta = bonusEarned - bonusUsed;
        await tx.user.update({
          where: { id: req.user.userId },
          data: { bonusPoints: { increment: delta } },
        });

        await tx.bonusTransaction.create({
          data: {
            userId: req.user.userId,
            orderId: created.id,
            amount: bonusEarned,
            type: 'EARN',
            note: `Заказ #${created.id.slice(-6)}`,
          },
        });

        if (bonusUsed > 0) {
          await tx.bonusTransaction.create({
            data: {
              userId: req.user.userId,
              amount: -bonusUsed,
              type: 'SPEND',
              note: `Списание за заказ #${created.id.slice(-6)}`,
            },
          });
        }
      }

      return created;
    });

    // Уведомление в Max
    const sourceLabel = data.source === 'app' ? '📱 ПРИЛОЖЕНИЕ' : '🌐 САЙТ';
    const itemsList = data.items
      .map((i) => `• ${i.name} x${i.quantity} — ${i.price * i.quantity}₽`)
      .join('\n');
    const deliveryInfo = data.type === 'DELIVERY'
      ? `Адрес: ${data.address}\nРайон: ${data.district ?? '—'}`
      : `Самовывоз в: ${data.pickupTime ?? '—'}`;

    const bonusLine = bonusUsed > 0 ? `\nСписано баллов: ${bonusUsed}₽` : '';
    const prepayLine = data.prepayment > 0 ? `\nПредоплата: ${data.prepayment}₽` : '';
    const earnLine = bonusEarned > 0 ? `\nНачислено баллов: +${bonusEarned}` : '';

    const message = `🛒 НОВЫЙ ЗАКАЗ — ${sourceLabel}

Клиент: ${data.name}
Телефон: ${data.phone}
Тип: ${data.type === 'DELIVERY' ? 'Доставка' : 'Самовывоз'}
${deliveryInfo}

Товары:
${itemsList}

Сумма: ${subtotal}₽${delivery > 0 ? `\nДоставка: +${delivery}₽` : ''}${bonusLine}${prepayLine}
Итого: ${total}₽${earnLine}

ID: #${order.id.slice(-6)}
Время: ${new Date().toLocaleString('ru-RU')}`;

    sendMaxMessage(message).catch(() => {}); // не блокируем ответ

    res.status(201).json(order);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Некорректные данные', details: e.errors });
    } else {
      console.error('[orders POST]', e);
      res.status(500).json({ error: e.message || 'Ошибка сервера' });
    }
  }
});

// GET /orders — история заказов (auth required)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.userId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

// GET /orders/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const order = await prisma.order.findFirst({
    where: { id: String(req.params.id), userId: req.user!.userId },
    include: { items: true },
  });
  if (!order) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(order);
});

export default router;
