// The Bag (occasion bags others can fill, drop-shipped), The Registry (wishes members can put funds toward),
// The Lab (Nova develops posts, you approve) and the Switchboard (connected accounts + consent ledger).
// From the design. Money moves only through the payment partner — Finesse never holds member funds — and
// everything here is a labelled preview until those partners and integrations are live.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {ActionBar, Chips, GoldFrame, SampleNote, SectionHead, Segmented, s} from './shared';

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
  const tot = items.reduce((t, x) => t + x[2], 0), cov = items.reduce((t, x, i) => t + (covered.includes(i) ? x[2] : 0), 0);
  const gift = her ? {from: 'Ryan', for: 'your date Saturday', n: 4, day: 'FRI', items: bags['Night out']} : {from: 'Mom', for: 'church on Sunday', n: 3, day: 'SAT', items: bags['Church Sunday']};
  return (
    <View style={{gap: 12}}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{expanded: open}}>
        <GoldFrame pad={3}>
          <View style={{backgroundColor: '#1C1012', padding: 14, gap: 4, alignItems: 'center'}}>
            <Icon name="gift" size={26} color={acc} />
            <Text style={{fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2.2, color: deco.brassHighlight}}>A NEW BAG IS ON ITS WAY</Text>
            <Text style={{fontFamily: fonts.script, fontSize: 18, color: deco.cream, textAlign: 'center'}}>{gift.from} is sending for {gift.for}</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: deco.brass}}>{gift.n} PIECES · ARRIVES {gift.day} · TAP TO {open ? 'CLOSE' : 'PEEK'}</Text>
          </View>
        </GoldFrame>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeInDown.duration(300)} style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
          {gift.items.map(([cat, name]) => <Text key={name} style={{paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)', fontFamily: fonts.label, fontSize: 11, color: deco.cream}}>{name} <Text style={{color: deco.brass, fontFamily: fonts.mono, fontSize: 8}}>{cat}</Text></Text>)}
        </Animated.View>
      ) : null}
      <SectionHead>YOUR BAGS · FOR ANY OCCASION</SectionHead>
      <Chips options={Object.keys(bags)} value={occ} onChange={(v) => { setOcc(v); setShared(false); }} />
      <Animated.View key={occ} entering={FadeIn.duration(300)} style={{gap: 8}}>
        {items.map(([cat, name, p], i) => {
          const c = covered.includes(i);
          return (
            <View key={name} style={{flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.3)'}}>
              <View style={{width: 44, height: 52, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center', backgroundColor: '#140E0B'}}><Icon name="shirt" size={18} color={deco.brass} strokeWidth={1.2} /></View>
              <View style={{flex: 1}}>
                <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>{cat}</Text>
                <Text style={{fontFamily: fonts.label, fontSize: 13, color: deco.cream}}>{name}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brassHighlight}}>${p}</Text>
              </View>
              <Text style={{paddingHorizontal: 6, paddingVertical: 2, backgroundColor: c ? deco.brassHighlight : 'transparent', fontFamily: fonts.mono, fontSize: 8, letterSpacing: 0.8, color: c ? '#140E08' : 'rgba(244,232,208,0.6)'}}>{c ? `COVERED BY ${gift.from.toUpperCase()}` : 'OPEN'}</Text>
            </View>
          );
        })}
        <View style={{gap: 5}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brassHighlight}}>${cov} COVERED</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.cream}}>${tot} TOTAL</Text>
          </View>
          <View style={{height: 4, backgroundColor: 'rgba(201,169,97,0.15)'}}><View style={{height: 4, width: `${Math.round((cov / tot) * 100)}%`, backgroundColor: acc}} /></View>
        </View>
      </Animated.View>
      <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>WHO CAN FILL IT</Text>
      <Chips options={['Partner', 'Family', 'Circle']} value={vis} onChange={(v) => { setVis(v); setShared(false); }} />
      <Text style={s.small}>No expectations. A bag just sits there until someone wants to fill a piece of it. Everything ships straight to you.</Text>
      <View style={{flexDirection: 'row', gap: 8}}>
        <View style={{flex: 1}}><ActionBar color={shared ? deco.brass : acc} label={shared ? `SHARED · ${vis.toUpperCase()}` : 'SHARE THIS BAG'} onPress={() => setShared((x) => !x)} /></View>
        <Pressable onPress={() => setSent((x) => !x)} accessibilityRole="button" style={{flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: deco.brass}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.4, color: deco.brassHighlight}}>{sent ? 'PICKING FOR MAYA…' : 'SEND ONE'}</Text>
        </Pressable>
      </View>
      <SampleNote>SAMPLE BAGS · NOTHING IS ORDERED OR CHARGED HERE · DROP-SHIP PARTNERS ARE BEING CONNECTED</SampleNote>
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
    <View style={{gap: 12}}>
      <Text style={[s.body, {textAlign: 'center'}]}>Wish for anything. Any member can put funds toward it.</Text>
      <Segmented options={[['mine', 'MY WISHES'], ['circle', 'FOR OTHERS']]} value={tab} onChange={(t) => { setTab(t); setOpenId(null); }} />
      {list.map(([id, cat, owner, name, goal, raised, backers]) => {
        const g = given[id] ?? 0, tot = raised + g, pct = Math.min(100, Math.round((tot / goal) * 100)), open = openId === id;
        const a = amt[id] ?? '$100', v = Number(a.slice(1));
        return (
          <Animated.View key={id} layout={LinearTransition} style={{borderWidth: 1, borderColor: open ? deco.brassHighlight : 'rgba(201,169,97,0.3)'}}>
            <Pressable onPress={() => setOpenId(open ? null : id)} accessibilityRole="button" accessibilityState={{expanded: open}} style={{padding: 12, gap: 4}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>{cat} · {owner === 'You' ? 'YOURS' : `${owner.toUpperCase()}’S`}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 10, color: pct >= 100 ? '#7AF5B8' : deco.brassHighlight}}>{pct}%</Text>
              </View>
              <Text style={{fontFamily: fonts.displayBold, fontSize: 16, color: deco.cream}}>{name}</Text>
              <Text style={s.small}>${tot.toLocaleString()} of ${goal.toLocaleString()} · {backers + (g ? 1 : 0)} members chipped in</Text>
            </Pressable>
            <View style={{height: 3, backgroundColor: 'rgba(201,169,97,0.15)'}}><Animated.View layout={LinearTransition} style={{height: 3, width: `${pct}%`, backgroundColor: pct >= 100 ? '#7AF5B8' : deco.brassHighlight}} /></View>
            {open ? (
              <Animated.View entering={FadeIn.duration(250)} style={{padding: 12, gap: 8}}>
                <Text style={{fontFamily: fonts.capsBold, fontSize: 9.5, letterSpacing: 1.6, color: deco.brassHighlight}}>{owner === 'You' ? 'TOP IT UP YOURSELF' : `PUT FUNDS TOWARD ${owner.toUpperCase()}’S WISH`}</Text>
                <Chips options={['$25', '$100', '$250', '$500']} value={a} onChange={(x) => setAmt((m) => ({...m, [id]: x}))} />
                <ActionBar color={g ? deco.brass : acc} label={g ? `YOU’VE GIVEN $${g.toLocaleString()} · GIVE ${a} MORE` : `GIVE ${a}`} onPress={() => setGiven((m) => ({...m, [id]: (m[id] ?? 0) + v}))} />
              </Animated.View>
            ) : null}
          </Animated.View>
        );
      })}
      {tab === 'mine' ? (
        <Pressable onPress={() => setExtra((n) => n + 1)} accessibilityRole="button" style={{minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: deco.brassHighlight}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2, color: deco.brassHighlight}}>+ MAKE A WISH</Text>
        </Pressable>
      ) : null}
      <Text style={s.small}>Gifts are held by our payment partner until a wish is met or its owner draws them down — Finesse never holds the money. Givers can stay anonymous.</Text>
      <SampleNote>SAMPLE WISHES · GIVING HERE IS A PREVIEW · NO MONEY MOVES UNTIL THE PAYMENT PARTNER IS LIVE</SampleNote>
    </View>
  );
}

