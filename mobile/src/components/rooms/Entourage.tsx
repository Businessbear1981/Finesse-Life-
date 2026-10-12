// Entourage — dossiers on the people you love: countdown to their day, gifts on record, what they love.
// Signed in, these are the member's own dossiers (entourage_people / entourage_gifts via /api/entourage);
// "Gift ideas" asks Nova's scout through the hub (find_item) and "Plan their birthday" asks the planner
// (plan · evening). Nothing is bought or booked. Signed out, a labelled sample.
import {useState} from 'react';
import {Linking, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {failure, useLive} from '@/lib/live';
import {AHCard, AHChip, AHEyebrow, AHInput, AHRing, AHSmoke, AHTitle} from '@/components/ah';
import {
  addPerson, birthdayBrief, editPerson, giftQuery, isIsoDate, lovesFrom, readPeople, removeGift, removePerson, saveGift, setGiftStatus,
  type Gift, type PeopleData, type Person,
} from '@/lib/rooms/entourage';
import {createRequest, formatCents, requestErrorText, resultView, type ItemView} from '@/lib/rooms/nova-requests';
import {ActionBar, Chips, SampleNote, s} from './shared';
import {LiveGate, Meta, RowBtn, Status} from './live';

type Msg = {ok: boolean; text: string} | null;

/* ─── Signed out: the labelled sample ─── */
const SAMPLE: Array<[string, string, string, number, string, number, string[]]> = [
  ['Mum', 'FAMILY', 'Savannah', 12, 'her birthday', 9, ['Orchids', 'Hermès scarves', 'Earl Grey']],
  ['Theo', 'PARTNER', 'Atlanta', 31, 'your anniversary', 14, ['Vintage watches', 'Negronis', 'Jazz']],
];

function Sample() {
  const [who, setWho] = useState('Mum');
  const P = SAMPLE.find((p) => p[0] === who)!;
  return (
    <View style={{gap: 14, marginTop: 14}}>
      <Chips options={SAMPLE.map((p) => p[0])} value={who} onChange={setWho} />
      <AHSmoke aspect={1 / 0.7} top={<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}><AHChip label={`Sample · ${P[1].toLowerCase()}`} tone="glass" /><AHRing name={P[0]} size={58} label={false} /></View>}>
        <AHEyebrow color="rgba(237,235,231,0.7)">{P[2]}</AHEyebrow>
        <AHTitle size={52} style={{marginTop: 2}}>{P[0]}</AHTitle>
        <Text style={[s.small, {color: 'rgba(237,235,231,0.7)', marginTop: 10}]}>{P[3]} days to {P[4]} · {P[5]} gifts on record</Text>
      </AHSmoke>
      <Text style={s.small}>Loves {P[6].join(', ')}</Text>
      <SampleNote>Sample dossiers · only you see your Entourage once you sign in</SampleNote>
    </View>
  );
}

