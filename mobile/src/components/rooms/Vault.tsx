// The Vault — After Hours (mirrors web src/app/(hotel)/vault/vault-view.tsx): "Your card." The Finesse card in
// Nano Black, Platinum or Rose Gold (member's choice of finish, persisted), tap the card to reveal the balance,
// the 12% house rate and the activity list. Live figures come from /api/vault/balance; when the ledger can't be
// read, a clearly labelled sample is shown instead of a guessed balance. The full card number is never
// rendered — only the last four. Funding stays paused until the card partner signs off.
import {useEffect, useId, useState} from 'react';
import {Modal, Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, Line, LinearGradient, RadialGradient, Rect, Stop} from 'react-native-svg';
import {Link} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {api} from '@/lib/api';
import {secureStorage} from '@/lib/secure-storage';
import {type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {AHCard, AHChip, AHDisplay, AHEyebrow, AHMemberCard, AHPill, AHSkeleton, FINISHES, isFinish, type Finish} from '@/components/ah';
import {SampleNote, s} from './shared';

type Tx = {id: string; merchant: string; amount_cents: number; cashback_cents: number; direction: string; created_at: string};
type Balance = {balance_cents: number; cashback_earned_cents: number; transactions: Tx[]};
// Finishes, not tiers: the founder's three card colours (keep in sync with web src/lib/card-finishes.ts).
type Tier = Finish;
const TIER_ORDER: Tier[] = ['nano_black', 'platinum', 'rose_gold'];
const FINISH_KEY = 'finesse_card_finish';
const isTier = isFinish;
type State = 'SETTLED' | 'PENDING' | 'HELD';
const STATE: Record<State, string> = {SETTLED: ah.ok, PENDING: ah.warn, HELD: ah.rose};
type Drawer = [string, string, Array<[string, string, State | null]>];
const SAMPLE: Drawer[] = [
  ['Rebates earned', '$318.40', [['Maison Aurel · evening bag', '+$96.00', 'SETTLED'], ['Scale · cashmere wrap', '+$42.40', 'PENDING'], ['Atelier Nuit · gown', '+$180.00', 'SETTLED']]],
  ['Purchases', '$4,120.00', [['Satin slingbacks', '$890.00', 'SETTLED'], ['Pearl drop earrings', '$1,430.00', 'SETTLED'], ['Weekly grocery order', '$186.40', 'PENDING']]],
  ['Held for you', '$2,150.00', [['Exchange · tote offer in escrow', '$2,150.00', 'HELD']]],
];
const money = (c: number) => `$${(c / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
const svgId = (raw: string, p: string) => `${p}${raw.replace(/[^a-zA-Z0-9]/g, '')}`;

/* ───────────────────────── pieces ───────────────────────── */
/** Swatch colours for the finish pills (diagonal of each finish's face). */
function FinishDot({tier, on, size = 22}: {tier: Tier; on: boolean; size?: number}) {
  const id = svgId(useId(), 'fd');
  const st = FINISHES[tier].stops;
  return (
    <View style={{width: size + 6, height: size + 6, borderRadius: size, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 1.5 : 0, borderColor: 'rgba(255,255,255,0.85)'}}>
      <Svg width={size} height={size}>
        <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">{st.map((c, i) => <Stop key={i} offset={[0, 0.38, 0.68, 1][i]} stopColor={c} />)}</LinearGradient></Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 0.5} fill={`url(#${id})`} stroke="rgba(255,255,255,0.2)" />
      </Svg>
    </View>
  );
}

