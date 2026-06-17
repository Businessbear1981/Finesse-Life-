'use client';

import { useEffect, useState } from 'react';

// ── Response shape for next_best_action ─────────────────────────────────────
interface NextBestActionResult {
  action: string;
  reason: string;
  confidence: number;
}

// ── Response shape for personalized_recs ─────────────────────────────────────
interface RecItem {
  title: string;
  category: string;
  price_range: string;
  why: string;
}

interface IntelligenceResponse {
  intent: string;
  result: unknown;
  confidence: number;
  model_used: string;
  latency_ms: number;
  audit_id: string;
}

// ── Gold skeleton bar ────────────────────────────────────────────────────────
function SkeletonBar({ width = '100%', height = 12 }: { width?: string | number; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 2,
        background: 'linear-gradient(90deg, rgba(201,169,97,0.08) 0%, rgba(232,200,122,0.18) 50%, rgba(201,169,97,0.08) 100%)',
        backgroundSize: '200% 100%',
        animation: 'nova-skeleton-shimmer 1.6s ease-in-out infinite',
      }}
    />
  );
}

// ── Empty state: no signals yet ──────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="py-3 text-center">
      <p
        className="font-body text-xs italic"
        style={{ color: 'rgba(244,232,208,0.28)' }}
      >
        Chat with Nova to build your intelligence profile
      </p>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────
