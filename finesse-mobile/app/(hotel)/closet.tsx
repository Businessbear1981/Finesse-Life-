import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { TierRail } from '../../src/components/TierRail';
import { CTA, Seg } from '../../src/components/ui';
import { useSession } from '../../src/lib/session';
import { C, F, accent } from '../../src/theme';

const TOPS = ['Ivory silk blouse', 'Black corset top', 'Camel knit', 'Oxblood satin cami', 'Cream tailored vest', 'Gold-button cardigan', 'White poplin shirt'];
const BOTTOMS = ['Wide black trousers', 'Pleated midi skirt', 'Camel cigarette pant', 'Leather pencil skirt', 'Ivory palazzo', 'Dark denim, straight', 'Satin bias skirt'];
const DRESSES = ['Champagne bias gown', 'Oxblood velvet midi', 'Black column', 'Ivory slip dress', 'Gold sequin sheath', 'Emerald wrap', 'Little black dress'];
const HIM_TOPS = ['Navy blazer', 'White oxford', 'Black rollneck', 'Camel overcoat', 'Linen shirt', 'Grey knit polo', 'Dinner jacket'];
const HIM_BOTTOMS = ['Charcoal flannel', 'Navy chino', 'Black tux trouser', 'Stone linen pant', 'Dark selvedge', 'Grey pleated', 'Olive cord'];

type Src = 'ALL' | 'SHOPPER' | 'CAMERA' | 'PURCHASE' | 'UPLOAD';
type Item = { name: string; src: Exclude<Src, 'ALL'>; uri?: string };
const SEED: Item[] = [
  { name: 'Gold-chain clutch', src: 'SHOPPER' }, { name: 'Satin slingbacks', src: 'SHOPPER' }, { name: 'Velvet blazer', src: 'CAMERA' },
  { name: 'Pearl drop earrings', src: 'PURCHASE' }, { name: 'Vintage silk scarf', src: 'UPLOAD' }, { name: 'Cashmere wrap', src: 'CAMERA' },
];
const BADGE: Record<Item['src'], [string, string]> = { SHOPPER: [C.her, '#140508'], CAMERA: [C.gold, '#140E08'], PURCHASE: [C.cream, '#140E08'], UPLOAD: ['#3A2A1A', C.cream] };

