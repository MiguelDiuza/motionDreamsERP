import { NextResponse } from 'next/server';

/**
 * Validates the agent bearer token on /api/agent/* routes.
 *
 * Agents (n8n WhatsApp, OpenClaw) authenticate with:
 *   Authorization: Bearer <AGENT_API_TOKEN>
 *
 * Returns a 401 NextResponse when the token is missing/invalid, or `null` when
 * the request is authorized (handlers should `return` the response if non-null).
 */
export function requireAgentToken(request: Request): NextResponse | null {
  const expected = process.env.AGENT_API_TOKEN;

  if (!expected) {
    return NextResponse.json(
      { error: 'AGENT_API_TOKEN is not configured on the server' },
      { status: 500 }
    );
  }

  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : '';

  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
