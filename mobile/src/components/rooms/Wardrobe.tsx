// The Wardrobe — a turning rack, as in the design: two tiers (top + bottom) or one tier (dress)
// slide under a chrome rail; the centred look is "tonight". Sample pieces until the member's closet is in.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useReducedMotion, withTiming} from 'react-native-reanimated';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {useAvailableWidth} from '@/lib/layout';
import {Icon} from '@/lib/icons';
import {AHEyebrow, AHTitle} from '@/components/ah';
import {ActionBar, SampleNote, Segmented} from './shared';

const TOPS = {her: ['Ivory silk blouse', 'Black corset top', 'Camel knit', 'Oxblood satin cami', 'Cream vest', 'Gold-button cardigan', 'White poplin'],
  him: ['Navy blazer', 'White oxford', 'Black rollneck', 'Camel overcoat', 'Linen shirt', 'Grey polo', 'Dinner jacket']};
const BOTS = {her: ['Wide black trousers', 'Pleated midi', 'Camel cigarette pant', 'Leather pencil skirt', 'Ivory palazzo', 'Dark denim', 'Satin bias skirt'],
  him: ['Charcoal flannel', 'Navy chino', 'Tux trouser', 'Stone linen', 'Selvedge denim', 'Grey pleated', 'Olive cord']};
const DRESS = ['Champagne bias gown', 'Oxblood velvet slip', 'Black column dress', 'Gold lamé midi', 'Ivory satin wrap', 'Emerald silk shift', 'Blush tulle'];

export function Wardrobe({side}: {side: Side}) {
  const her = side === 'her';
  const [mode, setMode] = useState<'sep' | 'dress'>('sep');
  const [idx, setIdx] = useState<Record<string, number>>({top: 3, bottom: 3, dress: 3});
  const [saved, setSaved] = useState(false);
  const dress = her && mode === 'dress';
  const tiers = dress
    ? [{key: 'dress', label: 'DRESS', items: DRESS, w: 132, h: 230, row: 250}]
    : [{key: 'top', label: 'TOP', items: TOPS[side], w: 108, h: 128, row: 146}, {key: 'bottom', label: 'BOTTOM', items: BOTS[side], w: 108, h: 128, row: 146}];
  const cur = (t: (typeof tiers)[number]) => t.items[idx[t.key] % t.items.length];
  const outfit = dress ? cur(tiers[0]) : `${cur(tiers[0])} with ${cur(tiers[1]).toLowerCase()}`;
  return (
    <View style={{gap: 14}}>
      {her ? <Segmented options={[['sep', 'Top + bottom'], ['dress', 'Dress']]} value={mode} onChange={(m) => { setMode(m); setSaved(false); }} /> : null}
      <View style={{height: 2, borderRadius: 1, backgroundColor: ah.platinum, opacity: 0.55, marginTop: 4}} />
      {tiers.map((t) => (
        <Tier key={t.key} label={t.label} items={t.items} w={t.w} h={t.h} row={t.row} index={idx[t.key]}
          onMove={(d) => { setSaved(false); setIdx((x) => ({...x, [t.key]: (x[t.key] + d + t.items.length) % t.items.length})); }} />
      ))}
      <View style={{alignItems: 'center', gap: 6, paddingHorizontal: 12, marginTop: 4}}>
        <AHEyebrow color={ah.rose}>Tonight</AHEyebrow>
        <View accessibilityLiveRegion="polite"><AHTitle size={30} style={{textAlign: 'center'}}>{outfit}</AHTitle></View>
      </View>
      <ActionBar label={saved ? 'Saved to tonight' : 'Wear this tonight'} color={saved ? ah.platinum : track[side].acc} onPress={() => setSaved((v) => !v)} />
      <SampleNote>Sample rack · your own pieces appear once the Camera room has catalogued them</SampleNote>
    </View>
  );
}

function Tier({label, items, w, h, row, index, onMove}: {label: string; items: string[]; w: number; h: number; row: number; index: number; onMove: (d: 1 | -1) => void}) {
  const W = useAvailableWidth();
  const reduce = useReducedMotion();
  const gap = 12;
  const rail = useAnimatedStyle(() => ({transform: [{translateX: withTiming(W / 2 - w / 2 - index * (w + gap), {duration: reduce ? 0 : 600})}]}));
  const name = label === 'TOP' ? 'Top' : label === 'BOTTOM' ? 'Bottom' : 'Dress';
  return (
    <View style={{height: row, overflow: 'hidden'}}>
      <Animated.View style={[{position: 'absolute', left: 0, top: (row - h) / 2, flexDirection: 'row', gap}, rail]}>
        {items.map((piece, i) => {
          const d = Math.abs(i - index);
          return (
            <View key={piece} style={{width: w, height: h, opacity: d === 0 ? 1 : d === 1 ? 0.5 : 0.22, transform: [{scale: d === 0 ? 1 : 0.86}]}}>
              <View style={{flex: 1, borderRadius: 18, borderWidth: 1, borderColor: d === 0 ? 'rgba(255,255,255,0.3)' : ah.line, backgroundColor: d === 0 ? ah.ink3 : ah.ink2, alignItems: 'center', justifyContent: 'center', padding: 10, gap: 8}}>
                <Icon name={label === 'BOTTOM' ? 'scale' : label === 'DRESS' ? 'sparkles' : 'shirt'} size={d === 0 ? 30 : 22} color={d === 0 ? ah.rose : ah.platinum} strokeWidth={1.2} />
                <Text style={{fontFamily: ahFonts.serif, fontSize: 15, lineHeight: 17, color: ah.text, textAlign: 'center'}} numberOfLines={2}>{piece}</Text>
              </View>
            </View>
          );
        })}
      </Animated.View>
      <View style={{position: 'absolute', left: 0, top: 0, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(5,5,5,0.85)', borderWidth: 1, borderColor: ah.line2}}>
        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10, letterSpacing: 1.4, color: ah.mute}}>{label}</Text>
      </View>
      <ArrowBtn side="left" onPress={() => onMove(-1)} label={`Previous ${name.toLowerCase()}`} row={row} />
      <ArrowBtn side="right" onPress={() => onMove(1)} label={`Next ${name.toLowerCase()}`} row={row} />
    </View>
  );
}

function ArrowBtn({side, onPress, label, row}: {side: 'left' | 'right'; onPress: () => void; label: string; row: number}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({pressed}) => ({position: 'absolute', [side]: 0, top: row / 2 - 22, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: ah.line2, backgroundColor: 'rgba(12,12,14,0.9)', alignItems: 'center', justifyContent: 'center', transform: [{scale: pressed ? 0.94 : 1}]})}>
      <Text style={{color: ah.text, fontSize: 18, fontFamily: ahFonts.sans}}>{side === 'left' ? '←' : '→'}</Text>
    </Pressable>
  );
}
