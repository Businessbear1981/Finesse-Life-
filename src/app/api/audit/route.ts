import {requireAdmin} from '@/lib/api-guard';
import {NextResponse, type NextRequest} from 'next/server';
import {FINESSE_API, SERVICE_ROLE, createClient as createDb} from '@/lib/data/compat';
import {runTest} from '@/lib/integrations/test';
import {getConfig} from '@/lib/config';
import {safeEqual} from '@/lib/net/webhook-auth';

export const runtime = 'nodejs';
// Allow long runs — every integration is tested in parallel but some may take 10s+.
export const maxDuration = 60;

type CheckResult = {
  kind: 'integration' | 'webhook' | 'critical_path';
  name: string;
  status: 'ok' | 'fail' | 'warn' | 'disabled';
  latency_ms: number;
  message: string;
};


export async function POST(req: NextRequest) {
  // Allow CLI usage with an admin bearer token (set INTEGRATIONS_CLI_TOKEN env)
  const cliToken = process.env.INTEGRATIONS_CLI_TOKEN;
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const isCli = safeEqual(bearer, cliToken);

  if (!isCli) {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({error: 'forbidden'}, {status: 403});
  }

  const admin = createDb(
    FINESSE_API,
    SERVICE_ROLE,
    {auth: {persistSession: false}},
  );

  // Fetch all enabled integrations
  const {data: rows, error} = await admin
    .from('integrations')
    .select('vendor, display_name, enabled')
    .order('display_name');
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  // Run integration tests in parallel
  const integrationChecks = await Promise.all(
    (rows ?? []).map(async (row): Promise<CheckResult> => {
      if (!row.enabled) {
        return {
          kind: 'integration',
          name: row.display_name,
          status: 'disabled',
          latency_ms: 0,
          message: 'disabled in /settings/integrations',
        };
      }
      const start = Date.now();
      try {
        // Called in-process (no self-HTTP: avoids Host-header SSRF and lost session cookies).
        const j = await runTest(row.vendor, await getConfig(row.vendor));
        return {
          kind: 'integration',
          name: row.display_name,
          status: j.status === 'no_quota' ? 'warn' : j.status,
          latency_ms: j.latency_ms ?? Date.now() - start,
          message: j.message ?? 'no message',
        };
      } catch (err) {
        return {
          kind: 'integration',
          name: row.display_name,
          status: 'fail',
          latency_ms: Date.now() - start,
          message: err instanceof Error ? err.message : 'unknown error',
        };
      }
    }),
  );

  // Critical paths: database reachable through the Worker, Worker health, outbox not backing up.
  const criticalChecks: CheckResult[] = await Promise.all([
    criticalPathAuthRoundtrip(admin),
    criticalPathWorkerHealth(),
  ]);

  const all = [...integrationChecks, ...criticalChecks];
  const summary = {
    ok: all.filter((c) => c.status === 'ok').length,
    fail: all.filter((c) => c.status === 'fail').length,
    warn: all.filter((c) => c.status === 'warn').length,
    disabled: all.filter((c) => c.status === 'disabled').length,
    total: all.length,
    ran_at: new Date().toISOString(),
  };

  // Persist summary + each check into integration_audits
  await admin.from('integration_audits').insert(
    all.map((c) => ({
      vendor: c.kind === 'integration' ? rows?.find((r) => r.display_name === c.name)?.vendor ?? null : null,
      check_name: c.kind === 'critical_path' ? `critical_path:${c.name}` : c.name,
      status: c.status === 'ok' ? 'ok' : c.status === 'warn' ? 'warn' : 'fail',
      latency_ms: c.latency_ms,
      message: c.message,
    })),
  );

  return NextResponse.json({summary, checks: all});
}

// Proves the service data path (Next → Worker /v1/data → Postgres) works.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function criticalPathAuthRoundtrip(admin: any): Promise<CheckResult> {
  const start = Date.now();
  const {error} = await admin.from('profiles').select('id').limit(1);
  if (error) {
    return {
      kind: 'critical_path',
      name: 'auth roundtrip',
      status: 'fail',
      latency_ms: Date.now() - start,
      message: error.message,
    };
  }
  return {
    kind: 'critical_path',
    name: 'auth roundtrip',
    status: 'ok',
    latency_ms: Date.now() - start,
    message: 'profiles table reachable',
  };
}

async function criticalPathWorkerHealth(): Promise<CheckResult> {
  const start = Date.now();
  const base = process.env.FINESSE_API_URL;
  const fail = (message: string): CheckResult => ({kind: 'critical_path', name: 'worker health', status: 'fail', latency_ms: Date.now() - start, message});
  if (!base) return fail('FINESSE_API_URL not set');
  try {
    const r = await fetch(`${base}/health`, {signal: AbortSignal.timeout(5000)});
    if (!r.ok) return fail(`health ${r.status}`);
    return {kind: 'critical_path', name: 'worker health', status: 'ok', latency_ms: Date.now() - start, message: 'worker healthy'};
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
