'use client';

/**
 * The Kitchen beyond this week's plan — all derived from the member's own rows (/api/kitchen/history):
 * recent orders (kitchen_orders: intent ≠ order), the recipe book (plates they've planned) — plus Nova's table
 * (/api/nova/requests, kind 'plan', topic 'table'): options for a table or a private chef, never a reservation.
 */
import {useEffect, useState} from 'react';
import {roomCall} from '@/lib/room-client';
import {NovaPlan} from '@/components/hotel/nova-plan';

type Order = {id: string; week_start: string; state: 'intent' | 'authorized' | 'fulfilled' | 'cancelled'; partner: string | null; created_at: string; itemCount: number};
type BookEntry = {name: string; times: number; kcal: number | null; slots: string[]; lastWeek: string};
export type KitchenHistory = {weekStart: string; orders: Order[]; book: BookEntry[]; lastPlan: {weekStart: string; meals: unknown[]; groceryList: unknown[]; dailyKcal: number | null} | null; partners: {id: string; name: string}[]; disclosure: string};

const ORDER_STATE: Record<Order['state'], string> = {
  intent: 'Intent recorded · not ordered, not charged',
  authorized: 'Authorised with the grocer',
  fulfilled: 'Delivered',
  cancelled: 'Withdrawn · nothing ordered',
};

export function KitchenMore({accent, isMasc}: {accent: string; isMasc: boolean}) {
  const [h, setH] = useState<KitchenHistory | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void roomCall<KitchenHistory>('/api/kitchen/history').then((r) => {
      if (!alive) return;
      if (r.ok) setH(r.body); else setErr(r.status === 503 ? 'Your kitchen history opens once this room is fitted out.' : 'Your kitchen history did not answer. Nothing was changed.');
    });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <NovaPlan room="kitchen" topic="table" title={isMasc ? 'Table' : 'Nova’s table'} label="Nova’s table · a table out or a chef at home" accent={accent} withWhen withParty
        placeholder={isMasc ? 'Steakhouse for four Thursday, somewhere we can talk business' : 'Omakase for two on Friday, or a private chef at home for six'} />

      {err && <p className="mb-8 border border-brass/15 p-4 font-body text-sm italic text-cream/70">{err}</p>}
      {!err && !h && <div className="mb-8 h-24 animate-pulse border border-brass/10" role="status" aria-label="Loading your kitchen history" />}
      {h && (
        <>
          <section aria-labelledby="kitchen-orders" className="mb-8 border border-brass/20 p-4">
            <h2 id="kitchen-orders" className="font-label text-[10px] uppercase tracking-[0.4em]" style={{color: accent}}>Recent orders</h2>
            {h.orders.length === 0 ? (
              <p className="mt-3 font-body text-sm italic text-cream/60">No orders yet — confirm your week&apos;s grocery list above to record one.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {h.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 border-b border-brass/10 py-2">
                    <span className="font-body text-sm text-cream/85">Week of {o.week_start} · {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}{o.partner ? ` · ${o.partner}` : ''}</span>
                    <span className="shrink-0 font-label text-[8px] uppercase tracking-[0.2em]" style={{color: o.state === 'fulfilled' || o.state === 'authorized' ? '#7AF5B8' : 'rgba(244,232,208,0.55)'}}>{ORDER_STATE[o.state]}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 font-body text-[11px] italic text-cream/45">{h.partners.length ? h.disclosure : 'Grocery delivery needs a partner (Instacart) — not connected yet, so intents are never placed or charged.'}</p>
          </section>

          <section aria-labelledby="kitchen-book" className="mb-8 border border-brass/20 p-4">
            <h2 id="kitchen-book" className="font-label text-[10px] uppercase tracking-[0.4em]" style={{color: accent}}>Your recipe book</h2>
            {h.book.length === 0 ? (
              <p className="mt-3 font-body text-sm italic text-cream/60">Your book fills itself from the plates you plan. Nothing in it yet.</p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {h.book.map((b) => (
                  <li key={b.name} className="border border-brass/10 p-3">
                    <p className="font-display text-base italic text-cream/90">{b.name}</p>
                    <p className="mt-1 font-label text-[8px] uppercase tracking-[0.2em] text-cream/50">
                      {b.slots.join(' · ')} · planned {b.times}×{b.kcal != null ? ` · ${b.kcal} kcal` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