/* ─── Add / edit a dossier ─── */
function PersonForm({person, acc, onSaved, onCancel}: {person?: Person; acc: string; onSaved: (id?: string) => void; onCancel?: () => void}) {
  const [name, setName] = useState(person?.name ?? '');
  const [relation, setRelation] = useState(person?.relation ?? '');
  const [city, setCity] = useState(person?.city ?? '');
  const [birthday, setBirthday] = useState(person?.birthday ?? '');
  const [loves, setLoves] = useState(person?.loves.join(', ') ?? '');
  const [notes, setNotes] = useState(person?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const save = async () => {
    if (!name.trim() || busy) return;
    if (birthday && !isIsoDate(birthday.trim())) { setMsg({ok: false, text: 'Write the birthday as YYYY-MM-DD, e.g. 1962-10-20. Nothing was saved.'}); return; }
    setBusy(true); setMsg(null);
    const input = {name: name.trim(), relation: relation.trim() || 'friend', city: city.trim() || null, birthday: birthday.trim() || null, loves: lovesFrom(loves), notes: notes.trim() || null};
    const r = person ? await editPerson(person.id, input) : await addPerson(input);
    setBusy(false);
    if (r.ok) onSaved(r.body.person?.id);
    else setMsg({ok: false, text: failure(r.status, r.body, person ? 'Nothing was changed.' : 'Nothing was added.')});
  };
  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <AHCard style={{gap: 12}}>
        <AHEyebrow>{person ? `Edit ${person.name}` : 'Add someone you love'}</AHEyebrow>
        <AHInput label="Name" value={name} onChangeText={(v) => setName(v.slice(0, 80))} placeholder="Mum, Theo, Maya…" />
        <AHInput label="Who they are to you" value={relation} onChangeText={(v) => setRelation(v.slice(0, 40))} placeholder="Family, partner, best friend…" />
        <AHInput label="City" value={city} onChangeText={(v) => setCity(v.slice(0, 80))} placeholder="Optional" />
        <AHInput label="Birthday" value={birthday} onChangeText={(v) => setBirthday(v.replace(/[^\d-]/g, '').slice(0, 10))} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        <AHInput label="Loves" value={loves} onChangeText={(v) => setLoves(v.slice(0, 600))} placeholder="Orchids, jazz, first editions" />
        <AHInput label="Notes only you see" value={notes} onChangeText={(v) => setNotes(v.slice(0, 2000))} placeholder="Optional" multiline style={{minHeight: 80, paddingTop: 14}} />
        <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
          <RowBtn label={busy ? 'Saving…' : person ? 'Save' : 'Add to my people'} onPress={save} disabled={busy || !name.trim()} tone={acc} />
          {onCancel ? <RowBtn label="Cancel" onPress={onCancel} /> : null}
        </View>
        <Status msg={msg} />
      </AHCard>
    </Animated.View>
  );
}

/* ─── One dossier ─── */
function GiftRow({g, person, onChange, last}: {g: Gift; person: Person; onChange: (m: Msg) => void; last: boolean}) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<{ok: boolean; status: number; body: {message?: string; error?: string}}>) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    onChange(r.ok ? null : {ok: false, text: failure(r.status, r.body)});
  };
  return (
    <View style={{paddingVertical: 12, gap: 8, borderBottomWidth: last ? 0 : 1, borderColor: ah.line}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 10}}>
        <Text style={{flex: 1, fontFamily: ahFonts.serif, fontSize: 19, lineHeight: 23, color: ah.text}}>{g.title}</Text>
        {g.price_cents != null ? <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: ah.text}}>{formatCents(g.price_cents)}</Text> : null}
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
        <Meta color={g.status === 'idea' ? ah.mute : ah.ok}>{g.status}{g.source === 'nova' ? ' · from Nova' : ''}</Meta>
        {g.status === 'idea' ? <RowBtn label="Bought it" disabled={busy} onPress={() => act(() => setGiftStatus(person.id, g.id, 'purchased'))} /> : null}
        {g.status === 'purchased' ? <RowBtn label="Given" disabled={busy} onPress={() => act(() => setGiftStatus(person.id, g.id, 'given'))} /> : null}
        {g.url ? <RowBtn label="Open" onPress={() => { void Linking.openURL(g.url!).catch(() => onChange({ok: false, text: 'That link could not be opened on this phone.'})); }} /> : null}
        <RowBtn label="Remove" a11y={`Remove ${g.title}`} disabled={busy} onPress={() => act(() => removeGift(person.id, g.id))} />
      </View>
    </View>
  );
}

const BUDGETS: Record<string, number> = {'$50': 5000, '$150': 15000, '$300': 30000, '$500': 50000};

