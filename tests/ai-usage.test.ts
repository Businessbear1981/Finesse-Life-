import {describe, expect, it} from 'vitest';
import {estimateCostMicros, fromSdkUsage, normalizeModel, priceFor, toRow} from '@/lib/ai-usage';
import {buildReport, clampDays, type DailyRow} from '@/lib/ai-usage-report';

describe('AI usage pricing', () => {
  it('normalizes gateway model ids', () => {
    expect(normalizeModel('anthropic/claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
    expect(normalizeModel('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5-20251001');
  });
  it('prices by model family', () => {
    expect(priceFor('anthropic/claude-sonnet-4-6')?.in).toBe(3);
    expect(priceFor('claude-haiku-4-5-20251001')?.out).toBe(5);
    expect(priceFor('openai/gpt-4o')).toBeNull();
  });
  it('estimates cost in micro-dollars', () => {
    // 1M input @ $3 + 1M output @ $15 = $18
    expect(estimateCostMicros('claude-sonnet-4-6', {inputTokens: 1_000_000, outputTokens: 1_000_000})).toBe(18_000_000);
    expect(estimateCostMicros('mystery-model', {inputTokens: 500})).toBe(0);
  });
  it('splits cached input out of SDK usage', () => {
    const u = fromSdkUsage({inputTokens: 1000, outputTokens: 50, inputTokenDetails: {cacheReadTokens: 800, cacheWriteTokens: 0}});
    expect(u).toEqual({inputTokens: 200, outputTokens: 50, cacheReadTokens: 800, cacheWriteTokens: 0});
  });
});

describe('AI usage rows', () => {
  it('never stores invalid feature labels or negative counts', () => {
    const r = toRow({feature: 'Nova; DROP TABLE', model: 'anthropic/claude-sonnet-4-6', inputTokens: -5, outputTokens: 10.7});
    expect(r.feature).toBe('unknown');
    expect(r.input_tokens).toBe(0);
    expect(r.output_tokens).toBe(10);
    expect(r.model).toBe('claude-sonnet-4-6');
  });
});

describe('AI usage report', () => {
  const rows: DailyRow[] = [
    {day: '2026-10-01', feature: 'nova', model: 'claude-sonnet-4-6', calls: 3, failures: 1, input_tokens: 300, output_tokens: 90, cache_read_tokens: 0, total_tokens: 390, est_cost_micros: 2250},
    {day: '2026-10-02', feature: 'bernard', model: 'gpt-x', calls: 1, failures: 0, input_tokens: 10, output_tokens: 10, cache_read_tokens: 0, total_tokens: 20, est_cost_micros: 0},
  ];
  it('totals, groups and flags unpriced models', () => {
    const rep = buildReport(rows, '2026-09-02', 30);
    expect(rep.totals.calls).toBe(4);
    expect(rep.totals.totalTokens).toBe(410);
    expect(rep.byDay.map((d) => d.key)).toEqual(['2026-10-01', '2026-10-02']);
    expect(rep.byFeature[0].key).toBe('nova');
    expect(rep.unpricedModels).toEqual(['gpt-x']);
  });
  it('clamps the range', () => {
    expect(clampDays('9999')).toBe(365);
    expect(clampDays('0')).toBe(1);
    expect(clampDays('abc')).toBe(30);
    expect(clampDays(null)).toBe(30);
  });
});
