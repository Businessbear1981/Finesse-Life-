// The remaining rooms, built from the 31-Room Design Atlas (After Hours skin): Carpe Diem (today's brief
// across movement, work, sport and a read-only portfolio), Market (partner market, disclosed offers, honest
// prices), and the Ballroom (compose an evening: proposal → hold → confirmed). Labelled samples.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import {deco, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {AHCard, AHChip, AHEyebrow, AHSmoke, AHTitle} from '@/components/ah';
import {ActionBar, Chips, SampleNote} from './shared';
import {Head, Meter, TextBtn, Tile, ah, ahFonts, t} from './RoomKit';

const PLAT = deco.lamp;

/* ─────────────── Carpe Diem ─────────────── */
const BRIEF: Array<[string, string, string, string, number]> = [
  ['MOVEMENT', 'Gym · upper body, 45 min', 'dumbbell', '6:30 AM', 0],
  ['WORK', 'Two decisions due before noon', 'briefcase', '11:45 AM', 0],
  ['SPORT', 'Tee time Sunday, 07:50 · four-ball', 'trendingup', 'SUN', 0],
  ['PORTFOLIO', 'Read-only · paper account · no trades from the app', 'wallet', 'READ-ONLY', 0],
];

export function CarpeDiem({side}: {side: Side}) {
  const acc = side === 'him' ? PLAT : track[side].acc;
  const [done, setDone] = useState<string[]>([]);
  const pct = Math.round((done.length / 3) * 100);
  return (
    <View style={{gap: 16}}>
      <AHSmoke tone="city" aspect={1.1} top={<View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}><AHChip label="Today’s brief" /><AHChip label={new Date().toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'})} tone="outline" /></View>}>
        <AHEyebrow color={ah.platinum}>Carpe Diem</AHEyebrow>
        <AHTitle size={36} style={{marginTop: 6}}>Seize it. One decisive brief for the day.</AHTitle>
        <View style={{marginTop: 18, gap: 8}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={[t.eyebrow, {color: 'rgba(255,255,255,0.7)'}]}>Confirmed progress</Text>
            <Text style={[t.num, {fontSize: 13}]}>{pct}%</Text>
          </View>
          <Meter pct={pct} tone={ah.white} />
        </View>
      </AHSmoke>
      <View>
        {BRIEF.map(([k, line, icon, when], i) => {
          const isDone = done.includes(k), canTick = i < 3;
          return (
            <Pressable key={k} disabled={!canTick} onPress={() => setDone((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]))}
              accessibilityRole={canTick ? 'checkbox' : 'text'} accessibilityState={canTick ? {checked: isDone} : undefined} accessibilityLabel={`${k.toLowerCase()}, ${line}, ${when}`}
              style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingVertical: 12, borderBottomWidth: i === BRIEF.length - 1 ? 0 : 1, borderColor: ah.line, opacity: pressed ? 0.8 : 1})}>
              <View style={{width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: isDone ? ah.ok : ah.line2, alignItems: 'center', justifyContent: 'center', backgroundColor: isDone ? 'rgba(126,226,184,0.12)' : ah.ink3}}>
                <Icon name={isDone ? 'sparkles' : icon} size={18} color={isDone ? ah.ok : ah.text} />
              </View>
              <View style={{flex: 1, gap: 2}}>
                <Text style={t.eyebrow}>{k} · {when}</Text>
                <Text style={[t.title, {fontSize: 21, lineHeight: 24, textDecorationLine: isDone ? 'line-through' : 'none', opacity: isDone ? 0.55 : 1}]}>{line}</Text>
              </View>
              {canTick ? <View style={{width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: isDone ? ah.ok : ah.line2, backgroundColor: isDone ? ah.ok : 'transparent', alignItems: 'center', justifyContent: 'center'}}>{isDone ? <Text style={{color: '#000', fontSize: 13, fontFamily: ahFonts.sansBold}}>✓</Text> : null}</View> : null}
            </Pressable>
          );
        })}
      </View>
      <ActionBar color={acc} label={pct === 100 ? 'Day seized · see you tomorrow' : 'Open today’s brief with Nova'} />
      <SampleNote>Sample brief · The indicator rises only with what you confirm · Portfolio is read-only and never trades</SampleNote>
    </View>
  );
}

