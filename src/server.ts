import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import menuRouter from './routes/menu';
import ordersRouter from './routes/orders';
import profileRouter from './routes/profile';
import bonusRouter from './routes/bonus';

const app = express();
const PORT = Number(process.env.PORT) || 3003;

app.use(cors({ origin: '*' }));
app.use(express.json());

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
