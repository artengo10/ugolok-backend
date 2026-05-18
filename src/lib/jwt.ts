import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;
const EXPIRES_IN = '30d';

export function signToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string; email: string } {
  return jwt.verify(token, SECRET) as { userId: string; email: string };
}
