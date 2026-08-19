import { handle } from '../../../lib/api/respond.js';
import { removeDraft, saveDraft } from '../../../lib/api/draft-service.js';

export const dynamic = 'force-dynamic';

export async function PUT(request) {
  const body = await request.json();
  return handle(() => saveDraft(body));
}

export async function DELETE(request) {
  const body = await request.json();
  return handle(() => removeDraft(body));
}
