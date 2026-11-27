import {env} from 'cloudflare:workers';
import {familyP1Auth, familyP1Enabled} from '@/lib/family-p1-session';
import {readFamilyLearning, type FamilyLearningProvider} from '@/lib/family-learning';

export const dynamic = 'force-dynamic';
export function GET(request: Request) {
  const values = env as unknown as Record<string, unknown>;
  if (!familyP1Enabled(values, process.env.NODE_ENV)) {
    return new Response(null, {status: 404, headers: {'Cache-Control': 'private, no-store'}});
  }
  return readFamilyLearning(request, familyP1Auth(values), values.FAMILY_LEARNING_PROVIDER as FamilyLearningProvider | undefined);
}
