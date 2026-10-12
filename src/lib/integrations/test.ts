import 'server-only';
import {safeFetch} from '@/lib/net/safe-url';

export type TestResult = {
  vendor: string;
  status: 'ok' | 'fail' | 'no_quota' | 'disabled';
  latency_ms: number;
  message: string;
  details?: Record<string, unknown>;
};

// One real call per vendor — auth-cheap endpoint that proves the key works.
export async function runTest(vendor: string, cfg: Record<string, string>): Promise<TestResult> {
  switch (vendor) {
    case 'finesse_api': {
      const r = await safeFetch(`${cfg.url ?? process.env.FINESSE_API_URL}/health`).catch(() => null);
      if (!r?.ok) return {vendor, status: 'fail', latency_ms: 0, message: `health ${r?.status ?? 'unreachable'}`};
      return {vendor, status: 'ok', latency_ms: 0, message: 'connected'};
    }
    case 'cloudflare_r2': {
      // HeadBucket via S3-compatible endpoint
      const {S3Client, HeadBucketCommand} = await import('@aws-sdk/client-s3');
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${cfg.account_id}.r2.cloudflarestorage.com`,
        credentials: {accessKeyId: cfg.token, secretAccessKey: cfg.secret ?? cfg.token},
      });
      await s3.send(new HeadBucketCommand({Bucket: cfg.bucket}));
      return {vendor, status: 'ok', latency_ms: 0, message: `bucket ${cfg.bucket} reachable`};
    }
    case 'ai_gateway': {
      // 1-token completion as a heartbeat
      const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {Authorization: `Bearer ${cfg.api_key}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({
          model: cfg.default_model ?? 'anthropic/claude-opus-4-6',
          messages: [{role: 'user', content: 'hi'}],
          max_tokens: 1,
        }),
      });
      if (!res.ok) {
        return {vendor, status: 'fail', latency_ms: 0, message: `${res.status} ${await res.text().then(t => t.slice(0, 200))}`};
      }
      return {vendor, status: 'ok', latency_ms: 0, message: 'gateway responded'};
    }
    case 'stripe': {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: {Authorization: `Bearer ${cfg.secret_key}`},
      });
      if (!res.ok) return {vendor, status: 'fail', latency_ms: 0, message: `Stripe ${res.status}`};
      return {vendor, status: 'ok', latency_ms: 0, message: 'key valid'};
    }
    case 'elevenlabs': {
      const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: {'xi-api-key': cfg.api_key},
      });
      if (!res.ok) return {vendor, status: 'fail', latency_ms: 0, message: `ElevenLabs ${res.status}`};
      const sub = (await res.json()) as {character_count?: number; character_limit?: number};
      const remaining = (sub.character_limit ?? 0) - (sub.character_count ?? 0);
      if (remaining < 100) {
        return {vendor, status: 'no_quota', latency_ms: 0, message: `Only ${remaining} characters left`, details: sub};
      }
      return {vendor, status: 'ok', latency_ms: 0, message: `${remaining} characters left`, details: sub};
    }
    case 'higgsfield': {
      const res = await safeFetch(`${cfg.api_base ?? 'https://platform.higgsfield.ai/v1'}/account`, {
        headers: {'hf-api-key': cfg.api_key_id, 'hf-secret': cfg.api_secret},
      }, {allowHosts: ['higgsfield.ai']});
      if (!res.ok) return {vendor, status: 'fail', latency_ms: 0, message: `Higgsfield ${res.status}`};
      return {vendor, status: 'ok', latency_ms: 0, message: 'key valid'};
    }
    case 'meshy': {
      const res = await fetch('https://api.meshy.ai/v2/text-to-3d', {
        headers: {Authorization: `Bearer ${cfg.api_key}`},
      });
      // Meshy returns 200 with list or 401/403 on bad key
      if (res.status === 401 || res.status === 403) {
        return {vendor, status: 'fail', latency_ms: 0, message: `Meshy ${res.status}`};
      }
      return {vendor, status: 'ok', latency_ms: 0, message: 'key valid'};
    }
    case 'suno': {
      // No first-party Suno API: members configure a wrapper base URL. Guarded against SSRF.
      if (!cfg.api_base) return {vendor, status: 'fail', latency_ms: 0, message: 'api_base not configured'};
      const res = await safeFetch(`${cfg.api_base.replace(/\/$/, '')}/api/get_limit`, {headers: {Authorization: `Bearer ${cfg.api_key}`}});
      if (!res.ok) return {vendor, status: 'fail', latency_ms: 0, message: `Suno wrapper ${res.status}`};
      return {vendor, status: 'ok', latency_ms: 0, message: 'wrapper reachable'};
    }
    case 'langsmith': {
      const res = await fetch('https://api.smith.langchain.com/api/v1/sessions?limit=1', {headers: {'x-api-key': cfg.api_key}});
      if (!res.ok) return {vendor, status: 'fail', latency_ms: 0, message: `LangSmith ${res.status}`};
      return {vendor, status: 'ok', latency_ms: 0, message: 'key valid'};
    }
    case 'porkbun': {
      const res = await fetch('https://api.porkbun.com/api/json/v3/ping', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({apikey: cfg.api_key, secretapikey: cfg.secret_api_key ?? cfg.secret}),
      });
      const j = (await res.json().catch(() => ({}))) as {status?: string; message?: string};
      if (j.status !== 'SUCCESS') return {vendor, status: 'fail', latency_ms: 0, message: `Porkbun ${j.message ?? res.status}`};
      return {vendor, status: 'ok', latency_ms: 0, message: 'key valid'};
    }
    case 'railway': {
      const res = await fetch('https://backboard.railway.com/graphql/v2', {
        method: 'POST', headers: {Authorization: `Bearer ${cfg.token ?? cfg.api_token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({query: '{ me { id } }'}),
      });
      const j = (await res.json().catch(() => ({}))) as {errors?: {message: string}[]};
      if (!res.ok || j.errors?.length) return {vendor, status: 'fail', latency_ms: 0, message: `Railway ${j.errors?.[0]?.message ?? res.status}`};
      return {vendor, status: 'ok', latency_ms: 0, message: 'token valid'};
    }
    case 'vercel': {
      const res = await fetch('https://api.vercel.com/v2/user', {headers: {Authorization: `Bearer ${cfg.token ?? cfg.api_token}`}});
      if (!res.ok) return {vendor, status: 'fail', latency_ms: 0, message: `Vercel ${res.status}`};
      return {vendor, status: 'ok', latency_ms: 0, message: 'token valid'};
    }
    default:
      return {vendor, status: 'fail', latency_ms: 0, message: `unknown vendor: ${vendor}`};
  }
}