function FinishPills({value, onChange}: {value: Tier; onChange: (t: Tier) => void}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Card finish" style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8}}>
      {TIER_ORDER.map((t) => {
        const on = t === value;
        return (
          <Pressable key={t} onPress={() => onChange(t)} accessibilityRole="radio" accessibilityState={{checked: on}} accessibilityLabel={`${FINISHES[t].label} finish`}
            style={({pressed}) => ({minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 6, paddingRight: 14, borderRadius: radius.pill, borderWidth: 1,
              borderColor: on ? 'rgba(255,255,255,0.35)' : ah.line2, backgroundColor: on ? 'rgba(255,255,255,0.1)' : 'transparent', opacity: pressed ? 0.8 : 1})}>
            <FinishDot tier={t} on={on} />
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 13, color: on ? ah.white : ah.mute}}>{FINISHES[t].label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The card: tap to reveal the balance. Tilts in on mount, settles flat when open. */
function TheCard({tier, open, holder, number, onPress}: {tier: Tier; open: boolean; holder: string; number: string; onPress: () => void}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const st = useAnimatedStyle(() => ({
    opacity: withTiming(mounted ? 1 : 0, {duration: reduce ? 0 : 700}),
    transform: [{perspective: 900}, {rotateX: withTiming(!mounted ? '25deg' : open ? '0deg' : '6deg', {duration: reduce ? 0 : 900})}, {translateY: withTiming(mounted ? 0 : 24, {duration: reduce ? 0 : 900})}],
  }));
  const glow = FINISHES[tier].glow;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{expanded: open}} accessibilityLabel="Tap the card to reveal your balance" style={{width: '100%', maxWidth: 380, alignSelf: 'center'}}>
      <Animated.View style={[{shadowColor: glow, shadowOpacity: 1, shadowRadius: 40, shadowOffset: {width: 0, height: 0}, borderRadius: 20}, st]}>
        <AHMemberCard finish={tier} holder={holder} right="12%"
          big={<Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, letterSpacing: 3.5, color: FINISHES[tier].inkSoft, marginTop: 'auto', marginBottom: 6}}>{number}</Text>} />
      </Animated.View>
    </Pressable>
  );
}

/** Chrome dial for the closed Vault. */
function ClosedDial() {
  const id = svgId(useId(), 'cd');
  const q = (n: number) => Number(n.toFixed(2));
  return (
    <Svg width={180} height={180} viewBox="0 0 200 200" style={{alignSelf: 'center'}}>
      <Defs>
        <LinearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.9} /><Stop offset="0.55" stopColor="#b9bcc2" stopOpacity={0.55} /><Stop offset="1" stopColor="#6d7076" stopOpacity={0.3} />
        </LinearGradient>
        <RadialGradient id={`${id}g`} cx="0.5" cy="0.5" r="0.5"><Stop offset="0" stopColor="#b76e79" stopOpacity={0.45} /><Stop offset="1" stopColor="#b76e79" stopOpacity={0} /></RadialGradient>
      </Defs>
      <Circle cx={100} cy={100} r={98} fill={`url(#${id}g)`} />
      {[88, 70, 52].map((r) => <Circle key={r} cx={100} cy={100} r={r} fill="none" stroke={`url(#${id}c)`} strokeWidth={1} />)}
      {Array.from({length: 60}, (_, i) => {
        const a = (i / 60) * Math.PI * 2;
        const r1 = i % 5 === 0 ? 76 : 80;
        return <Line key={i} x1={q(100 + Math.cos(a) * r1)} y1={q(100 + Math.sin(a) * r1)} x2={q(100 + Math.cos(a) * 86)} y2={q(100 + Math.sin(a) * 86)} stroke="#b9bcc2" strokeOpacity={0.45} strokeWidth={1} />;
      })}
      <Rect x={96} y={54} width={8} height={26} rx={4} fill={ah.rose} />
      <Circle cx={100} cy={100} r={6} fill={ah.rose} />
    </Svg>
  );
}