export function NovaIntelligencePanel() {
  const [loading, setLoading] = useState(true);
  const [nextAction, setNextAction] = useState<NextBestActionResult | null>(null);
  const [recs, setRecs] = useState<RecItem[]>([]);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchIntelligence() {
      try {
        const [nbaRes, recsRes] = await Promise.all([
          fetch('/api/intelligence/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              intent: 'next_best_action',
              user_id: 'me',
              context: { page: 'lobby' },
              max_latency_ms: 2000,
            }),
          }),
          fetch('/api/intelligence/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              intent: 'personalized_recs',
              user_id: 'me',
              context: { count: 3 },
              max_latency_ms: 3000,
            }),
          }),
        ]);

        if (cancelled) return;

        // Parse next_best_action
        if (nbaRes.ok) {
          const nbaData = (await nbaRes.json()) as IntelligenceResponse;
          const action = nbaData.result as NextBestActionResult;
          if (action?.action) {
            setNextAction(action);
          }
        }

        // Parse personalized_recs
        if (recsRes.ok) {
          const recsData = (await recsRes.json()) as IntelligenceResponse;
          const items = recsData.result as RecItem[];
          if (Array.isArray(items) && items.length > 0) {
            setRecs(items.slice(0, 3));
          }
        }
      } catch {
        // Silently fail — panel stays empty rather than crashing lobby
      } finally {
        if (!cancelled) {
          setLoading(false);
          // Check if we got nothing at all (no signals built up yet)
          setEmpty(false); // will be re-evaluated after state settles
        }
      }
    }

    void fetchIntelligence();
    return () => { cancelled = true; };
  }, []);

  // Determine empty after loading resolves
  const isEmptyProfile =
    !loading && !nextAction && recs.length === 0;

  // ── Action label prettifier ─────────────────────────────────────────────
  function prettifyAction(action: string): string {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <>
      {/* Keyframe injected once via style tag */}
      <style>{`
        @keyframes nova-skeleton-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>

      <div
        style={{
          border: '1px solid rgba(201,169,97,0.12)',
          background: 'rgba(10,4,6,0.60)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* ── Header bar ── */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{
            borderBottom: '1px solid rgba(201,169,97,0.08)',
          }}
        >
          <div className="flex items-center gap-2">
            {/* Pulsing orb */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#C9A961',
                boxShadow: '0 0 8px rgba(201,169,97,0.7)',
                animation: 'chandelier-pulse 2.5s ease-in-out infinite',
              }}
            />
            <span
              className="font-label"
              style={{
                fontSize: 8,
                letterSpacing: '0.4em',
                textTransform: 'uppercase',
                color: 'rgba(201,169,97,0.5)',
              }}
            >
              Nova Intelligence
            </span>
          </div>
          {!loading && (nextAction || recs.length > 0) && (
            <span
              className="font-label"
              style={{
                fontSize: 7,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(201,169,97,0.25)',
              }}
            >
              Live · Personalized
            </span>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-4 py-3 space-y-3">

          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-3">
              {/* NBA skeleton */}
              <div className="space-y-1.5">
                <SkeletonBar width="40%" height={8} />
                <SkeletonBar width="75%" height={11} />
                <SkeletonBar width="60%" height={9} />
              </div>
              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(201,169,97,0.06)' }} />
              {/* Recs skeleton */}
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonBar width={28} height={28} />
                    <div className="flex-1 space-y-1.5">
                      <SkeletonBar width="55%" height={9} />
                      <SkeletonBar width="40%" height={8} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty profile state */}
          {isEmptyProfile && <EmptyState />}

          {/* Next Best Action */}
          {!loading && nextAction && (
            <div>
              <p
                className="font-label mb-1.5"
                style={{
                  fontSize: 7,
                  letterSpacing: '0.35em',
                  textTransform: 'uppercase',
                  color: 'rgba(201,169,97,0.3)',
                }}
              >
                Suggested Next Step
              </p>
              <div
                className="flex items-start gap-3 px-3 py-2.5"
                style={{
                  background: 'rgba(201,169,97,0.04)',
                  border: '1px solid rgba(201,169,97,0.10)',
                }}
              >
                {/* Gold diamond accent */}
                <div
                  style={{
                    width: 6,
                    height: 6,
                    flexShrink: 0,
                    marginTop: 4,
                    background: '#C9A961',
                    transform: 'rotate(45deg)',
                    opacity: 0.7,
                  }}
                />
                <div>
                  <p
                    className="font-display"
                    style={{
                      fontSize: 13,
                      color: '#E8C87A',
                      lineHeight: 1.3,
                    }}
                  >
                    {prettifyAction(nextAction.action)}
                  </p>
                  <p
                    className="font-body mt-0.5"
                    style={{
                      fontSize: 11,
                      color: 'rgba(244,232,208,0.40)',
                      lineHeight: 1.4,
                      fontStyle: 'italic',
                    }}
                  >
                    {nextAction.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Personalized Recs */}
          {!loading && recs.length > 0 && (
            <div>
              {nextAction && (
                <div
                  style={{
                    height: 1,
                    background: 'rgba(201,169,97,0.06)',
                    marginBottom: 12,
                  }}
                />
              )}
              <p
                className="font-label mb-2"
                style={{
                  fontSize: 7,
                  letterSpacing: '0.35em',
                  textTransform: 'uppercase',
                  color: 'rgba(201,169,97,0.3)',
                }}
              >
                Curated For You
              </p>
              <div className="space-y-1.5">
                {recs.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 px-3 py-2"
                    style={{
                      background: 'rgba(10,4,6,0.35)',
                      border: '1px solid rgba(201,169,97,0.07)',
                    }}
                  >
                    {/* Index marker */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: 18,
                        height: 18,
                        border: '1px solid rgba(201,169,97,0.2)',
                        marginTop: 1,
                      }}
                    >
                      <span
                        className="font-display"
                        style={{ fontSize: 9, color: 'rgba(201,169,97,0.5)' }}
                      >
                        {idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className="font-body truncate"
                          style={{
                            fontSize: 12,
                            color: 'rgba(244,232,208,0.70)',
                            lineHeight: 1.3,
                          }}
                        >
                          {item.title}
                        </p>
                        <span
                          className="font-label flex-shrink-0"
                          style={{
                            fontSize: 9,
                            color: '#C9A961',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {item.price_range}
                        </span>
                      </div>
                      <p
                        className="font-body mt-0.5"
                        style={{
                          fontSize: 10,
                          color: 'rgba(244,232,208,0.28)',
                          fontStyle: 'italic',
                          lineHeight: 1.4,
                        }}
                      >
                        {item.why}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
