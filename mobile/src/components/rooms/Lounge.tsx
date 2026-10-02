import {useEffect, useState} from 'react';
import {Pressable, Share, Text, View} from 'react-native';
import {useAvailableWidth} from '@/lib/layout';
import Animated, {useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming} from 'react-native-reanimated';
import Svg, {Defs, Ellipse, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {api} from '@/lib/api';
import {deco, easeCine, fonts} from '@/lib/deco';
import {Panel, plateText} from '@/components/plate/RoomPlate';

type Post = {id: string; content: string; created_at: string; profiles?: {display_name?: string; username?: string} | null};

/** Velvet seating islands; presence lamps light one table at a time, never a feed cascade. */
function LoungeScene() {
  const W = Math.min(useAvailableWidth(), 480), H = W * 0.46;
  const tables = [0.12, 0.31, 0.5, 0.69, 0.88];
  return (
    <View style={{width: W, height: H, alignSelf: 'center'}}>
      <Svg width={W} height={H} viewBox="0 0 400 184" style={{position: 'absolute'}}>
        <Defs>
          <RadialGradient id="velvet" cx="200" cy="150" r="220" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#5A1A26" />
            <Stop offset="1" stopColor={deco.ink} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={400} height={184} fill="url(#velvet)" />
        {/* brass privacy screens */}
        {[0.215, 0.405, 0.595, 0.785].map((x) => (
          <Path key={x} d={`M${x * 400} 40 L${x * 400} 150 M${x * 400 - 6} 52 L${x * 400 + 6} 52 M${x * 400 - 6} 70 L${x * 400 + 6} 70`} stroke={deco.brass} strokeOpacity={0.55} />
        ))}
        {tables.map((x) => (
          <Ellipse key={x} cx={x * 400} cy={148} rx={30} ry={9} fill="#1A0A0E" stroke={deco.brassShadow} />
        ))}
        <Path d="M0 166 L400 166" stroke={deco.brass} strokeOpacity={0.35} />
      </Svg>
      {tables.map((x, i) => <Lamp key={x} x={x} i={i} W={W} H={H} />)}
    </View>
  );
}

function Lamp({x, i, W, H}: {x: number; i: number; W: number; H: number}) {
  const o = useSharedValue(0.15);
  useEffect(() => {
    o.value = withDelay(400 + i * 650, withRepeat(withSequence(withTiming(1, {duration: 900, easing: easeCine}), withTiming(0.55, {duration: 2600})), -1, true));
  }, [i, o]);
  const s = useAnimatedStyle(() => ({opacity: o.value}));
  const k = W / 400;
  return (
    <Animated.View pointerEvents="none" style={[{position: 'absolute', left: x * W - 26 * k, top: 96 * k, width: 52 * k, height: 52 * k}, s]}>
      <Svg width={52 * k} height={52 * k} viewBox="0 0 52 52">
        <Defs>
          <RadialGradient id={`lamp${i}`} cx="26" cy="26" r="26" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={deco.cream} stopOpacity={0.95} />
            <Stop offset="0.3" stopColor={deco.pink} stopOpacity={0.5} />
            <Stop offset="1" stopColor={deco.pink} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={26} cy={26} rx={26} ry={26} fill={`url(#lamp${i})`} />
        <Path d="M22 34 L26 18 L30 34 Z" fill={deco.brassHighlight} />
      </Svg>
    </Animated.View>
  );
}

export function Lounge() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    api<{posts?: Post[]; data?: Post[]}>('/api/posts?page=1').then((r) => {
      if (!r.ok) { setPosts([]); setNote(r.status === 0 ? 'The house line is offline.' : 'The Lounge opens to members.'); return; }
      setPosts((r.body.posts ?? r.body.data ?? []).slice(0, 8));
    });
  }, []);
  const invite = () => Share.share({message: 'I keep a table for you at Finesse — finesselife.vip'}).catch(() => {});
  return (
    <>
      <LoungeScene />
      <Text style={[plateText.small, {textAlign: 'center'}]}>Lamps light only for people who have chosen to be seen tonight. There is no feed here.</Text>
      <Panel title="NOTES LEFT AT THE TABLES">
        {posts === null ? <Text style={plateText.small}>The host is checking the room…</Text> : null}
        {posts && posts.length === 0 ? <Text style={plateText.body}>{note ?? 'The Lounge is quiet tonight.'}</Text> : null}
        {posts?.map((p) => (
          <View key={p.id} style={{borderTopWidth: 1, borderColor: 'rgba(201,169,97,0.25)', paddingTop: 10}}>
            <Text style={[plateText.label, {letterSpacing: 2}]}>{(p.profiles?.display_name ?? p.profiles?.username ?? 'A member').toUpperCase()}</Text>
            <Text style={[plateText.body, {marginTop: 4}]}>{p.content}</Text>
          </View>
        ))}
      </Panel>
      <Pressable onPress={invite} accessibilityRole="button" style={btn}><Text style={btnText}>INVITE SOMEONE TO YOUR TABLE</Text></Pressable>
    </>
  );
}

export const btn = {minHeight: 52, borderWidth: 1, borderColor: deco.brass, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: 'rgba(58,18,27,0.6)'};
export const btnText = {fontFamily: fonts.label, fontSize: 11, letterSpacing: 4, color: deco.brassHighlight};
