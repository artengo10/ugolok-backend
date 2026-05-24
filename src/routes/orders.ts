import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { sendMaxMessage, sendMaxOrderMessage, removeMaxOrderButtons } from '../lib/max';

const router = Router();

const BONUS_EARN_RATE = 0.05;
const BONUS_SPEND_MAX = 0.30;

const SITE_URL = 'https://ugolok-vkusa1.ru';

const orderItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  price: z.number().min(0),
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
    // Если бонусы списывались — начисление не происходит (либо копишь, либо тратишь)
    const bonusEarned = req.user && bonusUsed === 0 ? Math.floor(total * BONUS_EARN_RATE) : 0;

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
              price: Math.round(i.price),
              quantity: i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Только списание бонусов происходит сразу; начисление — после подтверждения
      if (req.user && bonusUsed > 0) {
        await tx.user.update({
          where: { id: req.user.userId },
          data: { bonusPoints: { decrement: bonusUsed } },
        });
        await tx.bonusTransaction.create({
          data: {
            userId: req.user.userId,
            amount: -bonusUsed,
            type: 'SPEND',
            note: `Списание за заказ #${created.id.slice(-6)}`,
          },
        });
      }

      return created;
    });

    // Уведомление в Max с кнопками
    const adminSecret = process.env.ADMIN_SECRET ?? '';
    const confirmUrl = `${SITE_URL}/api/orders/${order.id}/confirm-payment?s=${adminSecret}`;
    const rejectUrl  = `${SITE_URL}/api/orders/${order.id}/reject-payment?s=${adminSecret}`;

    const sourceLabel = data.source === 'app' ? '📱 ПРИЛОЖЕНИЕ' : '🌐 САЙТ';
    const itemsList = data.items
      .map((i) => `• ${i.name} x${i.quantity} — ${i.price * i.quantity}₽`)
      .join('\n');
    const deliveryInfo = data.type === 'DELIVERY'
      ? `Адрес: ${data.address}\nРайон: ${data.district ?? '—'}`
      : `Самовывоз в: ${data.pickupTime ?? '—'}`;

    const bonusLine  = bonusUsed   > 0 ? `\nСписано баллов: −${bonusUsed}₽` : '';
    const prepayLine = data.prepayment > 0 ? `\nПредоплата: ${data.prepayment}₽` : '';
    const earnLine   = bonusEarned  > 0 ? `\nНачислят баллов: +${bonusEarned} (после подтверждения)` : '';

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

    // Кнопки подтверждения для всех заказов
    sendMaxOrderMessage(message, confirmUrl, rejectUrl)
      .then(messageId => {
        if (messageId) {
          prisma.order.update({ where: { id: order.id }, data: { maxMessageId: messageId } })
            .catch(e => console.error('[orders] save maxMessageId:', e));
        }
      })
      .catch(() => {});

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

// GET /orders/:id/confirm-payment — подтверждение оплаты (открывает в браузере)
router.get('/:id/confirm-payment', async (req, res) => {
  const { s } = req.query;
  if (!s || s !== process.env.ADMIN_SECRET) {
    res.status(403).send(html('403 Доступ запрещён', '❌', 'Неверный ключ доступа.'));
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } });
  if (!order) {
    res.status(404).send(html('Заказ не найден', '❓', 'Заказ не найден в базе данных.'));
    return;
  }
  if (order.status === 'CANCELLED') {
    res.send(html('Заказ отменён', '⚠️', `Заказ #${order.id.slice(-6).toUpperCase()} уже был отменён.`));
    return;
  }
  if (order.bonusCredited) {
    res.send(html('Уже подтверждено', '✅', `Заказ #${order.id.slice(-6).toUpperCase()} уже подтверждён, бонусы начислены.`));
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CONFIRMED', bonusCredited: true },
    });
    if (order.userId && order.bonusEarned > 0) {
      await tx.user.update({
        where: { id: order.userId },
        data: { bonusPoints: { increment: order.bonusEarned } },
      });
      await tx.bonusTransaction.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          amount: order.bonusEarned,
          type: 'EARN',
          note: `Заказ #${order.id.slice(-6)}`,
        },
      });
    }
  });

  if (order.maxMessageId) {
    removeMaxOrderButtons(order.maxMessageId, order.id, true).catch(() => {});
  }

  const bonusMsg = order.userId && order.bonusEarned > 0
    ? `Клиенту начислено +${order.bonusEarned} бонусных баллов.`
    : 'Бонусы не предусмотрены (гость или нулевая сумма).';
  res.send(html('Оплата подтверждена!', '✅', `Заказ #${order.id.slice(-6).toUpperCase()} подтверждён.<br>${bonusMsg}`));
});

// GET /orders/:id/reject-payment — отклонение оплаты
router.get('/:id/reject-payment', async (req, res) => {
  const { s } = req.query;
  if (!s || s !== process.env.ADMIN_SECRET) {
    res.status(403).send(html('403 Доступ запрещён', '❌', 'Неверный ключ доступа.'));
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } });
  if (!order) {
    res.status(404).send(html('Заказ не найден', '❓', 'Заказ не найден в базе данных.'));
    return;
  }
  if (order.status === 'CANCELLED') {
    res.send(html('Уже отменён', '⚠️', `Заказ #${order.id.slice(-6).toUpperCase()} уже отменён.`));
    return;
  }
  if (order.bonusCredited) {
    res.send(html('Уже подтверждён', '⚠️', `Заказ #${order.id.slice(-6).toUpperCase()} уже был подтверждён.`));
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
    // Возвращаем потраченные бонусы если были
    if (order.userId && order.bonusUsed > 0) {
      await tx.user.update({
        where: { id: order.userId },
        data: { bonusPoints: { increment: order.bonusUsed } },
      });
      await tx.bonusTransaction.create({
        data: {
          userId: order.userId,
          amount: order.bonusUsed,
          type: 'EARN',
          note: `Возврат баллов за отменённый заказ #${order.id.slice(-6)}`,
        },
      });
    }
  });

  if (order.maxMessageId) {
    removeMaxOrderButtons(order.maxMessageId, order.id, false).catch(() => {});
  }

  res.send(html('Заказ отменён', '❌', `Заказ #${order.id.slice(-6).toUpperCase()} отменён. ${order.bonusUsed > 0 ? `Возвращено ${order.bonusUsed} бонусов клиенту.` : ''}`));
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

function html(title: string, icon: string, body: string): string {
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f0eb}.box{text-align:center;padding:40px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:360px}.icon{font-size:56px;margin-bottom:16px}h1{margin:0 0 12px;font-size:22px;color:#1a1a1a}p{color:#666;margin:0;line-height:1.6}</style></head><body><div class="box"><div class="icon">${icon}</div><h1>${title}</h1><p>${body}</p></div></body></html>`;
}

export default router;
