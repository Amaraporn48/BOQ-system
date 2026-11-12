import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const FALLBACK_DEV_SECRET = 'boq-quotation-system-secret-key-2026-secure-super-long-token';
let warnedMissingJwtSecret = false;

function getJwtSecret(): Uint8Array {
  const envSecret = process.env.JWT_SECRET;
  if (!envSecret && process.env.NODE_ENV === 'production' && !warnedMissingJwtSecret) {
    warnedMissingJwtSecret = true;
    console.warn('[auth] JWT_SECRET is not set in production environment variables; using fallback secret.');
  }
  return new TextEncoder().encode(envSecret || FALLBACK_DEV_SECRET);
}

export const COOKIE_NAME = 'boq_auth_token';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface UserSessionPayload {
  userId: string;
  username: string;
  name: string;
  role: string;
  email: string;
}

export async function createSessionToken(payload: UserSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as UserSessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  // Verify user still exists and is active in DB
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, name: true, role: true, email: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  return {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email,
  };
}
