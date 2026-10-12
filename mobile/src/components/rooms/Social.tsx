// The Bag (occasion bags others can fill, drop-shipped), The Registry (wishes members can put funds toward),
// The Lab (Nova develops posts, you approve) and the Switchboard (connected accounts + consent ledger).
// After Hours skin. Money moves only through the payment partner — Finesse never holds member funds — and
// everything here is a labelled preview until those partners and integrations are live.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useReducedMotion, withTiming} from 'react-native-reanimated';
import {deco, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {AHCard, AHChip, AHEyebrow, AHSmoke, AHTitle} from '@/components/ah';
import {radius} from '@/lib/ah';
import {ActionBar, Chips, SampleNote, Segmented} from './shared';
import {Fine, Head, Meter, Pick, Row, Tag, Tile, ah, ahFonts, t} from './RoomKit';

type Item = [string, string, number];
const BAGS: Record<Side, Record<string, Item[]>> = {
  her: {
    'Night out': [['DRESS', 'Black satin slip dress', 240], ['SHOES', 'Strappy gold sandals', 180], ['LINGERIE', 'Silk set, champagne', 120], ['PERFUME', 'Eau de parfum, 50 ml', 95]],
    'Girls night': [['WINE', 'Two bottles of rosé', 60], ['SKIN', 'Sheet masks, 6 pack', 28], ['SNACK', 'Charcuterie box', 45]],
    'Baby shower': [['GIFT', 'Cashmere baby blanket', 140], ['DRESS', 'Floral midi', 160], ['CARD', 'Letterpress card', 9]],
    'Church Sunday': [['DRESS', 'Navy wrap dress', 150], ['HAT', 'Wide-brim felt hat', 85], ['SHOES', 'Nude block heels', 120]],
    'First day of school': [['BAG', 'Leather backpack', 120], ['STATIONERY', 'Notebook and pen set', 35], ['SHOES', 'White sneakers', 90]],
  },
  him: {
    'Night out': [['SHIRT', 'Black silk shirt', 180], ['SHOES', 'Suede loafers', 320], ['FRAGRANCE', 'Cologne, 100 ml', 140], ['WATCH', 'Leather strap, cognac', 75]],
    'Game day': [['JERSEY', 'Home jersey', 130], ['DRINK', 'Bourbon, small batch', 70], ['SNACK', 'Wings for six', 60]],
    'Church Sunday': [['SUIT', 'Navy two-piece', 690], ['TIE', 'Silk tie, burgundy', 85], ['SHOES', 'Oxford, black', 260]],
    'First day of work': [['BAG', 'Leather briefcase', 340], ['PEN', 'Fountain pen', 120], ['SHIRT', 'White poplin', 110]],
  },
};

export function Bag({side}: {side: Side}) {
  const acc = track[side].acc, her = side === 'her';
  const bags = BAGS[side];
  const [occ, setOcc] = useState('Night out');
  const [open, setOpen] = useState(false);
  const [vis, setVis] = useState('Partner');
  const [shared, setShared] = useState(false);
  const [sent, setSent] = useState(false);
  const items = bags[occ];
  const covered = occ === 'Night out' ? [1] : [];
  const tot = items.reduce((a, x) => a + x[2], 0), cov = items.reduce((a, x, i) => a + (covered.includes(i) ? x[2] : 0), 0);
  const gift = her ? {from: 'Ryan', for: 'your date Saturday', n: 4, day: 'FRI', items: bags['Night out']} : {from: 'Mom', for: 'church on Sunday', n: 3, day: 'SAT', items: bags['Church Sunday']};
  return (
    <View style={{gap: 16}}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{expanded: open}} accessibilityLabel={`A new bag is on its way. ${gift.from} is sending for ${gift.for}. ${open ? 'Close' : 'Peek'}`}>
        <AHSmoke aspect={1.2} top={<View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}><AHChip label="On its way" live tone="rose" /><AHChip label={`Arrives ${gift.day.charAt(0)}${gift.day.slice(1).toLowerCase()}`} tone="outline" /></View>}>
          <Icon name="gift" size={26} color={ah.blush} />
          <AHTitle size={32} style={{marginTop: 10}}>{gift.from} is sending for {gift.for}</AHTitle>
          <Text style={[t.meta, {color: 'rgba(255,255,255,0.7)', marginTop: 8}]}>{gift.n} pieces · tap to {open ? 'close' : 'peek'}</Text>
        </AHSmoke>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeInDown.duration(300)} style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {gift.items.map(([cat, name]) => (
            <View key={name} style={{flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 38, borderRadius: radius.pill, borderWidth: 1, borderColor: ah.line2}}>
              <Text style={[t.name, {fontSize: 13}]}>{name}</Text>
              <Text style={[t.meta, {fontSize: 10, color: ah.faint}]}>{cat}</Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
      <Head>Your bags · for any occasion</Head>
      <Chips options={Object.keys(bags)} value={occ} onChange={(v) => { setOcc(v); setShared(false); }} />
      <Animated.View key={occ} entering={FadeIn.duration(300)} style={{gap: 12}}>
        <View>
          {items.map(([cat, name, p], i) => {
            const c = covered.includes(i);
            return (
              <Row key={name} last={i === items.length - 1}>
                <Tile icon="shirt" size={52} tone={ah.mute} />
                <View style={{flex: 1, gap: 2}}>
                  <Text style={t.eyebrow}>{cat}</Text>
                  <Text style={[t.title, {fontSize: 20, lineHeight: 23}]}>{name}</Text>
                  <Text style={[t.num, {fontSize: 13, color: ah.blush}]}>${p}</Text>
                </View>
                <Tag tone={c ? ah.rose : ah.faint} fill={c}>{c ? `Covered by ${gift.from}` : 'Open'}</Tag>
              </Row>
            );
          })}
        </View>
        <View style={{gap: 8}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[t.num, {fontSize: 13, color: ah.rose}]}>${cov} covered</Text>
            <Text style={[t.num, {fontSize: 13}]}>${tot} total</Text>
          </View>
          <Meter pct={Math.round((cov / tot) * 100)} tone={acc === deco.pink ? ah.rose : ah.white} />
        </View>
      </Animated.View>
      <Head>Who can fill it</Head>
      <Chips options={['Partner', 'Family', 'Circle']} value={vis} onChange={(v) => { setVis(v); setShared(false); }} />
      <Fine>No expectations. A bag just sits there until someone wants to fill a piece of it. Everything ships straight to you.</Fine>
      <ActionBar color={shared ? ah.white : acc} label={shared ? `Shared · ${vis.toLowerCase()}` : 'Share this bag'} onPress={() => setShared((x) => !x)} />
      <Pick label={sent ? 'Picking for Maya…' : 'Send one'} on={sent} onPress={() => setSent((x) => !x)} style={{minHeight: 50}} />
      <SampleNote>Sample bags · Nothing is ordered or charged here · Drop-ship partners are being connected</SampleNote>
    </View>
  );
}

const WISH: Array<[string, string, string, string, number, number, number]> = [
  ['amalfi', 'TRAVEL', 'You', 'Two weeks on the Amalfi coast', 6000, 2350, 9],
  ['school', 'SCHOOL', 'You', 'Spring term, design certificate', 4800, 1200, 4],
  ['car', 'CAR', 'You', 'Down payment, vintage convertible', 12000, 3100, 6],
  ['maya', 'TRAVEL', 'Maya', 'Tulum for her 30th', 3000, 1850, 12],
  ['theo', 'STUDIO', 'Theo', 'Recording studio deposit', 8000, 2600, 7],
  ['sana', 'SCHOOL', 'Sana', 'Law school deposit', 5000, 4100, 21],
];

export function Registry({side}: {side: Side}) {
  const acc = track[side].acc;
  const [tab, setTab] = useState<'mine' | 'circle'>('mine');
  const [openId, setOpenId] = useState<string | null>(null);
  const [amt, setAmt] = useState<Record<string, string>>({});
  const [given, setGiven] = useState<Record<string, number>>({});
  const [extra, setExtra] = useState(0);
  const mine = [...WISH.filter((w) => w[2] === 'You'), ...Array.from({length: extra}, (_, k) => [`new${k}`, 'ANYTHING', 'You', `New wish ${k + 1}`, 1000, 0, 0] as (typeof WISH)[number])];
  const list = tab === 'mine' ? mine : WISH.filter((w) => w[2] !== 'You');
  return (
    <View style={{gap: 14}}>
      <View style={{gap: 6}}>
        <AHTitle size={32}>Wish for anything. Any member can put funds toward it.</AHTitle>
      </View>
      <Segmented options={[['mine', 'My wishes'], ['circle', 'For others']]} value={tab} onChange={(x) => { setTab(x); setOpenId(null); }} />
      {list.map(([id, cat, owner, name, goal, raised, backers]) => {
        const g = given[id] ?? 0, tot = raised + g, pct = Math.min(100, Math.round((tot / goal) * 100)), open = openId === id;
        const a = amt[id] ?? '$100', v = Number(a.slice(1));
        return (
          <Animated.View key={id} layout={LinearTransition}>
            <AHCard pad={0} style={open ? {borderColor: ah.line2} : undefined}>
              <Pressable onPress={() => setOpenId(open ? null : id)} accessibilityRole="button" accessibilityState={{expanded: open}} accessibilityLabel={`${name}, ${pct}% funded`} style={{padding: 18, gap: 6}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Text style={t.eyebrow}>{cat} · {owner === 'You' ? 'yours' : `${owner}’s`}</Text>
                  <Text style={{fontFamily: ahFonts.serif, fontSize: 24, color: pct >= 100 ? ah.ok : ah.text}}>{pct}%</Text>
                </View>
                <Text style={[t.title, {fontSize: 23, lineHeight: 26}]}>{name}</Text>
                <Text style={t.small}>${tot.toLocaleString()} of ${goal.toLocaleString()} · {backers + (g ? 1 : 0)} members chipped in</Text>
                <View style={{marginTop: 6}}><Meter pct={pct} tone={pct >= 100 ? ah.ok : ah.rose} /></View>
              </Pressable>
              {open ? (
                <Animated.View entering={FadeIn.duration(250)} style={{paddingHorizontal: 18, paddingBottom: 18, gap: 12}}>
                  <AHEyebrow color={ah.blush}>{owner === 'You' ? 'Top it up yourself' : `Put funds toward ${owner}’s wish`}</AHEyebrow>
                  <Chips options={['$25', '$100', '$250', '$500']} value={a} onChange={(x) => setAmt((m) => ({...m, [id]: x}))} />
                  <ActionBar color={g ? ah.white : acc} label={g ? `You’ve given $${g.toLocaleString()} · give ${a} more` : `Give ${a}`} onPress={() => setGiven((m) => ({...m, [id]: (m[id] ?? 0) + v}))} />
                </Animated.View>
              ) : null}
            </AHCard>
          </Animated.View>
        );
      })}
      {tab === 'mine' ? (
        <Pressable onPress={() => setExtra((n) => n + 1)} accessibilityRole="button" accessibilityLabel="Make a wish"
          style={({pressed}) => ({minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: ah.line2, opacity: pressed ? 0.75 : 1})}>
          <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 22, color: ah.text}}>+ Make a wish</Text>
        </Pressable>
      ) : null}
      <Fine>Gifts are held by our payment partner until a wish is met or its owner draws them down — Finesse never holds the money. Givers can stay anonymous.</Fine>
      <SampleNote>Sample wishes · Giving here is a preview · No money moves until the payment partner is live</SampleNote>
    </View>
  );
}

