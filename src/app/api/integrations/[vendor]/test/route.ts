import {requireAdmin} from '@/lib/api-guard';
import {NextResponse, type NextRequest} from 'next/server';
import {FINESSE_API, SERVICE_ROLE, createClient as createDb} from '@/lib/data/compat';
import {createClient} from '@/lib/data/server';
import {getConfig, IntegrationDisabledError} from '@/lib/config';
import {runTest, type TestResult} from '@/lib/integrations/test';

export const runtime = 'nodejs';


export async function POST(_req: NextRequest, ctx: {params: Promise<{vendor: string}>}) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({error: 'forbidden'}, {status: 403});

  const {vendor} = await ctx.params;
  const start = Date.now();

  try {
    const cfg = await getConfig(vendor);
    const result = await runTest(vendor, cfg);
    result.latency_ms = Date.now() - start;

    // Persist outcome on the integrations row + audit log
    const admin = createDb(
      FINESSE_API,
      SERVICE_ROLE,
      {auth: {persistSession: false}},
    );
    await admin.from('integrations').update({
      last_tested_at: new Date().toISOString(),
      last_test_status: result.status,
      last_test_message: result.message,
      last_test_latency_ms: result.latency_ms,
    }).eq('vendor', vendor);
    await admin.from('integration_audits').insert({
      vendor,
      check_name: 'connection',
      status: result.status === 'ok' ? 'ok' : result.status === 'no_quota' ? 'warn' : 'fail',
      latency_ms: result.latency_ms,
      message: result.message,
      details: result.details ?? {},
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof IntegrationDisabledError ? 'disabled' : 'fail';
    return NextResponse.json({
      vendor,
      status,
      latency_ms: Date.now() - start,
      message,
    } satisfies TestResult);
  }
}