function Dossier({person, acc, reload}: {person: Person; acc: string; reload: () => void}) {
  const [editing, setEditing] = useState(false);
  const [budget, setBudget] = useState('$150');
  const [busy, setBusy] = useState<'gifts' | 'plan' | 'save' | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [ideas, setIdeas] = useState<ItemView[] | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) return <PersonForm person={person} acc={acc} onSaved={() => { setEditing(false); reload(); }} onCancel={() => setEditing(false)} />;

  const giftIdeas = async () => {
    setBusy('gifts'); setMsg(null); setIdeas(null);
    const r = await createRequest({kind: 'find_item', title: `Gift ideas for ${person.name}`, room: 'entourage', details: {query: giftQuery(person), budget_cents: BUDGETS[budget]}}, true);
    setBusy(null);
    if (!r.ok) { setMsg({ok: false, text: requestErrorText(r.status, r.body)}); return; }
    const v = resultView(r.data.result);
    setIdeas(v.type === 'items' ? v.items : []);
  };
  const planBirthday = async () => {
    setBusy('plan'); setMsg(null); setPlan(null);
    const when = person.next ? new Date(`${person.next.date}T19:00:00`).toISOString() : undefined;
    const r = await createRequest({kind: 'plan', title: `${person.name}’s birthday`, room: 'entourage',
      details: {topic: 'evening', brief: birthdayBrief(person, person.next?.turning ?? null), ...(when ? {when} : {})}}, true);
    setBusy(null);
    if (!r.ok) { setMsg({ok: false, text: requestErrorText(r.status, r.body)}); return; }
    const v = resultView(r.data.result);
    setPlan(v.type === 'plan' ? v.text : null);
    setMsg(v.type === 'plan' ? {ok: true, text: 'Nova’s plan is in your Diary for approval. Nothing is booked.'} : {ok: false, text: 'Nova returned an empty plan. Nothing was booked.'});
  };
  const keep = async (i: ItemView) => {
    setBusy('save');
    const r = await saveGift(person.id, {title: [i.brand, i.title].filter(Boolean).join(' — ').slice(0, 160), price_cents: i.price_cents, url: i.url, source: 'nova', occasion: person.next ? 'Birthday' : null});
    setBusy(null);
    if (r.ok) { setIdeas((xs) => xs?.filter((x) => x !== i) ?? null); reload(); } else setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was saved.')});
  };
  const remove = async () => {
    const r = await removePerson(person.id);
    if (r.ok) reload(); else setMsg({ok: false, text: failure(r.status, r.body)});
  };
  const soon = person.next != null && person.next.days <= 14;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={{gap: 14}}>
      <AHSmoke aspect={1 / 0.78} top={
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <AHChip label={`Dossier · ${person.relation.toLowerCase()}`} tone="glass" />
          <AHRing name={person.name} size={58} label={false} />
        </View>
      }>
        {person.city ? <AHEyebrow color="rgba(237,235,231,0.7)">{person.city}</AHEyebrow> : null}
        <AHTitle size={person.name.length > 10 ? 40 : 56} style={{marginTop: 2}}>{person.name}</AHTitle>
        <View style={{flexDirection: 'row', marginTop: 16, gap: 22}}>
          <View style={{flex: 1}}>
            <Text style={{fontFamily: ahFonts.serif, fontSize: 40, lineHeight: 42, color: soon ? ah.blush : ah.text}}>{person.next ? String(person.next.days) : '—'}</Text>
            <Text style={[s.small, {color: 'rgba(237,235,231,0.7)'}]}>{person.next ? `${person.next.days === 1 ? 'day' : 'days'} to their birthday${person.next.turning ? ` · ${person.next.turning}` : ''}` : 'no birthday on file'}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontFamily: ahFonts.serif, fontSize: 40, lineHeight: 42, color: ah.text}}>{person.gifts.length}</Text>
            <Text style={[s.small, {color: 'rgba(237,235,231,0.7)'}]}>gifts on record</Text>
          </View>
        </View>
      </AHSmoke>

      {person.loves.length ? (
        <View style={{gap: 10}}>
          <Meta>Loves</Meta>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            {person.loves.map((l) => (
              <View key={l} style={{paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: ah.line2}}>
                <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color: ah.text}}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {person.notes ? <View style={{paddingLeft: 14, borderLeftWidth: 2, borderColor: acc}}><Text style={[s.body, {color: ah.mute}]}>{person.notes}</Text></View> : null}

      <AHCard pad={16} style={{gap: 2}}>
        <Meta>Gifts on record</Meta>
        {person.gifts.length === 0 ? <Text style={[s.small, {marginTop: 6}]}>No gifts on record yet — ask Nova for ideas below.</Text>
          : person.gifts.map((g, i) => <GiftRow key={g.id} g={g} person={person} onChange={(m) => { setMsg(m); if (!m) reload(); }} last={i === person.gifts.length - 1} />)}
      </AHCard>

      <View style={{gap: 10}}>
        <Meta>Gift ideas · budget</Meta>
        <Chips options={Object.keys(BUDGETS)} value={budget} onChange={setBudget} />
        <RowBtn label={busy === 'gifts' ? 'Nova is looking…' : 'Gift ideas from Nova'} onPress={giftIdeas} disabled={!!busy} tone={acc} />
        {ideas ? (ideas.length === 0 ? <Text style={s.small}>Nova didn’t find anything that fits — try another budget, or add more of what they love.</Text> : (
          <Animated.View layout={LinearTransition} style={{gap: 8}}>
            {ideas.map((i, k) => (
              <AHCard key={`${i.title}-${k}`} pad={14} style={{gap: 6}}>
                {i.brand ? <Meta>{i.brand}</Meta> : null}
                <Text style={{fontFamily: ahFonts.serif, fontSize: 19, lineHeight: 23, color: ah.text}}>{i.title}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                  <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: ah.text}}>{formatCents(i.price_cents)}</Text>
                  <RowBtn label="Save as idea" onPress={() => keep(i)} disabled={busy === 'save'} />
                </View>
              </AHCard>
            ))}
          </Animated.View>
        )) : null}
      </View>

      {plan ? (
        <Animated.View entering={FadeIn.duration(300)} style={{paddingLeft: 14, borderLeftWidth: 2, borderColor: acc, gap: 6}}>
          <Meta>Nova’s plan · nothing booked</Meta>
          <Text style={[s.body, {color: ah.text}]}>{plan}</Text>
        </Animated.View>
      ) : null}
      <ActionBar color={acc} label={busy === 'plan' ? 'Nova is planning…' : `Plan ${person.name}’s birthday`} onPress={planBirthday} disabled={!!busy} />
      <Status msg={msg} />

      <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
        <RowBtn label="Edit" onPress={() => setEditing(true)} />
        {confirmDelete
          ? <><RowBtn label={`Delete ${person.name} and their gifts`} onPress={remove} tone={ah.rose} /><RowBtn label="Keep" onPress={() => setConfirmDelete(false)} /></>
          : <RowBtn label="Delete" onPress={() => setConfirmDelete(true)} />}
      </View>
    </Animated.View>
  );
}

