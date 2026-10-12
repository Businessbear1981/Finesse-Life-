'use client';

/** The Kitchen — your week of meals, calorie ledger and ONE order intent (room 27). */
import {useCallback, useEffect, useState} from 'react';
import {btnCls, fieldCls, roomCall} from '@/lib/room-client';

type Meal = {day: number; slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'; name: string; kcal?: number | null};
type Plan = {weekStart: string; dailyKcalTarget: number | null; meals: Meal[]; dailyTotals: number[]; groceryList: {item: string; qty: string}[]; order: {id: string; state: string} | null; stage: string};
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STAGES = ['plan', 'intent', 'authorized', 'fulfilled'];
type Options = {partners: {id: string; name: string}[]; disclosure: string};
type LastPlan = {weekStart: string; meals: Meal[]; groceryList: Plan['groceryList']; dailyKcal: number | null} | null;

export function KitchenWeek({accent}: {accent: string}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'signed_out' | 'closed' | 'error'>('loading');
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<Meal['slot']>('dinner');
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [grocery, setGrocery] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [last, setLast] = useState<LastPlan>(null);

  const load = useCallback(async () => {
    const r = await roomCall<Plan>('/api/kitchen/plan');
    if (r.ok) { setPlan(r.body); setStatus('live'); }
    else setStatus(r.status === 401 ? 'signed_out' : r.status === 503 ? 'closed' : 'error');
    if (!r.ok) return;
    // Checkout honesty: which grocery partners are actually connected (none ⇒ intent only).
    const o = await roomCall<Options>('/api/kitchen/grocery-options');
    if (o.ok) setOptions(o.body);
    if (r.body.meals.length === 0) {
      const h = await roomCall<{lastPlan: LastPlan}>(`/api/kitchen/history?week=${r.body.weekStart}`);
      if (h.ok) setLast(h.body.lastPlan);
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the awaited fetch, not synchronously
  useEffect(() => { void load(); }, [load]);

  const save = async (meals: Meal[], groceryList: Plan['groceryList']) => {
    if (!plan) return;
    const r = await roomCall('/api/kitchen/compose', {method: 'POST', json: {weekStart: plan.weekStart, dailyKcal: plan.dailyKcalTarget, meals, groceryList}});
    if (!r.ok) setMsg(r.body.message ?? 'Nothing was saved.'); else { setMsg(null); void load(); }
  };
  const addMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !name.trim()) return;
    void save([...plan.meals.filter((m) => !(m.day === day && m.slot === slot)), {day, slot, name: name.trim(), kcal: kcal ? Number(kcal) : null}], plan.groceryList);
    setName(''); setKcal('');
  };
  const addGrocery = () => {
    if (!plan || !grocery.trim()) return;
    void save(plan.meals, [...plan.groceryList, {item: grocery.trim(), qty: '1'}]);
    setGrocery('');
  };
  const intent = async (cancel = false) => {
    if (!plan) return;
    const r = await roomCall('/api/kitchen/order-intent', {method: 'POST', json: {weekStart: plan.weekStart, cancel}});
    setMsg(r.body.message ?? (r.ok ? null : 'Nothing was changed.'));
    if (r.ok) void load();
  };

  if (status === 'loading') return <div className="mb-8 h-24 animate-pulse border border-brass/10" role="status" aria-label="Loading your week" />;
  if (status !== 'live' || !plan) {
    return (
      <p className="mb-8 border border-brass/15 p-4 font-body text-sm italic text-cream/70">
        {status === 'signed_out' ? 'Sign in to plan your own week of meals here.' : status === 'closed' ? 'Your meal plan opens once this room is fitted out.' : 'The kitchen did not answer. Nothing was changed.'}
      </p>
    );
  }
  const stageIdx = STAGES.indexOf(plan.stage === 'empty' ? 'plan' : plan.stage);
  return (
    <section aria-labelledby="kitchen-week" className="mb-10 border p-4" style={{borderColor: `${accent}55`}}>
      <h2 id="kitchen-week" className="font-label text-[10px] uppercase tracking-[0.4em]" style={{color: accent}}>Your week · live · {plan.weekStart}</h2>
      <ol className="mt-3 flex gap-1" aria-label="Order stages">
        {STAGES.map((s, i) => (
          <li key={s} className="flex-1 border px-1 py-1 text-center font-label text-[8px] uppercase tracking-[0.2em]"
            style={{borderColor: i <= stageIdx ? accent : 'rgba(201,169,97,0.2)', color: i <= stageIdx ? '#F4E8D0' : 'rgba(244,232,208,0.45)'}}>{s}</li>
        ))}
      </ol>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-7">
        {DAYS.map((d, i) => (
          <li key={d} className="border border-brass/15 p-2">
            <span className="block font-label text-[8px] uppercase tracking-[0.25em] text-brass/80">{d} · {plan.dailyTotals[i]} kcal</span>
            {plan.meals.filter((m) => m.day === i).map((m) => <span key={m.slot} className="mt-1 block font-body text-[11px] text-cream/80">{m.slot}: {m.name}</span>)}
          </li>
        ))}
      </ul>
      <form onSubmit={addMeal} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <select aria-label="Day" value={day} onChange={(e) => setDay(Number(e.target.value))} className={fieldCls}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
        <select aria-label="Meal" value={slot} onChange={(e) => setSlot(e.target.value as Meal['slot'])} className={fieldCls}>{['breakfast', 'lunch', 'dinner', 'snack'].map((s) => <option key={s}>{s}</option>)}</select>
        <input aria-label="Dish" value={name} onChange={(e) => setName(e.target.value)} placeholder="Miso cod, greens" className={fieldCls} maxLength={120} />
        <input aria-label="Calories" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value.replace(/\D/g, ''))} placeholder="kcal" className={fieldCls} />
        <button type="submit" className={`${btnCls} border-brass/50 text-brass-highlight`}>Add to week</button>
      </form>
      <div className="mt-4">
        <p className="font-label text-[9px] uppercase tracking-[0.3em] text-brass/80">Grocery list</p>
        <p className="mt-1 font-body text-sm text-cream/75">{plan.groceryList.length ? plan.groceryList.map((g) => g.item).join(' · ') : 'Empty.'}</p>
        <div className="mt-2 flex gap-2">
          <input aria-label="Grocery item" value={grocery} onChange={(e) => setGrocery(e.target.value)} placeholder="Add an item" className={fieldCls} maxLength={80} />
          <button type="button" onClick={addGrocery} className={`${btnCls} border-brass/40 text-cream/80`}>Add</button>
        </div>
      </div>
      {plan.meals.length === 0 && last && (
        <div className="mt-4 border border-brass/15 p-3">
          <p className="font-body text-sm text-cream/75">Nothing planned yet this week. Start from the week of {last.weekStart}? You can change any plate after.</p>
          <button type="button" onClick={() => void save(last.meals, last.groceryList)} className={`${btnCls} mt-2 border-brass/50 text-brass-highlight`}>Start from last week</button>
        </div>
      )}
      <div className="mt-4 border-t border-brass/10 pt-3">
        <p className="font-label text-[9px] uppercase tracking-[0.3em] text-brass/80">Delivery</p>
        {options === null ? (
          <p className="mt-1 font-body text-xs italic text-cream/50">Checking grocery partners…</p>
        ) : options.partners.length ? (
          <p className="mt-1 font-body text-xs text-cream/70">{options.partners.map((p) => p.name).join(', ')} · {options.disclosure} They ask you to authorise before anything is charged.</p>
        ) : (
          <p className="mt-1 font-body text-xs italic text-cream/70">Instacart isn&apos;t connected yet. Confirming records an order intent for this list — nothing is placed, delivered or charged.</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!plan.order && <button type="button" onClick={() => intent()} className={btnCls} style={{borderColor: accent, color: accent}}>Confirm the order</button>}
        {plan.order?.state === 'intent' && <button type="button" onClick={() => intent(true)} className={`${btnCls} border-brass/40 text-cream/70`}>Withdraw the order</button>}
      </div>
      <p className="mt-2 font-body text-[11px] italic text-cream/45">Confirming records an order intent only. A grocery partner must authorise before anything is placed or charged.</p>
      {msg && <p role="status" className="mt-2 font-body text-sm italic text-cream/80">{msg}</p>}
    </section>
  );
}