type JobState = 'DEVELOPING' | 'NEEDS APPROVAL' | 'READY TO SHARE' | 'RETAKE';
const CHIP: Record<JobState, [string, string]> = {'DEVELOPING': ['#3A1A1E', '#FF8A94'], 'NEEDS APPROVAL': ['#FF2A3A', '#140508'], 'READY TO SHARE': [deco.brassHighlight, '#140E08'], 'RETAKE': ['#3A2A1A', deco.cream]};
const JOBS: Array<[string, string]> = [['Tonight’s look, 3 frames', 'Instagram · carousel'], ['Amalfi recap, 22s', 'TikTok · reel'], ['Velvet season board', 'Pinterest · board']];

export function Lab() {
  const [states, setStates] = useState<JobState[]>(['DEVELOPING', 'NEEDS APPROVAL', 'READY TO SHARE']);
  const [ji, setJi] = useState(1);
  const set = (v: JobState) => setStates((a) => a.map((x, i) => (i === ji ? v : x)));
  return (
    <View style={{gap: 12}}>
      <Text style={{fontFamily: fonts.script, fontSize: 18, color: deco.cream, textAlign: 'center'}}>Nova develops. You approve. Nothing leaves without you.</Text>
      {JOBS.map(([t, f], i) => (
        <Pressable key={t} onPress={() => setJi(i)} accessibilityRole="button" accessibilityState={{selected: i === ji}}
          style={{flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderWidth: 1, borderColor: i === ji ? '#FF2A3A' : 'rgba(255,42,58,0.25)', backgroundColor: 'rgba(40,6,10,0.55)'}}>
          <View style={{width: 54, height: 54, backgroundColor: '#1A0608', borderWidth: 1, borderColor: 'rgba(255,42,58,0.4)', alignItems: 'center', justifyContent: 'center'}}><Icon name="flaskconical" size={20} color="#FF6B7A" /></View>
          <View style={{flex: 1, gap: 3}}>
            <Text style={{fontFamily: fonts.displayBold, fontSize: 15, color: deco.cream}}>{t}</Text>
            <Text style={s.small}>{f}</Text>
            <Text style={{alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, backgroundColor: CHIP[states[i]][0], fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1, color: CHIP[states[i]][1]}}>{states[i]}</Text>
          </View>
        </Pressable>
      ))}
      {states[ji] === 'NEEDS APPROVAL' ? (
        <Animated.View entering={FadeInDown.duration(300)} style={{padding: 12, gap: 10, borderWidth: 1.5, borderColor: '#FF2A3A'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: '#FF6B7A'}}>APPROVAL GATE</Text>
          <Text style={{fontFamily: fonts.displayBold, fontSize: 16, color: deco.cream}}>{JOBS[ji][0]}</Text>
          <View style={{flexDirection: 'row', gap: 8}}>
            <View style={{flex: 1}}><ActionBar color={deco.brassHighlight} label="APPROVE" onPress={() => set('READY TO SHARE')} /></View>
            <Pressable onPress={() => set('RETAKE')} accessibilityRole="button" style={{flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: deco.brass}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: deco.brassHighlight}}>RETAKE</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
      <SampleNote>SAMPLE DRAFTS · NOTHING IS POSTED ANYWHERE UNTIL YOU APPROVE AND THE ACCOUNT IS CONNECTED IN THE SWITCHBOARD</SampleNote>
    </View>
  );
}

const LINES: Array<[string, string, string]> = [['instagram', 'Instagram', 'Drafts · read style'], ['tiktok', 'TikTok', 'Drafts · read style'], ['pinterest', 'Pinterest', 'Read boards'], ['facebook', 'Facebook', 'Events'], ['x', 'X', 'Drafts'], ['google', 'Google Maps', 'Check-ins']];
const LEDGER: Array<[string, string]> = [['8:12 PM', 'Nova drafted 3 captions for Instagram. Waiting on you.'], ['7:40 PM', 'Google Maps check-in at Lucian, shared with close circle only.'], ['TODAY', 'Pinterest boards read for your style read.'], ['MON', 'TikTok reel posted after your approval.']];

function Toggle({on, onPress, label}: {on: boolean; onPress: () => void; label: string}) {
  const knob = useAnimatedStyle(() => ({transform: [{translateX: withTiming(on ? 22 : 0, {duration: 200})}]}));
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{checked: on}} accessibilityLabel={label} hitSlop={8}
      style={{width: 48, height: 26, borderRadius: 13, borderWidth: 1, borderColor: on ? '#00FF88' : deco.brass, backgroundColor: on ? 'rgba(0,255,136,0.18)' : 'transparent', justifyContent: 'center', paddingHorizontal: 2}}>
      <Animated.View style={[{width: 20, height: 20, borderRadius: 10, backgroundColor: on ? '#7AF5B8' : deco.brass}, knob]} />
    </Pressable>
  );
}

