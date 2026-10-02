import {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import {useAvailableWidth} from '@/lib/layout';
import {Link} from 'expo-router';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {api} from '@/lib/api';
import {BEZEL_STOPS, conicRing, deco, polar} from '@/lib/deco';
import {Panel, plateText} from '@/components/plate/RoomPlate';
import {btn, btnText} from './Lounge';

type Tx = {id: string; merchant: string; amount_cents: number; cashback_cents: number; direction: string; created_at: string};
type Balance = {balance_cents: number; cashback_earned_cents: number; transactions: Tx[]};
const money = (c: number) => `$${(c / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
const RING = conicRing(150, 150, 70, 62, BEZEL_STOPS, 210, 90);

/** A brass safe behind smoked glass; the dial turns for presentation only. */
function SafeScene() {
  const W = Math.min(useAvailableWidth() - 20, 340);
  const k = W / 300;
  const spin = useSharedValue(0);
  useEffect(() => { spin.value = withRepeat(withTiming(360, {duration: 30000, easing: Easing.linear}), -1); }, [spin]);
  const dial = useAnimatedStyle(() => ({transform: [{rotate: `${spin.value}deg`}]}));
  return (
    <View style={{width: W, height: W, alignSelf: 'center'}}>
      <Svg width={W} height={W} viewBox="0 0 300 300" style={{position: 'absolute'}}>
        <Defs>
          <LinearGradient id="door" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#2A1A10" />
            <Stop offset="0.5" stopColor="#140A06" />
            <Stop offset="1" stopColor="#050203" />
          </LinearGradient>
          <LinearGradient id="frame" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={deco.brassWhite} />
            <Stop offset="0.5" stopColor={deco.brass} />
            <Stop offset="1" stopColor={deco.brassShadow} />
          </LinearGradient>
          <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.12} />
            <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={10} y={10} width={280} height={280} rx={6} fill="url(#door)" stroke="url(#frame)" strokeWidth={5} />
        <Rect x={26} y={26} width={248} height={248} fill="none" stroke={deco.brass} strokeOpacity={0.35} />
        {[[30, 30], [270, 30], [30, 270], [270, 270]].map(([x, y]) => <Circle key={`${x}${y}`} cx={x} cy={y} r={4} fill="url(#frame)" />)}
        {[60, 100, 200, 240].map((y) => <Rect key={y} x={262} y={y - 10} width={22} height={20} rx={2} fill="url(#frame)" />)}
        {RING.map((w, i) => <Path key={i} d={w.d} fill={w.fill} />)}
        <Circle cx={150} cy={150} r={62} fill="#0A0406" />
        <Path d="M150 70 L156 80 L144 80 Z" fill={deco.pink} />
        <Rect x={0} y={0} width={300} height={300} fill="url(#glass)" />
      </Svg>
      <Animated.View style={[{position: 'absolute', left: 88 * k, top: 88 * k, width: 124 * k, height: 124 * k}, dial]}>
        <Svg width={124 * k} height={124 * k} viewBox="0 0 124 124">
          <Defs>
            <RadialGradient id="knob" cx="62" cy="52" r="60" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={deco.brassWhite} />
              <Stop offset="0.6" stopColor={deco.brass} />
              <Stop offset="1" stopColor={deco.brassShadow} />
            </RadialGradient>
          </Defs>
          {Array.from({length: 40}, (_, i) => {
            const a = polar(62, 62, 58, i * 9), b = polar(62, 62, i % 5 === 0 ? 48 : 53, i * 9);
            return <Path key={i} d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={deco.brassHighlight} strokeWidth={i % 5 === 0 ? 1.6 : 0.8} />;
          })}
          <Circle cx={62} cy={62} r={30} fill="url(#knob)" />
          {[0, 120, 240].map((d) => { const p = polar(62, 62, 26, d); return <Path key={d} d={`M62 62 L${p.x} ${p.y}`} stroke={deco.brassShadow} strokeWidth={6} strokeLinecap="round" />; })}
          <Circle cx={62} cy={62} r={7} fill={deco.ink} stroke={deco.brassHighlight} />
        </Svg>
      </Animated.View>
    </View>
  );
}

export function Vault() {
  const [state, setState] = useState<{kind: 'loading'} | {kind: 'signed_out'} | {kind: 'offline'} | {kind: 'error'} | {kind: 'ok'; data: Balance}>({kind: 'loading'});
  useEffect(() => {
    api<Balance>('/api/vault/balance').then((r) => {
      if (r.ok) setState({kind: 'ok', data: r.body});
      else if (r.status === 401) setState({kind: 'signed_out'});
      else if (r.status === 0) setState({kind: 'offline'});
      else setState({kind: 'error'});
    });
  }, []);
  return (
    <>
      <SafeScene />
      <Text style={[plateText.small, {textAlign: 'center'}]}>The dial turns for presentation. Balances change only when the ledger records them.</Text>
      {state.kind === 'ok' ? (
        <>
          <Panel title="VERIFIED BALANCE">
            <Text style={plateText.figure} accessibilityLabel={`Balance ${money(state.data.balance_cents)}`}>{money(state.data.balance_cents)}</Text>
            <Text style={plateText.small}>Rebates earned · {money(state.data.cashback_earned_cents)}</Text>
          </Panel>
          <Panel title="THE LEDGER">
            {state.data.transactions.length === 0 ? <Text style={plateText.body}>No entries yet.</Text> : null}
            {state.data.transactions.map((t) => (
              <View key={t.id} style={{flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: 'rgba(201,169,97,0.2)', paddingTop: 8}}>
                <View style={{flex: 1}}>
                  <Text style={plateText.body}>{t.merchant}</Text>
                  <Text style={plateText.small}>{new Date(t.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={[plateText.body, {color: t.direction === 'credit' ? deco.brassLight : deco.cream}]}>{t.direction === 'credit' ? '+' : '−'}{money(Math.abs(t.amount_cents))}</Text>
              </View>
            ))}
          </Panel>
        </>
      ) : (
        <Panel title="THE LEDGER">
          <Text style={plateText.body}>
            {state.kind === 'loading' ? 'Opening the ledger drawers…'
              : state.kind === 'signed_out' ? 'The Vault opens for signed-in members.'
              : state.kind === 'offline' ? 'The house line is offline. No balance is shown rather than a guessed one.'
              : 'The ledger could not be read just now.'}
          </Text>
          {state.kind === 'signed_out' ? (
            <Link href="/sign-in" asChild><View style={btn}><Text style={btnText}>SIGN IN</Text></View></Link>
          ) : null}
        </Panel>
      )}
      <Panel title="FUNDING">
        <Text style={plateText.small}>Adding funds opens once our card partner signs off. Finesse never holds member money itself.</Text>
      </Panel>
    </>
  );
}
