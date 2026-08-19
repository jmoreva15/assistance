import { handle } from '../../../lib/api/respond.js';
import { submitRecords } from '../../../lib/api/submission-service.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request) {
  const body = await request.json();
  return handle(() => submitRecords(body));
}