export function Switchboard() {
  const [conn, setConn] = useState<Record<string, boolean>>({});
  return (
    <View style={{gap: 12}}>
      <View style={{borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)'}}>
        {LINES.map(([k, name, scope], i) => {
          const on = !!conn[k];
          return (
            <View key={k} style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderColor: 'rgba(201,169,97,0.2)'}}>
              <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: on ? '#00FF88' : '#5A1A1E', shadowColor: '#00FF88', shadowOpacity: on ? 0.9 : 0, shadowRadius: 6}} />
              <View style={{flex: 1}}>
                <Text style={{fontFamily: fonts.label, fontSize: 14, color: deco.cream}}>{name}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 0.8, color: on ? '#7AF5B8' : 'rgba(244,232,208,0.5)'}}>{on ? `PREVIEW · ${scope.toUpperCase()}` : 'NOT CONNECTED'}</Text>
              </View>
              <Toggle on={on} label={name} onPress={() => setConn((c) => ({...c, [k]: !c[k]}))} />
            </View>
          );
        })}
      </View>
      <SectionHead>CONSENT LEDGER</SectionHead>
      {LEDGER.map(([when, t]) => (
        <View key={t} style={{flexDirection: 'row', gap: 12}}>
          <Text style={{width: 62, fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{when}</Text>
          <Text style={[s.small, {flex: 1}]}>{t}</Text>
        </View>
      ))}
      <SampleNote>SAMPLE LEDGER · TOGGLES ARE A PREVIEW · REAL CONNECTIONS USE EACH SERVICE’S OWN SIGN-IN AND CAN BE REVOKED HERE</SampleNote>
    </View>
  );
}
