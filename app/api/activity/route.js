import { handle } from '../../../lib/api/respond.js';
import { readActivity, recordActivity } from '../../../lib/api/activity-service.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json();
  return handle(() => recordActivity(body));
}

export async function GET(request) {
  const userId = new URL(request.url).searchParams.get('userId');
  return handle(() => readActivity(userId));
}
