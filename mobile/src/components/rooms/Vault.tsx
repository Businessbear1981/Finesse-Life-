// The Vault — the Finesse card in gun metal, rose gold or platinum, tap-to-reveal balance and the
// ledger drawers (from the design). Live figures come from /api/vault/balance; when the ledger can't be
// read, a clearly labelled sample is shown instead of a guessed balance. The full card number is never
// rendered — only the last four. Funding stays paused until the card partner signs off.
import {useEffect, useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, useAnimatedStyle, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {Link} from 'expo-router';
import {api} from '@/lib/api';
import {deco, easeCine, fonts, track, type Side} from '@/lib/deco';
import {useAvailableWidth} from '@/lib/layout';
import {ActionBar, SampleNote, Segmented, s} from './shared';

type Tx = {id: string; merchant: string; amount_cents: number; cashback_cents: number; direction: string; created_at: string};
type Balance = {balance_cents: number; cashback_earned_cents: number; transactions: Tx[]};
type Tier = 'gunmetal' | 'rosegold' | 'platinum';
const TIERS: Record<Tier, {label: string; stops: string[]; ink: string; name: string}> = {
  gunmetal: {label: 'GUN METAL', stops: ['#5A5E66', '#2A2D33', '#44484F', '#1A1C20'], ink: '#E8E6E0', name: 'MEMBER'},
  rosegold: {label: 'ROSE GOLD', stops: ['#F2C9B8', '#B76E79', '#E8B4A0', '#8E4B55'], ink: '#2A1014', name: 'VIP'},
  platinum: {label: 'PLATINUM', stops: ['#F4F4F2', '#B9BCC2', '#E6E7E9', '#8E9298'], ink: '#1A1C20', name: 'PENTHOUSE'},
};
type State = 'SETTLED' | 'PENDING' | 'HELD';
const STATE: Record<State, [string, string]> = {SETTLED: [deco.brassHighlight, '#140E08'], PENDING: ['#3A2A1A', deco.cream], HELD: ['#5A1A26', '#FFB8C8']};
type Drawer = [string, string, Array<[string, string, State]>];
const SAMPLE: Drawer[] = [
  ['Rebates earned', '$318.40', [['Maison Aurel · evening bag', '+$96.00', 'SETTLED'], ['Scale · cashmere wrap', '+$42.40', 'PENDING'], ['Atelier Nuit · gown', '+$180.00', 'SETTLED']]],
  ['Purchases', '$4,120.00', [['Satin slingbacks', '$890.00', 'SETTLED'], ['Pearl drop earrings', '$1,430.00', 'SETTLED'], ['Weekly grocery order', '$186.40', 'PENDING']]],
  ['Held for you', '$2,150.00', [['Exchange · tote offer in escrow', '$2,150.00', 'HELD']]],
];
const money = (c: number) => `$${(c / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

function Card({tier, open, name, onPress}: {tier: Tier; open: boolean; name: string; onPress: () => void}) {
  const T = TIERS[tier];
  const W = Math.min(useAvailableWidth(), 360), H = W * 0.63;
  const tilt = useAnimatedStyle(() => ({transform: [{perspective: 800}, {rotateX: withTiming(open ? '0deg' : '8deg', {duration: 700, easing: easeCine})}, {scale: withTiming(open ? 1 : 0.97, {duration: 700})}]}));
  const sheen = useAnimatedStyle(() => ({transform: [{translateX: withTiming(open ? W * 1.2 : -W * 0.4, {duration: 1100, easing: easeCine})}, {rotate: '20deg'}]}));
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{expanded: open}} accessibilityLabel="Tap the card to reveal your balance" style={{alignSelf: 'center'}}>
      <Animated.View style={[{width: W, height: H, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: {width: 0, height: 12}, elevation: 12}, tilt]}>
        <Svg width={W} height={H} style={{position: 'absolute'}}>
          <Defs>
            <LinearGradient id={`cd-${tier}`} x1="0" y1="0" x2="1" y2="1">
              {T.stops.map((c, i) => <Stop key={i} offset={[0, 0.4, 0.6, 1][i]} stopColor={c} />)}
            </LinearGradient>
            <LinearGradient id="chip" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={deco.brassWhite} /><Stop offset="0.5" stopColor={deco.brass} /><Stop offset="1" stopColor={deco.brassShadow} /></LinearGradient>
          </Defs>
          <Rect width={W} height={H} rx={16} fill={`url(#cd-${tier})`} />
          {/* deco sunburst engraving */}
          {Array.from({length: 13}, (_, i) => { const a = Math.PI + (i / 12) * Math.PI; return <Path key={i} d={`M${W * 0.82} ${H * 1.05} L${W * 0.82 + Math.cos(a) * W * 0.7} ${H * 1.05 + Math.sin(a) * W * 0.7}`} stroke={T.ink} strokeOpacity={0.07} strokeWidth={1} />; })}
          <Rect x={10} y={10} width={W - 20} height={H - 20} rx={10} fill="none" stroke={T.ink} strokeOpacity={0.18} />
          <Rect x={W * 0.08} y={H * 0.38} width={W * 0.13} height={H * 0.17} rx={4} fill="url(#chip)" />
          <Path d={`M${W * 0.08} ${H * 0.465} H${W * 0.21} M${W * 0.145} ${H * 0.38} V${H * 0.55}`} stroke={deco.brassShadow} strokeOpacity={0.6} />
          <Circle cx={W * 0.86} cy={H * 0.2} r={H * 0.07} fill="none" stroke={T.ink} strokeOpacity={0.35} />
        </Svg>
        <Animated.View pointerEvents="none" style={[{position: 'absolute', top: -H * 0.5, width: W * 0.18, height: H * 2, backgroundColor: 'rgba(255,255,255,0.18)'}, sheen]} />
        <View style={{flex: 1, padding: W * 0.07, justifyContent: 'space-between'}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <Text style={{fontFamily: fonts.displayHeavy, fontSize: W * 0.085, color: T.ink}}>Finesse</Text>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 2, color: T.ink, opacity: 0.8, marginTop: 6, marginRight: H * 0.12}}>{T.name}</Text>
          </View>
          <View style={{gap: 4}}>
            <Text style={{fontFamily: fonts.mono, fontSize: W * 0.048, letterSpacing: 2, color: T.ink}}>•••• •••• •••• 0412</Text>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: fonts.caps, fontSize: 11, letterSpacing: 1.6, color: T.ink}}>{name}</Text>
              <Text style={{fontFamily: fonts.label, fontSize: 8, letterSpacing: 2, color: T.ink, opacity: 0.7}}>EST. MMXXVI</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function Vault({side}: {side: Side}) {
  const acc = track[side].acc;
  const [tier, setTier] = useState<Tier>('gunmetal');
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState<number | null>(null);
  const [live, setLive] = useState<{kind: 'loading' | 'signed_out' | 'offline' | 'error'} | {kind: 'ok'; data: Balance}>({kind: 'loading'});
  useEffect(() => {
    api<Balance>('/api/vault/balance').then((r) => {
      if (r.ok) setLive({kind: 'ok', data: r.body});
      else setLive({kind: r.status === 401 ? 'signed_out' : r.status === 0 ? 'offline' : 'error'});
    });
  }, []);
  const isLive = live.kind === 'ok';
  const drawers: Drawer[] = isLive ? [
    ['Rebates earned', money(live.data.cashback_earned_cents), live.data.transactions.filter((t) => t.cashback_cents > 0).map((t) => [t.merchant, `+${money(t.cashback_cents)}`, 'SETTLED'])],
    ['Ledger', money(live.data.balance_cents), live.data.transactions.map((t) => [t.merchant, `${t.direction === 'credit' ? '+' : '−'}${money(Math.abs(t.amount_cents))}`, 'SETTLED'])],
  ] : SAMPLE;
  const balance = isLive ? money(live.data.balance_cents) : '$318.40';

  return (
    <View style={{gap: 12}}>
      <Segmented options={(Object.keys(TIERS) as Tier[]).map((k) => [k, TIERS[k].label] as [Tier, string])} value={tier} onChange={setTier} />
      <Card tier={tier} open={open} name={side === 'her' ? 'AMARA' : 'JULIAN'} onPress={() => setOpen((o) => !o)} />
      <Text style={{textAlign: 'center', fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1.2, color: open ? '#7AF5B8' : deco.brassHighlight}}>
        {open ? 'UNLOCKED' : 'TAP THE CARD TO REVEAL'}
      </Text>

      <View style={{alignItems: 'center', gap: 4, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.35)'}}>
        <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2.4, color: deco.brassHighlight}}>{isLive ? 'BALANCE' : 'REBATE BALANCE · SAMPLE'}</Text>
        <Text style={{fontFamily: fonts.displayHeavy, fontSize: 36, color: open ? deco.brassWhite : 'rgba(255,241,194,0.4)'}} accessibilityLabel={open ? `Balance ${balance}` : 'Balance hidden'}>{open ? balance : '$•••.••'}</Text>
        <Text style={s.small}>{open ? (isLive ? 'Read from the ledger just now.' : '$42.40 pending · settles when Scale closes Sunday') : 'Open the safe to see your balance'}</Text>
      </View>

      {drawers.map(([label, total, rows], i) => {
        const o = open && drawer === i;
        return (
          <View key={label} style={{borderWidth: 1, borderColor: o ? deco.brassHighlight : 'rgba(201,169,97,0.35)', backgroundColor: 'rgba(20,12,10,0.7)'}}>
            <Pressable onPress={() => { setOpen(true); setDrawer(drawer === i ? null : i); }} accessibilityRole="button" accessibilityState={{expanded: o}}
              style={{minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12}}>
              <View style={{width: 18, height: 4, borderRadius: 2, backgroundColor: deco.brass}} />
              <Text style={{flex: 1, fontFamily: fonts.label, fontSize: 13, color: deco.cream}}>{label}</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 11, color: deco.brassHighlight}}>{open ? total : '—'}</Text>
            </Pressable>
            {o ? (
              <Animated.View entering={FadeIn.duration(300)} style={{borderTopWidth: 1, borderColor: 'rgba(201,169,97,0.3)'}}>
                {rows.length === 0 ? <Text style={[s.small, {padding: 12}]}>No entries yet.</Text> : null}
                {rows.map(([t, amt, st], k) => (
                  <View key={`${t}${k}`} style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9}}>
                    <View style={{flex: 1, gap: 3}}>
                      <Text style={{fontFamily: fonts.body, fontSize: 12.5, color: deco.cream}}>{t}</Text>
                      <Text style={{alignSelf: 'flex-start', paddingHorizontal: 5, paddingVertical: 1, backgroundColor: STATE[st][0], fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1, color: STATE[st][1]}}>{st}</Text>
                    </View>
                    <Text style={{fontFamily: fonts.mono, fontSize: 11, color: deco.cream}}>{amt}</Text>
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </View>
        );
      })}

      <ActionBar label="FUND THE VAULT" color={acc} disabled />
      <Text style={s.small}>Adding funds opens once our card partner signs off. Finesse never holds member money itself.</Text>
      {live.kind === 'signed_out' ? <Link href="/sign-in" style={{fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2, color: deco.brassHighlight, textAlign: 'center', paddingVertical: 8}}>SIGN IN FOR YOUR REAL LEDGER</Link> : null}
      {!isLive ? <SampleNote>{live.kind === 'loading' ? 'OPENING THE LEDGER…' : 'SAMPLE LEDGER · YOUR REAL BALANCE SHOWS WHEN THE LEDGER CAN BE READ · CARD TIERS FOLLOW YOUR MEMBERSHIP'}</SampleNote> : null}
    </View>
  );
}
