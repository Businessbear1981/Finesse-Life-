// Scale engine Model v1 (Engines Spec): remaining pledges ~ Poisson with 3x variance (pledges cluster),
// declines ~ Binomial, both by normal approximation. Replace with fitted curves after ~30 closed campaigns.

export function normCdf(z: number): number {
  // Abramowitz–Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export interface ForecastInput { unitGoal: number; committed: number; unitsPerDay: number; daysLeft: number; declineRate?: number; waitlist: number }
export interface Forecast { pGoal: number; expectedFinal: number; perDayNeeded: number; expectedDeclines: number; backupsNeeded: number; waitlistCover: number; earlyWarning: boolean; model: 'v1' }

export function forecast(i: ForecastInput): Forecast {
  const rate = i.declineRate ?? 0.08;
  const remaining = Math.max(0, i.unitGoal - i.committed);
  const mean = i.unitsPerDay * Math.max(0, i.daysLeft);
  const sd = Math.sqrt(3 * mean);
  const pGoal = remaining === 0 ? 1 : sd === 0 ? 0 : normCdf((mean - remaining + 0.5) / sd);
  const dMean = i.unitGoal * rate;
  const dSd = Math.sqrt(i.unitGoal * rate * (1 - rate));
  const backupsNeeded = Math.ceil(dMean + 1.645 * dSd);
  const waitlistCover = dSd === 0 ? 1 : normCdf((i.waitlist - dMean + 0.5) / dSd);
  return {
    pGoal: round(pGoal), expectedFinal: Math.round(i.committed + mean),
    perDayNeeded: i.daysLeft > 0 ? round(remaining / i.daysLeft) : remaining,
    expectedDeclines: round(dMean), backupsNeeded, waitlistCover: round(waitlistCover),
    earlyWarning: pGoal < 0.4 && remaining > 0, model: 'v1',
  };
}
const round = (x: number) => Math.round(x * 1000) / 1000;

export const defaultWaitlistSize = (unitGoal: number) => Math.ceil(unitGoal * 0.2);

/** Strike ladder from the Workflow doc (pending Sean's confirmation): penalty share of the pledge, 5th strike bars. */
export function strikePenaltyBps(openStrikes: number): number {
  return openStrikes <= 1 ? 0 : openStrikes === 2 ? 2500 : openStrikes === 3 ? 5000 : 10000;
}
export const BAR_AT_STRIKES = 5;

export interface WaitlistEntry { id: string; created_at: Date; open_strikes: number; card_failing: boolean; band?: string | null }

/**
 * Suggested waitlist order (Engines Spec): first come, first served; members with an open strike or a
 * failing card go to the back; Patron/Ambassador moves ahead of others who joined within the same hour.
 */
export function orderWaitlist(entries: WaitlistEntry[]): WaitlistEntry[] {
  const vip = (e: WaitlistEntry) => e.band === 'Patron' || e.band === 'Ambassador';
  const penalised = (e: WaitlistEntry) => e.open_strikes > 0 || e.card_failing;
  return [...entries].sort((a, b) => {
    if (penalised(a) !== penalised(b)) return penalised(a) ? 1 : -1;
    const hourA = Math.floor(+a.created_at / 3_600_000), hourB = Math.floor(+b.created_at / 3_600_000);
    if (hourA === hourB && vip(a) !== vip(b)) return vip(a) ? -1 : 1;
    return +a.created_at - +b.created_at;
  });
}