/** Closed state (signed out / not a key holder). The sample room still follows below, labelled. */
export function VaultLocked({reason}: {reason: 'signed_out' | 'not_vip'}) {
  return (
    <View style={{alignItems: 'center', paddingTop: 8, paddingBottom: 10}}>
      <View style={{alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end'}}><AHChip label={reason === 'not_vip' ? 'Key holders' : 'Closed'} /></View>
      <ClosedDial />
      <AHEyebrow style={{marginTop: 18}}>The Vault</AHEyebrow>
      <View style={{alignSelf: 'stretch', alignItems: 'center'}}>
        <AHDisplay size={50} style={{marginTop: 6, width: reason === 'not_vip' ? 290 : 160}}>{reason === 'not_vip' ? 'By key only.' : 'Closed.'}</AHDisplay>
      </View>
      <Text style={{marginTop: 12, maxWidth: 340, textAlign: 'center', fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: ah.mute}}>
        {reason === 'signed_out' ? 'Sign in to open your Vault.' : 'The Vault is for key holders: your prepaid Finesse card in Nano Black, Platinum or Rose Gold, with 12% back on every purchase.'}
      </Text>
      {reason === 'signed_out' ? (
        <Link href="/sign-in" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="Sign in for your real ledger" style={{marginTop: 20, minHeight: 48, paddingHorizontal: 26, borderRadius: radius.pill, backgroundColor: ah.white, alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 15, color: '#000'}}>Sign in</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

/** Fund sheet. Funding is paused until the card partner signs off — the sheet says so; nothing is charged. */
function FundSheet({open, onClose}: {open: boolean; onClose: () => void}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} accessibilityLabel="Close" style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end'}}>
        <Pressable onPress={() => {}} accessible={false} style={{width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 12, paddingBottom: insets.bottom + 12}}>
          <View accessibilityViewIsModal style={{borderRadius: 28, padding: 22, backgroundColor: '#161618', borderWidth: 1, borderColor: ah.line2}}>
            <View style={{width: 40, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: -6, marginBottom: 16}} />
            <Text accessibilityRole="header" style={{fontFamily: ahFonts.serifItalic, fontSize: 32, lineHeight: 34, color: ah.text}}>Fund your Vault</Text>
            <AHCard pad={18} style={{marginTop: 18, gap: 6}}>
              <AHEyebrow>Instant top-up</AHEyebrow>
              <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 30, letterSpacing: -0.6, color: ah.faint}}>Paused</Text>
              <Text style={{fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 19, color: ah.mute, marginBottom: 8}}>Adding funds opens once our card partner signs off. Finesse never holds member money itself.</Text>
              <AHPill block disabled label="Opens with the card partner" />
            </AHCard>
            <View style={{paddingHorizontal: 4, paddingTop: 16, paddingBottom: 14}}>
              <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: ah.text}}>Wire transfer</Text>
              <Text style={{marginTop: 4, fontFamily: ahFonts.sans, fontSize: 13, color: ah.mute}}>For larger top-ups, once funding opens. Ask the Concierge.</Text>
            </View>
            <AHPill variant="ghost" block label="Close" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** One group of activity (was a safe-deposit box): header row + rows when expanded. */
function ActivityGroup({label, total, open, expanded, rows, onPress}: {label: string; total: string; open: boolean; expanded: boolean; rows: Array<[string, string, State | null]>; onPress: () => void}) {
  return (
    <View style={{borderBottomWidth: 1, borderColor: ah.line}}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={`${label}${open ? `, ${total}` : ''}`}
        style={({pressed}) => ({minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, opacity: pressed ? 0.75 : 1})}>
        <View style={{width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: ah.ink3, borderWidth: 1, borderColor: expanded ? 'rgba(232,180,160,0.5)' : ah.line}}>
          <Text style={{fontFamily: ahFonts.sansBold, fontSize: 15, color: ah.text}}>{label[0]}</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 15, color: ah.text}}>{label}</Text>
          <Text style={{marginTop: 3, fontFamily: ahFonts.sans, fontSize: 12, color: ah.mute}}>{rows.length} {rows.length === 1 ? 'entry' : 'entries'}</Text>
        </View>
        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 15, color: open ? ah.text : ah.faint}}>{open ? total : '$•••.••'}</Text>
        <Text style={{fontFamily: ahFonts.sans, fontSize: 18, color: ah.mute, width: 14, textAlign: 'center'}}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? (
        <Animated.View entering={FadeInDown.duration(350)} style={{paddingLeft: 56, paddingBottom: 8}}>
          {rows.length === 0 ? <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 18, color: ah.mute, paddingVertical: 8}}>No entries yet.</Text> : null}
          {rows.map(([t, amt, st], k) => (
            <View key={`${t}${k}`} style={{flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderColor: ah.line}}>
              <View style={{flex: 1, gap: 4}}>
                <Text style={{fontFamily: ahFonts.sans, fontSize: 14, color: ah.text}}>{t}</Text>
                {st ? (
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: STATE[st]}} />
                    <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 11, color: ah.mute}}>{st.charAt(0) + st.slice(1).toLowerCase()}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: amt.startsWith('+') ? ah.ok : ah.text}}>{amt}</Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

