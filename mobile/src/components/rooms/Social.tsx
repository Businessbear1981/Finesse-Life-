// The Bag (your collection — bag_items, by edition), the Registry (your wishes and outings), the Lab (studio
// jobs on media_jobs via /api/lab/jobs: start, check, keep or discard) and the Switchboard (which lines are really connected, and what was sent on your behalf).
// Signed in, every list is the member's own, from the same tables as the web rooms (lib/rooms/social.ts);
// Nova prices a piece, finds the best way to buy it, or sources a wish through the orchestrator hub.
// Money never moves here: giving to a wish waits for the payment partner, and nothing posts without a real
// connected account. Signed out, each room keeps its labelled sample.
import {useState} from 'react';
import {Linking, Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, LinearTransition, useAnimatedStyle, useReducedMotion, withTiming} from 'react-native-reanimated';
import {deco, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {addBagItem, addOuting, addRegistryWish, deleteBagItem, labAct, labStatus, readBag, readLab, readRegistry, readSwitchboard, startLabJob, updateBagNote,
  type BagItem, type Broadcast, type Edition, type LabData, type LabJob, type Line, type Outing, type Studio, type Wish} from '@/lib/rooms/social';
import {ago, dollars, fundedPct, parseDollars, switchboardLines} from '@/lib/rooms/logic';
import {AHCard, AHChip, AHEyebrow, AHInput, AHSmoke, AHTitle} from '@/components/ah';
import {radius} from '@/lib/ah';
import {ActionBar, Chips, SampleNote, Segmented} from './shared';
import {LiveGate, RowBtn, Status} from './live';
import {NovaAskButton} from './NovaAsk';
import {Fine, Head, Meter, Pick, Row, Tag, Tile, ah, ahFonts, t} from './RoomKit';

type Msg = {ok: boolean; text: string} | null;

/* ═════════════════════════ The Bag ═════════════════════════ */

const CATS: Record<Edition, string[]> = {finesse: ['bag', 'shoes', 'watch', 'jewelry', 'other'], carpe_diem: ['watch', 'sneakers', 'car', 'other']};
const CAT_ICON: Record<string, string> = {bag: 'briefcase', shoes: 'sparkles', watch: 'crown', jewelry: 'sparkles', sneakers: 'sparkles', car: 'car', other: 'shirt'};
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export function Bag({side}: {side: Side}) {
  const edition: Edition = side === 'him' ? 'carpe_diem' : 'finesse';
  return <BagRoom key={edition} side={side} edition={edition} />;
}

function BagRoom({side, edition}: {side: Side; edition: Edition}) {
  const {live, reload} = useLive<{items: BagItem[]}>(null, () => readBag(edition));
  return (
    <View style={{gap: 14}}>
      <AHTitle size={32}>{edition === 'carpe_diem' ? 'Everything you keep. What it’s worth, and why.' : 'The pieces you keep — what they’re worth, and the story.'}</AHTitle>
      <LiveGate live={live} reload={() => void reload()} what="your bag" signedOut={<BagSample side={side} />}>
        {(data) => <BagLive side={side} edition={edition} items={data.items} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

function BagLive({side, edition, items, reload}: {side: Side; edition: Edition; items: BagItem[]; reload: () => Promise<void>}) {
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const cats = ['All', ...CATS[edition].map(cap)];
  const list = items.filter((i) => cat === 'All' || (i.category ?? 'other').toLowerCase() === cat.toLowerCase());
  const total = items.reduce((a, i) => a + (i.value_est_cents ?? 0), 0);
  return (
    <View style={{gap: 14}}>
      <View style={{flexDirection: 'row', gap: 10}}>
        <AHCard pad={16} style={{flex: 1}}><Text style={t.eyebrow}>Pieces</Text><Text style={{fontFamily: ahFonts.serif, fontSize: 28, color: ah.text}}>{items.length}</Text></AHCard>
        <AHCard pad={16} style={{flex: 1}}><Text style={t.eyebrow}>Estimated value</Text><Text style={{fontFamily: ahFonts.serif, fontSize: 28, color: ah.text}}>{dollars(total)}</Text></AHCard>
      </View>
      {items.length > 0 ? <Chips options={cats} value={cat} onChange={setCat} /> : null}
      {items.length === 0 ? (
        <AHCard pad={22}><Text style={t.voice}>Your bag is empty.</Text><Fine style={{marginTop: 8}}>Add the first piece you keep — Nova can price it and find the best way to buy its next.</Fine></AHCard>
      ) : list.length === 0 ? (
        <Fine>Nothing in {cat.toLowerCase()} yet.</Fine>
      ) : (
        <View>{list.map((i, k) => <BagRow key={i.id} item={i} last={k === list.length - 1} open={open === i.id} onToggle={() => setOpen(open === i.id ? null : i.id)} reload={reload} />)}</View>
      )}
      {adding ? <AddBagItem side={side} edition={edition} onDone={() => { setAdding(false); void reload(); }} onCancel={() => setAdding(false)} />
        : <ActionBar label="Add a piece" color={track[side].acc} onPress={() => setAdding(true)} />}
    </View>
  );
}

function BagRow({item, last, open, onToggle, reload}: {item: BagItem; last: boolean; open: boolean; onToggle: () => void; reload: () => Promise<void>}) {
  const [note, setNote] = useState(item.note ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const category = (item.category ?? 'other').toLowerCase();
  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await updateBagNote(item.id, note.trim());
    setBusy(false);
    setMsg(r.ok ? {ok: true, text: 'Note saved.'} : {ok: false, text: failure(r.status, r.body, 'Nothing was saved.')});
    if (r.ok) void reload();
  };
  const remove = async () => {
    setBusy(true); setMsg(null);
    const r = await deleteBagItem(item.id);
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was removed.')}); return; }
    void reload();
  };
  return (
    <Animated.View layout={LinearTransition} style={{borderBottomWidth: last ? 0 : 1, borderColor: ah.line}}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{expanded: open}} accessibilityLabel={`${item.name}${item.brand ? ` by ${item.brand}` : ''}`}
        style={{flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12}}>
        <Tile icon={CAT_ICON[category] ?? 'shirt'} size={52} tone={ah.mute} />
        <View style={{flex: 1, gap: 2}}>
          <Text style={t.eyebrow}>{[item.brand, cap(category), item.acquired_year].filter(Boolean).join(' · ')}</Text>
          <Text style={[t.title, {fontSize: 20, lineHeight: 23}]}>{item.name}</Text>
          {item.value_est_cents ? <Text style={[t.num, {fontSize: 13, color: ah.blush}]}>{dollars(item.value_est_cents)}</Text> : null}
        </View>
        <Text style={{fontFamily: ahFonts.sans, fontSize: 18, color: ah.mute}}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(250)} style={{gap: 10, paddingBottom: 16}}>
          {item.color ? <Fine>Colour · {item.color}</Fine> : null}
          <AHInput value={note} onChangeText={(v) => setNote(v.slice(0, 280))} placeholder="The story behind it (only you see this)" multiline accessibilityLabel="Note" style={{minHeight: 64, paddingTop: 12}} />
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            <RowBtn label={busy ? 'One moment…' : 'Save note'} onPress={() => void save()} disabled={busy || note.trim() === (item.note ?? '')} />
            {confirmDel
              ? <RowBtn label="Yes, remove it" tone={ah.rose} onPress={() => void remove()} disabled={busy} />
              : <RowBtn label="Remove" onPress={() => setConfirmDel(true)} disabled={busy} />}
          </View>
          <Status msg={msg} />
          <NovaAskButton label="Price check" kind="price_check" title={`Price check · ${item.name}`} room="bag"
            details={{title: item.name, brand: item.brand ?? '', category, retail_cents: item.value_est_cents ?? 0}} />
          <NovaAskButton label="Best way to buy" kind="procurement" title={`Best way to buy · ${item.name}`} room="bag"
            details={{title: item.brand ? `${item.brand} ${item.name}` : item.name, category, price_cents: item.value_est_cents ?? 0}} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function AddBagItem({side, edition, onDone, onCancel}: {side: Side; edition: Edition; onDone: () => void; onCancel: () => void}) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState(cap(CATS[edition][0]));
  const [value, setValue] = useState('');
  const [year, setYear] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await addBagItem({name, brand, category: category.toLowerCase(), value_est_cents: parseDollars(value) ?? 0, acquired_year: year, note, edition});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was saved.')}); return; }
    onDone();
  };
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>Add a piece</AHEyebrow>
      <AHInput value={name} onChangeText={setName} placeholder="The piece (e.g. Birkin 25)" accessibilityLabel="The piece" />
      <AHInput value={brand} onChangeText={setBrand} placeholder="Brand" accessibilityLabel="Brand" />
      <Chips options={CATS[edition].map(cap)} value={category} onChange={setCategory} />
      <AHInput value={value} onChangeText={setValue} placeholder="What it’s worth, $ (optional)" keyboardType="decimal-pad" accessibilityLabel="Estimated value in dollars" />
      <AHInput value={year} onChangeText={(v) => setYear(v.slice(0, 4))} placeholder="Year acquired (optional)" keyboardType="number-pad" accessibilityLabel="Year acquired" />
      <AHInput value={note} onChangeText={(v) => setNote(v.slice(0, 280))} placeholder="A note (optional)" accessibilityLabel="Note" />
      <ActionBar label={busy ? 'Saving…' : 'Add to my bag'} color={track[side].acc} onPress={() => void save()} disabled={busy || !name.trim() || !brand.trim()} />
      <Pick label="Cancel" onPress={onCancel} />
      <Status msg={msg} />
    </AHCard>
  );
}

type Item = [string, string, number];
const BAGS: Record<Side, Record<string, Item[]>> = {
  her: {
    'Night out': [['DRESS', 'Black satin slip dress', 240], ['SHOES', 'Strappy gold sandals', 180], ['LINGERIE', 'Silk set, champagne', 120], ['PERFUME', 'Eau de parfum, 50 ml', 95]],
    'Girls night': [['WINE', 'Two bottles of rosé', 60], ['SKIN', 'Sheet masks, 6 pack', 28], ['SNACK', 'Charcuterie box', 45]],
    'Church Sunday': [['DRESS', 'Navy wrap dress', 150], ['HAT', 'Wide-brim felt hat', 85], ['SHOES', 'Nude block heels', 120]],
  },
  him: {
    'Night out': [['SHIRT', 'Black silk shirt', 180], ['SHOES', 'Suede loafers', 320], ['FRAGRANCE', 'Cologne, 100 ml', 140], ['WATCH', 'Leather strap, cognac', 75]],
    'Game day': [['JERSEY', 'Home jersey', 130], ['DRINK', 'Bourbon, small batch', 70], ['SNACK', 'Wings for six', 60]],
    'Church Sunday': [['SUIT', 'Navy two-piece', 690], ['TIE', 'Silk tie, burgundy', 85], ['SHOES', 'Oxford, black', 260]],
  },
};

function BagSample({side}: {side: Side}) {
  const acc = track[side].acc;
  const bags = BAGS[side];
  const [occ, setOcc] = useState('Night out');
  const items = bags[occ];
  const tot = items.reduce((a, x) => a + x[2], 0);
  return (
    <View style={{gap: 14, marginTop: 14}}>
      <AHSmoke aspect={1.3} top={<AHChip label="Sample" tone="outline" />}>
        <Icon name="gift" size={26} color={ah.blush} />
        <AHTitle size={30} style={{marginTop: 10}}>A bag for every occasion</AHTitle>
      </AHSmoke>
      <Chips options={Object.keys(bags)} value={occ} onChange={setOcc} />
      <Animated.View key={occ} entering={FadeIn.duration(300)}>
        {items.map(([c, name, p], i) => (
          <Row key={name} last={i === items.length - 1}>
            <Tile icon="shirt" size={52} tone={ah.mute} />
            <View style={{flex: 1, gap: 2}}>
              <Text style={t.eyebrow}>{c}</Text>
              <Text style={[t.title, {fontSize: 20, lineHeight: 23}]}>{name}</Text>
            </View>
            <Text style={[t.num, {fontSize: 13, color: ah.blush}]}>${p}</Text>
          </Row>
        ))}
        <View style={{marginTop: 10}}><Meter pct={100} tone={acc === deco.pink ? ah.rose : ah.white} /></View>
        <Text style={[t.num, {fontSize: 13, marginTop: 8}]}>${tot} total</Text>
      </Animated.View>
      <SampleNote>Sample bags · signed out · nothing is ordered or charged · sign in to keep your own pieces</SampleNote>
    </View>
  );
}

/* ═════════════════════════ The Registry ═════════════════════════ */

const REG_CATS = ['Bags', 'Shoes', 'Jewelry', 'Clothing', 'Beauty', 'Home', 'Travel', 'Experience', 'Other'];
const OCCASIONS = ['Birthday', 'Anniversary', 'Milestone', 'Vacation', 'Dining', 'Travel', 'Romance'];

export function Registry({side}: {side: Side}) {
  const {live, reload} = useLive<{items: Wish[]; outings: Outing[]}>(null, readRegistry);
  return (
    <View style={{gap: 14}}>
      <AHTitle size={32}>Wish for anything. Any member can put funds toward it.</AHTitle>
      <LiveGate live={live} reload={() => void reload()} what="your registry" signedOut={<RegistrySample side={side} />}>
        {(data) => <RegistryLive side={side} items={data.items} outings={data.outings} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

function RegistryLive({side, items, outings, reload}: {side: Side; items: Wish[]; outings: Outing[]; reload: () => Promise<void>}) {
  const [tab, setTab] = useState<'wishes' | 'outings'>('wishes');
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <View style={{gap: 14}}>
      <Segmented options={[['wishes', `My wishes · ${items.length}`], ['outings', `Outings · ${outings.length}`]]} value={tab} onChange={setTab} />
      {tab === 'wishes' ? (
        <>
          {items.length === 0 ? (
            <AHCard pad={22}><Text style={t.voice}>No wishes yet — make one.</Text><Fine style={{marginTop: 8}}>A wish is anything: a bag, a trip, a term of school. Nova can source it for you.</Fine></AHCard>
          ) : items.map((w) => {
            const pct = fundedPct(w.pledged_cents, w.price_cents), open = openId === w.id;
            return (
              <Animated.View key={w.id} layout={LinearTransition}>
                <AHCard pad={0} style={open ? {borderColor: ah.line2} : undefined}>
                  <Pressable onPress={() => setOpenId(open ? null : w.id)} accessibilityRole="button" accessibilityState={{expanded: open}} accessibilityLabel={`${w.title}, ${pct}% funded`} style={{padding: 18, gap: 6}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                      <Text style={t.eyebrow}>{[w.category, w.occasion].filter(Boolean).join(' · ') || 'Wish'}</Text>
                      <Text style={{fontFamily: ahFonts.serif, fontSize: 24, color: pct >= 100 ? ah.ok : ah.text}}>{pct}%</Text>
                    </View>
                    <Text style={[t.title, {fontSize: 23, lineHeight: 26}]}>{w.title}</Text>
                    <Text style={t.small}>{w.brand ? `${w.brand} · ` : ''}{dollars(w.pledged_cents ?? 0)} of {dollars(w.price_cents)}</Text>
                    <View style={{marginTop: 6}}><Meter pct={pct} tone={pct >= 100 ? ah.ok : ah.rose} /></View>
                  </Pressable>
                  {open ? (
                    <Animated.View entering={FadeIn.duration(250)} style={{paddingHorizontal: 18, paddingBottom: 18, gap: 12}}>
                      <NovaAskButton label="Source it" kind="find_item" title={`Source · ${w.title}`} room="registry"
                        details={{query: [w.brand, w.title].filter(Boolean).join(' '), ...(w.price_cents ? {budget_cents: w.price_cents} : {})}} />
                      <Fine>Members put funds toward a wish through the payment partner — that isn’t live yet, so nothing moves from here.</Fine>
                    </Animated.View>
                  ) : null}
                </AHCard>
              </Animated.View>
            );
          })}
          <AddWish side={side} onDone={reload} />
        </>
      ) : (
        <>
          {outings.length === 0 ? (
            <AHCard pad={22}><Text style={t.voice}>No outings yet — plan one.</Text><Fine style={{marginTop: 8}}>An outing is a date, a dinner, a trip — something a wish can be for.</Fine></AHCard>
          ) : outings.map((o, i) => (
            <Row key={o.id} last={i === outings.length - 1} style={{alignItems: 'flex-start'}}>
              <View style={{flex: 1, gap: 2}}>
                <Text style={t.eyebrow}>{[o.occasion_type, o.partner ? `with ${o.partner}` : null, o.date ? new Date(o.date).toLocaleDateString([], {month: 'short', day: 'numeric'}) : null].filter(Boolean).join(' · ') || 'Outing'}</Text>
                <Text style={[t.title, {fontSize: 21, lineHeight: 24}]}>{o.title}</Text>
                {o.note ? <Text style={t.small}>{o.note}</Text> : null}
              </View>
              <Tag tone={o.status === 'open' ? ah.rose : ah.mute}>{o.status}</Tag>
            </Row>
          ))}
          <AddOuting side={side} onDone={reload} />
        </>
      )}
    </View>
  );
}

function AddWish({side, onDone}: {side: Side; onDone: () => Promise<void>}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Other');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await addRegistryWish({title, brand, price_cents: parseDollars(price) ?? 0, category});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was saved.')}); return; }
    setTitle(''); setBrand(''); setPrice(''); setOpen(false);
    setMsg({ok: true, text: 'Your wish is on the registry.'});
    void onDone();
  };
  if (!open) return (
    <View style={{gap: 8}}>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Make a wish"
        style={({pressed}) => ({minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: ah.line2, opacity: pressed ? 0.75 : 1})}>
        <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 22, color: ah.text}}>+ Make a wish</Text>
      </Pressable>
      <Status msg={msg} />
    </View>
  );
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>Make a wish</AHEyebrow>
      <AHInput value={title} onChangeText={setTitle} placeholder="What do you wish for?" accessibilityLabel="Wish" />
      <AHInput value={brand} onChangeText={setBrand} placeholder="Brand (optional)" accessibilityLabel="Brand" />
      <AHInput value={price} onChangeText={setPrice} placeholder="Goal, $" keyboardType="decimal-pad" accessibilityLabel="Goal in dollars" />
      <Chips options={REG_CATS} value={category} onChange={setCategory} />
      <ActionBar label={busy ? 'Saving…' : 'Add to my registry'} color={track[side].acc} onPress={() => void save()} disabled={busy || !title.trim()} />
      <Pick label="Cancel" onPress={() => setOpen(false)} />
      <Status msg={msg} />
    </AHCard>
  );
}

