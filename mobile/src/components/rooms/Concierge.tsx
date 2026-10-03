import {useState} from 'react';
import {ActivityIndicator, Pressable, Text, TextInput, View} from 'react-native';
import {useAvailableWidth} from '@/lib/layout';
import Animated, {FadeInDown} from 'react-native-reanimated';
import Svg, {Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {api} from '@/lib/api';
import {deco, fonts} from '@/lib/deco';
import {Panel, plateText} from '@/components/plate/RoomPlate';
import {btn, btnText} from './Lounge';

type Docket = {id: number; ask: string; reply: string; at: string};

/** Walnut reception desk beneath a single pool of light, with the service bell. */
function DeskScene() {
  const W = Math.min(useAvailableWidth(), 480);
  return (
    <Svg width={W} height={W * 0.42} viewBox="0 0 400 168" style={{alignSelf: 'center'}}>
      <Defs>
        <RadialGradient id="pool" cx="200" cy="96" r="150" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={deco.cream} stopOpacity={0.35} />
          <Stop offset="1" stopColor={deco.ink} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="walnut" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5A3418" />
          <Stop offset="1" stopColor="#1E0E06" />
        </LinearGradient>
        <LinearGradient id="bell" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={deco.brassWhite} />
          <Stop offset="1" stopColor={deco.brassShadow} />
        </LinearGradient>
      </Defs>
      <Path d="M170 0 L230 0 L330 120 L70 120 Z" fill="url(#pool)" />
      <Rect x={30} y={112} width={340} height={44} fill="url(#walnut)" />
      <Rect x={26} y={106} width={348} height={7} fill="url(#bell)" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <Rect key={i} x={46 + i * 48} y={122} width={30} height={26} fill="none" stroke={deco.brass} strokeOpacity={0.35} />)}
      <Path d="M182 104 A18 18 0 0 1 218 104 Z" fill="url(#bell)" />
      <Circle cx={200} cy={84} r={3} fill={deco.brassWhite} />
      <Rect x={174} y={103} width={52} height={3} fill={deco.brassShadow} />
    </Svg>
  );
}

const SYSTEM = 'You are Nova, the concierge of Finesse, a members-only 1920s grand hotel. Be warm, brief and precise. You may draft plans and options; you never claim to have booked, bought or sent anything. End with what you need the member to confirm.';

export function Concierge() {
  const [ask, setAsk] = useState('');
  const [busy, setBusy] = useState(false);
  const [dockets, setDockets] = useState<Docket[]>([]);
  const send = async () => {
    const prompt = ask.trim();
    if (!prompt || busy) return;
    setBusy(true);
    const r = await api<{text?: string}>('/api/nova', {method: 'POST', json: {prompt, system: SYSTEM}});
    const reply = r.ok && r.body.text ? r.body.text : r.status === 0 ? 'The house line is offline. Your request is kept here; ask again when we are connected.' : 'Nova is with another member. Please try again in a moment.';
    setDockets((d) => [{id: Date.now(), ask: prompt, reply, at: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}, ...d]);
    setAsk(''); setBusy(false);
  };
  return (
    <>
      <DeskScene />
      <Panel title="THE REQUEST LINE">
        <TextInput value={ask} onChangeText={setAsk} placeholder="A table for two at nine, somewhere quiet…" placeholderTextColor="rgba(232,200,122,0.4)"
          multiline style={{minHeight: 64, color: deco.cream, fontFamily: fonts.display, fontSize: 18, lineHeight: 26}} accessibilityLabel="Your request for Nova" />
        <Pressable onPress={send} disabled={busy || !ask.trim()} accessibilityRole="button" style={[btn, {opacity: busy || !ask.trim() ? 0.5 : 1}]}>
          {busy ? <ActivityIndicator color={deco.brassHighlight} /> : <Text style={btnText}>RING FOR NOVA</Text>}
        </Pressable>
        <Text style={plateText.small}>Nova drafts and proposes. Nothing is booked, bought or sent until you confirm it.</Text>
      </Panel>
      {dockets.map((d) => (
        <Animated.View key={d.id} entering={FadeInDown.duration(500)}>
          <Panel title={`DOCKET · ${d.at}`}>
            <Text style={[plateText.small, {fontStyle: 'italic'}]}>“{d.ask}”</Text>
            <View style={{height: 1, backgroundColor: 'rgba(201,169,97,0.3)'}} />
            <Text style={plateText.body}>{d.reply}</Text>
          </Panel>
        </Animated.View>
      ))}
    </>
  );
}