/** 09 The Closet — turning rack (Top + Bottom, or Dress for Her) and pieces from the shopper, camera, purchases, uploads. */
export default function Closet() {
  const { side } = useSession();
  const her = side !== 'him';
  const [mode, setMode] = useState<'TOP + BOTTOM' | 'DRESS'>('TOP + BOTTOM');
  const [top, setTop] = useState(0);
  const [bot, setBot] = useState(0);
  const [dress, setDress] = useState(0);
  const [auto, setAuto] = useState(true);
  const [src, setSrc] = useState<Src>('ALL');
  const [items, setItems] = useState<Item[]>(SEED);
  const tops = her ? TOPS : HIM_TOPS, bottoms = her ? BOTTOMS : HIM_BOTTOMS;
  const isDress = her && mode === 'DRESS';

  useEffect(() => {
    if (!auto) return;
    let n = 0;
    const t = setInterval(() => {
      if (isDress) setDress((v) => (v + 1) % DRESSES.length);
      else (n++ % 2 ? setBot : setTop)((v: number) => (v + 1) % 7);
    }, 2600);
    return () => clearInterval(t);
  }, [auto, isDress]);

  const add = async (from: 'CAMERA' | 'UPLOAD') => {
    const perm = from === 'CAMERA' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = from === 'CAMERA' ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled) setItems((x) => [{ name: from === 'CAMERA' ? 'New scan' : 'New upload', src: from, uri: r.assets[0].uri }, ...x]); // TODO: upload to R2 + catalogue
  };
  const stop = <T,>(f: (v: T) => void) => (v: T) => { setAuto(false); f(v); };
  const shown = items.filter((i) => src === 'ALL' || i.src === src);
  const outfit = isDress ? DRESSES[dress] : `${tops[top]} with ${bottoms[bot].toLowerCase()}`;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={s.head}>
        <Text style={s.num}>29</Text>
        <Text style={s.title}>The Closet</Text>
      </View>
      {her && <View style={{ marginHorizontal: 12, marginTop: 10 }}><Seg options={['TOP + BOTTOM', 'DRESS']} value={mode} onChange={setMode} /></View>}
      <LinearGradient colors={['transparent', C.brassDeep, C.goldHot, C.brassDeep, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bar} />
      {isDress
        ? <TierRail label="DRESS" items={DRESSES} index={dress} onIndex={stop(setDress)} cardW={120} cardH={230} />
        : <>
            <TierRail label="TOP" items={tops} index={top} onIndex={stop(setTop)} cardW={104} cardH={118} />
            <TierRail label="BOTTOM" items={bottoms} index={bot} onIndex={stop(setBot)} cardW={104} cardH={118} />
          </>}
      <View style={s.caption}>
        <Text style={s.kicker}>{isDress ? 'TONIGHT · ONE PIECE' : 'TONIGHT · SEPARATES'}</Text>
        <Text style={s.outfit}>{outfit}</Text>
        <Pressable onPress={() => setAuto((a) => !a)} style={s.auto}><Text style={s.autoText}>{auto ? '❚❚ TURNING' : '▶ TURN'}</Text></Pressable>
      </View>
      <CTA label="APPROVE WEEK" color={accent(side)} style={{ marginHorizontal: 12, marginTop: 12 }} />

      <Text style={s.section}>NEW IN THE CLOSET</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, marginTop: 10 }}>
        {(['ALL', 'SHOPPER', 'CAMERA', 'PURCHASE', 'UPLOAD'] as Src[]).map((k) => (
          <Pressable key={k} onPress={() => setSrc(k)} style={[s.chip, src === k && { backgroundColor: C.gold }]}>
            <Text style={[s.chipText, src === k && { color: '#140E08' }]}>{{ ALL: 'All', SHOPPER: 'From shopper', CAMERA: 'Camera', PURCHASE: 'Purchases', UPLOAD: 'Uploads' }[k]}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.grid}>
        {shown.map((it, i) => (
          <View key={it.name + i} style={s.cell}>
            <View style={s.thumb}>
              {it.uri ? <Image source={{ uri: it.uri }} style={StyleSheet.absoluteFill} /> : null}
              <Text style={[s.badge, { backgroundColor: BADGE[it.src][0], color: BADGE[it.src][1] }]}>{it.src}</Text>
            </View>
            <Text style={s.cellName}>{it.name}</Text>
          </View>
        ))}
      </View>
      <View style={s.adds}>
        <Pressable onPress={() => add('CAMERA')} style={s.add}><Text style={s.addTitle}>◉ CAMERA</Text><Text style={s.addSub}>Scan a piece or the rack</Text></Pressable>
        <Pressable onPress={() => add('UPLOAD')} style={s.add}><Text style={s.addTitle}>＋ UPLOAD</Text><Text style={s.addSub}>From photos or a receipt</Text></Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  num: { fontFamily: F.caps, fontSize: 28, color: C.gold },
  title: { fontFamily: F.display, fontSize: 32, color: C.cream },
  bar: { height: 4, marginTop: 10, marginHorizontal: 12 },
  caption: { alignItems: 'center', gap: 2, paddingHorizontal: 12, marginTop: 6 },
  kicker: { fontFamily: F.caps, fontSize: 10, letterSpacing: 2.6, color: C.gold },
  outfit: { fontFamily: F.displaySemi, fontSize: 18, color: C.cream, textAlign: 'center' },
  auto: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(201,169,97,0.6)' },
  autoText: { fontFamily: F.mono, fontSize: 10, color: C.gold },
  section: { marginTop: 24, marginHorizontal: 12, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: C.brass, fontFamily: F.caps, fontSize: 11, letterSpacing: 2.4, color: C.gold },
  chip: { minHeight: 34, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: C.brass },
  chipText: { fontFamily: F.sansBold, fontSize: 12, color: C.cream },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, marginTop: 10 },
  cell: { width: '31.5%', gap: 4 },
  thumb: { aspectRatio: 3 / 4, backgroundColor: '#17110E', borderWidth: 1, borderColor: 'rgba(201,169,97,0.35)', overflow: 'hidden' },
  badge: { position: 'absolute', left: 4, top: 4, paddingHorizontal: 4, paddingVertical: 1, fontFamily: F.mono, fontSize: 8 },
  cellName: { fontFamily: F.sans, fontSize: 11, color: 'rgba(244,232,208,0.85)' },
  adds: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginTop: 14 },
  add: { flex: 1, minHeight: 60, padding: 10, gap: 2, borderWidth: 1, borderStyle: 'dashed', borderColor: C.brass, backgroundColor: 'rgba(201,169,97,0.06)' },
  addTitle: { fontFamily: F.caps, fontSize: 11, letterSpacing: 2, color: C.gold },
  addSub: { fontFamily: F.sans, fontSize: 11, color: C.creamMuted },
});
