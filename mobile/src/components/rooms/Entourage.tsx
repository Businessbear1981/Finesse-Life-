// Entourage — dossiers on the people you love: countdown to their day, gifts on record, what they love
// and a gift idea (from the design). Sample people until the member adds their own.
import {useState} from 'react';
import {Text, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {AHChip, AHEyebrow, AHRing, AHSmoke, AHTitle} from '@/components/ah';
import {ActionBar, Chips, SampleNote, s} from './shared';
import {Meta} from './live';

const PEOPLE: Array<[string, string, string, number, string, number, string[], string]> = [
  ['Mum', 'FAMILY', 'Savannah', 12, 'her birthday', 9, ['Orchids', 'Hermès scarves', 'Earl Grey'], 'a silk carré in garden print'],
  ['Theo', 'PARTNER', 'Atlanta', 31, 'your anniversary', 14, ['Vintage watches', 'Negronis', 'Jazz'], 'a 1960s dress watch, serviced'],
  ['Maya', 'BEST FRIEND', 'New York', 48, 'her birthday', 6, ['Candles', 'First editions', 'Spa days'], 'a first edition of her favourite novel'],
  ['Dre', 'MENTOR', 'Atlanta', 5, 'his promotion dinner', 2, ['Cigars', 'Golf', 'Bourbon'], 'a private tasting for two'],
];

export function Entourage({side}: {side: Side}) {
  const acc = track[side].acc;
  const [who, setWho] = useState('Mum');
  const [planned, setPlanned] = useState<string[]>([]);
  const P = PEOPLE.find((p) => p[0] === who)!;
  const isPlanned = planned.includes(P[0]);
  return (
    <View style={{gap: 16}}>
      <Chips options={PEOPLE.map((p) => p[0])} value={who} onChange={setWho} />
      <Animated.View key={who} entering={FadeInDown.duration(400)} style={{gap: 14}}>
        <AHSmoke aspect={1 / 0.78} top={
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <AHChip label={`Dossier · ${P[1].toLowerCase()}`} tone="glass" />
            <AHRing name={P[0]} size={58} label={false} />
          </View>
        }>
          <AHEyebrow color="rgba(237,235,231,0.7)">{P[2]}</AHEyebrow>
          <AHTitle size={56} style={{marginTop: 2}}>{P[0]}</AHTitle>
          <View style={{flexDirection: 'row', marginTop: 16, gap: 22}}>
            {[[String(P[3]), `days to ${P[4]}`], [String(P[5]), 'gifts on record']].map(([n, l], i) => (
              <View key={l} style={{flex: 1}}>
                <Text style={{fontFamily: ahFonts.serif, fontSize: 40, lineHeight: 42, color: i === 0 && P[3] <= 14 ? ah.blush : ah.text}}>{n}</Text>
                <Text style={[s.small, {color: 'rgba(237,235,231,0.7)'}]}>{l}</Text>
              </View>
            ))}
          </View>
        </AHSmoke>

        <View style={{gap: 10}}>
          <Meta>Loves</Meta>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            {P[6].map((l) => (
              <View key={l} style={{paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: ah.line2}}>
                <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color: ah.text}}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{paddingLeft: 14, borderLeftWidth: 2, borderColor: acc, gap: 4}}>
          <Meta>Gift idea</Meta>
          <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 24, lineHeight: 28, color: ah.text}}>{P[7].charAt(0).toUpperCase() + P[7].slice(1)}</Text>
        </View>
      </Animated.View>
      <ActionBar color={isPlanned ? ah.platinum : acc} label={isPlanned ? `Nova is planning for ${P[0]}` : `Plan for ${P[0]}`}
        onPress={() => setPlanned((l) => (l.includes(P[0]) ? l.filter((x) => x !== P[0]) : [...l, P[0]]))} />
      <SampleNote>Sample dossiers · only you see your Entourage · Nova drafts plans for your approval, nothing is bought</SampleNote>
    </View>
  );
}
