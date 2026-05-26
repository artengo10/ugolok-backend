import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth';
import menuRouter from './routes/menu';
import ordersRouter from './routes/orders';
import profileRouter from './routes/profile';
import bonusRouter from './routes/bonus';

const app = express();
const PORT = Number(process.env.PORT) || 3003;

const ALLOWED_ORIGINS = [
  'https://ugolok-vkusa1.ru',
  'http://localhost:3000',
  'http://localhost:3002',
];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50kb' }));

// Rate limiting для auth роутов
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10,
  message: { error: 'Слишком много запросов, попробуйте через 15 минут' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5,
  message: { error: 'Слишком много попыток отправки кода, попробуйте через час' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/auth/forgot-password', otpLimiter);
app.use('/auth/send-otp', otpLimiter);
app.use('/auth/verify-otp', authLimiter);
app.use('/auth/verify-registration', authLimiter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/menu', menuRouter);
app.use('/orders', ordersRouter);
app.use('/profile', profileRouter);
app.use('/bonus', bonusRouter);

app.listen(PORT, () => {
  console.log(`ugolok-backend running on port ${PORT}`);
});

export default app;
