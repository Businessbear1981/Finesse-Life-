// Entourage — dossiers on the people you love: countdown to their day, gifts on record, what they love
// and a gift idea (from the design). Sample people until the member adds their own.
import {useState} from 'react';
import {Text, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {ActionBar, Chips, GoldFrame, Monogram, SampleNote, s} from './shared';

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
    <View style={{gap: 12}}>
      <Chips options={PEOPLE.map((p) => p[0])} value={who} onChange={setWho} />
      <Animated.View key={who} entering={FadeInDown.duration(400)}>
        <GoldFrame pad={3}>
          <View style={{backgroundColor: '#140E0B', padding: 14, gap: 14}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
              <Monogram name={P[0]} size={64} ring={acc} />
              <View style={{flex: 1, gap: 2}}>
                <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2, color: deco.brass}}>DOSSIER · {P[1]}</Text>
                <Text style={{fontFamily: fonts.displayHeavy, fontSize: 26, color: deco.cream}}>{P[0]}</Text>
                <Text style={s.small}>{P[2]}</Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.3)'}}>
              {[[String(P[3]), `days to ${P[4]}`], [String(P[5]), 'gifts on record']].map(([n, l], i) => (
                <View key={l} style={{flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: i ? 1 : 0, borderColor: 'rgba(201,169,97,0.3)'}}>
                  <Text style={{fontFamily: fonts.displayHeavy, fontSize: 30, color: i === 0 && P[3] <= 14 ? acc : deco.brassLight}}>{n}</Text>
                  <Text style={[s.small, {textAlign: 'center'}]}>{l}</Text>
                </View>
              ))}
            </View>
            <View style={{gap: 8}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>LOVES</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                {P[6].map((l) => <Text key={l} style={{paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)', fontFamily: fonts.label, fontSize: 11, color: deco.cream}}>{l}</Text>)}
              </View>
              <Text style={{fontFamily: fonts.script, fontSize: 17, lineHeight: 23, color: deco.cream}}>Gift idea: {P[7]}</Text>
            </View>
          </View>
        </GoldFrame>
      </Animated.View>
      <ActionBar color={isPlanned ? deco.brass : acc} label={isPlanned ? `NOVA IS PLANNING FOR ${P[0].toUpperCase()}` : `PLAN FOR ${P[0].toUpperCase()}`}
        onPress={() => setPlanned((l) => (l.includes(P[0]) ? l.filter((x) => x !== P[0]) : [...l, P[0]]))} />
      <SampleNote>SAMPLE DOSSIERS · ONLY YOU SEE YOUR ENTOURAGE · NOVA DRAFTS PLANS FOR YOUR APPROVAL, NOTHING IS BOUGHT</SampleNote>
    </View>
  );
}
