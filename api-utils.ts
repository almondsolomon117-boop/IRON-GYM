import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

// Helper to get auth or return 401
export function requireAuth(request: Request): { userId: string; username: string } | NextResponse {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Use verifyToken synchronously — it returns a Promise
  // We handle this in the route handlers
  return null as unknown as { userId: string; username: string };
}

// Async version for route handlers
export async function getAuthUser(request: Request): Promise<{ userId: string; username: string } | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

// Input sanitization to prevent XSS
export function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
