import { handle } from '../../../lib/api/respond.js';
import { describeForm } from '../../../lib/api/form-service.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(() => describeForm());
}
