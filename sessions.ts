// Simple in-memory session store for this installation
const sessions = new Map<string, { userId: string; username: string; expiresAt: number }>();

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function createSession(userId: string, username: string): string {
  const token = crypto.randomUUID();
  sessions.set(token, {
    userId,
    username,
    expiresAt: Date.now() + SESSION_DURATION,
  });
  return token;
}

export function validateSession(token: string): { userId: string; username: string } | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return { userId: session.userId, username: session.username };
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // every hour