/* ─────────────── Market ─────────────── */
const GOODS: Array<[string, string, string, string, number, string]> = [
  ['WATCHES', 'Steel dress watch, 38 mm', 'Partner boutique', 'Affiliate · Finesse earns 6%', 4200, 'briefcase'],
  ['GOLF', 'Forged irons, 5–PW', 'Brand site', 'Affiliate · Finesse earns 5%', 1450, 'trendingup'],
  ['TAILORING', 'Made-to-measure navy suit', 'Partner tailor', 'Referral fee disclosed at fitting', 1890, 'shirt'],
  ['SPIRITS', 'Single-cask bourbon, 750 ml', 'Licensed retailer · 21+', 'Affiliate · Finesse earns 4%', 180, 'martini'],
];
export function Market({side}: {side: Side}) {
  const acc = side === 'him' ? PLAT : track[side].acc;
  const [cat, setCat] = useState('All');
  const [flip, setFlip] = useState<string | null>(null);
  const list = GOODS.filter((g) => cat === 'All' || g[0] === cat.toUpperCase());
  return (
    <View style={{gap: 14}}>
      <View style={{gap: 6}}>
        <AHTitle size={30}>The honest price, the original source and what Finesse earns — before you leave the house.</AHTitle>
      </View>
      <Chips options={['All', 'Watches', 'Golf', 'Tailoring', 'Spirits']} value={cat} onChange={setCat} accent={acc === deco.pink ? ah.rose : undefined} />
      {list.map(([c, name, src, fee, price, icon]) => {
        const open = flip === name;
        return (
          <Animated.View key={name} entering={FadeInDown.duration(300)} layout={LinearTransition}>
            <AHCard pad={16}>
              <View style={{flexDirection: 'row', gap: 14, alignItems: 'center'}}>
                <Tile icon={icon} size={58} />
                <View style={{flex: 1, gap: 2}}>
                  <Text style={t.eyebrow}>{c}</Text>
                  <Text style={[t.title, {fontSize: 21, lineHeight: 24}]}>{name}</Text>
                  <Text style={t.small}>{src}</Text>
                </View>
              </View>
              <Pressable onPress={() => setFlip(open ? null : name)} accessibilityRole="button" accessibilityLabel={`Price tag for ${name}`} accessibilityState={{expanded: open}}
                style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, marginTop: 10, opacity: pressed ? 0.75 : 1})}>
                <Text style={{fontFamily: ahFonts.serif, fontSize: 30, color: ah.text}}>${price.toLocaleString()}</Text>
                <Text style={[t.name, {fontSize: 13, color: open ? ah.rose : ah.text}]}>{open ? 'Hide fees' : 'Fees & source'}</Text>
              </Pressable>
              {open ? (
                <Animated.View entering={FadeIn.duration(250)} style={{marginTop: 8, padding: 14, gap: 4, borderRadius: 16, backgroundColor: 'rgba(232,180,160,0.08)', borderWidth: 1, borderColor: 'rgba(232,180,160,0.2)'}}>
                  <AHEyebrow color={ah.rose}>Disclosed · {fee}</AHEyebrow>
                  <Text style={[t.small, {color: ah.text}]}>The price is the partner’s own. You check out on their site; Finesse never marks it up.</Text>
                </Animated.View>
              ) : null}
            </AHCard>
          </Animated.View>
        );
      })}
      <SampleNote>Sample goods · Tap a price tag for fees and source · Outbound links open once partners are contracted</SampleNote>
    </View>
  );
}