/* ───────────────────────── the room ───────────────────────── */
export function Vault({side}: {side: Side}) {
  const [tier, setTierState] = useState<Tier>('nano_black');
  useEffect(() => {
    secureStorage.getItem(FINISH_KEY).then((v) => { if (isTier(v)) setTierState(v); }).catch(() => {});
  }, []);
  const setTier = (t: Tier) => {
    setTierState(t);
    secureStorage.setItem(FINISH_KEY, t).catch(() => {});
  };
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState<number | null>(null);
  const [fund, setFund] = useState(false);
  const [live, setLive] = useState<{kind: 'loading' | 'signed_out' | 'not_vip' | 'offline' | 'error'} | {kind: 'ok'; data: Balance}>({kind: 'loading'});
  useEffect(() => {
    api<Balance>('/api/vault/balance').then((r) => {
      if (r.ok) setLive({kind: 'ok', data: r.body});
      else setLive({kind: r.status === 401 ? 'signed_out' : r.status === 403 ? 'not_vip' : r.status === 0 ? 'offline' : 'error'});
    });
  }, []);
  const isLive = live.kind === 'ok';
  const drawers: Drawer[] = isLive ? [
    ['Rebates earned', money(live.data.cashback_earned_cents), live.data.transactions.filter((t) => t.cashback_cents > 0).map((t) => [t.merchant, `+${money(t.cashback_cents)}`, null])],
    ['Ledger', money(live.data.balance_cents), live.data.transactions.map((t) => [t.merchant, `${t.direction === 'credit' ? '+' : '−'}${money(Math.abs(t.amount_cents))}`, null])],
  ] : SAMPLE;
  const balance = isLive ? money(live.data.balance_cents) : '$318.40';
  const earned = isLive ? money(live.data.cashback_earned_cents) : '$318.40';
  const locked = live.kind === 'signed_out' || live.kind === 'not_vip';
  const rateId = svgId(useId(), 'vr');

  return (
    <View style={{gap: 14}}>
      {locked ? (
        <>
          <VaultLocked reason={live.kind === 'not_vip' ? 'not_vip' : 'signed_out'} />
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10}}>
            <View style={{flex: 1, height: 1, backgroundColor: ah.line}} />
            <AHEyebrow>A look inside · sample</AHEyebrow>
            <View style={{flex: 1, height: 1, backgroundColor: ah.line}} />
          </View>
        </>
      ) : (
        <View>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <AHEyebrow>The Vault · Private floor</AHEyebrow>
            <AHChip label={isLive ? 'Key holder' : 'Sample'} live={isLive} />
          </View>
          <AHDisplay size={52} style={{marginTop: 8}}>Your card.</AHDisplay>
        </View>
      )}

      {/* the card */}
      <View style={{marginTop: 8}}>
        {/* Sample names/number only in the sample; a live card never shows invented details. */}
        <TheCard tier={tier} open={open} onPress={() => setOpen((o) => !o)}
          holder={isLive ? 'MEMBER' : side === 'her' ? 'AMARA · SAMPLE' : 'JULIAN · SAMPLE'}
          number={isLive ? '•••• •••• •••• ••••' : '•••• •••• •••• 0000'} />
      </View>
      <Text style={{marginTop: 6, textAlign: 'center', fontFamily: ahFonts.sans, fontSize: 12, color: open ? ah.ok : ah.faint}}>
        {open ? 'Unlocked' : 'Tap the card to reveal'} · Preview. Your card is issued once the card partner is live.
      </Text>
      <FinishPills value={tier} onChange={setTier} />

      {/* balance */}
      <View style={{marginTop: 22}}>
        <AHEyebrow>{isLive ? 'Available' : 'Rebate balance · sample'}</AHEyebrow>
        {live.kind === 'loading' ? (
          <AHSkeleton h={52} w={220} style={{marginTop: 8}} />
        ) : (
          <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={open ? `Balance ${balance}` : 'Balance hidden. Double tap to reveal.'}>
            <Animated.Text key={String(open)} entering={FadeIn.duration(350)} style={{marginTop: 6, fontFamily: ahFonts.sansSemi, fontSize: 52, lineHeight: 58, letterSpacing: -1.6, color: open ? ah.text : ah.faint}}>
              {open ? balance : '$•••.••'}
            </Animated.Text>
          </Pressable>
        )}
        <Text style={[s.small, {marginTop: 4}]}>{open ? (isLive ? 'Read from the ledger just now.' : '$42.40 pending · settles when Scale closes Sunday') : 'Tap the card to see your balance'}</Text>
      </View>

      {/* the house rate */}
      <Animated.View entering={FadeIn.duration(600)}>
        <AHCard style={{flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6}}>
          <Svg pointerEvents="none" style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0}} width="100%" height="100%">
            <Defs><RadialGradient id={rateId} cx="0" cy="0.5" r="0.7"><Stop offset="0" stopColor={ah.rose2} stopOpacity={0.32} /><Stop offset="1" stopColor={ah.rose2} stopOpacity={0} /></RadialGradient></Defs>
            <Rect width="100%" height="100%" fill={`url(#${rateId})`} />
          </Svg>
          <View style={{width: 116}} accessible accessibilityLabel="Twelve percent cashback">
            <AHDisplay size={64} rose accessibilityRole="text">12%</AHDisplay>
          </View>
          <View style={{flex: 1, gap: 4}}>
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 15, color: ah.text}}>Back on every purchase</Text>
            <Text style={{fontFamily: ahFonts.sans, fontSize: 13, lineHeight: 18, color: ah.mute}}>{open ? `${earned} earned so far${isLive ? '' : ' · sample'}. ` : ''}On Finesse purchases, credited as rebates once our card partner is live.</Text>
          </View>
        </AHCard>
      </Animated.View>

      <AHPill block label="Fund your Vault" onPress={() => setFund(true)} style={{marginTop: 8}} />
      <Text style={[s.small, {textAlign: 'center'}]}>Adding funds opens once our card partner signs off. Finesse never holds member money itself.</Text>

      {/* activity */}
      <View style={{marginTop: 18}}>
        <AHEyebrow style={{marginBottom: 4}}>Activity</AHEyebrow>
        {live.kind === 'loading' ? (
          <View style={{gap: 10, marginTop: 10}}>{[0, 1, 2].map((i) => <AHSkeleton key={i} h={56} r={14} />)}</View>
        ) : (
          drawers.map(([label, total, rows], i) => (
            <ActivityGroup key={label} label={label} total={total} rows={rows} open={open} expanded={open && drawer === i}
              onPress={() => { setOpen(true); setDrawer(drawer === i ? null : i); }} />
          ))
        )}
      </View>

      {live.kind === 'signed_out' ? (
        <Link href="/sign-in" style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: ah.rose, textAlign: 'center', paddingVertical: 12}}>Sign in for your real ledger</Link>
      ) : null}
      {!isLive ? <SampleNote>{live.kind === 'loading' ? 'OPENING THE LEDGER…' : 'SAMPLE LEDGER · YOUR REAL BALANCE SHOWS WHEN THE LEDGER CAN BE READ · CHOOSE YOUR FINISH · CARD ISSUED ONCE THE PARTNER IS LIVE'}</SampleNote> : null}
      <FundSheet open={fund} onClose={() => setFund(false)} />
    </View>
  );
}
