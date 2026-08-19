import { handle } from '../../../lib/api/respond.js';
import { updateProfile } from '../../../lib/api/session-service.js';

export const dynamic = 'force-dynamic';

export async function PUT(request) {
  const body = await request.json();
  return handle(() => updateProfile(body));
}
