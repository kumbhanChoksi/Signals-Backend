import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  tenantId: string;
}

export function generateToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return jwt.sign(payload, secret, { expiresIn: '1h' });
}
