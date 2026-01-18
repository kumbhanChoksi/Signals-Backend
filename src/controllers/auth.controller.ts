import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db';
import { generateToken } from '../utils/jwt';
import logger from '../utils/logger';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const emailNormalized = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { passwordHash, ...userWithoutPassword } = user;

    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
    });

    res.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    logger.error({ err: error }, 'Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
}
