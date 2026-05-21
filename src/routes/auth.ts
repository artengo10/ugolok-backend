import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(email: string, code: string) {
  return resend.emails.send({
    from: 'Уголок вкуса <noreply@ugolok-vkusa1.ru>',
    to: email,
    subject: 'Код подтверждения — Уголок вкуса',
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">Уголок вкуса</h2>
        <p style="color:#555;margin:0 0 24px">Ваш код подтверждения:</p>
        <div style="background:#f5f0eb;border-radius:12px;padding:20px;text-align:center">
          <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a1a">${code}</span>
        </div>
        <p style="color:#888;font-size:13px;margin:16px 0 0">Код действует 10 минут.</p>
      </div>
    `,
  });
}

// POST /auth/register — шаг 1: имя + email + пароль → OTP на почту
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = z.object({
      name: z.string().min(2, 'Минимум 2 символа'),
      email: z.string().email('Некорректный email'),
      password: z.string().min(8, 'Минимум 8 символов'),
    }).parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      res.status(409).json({ error: 'Пользователь с таким email уже зарегистрирован' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.upsert({
      where: { email },
      update: { name, passwordHash },
      create: { email, name, passwordHash },
    });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.otpCode.create({ data: { email, code, expiresAt } });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP register] ${email} → ${code}`);
    }

    const { error: resendError } = await sendOtpEmail(email, code);
    if (resendError) {
      console.error('[Resend error]', resendError);
      res.status(500).json({ error: 'Не удалось отправить письмо. Проверьте email.' });
      return;
    }

    res.json({ ok: true });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: e.errors[0]?.message ?? 'Некорректные данные' });
    } else {
      console.error('[register error]', e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
});

// POST /auth/verify-registration — шаг 2: подтвердить OTP после регистрации
router.post('/verify-registration', async (req, res) => {
  try {
    const { email, code } = z.object({
      email: z.string().email(),
      code: z.string().length(6),
    }).parse(req.body);

    const otp = await prisma.otpCode.findFirst({
      where: { email, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      res.status(400).json({ error: 'Неверный или истёкший код' });
      return;
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, bonusPoints: user.bonusPoints },
    });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Некорректные данные' });
    } else {
      console.error('[verify-registration error]', e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
});

// POST /auth/login — вход по email + пароль
router.post('/login', async (req, res) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, bonusPoints: user.bonusPoints },
    });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Некорректные данные' });
    } else {
      console.error('[login error]', e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
});

// POST /auth/send-otp — оставлен для обратной совместимости
router.post('/send-otp', async (req, res) => {
  try {
    const { email, type } = z.object({
      email: z.string().email(),
      type: z.enum(['login', 'register']).optional(),
    }).parse(req.body);

    if (type === 'login') {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        res.status(404).json({ error: 'Пользователь не найден. Сначала зарегистрируйтесь.' });
        return;
      }
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.otpCode.create({ data: { email, code, expiresAt } });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[OTP] ${email} → ${code}`);
    }

    const { error: resendError } = await sendOtpEmail(email, code);
    if (resendError) {
      console.error('[Resend error]', resendError);
      res.status(500).json({ error: 'Не удалось отправить письмо.' });
      return;
    }

    res.json({ ok: true });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Некорректный email' });
    } else {
      console.error('[send-otp error]', e);
      res.status(500).json({ error: e.message || 'Ошибка сервера' });
    }
  }
});

// POST /auth/verify-otp — оставлен для обратной совместимости
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code, name } = z.object({
      email: z.string().email(),
      code: z.string().length(6),
      name: z.string().optional(),
    }).parse(req.body);

    const otp = await prisma.otpCode.findFirst({
      where: { email, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      res.status(400).json({ error: 'Неверный или истёкший код' });
      return;
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: name ?? null },
    });

    const token = signToken({ userId: user.id, email: user.email });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, bonusPoints: user.bonusPoints },
    });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Некорректные данные' });
    } else {
      console.error('[verify-otp error]', e);
      res.status(500).json({ error: e.message || 'Ошибка сервера' });
    }
  }
});

export default router;
