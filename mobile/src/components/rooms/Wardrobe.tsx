// The Wardrobe — a turning rack, as in the design: two tiers (top + bottom) or one tier (dress)
// slide under a gold rail; the centred look is "tonight". Sample pieces until the member's closet is in.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {useAvailableWidth} from '@/lib/layout';
import {Icon} from '@/lib/icons';
import {ActionBar, GoldFrame, GoldRule, SampleNote, Segmented} from './shared';

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
    ? [{key: 'dress', label: 'DRESS', items: DRESS, w: 120, h: 220, row: 236}]
    : [{key: 'top', label: 'TOP', items: TOPS[side], w: 100, h: 118, row: 130}, {key: 'bottom', label: 'BOTTOM', items: BOTS[side], w: 100, h: 118, row: 130}];
  const cur = (t: (typeof tiers)[number]) => t.items[idx[t.key] % t.items.length];
  const outfit = dress ? cur(tiers[0]) : `${cur(tiers[0])} with ${cur(tiers[1]).toLowerCase()}`;
  return (
    <View style={{gap: 10}}>
      {her ? <Segmented options={[['sep', 'TOP + BOTTOM'], ['dress', 'DRESS']]} value={mode} onChange={(m) => { setMode(m); setSaved(false); }} /> : null}
      <GoldRule />
      {tiers.map((t) => (
        <Tier key={t.key} label={t.label} items={t.items} w={t.w} h={t.h} row={t.row} index={idx[t.key]}
          onMove={(d) => { setSaved(false); setIdx((x) => ({...x, [t.key]: (x[t.key] + d + t.items.length) % t.items.length})); }} />
      ))}
      <View style={{alignItems: 'center', gap: 2}}>
        <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2.6, color: deco.brassHighlight}}>TONIGHT</Text>
        <Text style={{fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, color: deco.cream, textAlign: 'center'}} accessibilityLiveRegion="polite">{outfit}</Text>
      </View>
      <ActionBar label={saved ? 'SAVED TO TONIGHT' : 'WEAR THIS TONIGHT'} color={saved ? deco.brass : track[side].acc} onPress={() => setSaved((v) => !v)} />
      <SampleNote>SAMPLE RACK · YOUR OWN PIECES APPEAR ONCE THE CAMERA ROOM HAS CATALOGUED THEM</SampleNote>
    </View>
  );
}

function Tier({label, items, w, h, row, index, onMove}: {label: string; items: string[]; w: number; h: number; row: number; index: number; onMove: (d: 1 | -1) => void}) {
  const W = useAvailableWidth();
  const gap = 10;
  const rail = useAnimatedStyle(() => ({transform: [{translateX: withTiming(W / 2 - w / 2 - index * (w + gap), {duration: 600})}]}));
  return (
    <View style={{height: row, overflow: 'hidden'}}>
      <Animated.View style={[{position: 'absolute', left: 0, top: (row - h) / 2, flexDirection: 'row', gap}, rail]}>
        {items.map((name, i) => {
          const d = Math.abs(i - index);
          return (
            <View key={name} style={{width: w, height: h, opacity: d === 0 ? 1 : d === 1 ? 0.6 : 0.3, transform: [{scale: d === 0 ? 1 : 0.86}]}}>
              <GoldFrame pad={d === 0 ? 4 : 2} style={{flex: 1}}>
                <View style={{flex: 1, backgroundColor: '#17110E', alignItems: 'center', justifyContent: 'center', padding: 6, gap: 6}}>
                  <Icon name={label === 'BOTTOM' ? 'scale' : label === 'DRESS' ? 'sparkles' : 'shirt'} size={d === 0 ? 30 : 22} color={deco.brass} strokeWidth={1.2} />
                  <Text style={{fontFamily: fonts.label, fontSize: 9, lineHeight: 12, color: 'rgba(244,232,208,0.75)', textAlign: 'center'}} numberOfLines={2}>{name}</Text>
                </View>
              </GoldFrame>
            </View>
          );
        })}
      </Animated.View>
      <View style={{position: 'absolute', left: 0, top: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#0A0807', borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)'}}>
        <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2, color: deco.brassHighlight}}>{label}</Text>
      </View>
      <ArrowBtn side="left" onPress={() => onMove(-1)} label={`Previous ${label.toLowerCase()}`} row={row} />
      <ArrowBtn side="right" onPress={() => onMove(1)} label={`Next ${label.toLowerCase()}`} row={row} />
    </View>
  );
}

function ArrowBtn({side, onPress, label, row}: {side: 'left' | 'right'; onPress: () => void; label: string; row: number}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{position: 'absolute', [side]: 0, top: row / 2 - 20, width: 40, height: 40, borderWidth: 2, borderColor: deco.brass, backgroundColor: 'rgba(10,8,7,0.88)', alignItems: 'center', justifyContent: 'center'}}>
      <Text style={{color: deco.brassHighlight, fontSize: 16}}>{side === 'left' ? '←' : '→'}</Text>
    </Pressable>
  );
}