/* ─── The room ─── */
function People({data, acc, reload}: {data: PeopleData; acc: string; reload: () => void}) {
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(data.people.length === 0);
  // Chip labels must be unique; two people with the same name get a number.
  const labels = data.people.map((p, i) => (data.people.findIndex((q) => q.name === p.name) === i ? p.name : `${p.name} ${i + 1}`));
  const idx = Math.max(0, data.people.findIndex((p) => p.id === sel));
  const current = data.people[idx] ?? null;
  return (
    <View style={{gap: 16}}>
      {data.people.length ? (
        <Chips options={labels} value={labels[idx]} onChange={(l) => { setSel(data.people[labels.indexOf(l)]?.id ?? null); setAdding(false); }} />
      ) : (
        <AHCard style={{gap: 6}}>
          <AHTitle size={28}>No one here yet.</AHTitle>
          <Text style={s.small}>Add the people you love — the house counts down to their day and Nova helps with gifts.</Text>
        </AHCard>
      )}
      {adding
        ? <PersonForm acc={acc} onSaved={(id) => { setAdding(false); if (id) setSel(id); reload(); }} onCancel={data.people.length ? () => setAdding(false) : undefined} />
        : <RowBtn label="Add someone" onPress={() => setAdding(true)} />}
      {current && !adding ? <Dossier key={current.id} person={current} acc={acc} reload={reload} /> : null}
      <SampleNote>Only you see your Entourage · Nova suggests and drafts, nothing is bought or booked</SampleNote>
    </View>
  );
}

export function Entourage({side}: {side: Side}) {
  const acc = track[side].acc;
  const {live, reload} = useLive<PeopleData>(null, readPeople);
  return (
    <LiveGate live={live} reload={() => void reload()} what="your Entourage" signedOut={<Sample />}>
      {(d) => <People data={d} acc={acc} reload={() => void reload(true)} />}
    </LiveGate>
  );
}