type JobState = 'DEVELOPING' | 'NEEDS APPROVAL' | 'READY TO SHARE' | 'RETAKE';
const CHIP: Record<JobState, string> = {'DEVELOPING': ah.mute, 'NEEDS APPROVAL': ah.rose, 'READY TO SHARE': ah.ok, 'RETAKE': ah.warn};
const JOBS: Array<[string, string]> = [['Tonight’s look, 3 frames', 'Instagram · carousel'], ['Amalfi recap, 22s', 'TikTok · reel'], ['Velvet season board', 'Pinterest · board']];

export function Lab() {
  const [states, setStates] = useState<JobState[]>(['DEVELOPING', 'NEEDS APPROVAL', 'READY TO SHARE']);
  const [ji, setJi] = useState(1);
  const set = (v: JobState) => setStates((a) => a.map((x, i) => (i === ji ? v : x)));
  return (
    <View style={{gap: 14}}>
      <View style={{gap: 6}}>
        <AHTitle size={32}>Nova develops. You approve. Nothing leaves without you.</AHTitle>
      </View>
      {JOBS.map(([title, f], i) => {
        const on = i === ji;
        return (
          <Pressable key={title} onPress={() => setJi(i)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${title}, ${f}, ${states[i].toLowerCase()}`}
            style={({pressed}) => ({flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: on ? ah.white : ah.line, backgroundColor: on ? 'rgba(255,255,255,0.06)' : ah.ink2, opacity: pressed ? 0.85 : 1})}>
            <Tile icon="flaskconical" size={56} tone={ah.rose} />
            <View style={{flex: 1, gap: 4}}>
              <Text style={[t.title, {fontSize: 20, lineHeight: 23}]}>{title}</Text>
              <Text style={t.small}>{f}</Text>
              <Tag tone={CHIP[states[i]]}>{states[i]}</Tag>
            </View>
          </Pressable>
        );
      })}
      {states[ji] === 'NEEDS APPROVAL' ? (
        <Animated.View entering={FadeInDown.duration(300)}>
          <AHCard pad={18} style={{borderColor: 'rgba(232,180,160,0.4)'}}>
            <AHEyebrow color={ah.rose}>Approval gate</AHEyebrow>
            <Text style={[t.title, {marginTop: 8}]}>{JOBS[ji][0]}</Text>
            <View style={{gap: 10, marginTop: 14}}>
              <ActionBar color={ah.white} label="Approve" onPress={() => set('READY TO SHARE')} />
              <Pick label="Retake" onPress={() => set('RETAKE')} style={{minHeight: 50}} />
            </View>
          </AHCard>
        </Animated.View>
      ) : null}
      <SampleNote>Sample drafts · Nothing is posted anywhere until you approve and the account is connected in the Switchboard</SampleNote>
    </View>
  );
}

const LINES: Array<[string, string, string]> = [['instagram', 'Instagram', 'Drafts · read style'], ['tiktok', 'TikTok', 'Drafts · read style'], ['pinterest', 'Pinterest', 'Read boards'], ['facebook', 'Facebook', 'Events'], ['x', 'X', 'Drafts'], ['google', 'Google Maps', 'Check-ins']];
const LEDGER: Array<[string, string]> = [['8:12 PM', 'Nova drafted 3 captions for Instagram. Waiting on you.'], ['7:40 PM', 'Google Maps check-in at Lucian, shared with close circle only.'], ['TODAY', 'Pinterest boards read for your style read.'], ['MON', 'TikTok reel posted after your approval.']];

function Toggle({on, onPress, label}: {on: boolean; onPress: () => void; label: string}) {
  const reduce = useReducedMotion();
  const knob = useAnimatedStyle(() => ({transform: [{translateX: reduce ? (on ? 20 : 0) : withTiming(on ? 20 : 0, {duration: 200})}]}));
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{checked: on}} accessibilityLabel={label} hitSlop={10}
      style={{width: 52, height: 32, borderRadius: 16, backgroundColor: on ? ah.ok : 'rgba(255,255,255,0.14)', justifyContent: 'center', paddingHorizontal: 3}}>
      <Animated.View style={[{width: 26, height: 26, borderRadius: 13, backgroundColor: ah.white}, knob]} />
    </Pressable>
  );
}

export function Switchboard() {
  const [conn, setConn] = useState<Record<string, boolean>>({});
  return (
    <View style={{gap: 14}}>
      <View style={{gap: 6}}>
        <AHTitle size={32}>Every line in, every line out — on your say.</AHTitle>
      </View>
      <AHCard pad={4} style={{paddingHorizontal: 18}}>
        {LINES.map(([k, name, scope], i) => {
          const on = !!conn[k];
          return (
            <Row key={k} last={i === LINES.length - 1}>
              <View style={{flex: 1, gap: 2}}>
                <Text style={t.title}>{name}</Text>
                <Text style={[t.meta, {color: on ? ah.ok : ah.faint}]}>{on ? `Preview · ${scope.toLowerCase()}` : 'Not connected'}</Text>
              </View>
              <Toggle on={on} label={name} onPress={() => setConn((c) => ({...c, [k]: !c[k]}))} />
            </Row>
          );
        })}
      </AHCard>
      <Head>Consent ledger</Head>
      <View>
        {LEDGER.map(([when, x], i) => (
          <Row key={x} last={i === LEDGER.length - 1} style={{alignItems: 'flex-start'}}>
            <Text style={[t.meta, {width: 64, paddingTop: 2}]}>{when}</Text>
            <Text style={[t.body, {flex: 1}]}>{x}</Text>
          </Row>
        ))}
      </View>
      <SampleNote>Sample ledger · Toggles are a preview · Real connections use each service’s own sign-in and can be revoked here</SampleNote>
    </View>
  );
}
