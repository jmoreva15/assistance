import { handle } from '../../../lib/api/respond.js';
import { openSession, resumeSession } from '../../../lib/api/session-service.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json();
  return handle(() => (body.userId ? resumeSession(body.userId) : openSession(body)));
}
