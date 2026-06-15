// GET /api/intelligence/health
// Engine status dashboard — integration health, configured count, circuit states.
// No auth required — safe to expose (no secrets in response).

import { getIntegrationHealth, getConfiguredCount, INTEGRATION_REGISTRY } from '@/lib/intelligence';

export async function GET() {
  const integrations = getIntegrationHealth();
  const configured = getConfiguredCount();
  const total = INTEGRATION_REGISTRY.length;

  const byStatus = integrations.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const byCategory = integrations.reduce(
    (acc, i) => {
      if (!acc[i.category]) acc[i.category] = [];
      acc[i.category].push({ name: i.name, status: i.status, configured: i.configured });
      return acc;
    },
    {} as Record<string, Array<{ name: string; status: string; configured: boolean }>>,
  );

  return Response.json({
    engine: 'finesse-intelligence-v1',
    timestamp: new Date().toISOString(),
    integrations: {
      total,
      configured,
      unconfigured: total - configured,
      by_status: byStatus,
      by_category: byCategory,
      // Full list with all health fields — consumed by the Backstage dashboard
      list: integrations,
    },
    status: byStatus['down'] ? 'degraded' : byStatus['degraded'] ? 'degraded' : 'operational',
  });
}