function AddOuting({side, onDone}: {side: Side; onDone: () => Promise<void>}) {
  const [title, setTitle] = useState('');
  const [partner, setPartner] = useState('');
  const [occ, setOcc] = useState('Dining');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await addOuting({title, partner, occasion_type: occ, note});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was saved.')}); return; }
    setTitle(''); setPartner(''); setNote('');
    setMsg({ok: true, text: 'Outing saved. Nothing is booked.'});
    void onDone();
  };
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>Plan an outing</AHEyebrow>
      <AHInput value={title} onChangeText={setTitle} placeholder="Dinner at Lucian" accessibilityLabel="Outing" />
      <AHInput value={partner} onChangeText={setPartner} placeholder="With (optional)" accessibilityLabel="With" />
      <Chips options={OCCASIONS} value={occ} onChange={setOcc} />
      <AHInput value={note} onChangeText={(v) => setNote(v.slice(0, 280))} placeholder="A note (optional)" accessibilityLabel="Note" />
      <ActionBar label={busy ? 'Saving…' : 'Save the outing'} color={track[side].acc} onPress={() => void save()} disabled={busy || !title.trim()} />
      <Status msg={msg} />
    </AHCard>
  );
}

const WISH: Array<[string, string, string, number, number]> = [
  ['amalfi', 'TRAVEL', 'Two weeks on the Amalfi coast', 6000, 2350],
  ['school', 'SCHOOL', 'Spring term, design certificate', 4800, 1200],
  ['car', 'CAR', 'Down payment, vintage convertible', 12000, 3100],
];