/* ─────────────── Ballroom ─────────────── */
type Stage = 'PROPOSAL' | 'HOLD REQUESTED' | 'CONFIRMED';
const STAGES: Stage[] = ['PROPOSAL', 'HOLD REQUESTED', 'CONFIRMED'];
const EVE: Array<[string, string, string, string]> = [
  ['7:00 PM', 'Salon touch-up', 'Partner salon · 30 min', 'sparkles'],
  ['8:30 PM', 'Dinner for two · Lucian', 'Venue hold requested', 'chefhat'],
  ['10:30 PM', 'Nightcap at the Club', 'Two chairs by the fire', 'martini'],
  ['12:15 AM', 'Car home', 'Finesse Black', 'car'],
];

export function Ballroom({side}: {side: Side}) {
  const acc = track[side].acc;
  const [stage, setStage] = useState(0);
  const [skip, setSkip] = useState<string[]>([]);
  const st = STAGES[stage];
  return (
    <View style={{gap: 16}}>
      <AHSmoke aspect={1.1} top={<AHChip label={stage === 2 ? 'Confirmed' : stage === 1 ? 'Holds requested' : 'Proposal'} live={stage === 1} tone={stage === 2 ? 'rose' : 'glass'} />}>
        <AHEyebrow color={ah.blush}>The Ballroom</AHEyebrow>
        <AHTitle size={34} style={{marginTop: 6}}>Compose an evening. Nova holds each piece; you confirm the whole.</AHTitle>
      </AHSmoke>
      <View style={{flexDirection: 'row', gap: 6}} accessibilityLabel={`Stage ${stage + 1} of 3: ${st.toLowerCase()}`}>
        {STAGES.map((x, i) => (
          <View key={x} style={{flex: 1, gap: 6}}>
            <View style={{height: 3, borderRadius: 2, backgroundColor: i <= stage ? (i === 2 ? ah.ok : ah.white) : ah.line2}} />
            <Text style={[t.eyebrow, {fontSize: 9.5, letterSpacing: 1, color: i <= stage ? ah.text : ah.faint}]}>{x}</Text>
          </View>
        ))}
      </View>
      <View>
        {EVE.map(([time, title, sub, icon], i) => {
          const off = skip.includes(title);
          return (
            <View key={title} style={{flexDirection: 'row', gap: 14}}>
              <View style={{alignItems: 'center', width: 40}}>
                <View style={{width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: off ? ah.line : ah.line2, backgroundColor: off ? 'transparent' : ah.ink3, alignItems: 'center', justifyContent: 'center'}}><Icon name={icon} size={16} color={off ? ah.faint : ah.rose} /></View>
                {i < EVE.length - 1 ? <View style={{flex: 1, width: 1, backgroundColor: ah.line2}} /> : null}
              </View>
              <View style={{flex: 1, paddingBottom: 18, opacity: off ? 0.4 : 1}}>
                <Text style={t.eyebrow}>{time}</Text>
                <Text style={[t.title, {fontSize: 22, lineHeight: 25, textDecorationLine: off ? 'line-through' : 'none'}]}>{title}</Text>
                <Text style={t.small}>{sub}</Text>
              </View>
              {stage === 0 ? <View style={{paddingTop: 2}}><TextBtn label={off ? 'Add' : 'Skip'} tone={off ? ah.rose : ah.mute} a11y={`${off ? 'Add' : 'Skip'} ${title}`} onPress={() => setSkip((l) => (l.includes(title) ? l.filter((x) => x !== title) : [...l, title]))} /></View> : null}
            </View>
          );
        })}
      </View>
      <ActionBar color={stage === 2 ? ah.white : acc} label={stage === 0 ? 'Request the holds' : stage === 1 ? 'Confirm the evening' : 'Preview · not booked or saved'} onPress={() => setStage((x) => (x + 1) % 3)} />
      <SampleNote>{`Preview · Current stage: ${st.toLowerCase()} · Holds are requests to venues · Nothing is paid until you confirm with each partner`}</SampleNote>
    </View>
  );
}