function RegistrySample({side: _side}: {side: Side}) {
  return (
    <View style={{gap: 12, marginTop: 14}}>
      {WISH.map(([id, cat, name, goal, raised]) => {
        const pct = Math.round((raised / goal) * 100);
        return (
          <AHCard key={id} pad={18} style={{gap: 6}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}><Text style={t.eyebrow}>{cat} · sample</Text><Text style={{fontFamily: ahFonts.serif, fontSize: 22, color: ah.text}}>{pct}%</Text></View>
            <Text style={[t.title, {fontSize: 22, lineHeight: 25}]}>{name}</Text>
            <Text style={t.small}>${raised.toLocaleString()} of ${goal.toLocaleString()}</Text>
            <Meter pct={pct} />
          </AHCard>
        );
      })}
      <SampleNote>Sample wishes · signed out · no money moves until the payment partner is live</SampleNote>
    </View>
  );
}

/* ═════════════════════════ The Lab ═════════════════════════ */

const LAB_TONE: Record<string, string> = {complete: ah.rose, approved: ah.ok, failed: ah.danger, needs_key: ah.warn, processing: ah.platinum};

export function Lab() {
  const {live, reload} = useLive<LabData>(null, readLab);
  return (
    <View style={{gap: 14}}>
      <AHTitle size={32}>Nova develops. You approve. Nothing leaves without you.</AHTitle>
      <LiveGate live={live} reload={() => void reload()} what="the Lab" signedOut={<LabSample />}>
        {(data) => !data.open ? (
          <AHCard pad={22} style={{gap: 8}}>
            <AHEyebrow>The studios</AHEyebrow>
            <Text style={t.voice}>The studios aren’t open yet.</Text>
            <Fine>Nothing is generated from the Lab yet. When the studios open, your jobs show here with keep or discard on each one.</Fine>
          </AHCard>
        ) : <LabLive data={data} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

function LabLive({data, reload}: {data: LabData; reload: () => Promise<void>}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{id: string; ok: boolean; text: string} | null>(null);
  const act = async (j: LabJob, a: 'check' | 'approve' | 'discard') => {
    setBusy(j.id); setMsg(null);
    const r = await labAct(j.id, a);
    setBusy(null);
    if (!r.ok) { setMsg({id: j.id, ok: false, text: r.body.message ?? failure(r.status, r.body)}); return; }
    setMsg({id: j.id, ok: true, text: a === 'approve' ? 'Kept — it’s in your library.' : a === 'discard' ? 'Discarded.' : labStatus(r.body.job?.status ?? j.status)});
    void reload();
  };
  return (
    <View style={{gap: 12}}>
      <NewLabJob studios={data.studios} onStarted={reload} />
      <Head right={String(data.jobs.length)}>Your jobs</Head>
      {data.jobs.length === 0 ? <Fine>No jobs in the Lab yet — start one above.</Fine> : data.jobs.map((j) => {
        const tone = LAB_TONE[j.status] ?? ah.mute;
        return (
          <AHCard key={j.id} pad={16} style={{gap: 8}}>
            <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
              <Tile icon="flaskconical" size={48} tone={tone} />
              <View style={{flex: 1, gap: 4}}>
                <Text style={[t.title, {fontSize: 18, lineHeight: 22}]} numberOfLines={2}>{j.prompt}</Text>
                <Text style={t.small}>{[data.studios.find((st) => st.type === j.type)?.name ?? j.type, j.style, ago(j.created_at)].filter(Boolean).join(' · ')}</Text>
              </View>
            </View>
            <Tag tone={tone}>{labStatus(j.status)}</Tag>
            {j.error_message && (j.status === 'needs_key' || j.status === 'failed') ? <Fine>{j.error_message}</Fine> : null}
            {j.result_url && (j.status === 'complete' || j.status === 'approved') ? <RowBtn label="Open the result ↗" onPress={() => void Linking.openURL(j.result_url!).catch(() => {})} /> : null}
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
              {j.status === 'processing' || j.status === 'queued' ? <RowBtn label={busy === j.id ? 'Checking…' : 'Check on it'} onPress={() => void act(j, 'check')} disabled={busy !== null} /> : null}
              {j.status === 'complete' ? <RowBtn label={busy === j.id ? 'One moment…' : 'Keep it'} tone={ah.rose} onPress={() => void act(j, 'approve')} disabled={busy !== null} /> : null}
              {j.status !== 'approved' ? <RowBtn label="Discard" onPress={() => void act(j, 'discard')} disabled={busy !== null} /> : null}
            </View>
            {msg?.id === j.id ? <Status msg={msg} /> : null}
          </AHCard>
        );
      })}
    </View>
  );
}

function NewLabJob({studios, onStarted}: {studios: Studio[]; onStarted: () => Promise<void>}) {
  const [type, setType] = useState(studios[0]?.name ?? '');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  if (studios.length === 0) return null;
  const st = studios.find((x) => x.name === type) ?? studios[0];
  const go = async () => {
    setBusy(true); setMsg(null);
    const r = await startLabJob(st.type, prompt);
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was started.')}); return; }
    setPrompt('');
    setMsg({ok: r.body.job?.status !== 'failed', text: r.body.message ?? 'Started.'});
    void onStarted();
  };
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>Start a job</AHEyebrow>
      <Chips options={studios.map((x) => x.name)} value={st.name} onChange={setType} />
      <Fine>{st.connected ? `${st.name} runs on ${st.vendor}.` : `${st.name} isn’t connected yet (${st.vendor}) — your prompt is saved as a draft and nothing is sent.`}</Fine>
      <AHInput value={prompt} onChangeText={(v) => setPrompt(v.slice(0, 1000))} placeholder="Describe what Nova should make" multiline style={{minHeight: 70, paddingTop: 12}} accessibilityLabel="Prompt" />
      <RowBtn label={busy ? 'Starting…' : st.connected ? 'Start it' : 'Save the draft'} tone={ah.rose} onPress={() => void go()} disabled={busy || prompt.trim().length < 3} />
      <Status msg={msg} />
    </AHCard>
  );
}

function LabSample() {
  const jobs: Array<[string, string, string]> = [['Tonight’s look, 3 frames', 'Instagram · carousel', 'DEVELOPING'], ['Amalfi recap, 22s', 'TikTok · reel', 'NEEDS APPROVAL'], ['Velvet season board', 'Pinterest · board', 'READY TO SHARE']];
  return (
    <View style={{gap: 10, marginTop: 14}}>
      {jobs.map(([title, f, st]) => (
        <Row key={title}>
          <Tile icon="flaskconical" size={52} tone={ah.rose} />
          <View style={{flex: 1, gap: 4}}><Text style={[t.title, {fontSize: 19}]}>{title}</Text><Text style={t.small}>{f}</Text><Tag>{st}</Tag></View>
        </Row>
      ))}
      <SampleNote>Sample drafts · signed out · nothing is posted anywhere until you approve and the account is connected</SampleNote>
    </View>
  );
}

/* ═════════════════════════ The Switchboard ═════════════════════════ */

function Dot({on}: {on: boolean}) {
  const reduce = useReducedMotion();
  const st = useAnimatedStyle(() => ({opacity: reduce ? 1 : withTiming(on ? 1 : 0.5, {duration: 300})}));
  return <Animated.View style={[{width: 10, height: 10, borderRadius: 5, backgroundColor: on ? ah.ok : 'rgba(255,255,255,0.18)'}, st]} />;
}

export function Switchboard() {
  const {live, reload} = useLive<{lines: Line[]; broadcasts: Broadcast[]}>(null, readSwitchboard);
  return (
    <View style={{gap: 14}}>
      <AHTitle size={32}>Every line in, every line out — on your say.</AHTitle>
      <LiveGate live={live} reload={() => void reload()} what="your Switchboard" signedOut={<SwitchboardSample />}>
        {(data) => {
          const lines = switchboardLines(data.lines);
          const n = lines.filter((l) => l.on).length;
          return (
            <View style={{gap: 14}}>
              <AHCard pad={4} style={{paddingHorizontal: 18}}>
                {lines.map((l, i) => (
                  <Row key={l.key} last={i === lines.length - 1}>
                    <View style={{flex: 1, gap: 2}}>
                      <Text style={t.title}>{l.name}</Text>
                      <Text style={[t.meta, {color: l.on ? ah.ok : ah.faint}]}>{l.on ? `Connected${l.since ? ` · since ${new Date(l.since).toLocaleDateString([], {month: 'short', day: 'numeric'})}` : ''}` : 'Not connected'}</Text>
                    </View>
                    <Dot on={l.on} />
                  </Row>
                ))}
              </AHCard>
              <Fine>{n === 0
                ? 'No line is connected. A line connects only through that network’s own sign-in, and the house holds a real token for it — no network’s sign-in is open yet, so nothing can post on your behalf.'
                : 'Connected means the house holds a real sign-in token for that network.'}</Fine>
              <Head right={String(data.broadcasts.length)}>Consent ledger</Head>
              {data.broadcasts.length === 0 ? <Fine>Nothing has been sent on your behalf.</Fine> : (
                <View>
                  {data.broadcasts.map((b, i) => (
                    <Row key={b.id} last={i === data.broadcasts.length - 1} style={{alignItems: 'flex-start'}}>
                      <Text style={[t.meta, {width: 70, paddingTop: 2}]}>{ago(b.created_at)}</Text>
                      <View style={{flex: 1, gap: 2}}>
                        <Text style={t.body} numberOfLines={3}>{b.content ?? '—'}</Text>
                        <Text style={t.meta}>{(b.platforms ?? []).join(' · ') || 'No network'} · {b.status ?? 'logged'}</Text>
                      </View>
                    </Row>
                  ))}
                </View>
              )}
            </View>
          );
        }}
      </LiveGate>
    </View>
  );
}

function SwitchboardSample() {
  const lines: Array<[string, boolean]> = [['Instagram', true], ['TikTok', false], ['Pinterest', true]];
  return (
    <View style={{gap: 12, marginTop: 14}}>
      <AHCard pad={4} style={{paddingHorizontal: 18}}>
        {lines.map(([name, on], i) => (
          <Row key={name} last={i === lines.length - 1}>
            <View style={{flex: 1}}><Text style={t.title}>{name}</Text><Text style={[t.meta, {color: on ? ah.ok : ah.faint}]}>{on ? 'Sample · connected' : 'Not connected'}</Text></View>
            <Dot on={on} />
          </Row>
        ))}
      </AHCard>
      <SampleNote>Sample lines · signed out · real connections use each service’s own sign-in and can be revoked</SampleNote>
    </View>
  );
}

