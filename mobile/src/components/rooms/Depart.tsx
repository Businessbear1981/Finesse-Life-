// Departures — RIDE (Finesse Black, Uber Black, Lyft Lux) and FLY (gold-foil boarding pass, weather, car,
// itinerary), from the design. Sample until ride and travel partners are connected; nothing is booked here.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {ActionBar, Chips, SampleNote, SectionHead, Segmented, s} from './shared';

const RIDES: Array<[string, string, string, string, number]> = [
  ['black', 'Finesse Black', 'Mercedes S-Class · Marcus, 4.98', '4 MIN AWAY', 64],
  ['uber', 'Uber Black', 'Cadillac Escalade', '6 MIN AWAY', 48],
  ['lyft', 'Lyft Lux Black', 'Lincoln Navigator', '9 MIN AWAY', 44],
];
type Trip = {label: string; flight: string; from: string; fromCity: string; to: string; toCity: string; time: string; gate: string; seat: string; weather: string; car: string; plan: Array<[string, string]>};
const TRIPS: Trip[] = [
  {label: 'Amalfi', flight: 'FN 214', from: 'ATL', fromCity: 'Atlanta', to: 'NAP', toCity: 'Naples', time: '6:40 PM', gate: 'E12', seat: '2A', weather: '24° · clear', car: 'Naples · 9:15 AM',
    plan: [['FRI 6:40 PM', 'Car to ATL, lounge access'], ['SAT 9:15 AM', 'Driver to Positano, 75 min'], ['SAT 1:00 PM', 'Lunch held at the hotel terrace'], ['SUN 10:00 AM', 'Boat to Capri, returns 5 PM']]},
  {label: 'New York', flight: 'FN 088', from: 'ATL', fromCity: 'Atlanta', to: 'JFK', toCity: 'New York', time: '8:05 AM', gate: 'B4', seat: '1C', weather: '14° · wind', car: 'JFK · 10:20 AM',
    plan: [['THU 8:05 AM', 'Car at 6:30 AM'], ['THU 12:30 PM', 'Fitting at Atelier Nuit'], ['THU 8:00 PM', 'Gallery opening, Chelsea'], ['FRI 6:15 PM', 'Return flight']]},
];

function Foil({children}: {children: React.ReactNode}) {
  return (
    <View style={{borderRadius: 10, overflow: 'hidden'}}>
      <Svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} preserveAspectRatio="none">
        <Defs><LinearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#F6E2A0" /><Stop offset="0.35" stopColor={deco.brass} /><Stop offset="0.55" stopColor="#FFF1C2" /><Stop offset="1" stopColor={deco.brassShadow} /></LinearGradient></Defs>
        <Rect width="100%" height="100%" fill="url(#foil)" />
      </Svg>
      {children}
    </View>
  );
}

export function Depart({side}: {side: Side}) {
  const acc = track[side].acc;
  const [tab, setTab] = useState<'ride' | 'fly'>('ride');
  const [ride, setRide] = useState('black');
  const [booked, setBooked] = useState(false);
  const [ti, setTi] = useState('Amalfi');
  const RD = RIDES.find((r) => r[0] === ride)!;
  const T = TRIPS.find((t) => t.label === ti)!;
  const ink = '#1A120C';

  return (
    <View style={{gap: 12}}>
      <Segmented options={[['ride', 'RIDE'], ['fly', 'FLY']]} value={tab} onChange={setTab} />
      {tab === 'ride' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 10}}>
          <View style={{padding: 12, gap: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)', backgroundColor: 'rgba(20,12,10,0.7)'}}>
            {[['PICKUP', 'Home · Buckhead', '#7AF5B8'], ['DROP-OFF', 'Lucian · dinner at 8:30', acc]].map(([k, v, c]) => (
              <View key={k} style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <View style={{width: 10, height: 10, borderRadius: k === 'PICKUP' ? 5 : 1, backgroundColor: c}} />
                <View><Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>{k}</Text><Text style={{fontFamily: fonts.label, fontSize: 14, color: deco.cream}}>{v}</Text></View>
              </View>
            ))}
          </View>
          {RIDES.map(([k, name, car, eta, p]) => {
            const on = k === ride;
            return (
              <Pressable key={k} onPress={() => { setRide(k); setBooked(false); }} accessibilityRole="button" accessibilityState={{selected: on}}
                style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: on ? deco.brassHighlight : 'rgba(201,169,97,0.3)', backgroundColor: on ? 'rgba(232,200,122,0.06)' : 'transparent'}}>
                <View style={{width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center'}}><Icon name="car" size={18} /></View>
                <View style={{flex: 1}}>
                  <Text style={{fontFamily: fonts.displayBold, fontSize: 16, color: deco.cream}}>{name}</Text>
                  <Text style={s.small}>{car}</Text>
                  <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: '#7AF5B8'}}>{eta}</Text>
                </View>
                <Text style={{fontFamily: fonts.displayHeavy, fontSize: 20, color: deco.brassLight}}>${p}</Text>
              </Pressable>
            );
          })}
          <View style={{padding: 12, gap: 4, borderLeftWidth: 2, borderColor: deco.brassHighlight}}>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>FINESSE BLACK</Text>
            <Text style={s.small}>The house fleet. Vetted chauffeurs who know your name, your music and your door. Water, charger, silence on request.</Text>
          </View>
          <ActionBar color={booked ? deco.brass : acc} label={booked ? `${RD[1].toUpperCase()} · ${RD[3]}` : `REQUEST ${RD[1].toUpperCase()} · $${RD[4]}`} onPress={() => setBooked((b) => !b)} />
          <SampleNote>PREVIEW · NO RIDE IS REQUESTED UNTIL THE FLEET AND RIDE PARTNERS ARE CONNECTED</SampleNote>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <Chips options={TRIPS.map((t) => t.label)} value={ti} onChange={setTi} />
          <Animated.View key={ti} entering={FadeInDown.duration(450)}>
            <Foil>
              <View style={{padding: 14, gap: 12}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2.4, color: ink}}>BOARDING PASS</Text>
                  <Text style={{fontFamily: fonts.mono, fontSize: 11, color: ink}}>{T.flight}</Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                  <View><Text style={{fontFamily: fonts.displayHeavy, fontSize: 34, color: ink}}>{T.from}</Text><Text style={{fontFamily: fonts.label, fontSize: 11, color: ink}}>{T.fromCity}</Text></View>
                  <Icon name="plane" size={26} color={ink} />
                  <View style={{alignItems: 'flex-end'}}><Text style={{fontFamily: fonts.displayHeavy, fontSize: 34, color: ink}}>{T.to}</Text><Text style={{fontFamily: fonts.label, fontSize: 11, color: ink}}>{T.toCity}</Text></View>
                </View>
                <View style={{height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(26,18,12,0.45)'}} />
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  {[['DEPARTS', T.time], ['GATE', T.gate], ['SEAT', T.seat]].map(([k, v]) => (
                    <View key={k}><Text style={{fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1, color: ink}}>{k}</Text><Text style={{fontFamily: fonts.capsBold, fontSize: 15, color: ink}}>{v}</Text></View>
                  ))}
                </View>
              </View>
            </Foil>
          </Animated.View>
          <View style={{flexDirection: 'row', gap: 10}}>
            {[['WEATHER', T.weather], ['CAR AT', T.car]].map(([k, v]) => (
              <View key={k} style={{flex: 1, padding: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)'}}>
                <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass}}>{k}</Text>
                <Text style={{fontFamily: fonts.label, fontSize: 13, color: deco.cream}}>{v}</Text>
              </View>
            ))}
          </View>
          <SectionHead>ITINERARY</SectionHead>
          {T.plan.map(([when, t], i) => (
            <View key={when} style={{flexDirection: 'row', gap: 12}}>
              <View style={{alignItems: 'center', width: 12}}>
                <View style={{width: 10, height: 10, borderRadius: 5, marginTop: 4, backgroundColor: i === 0 ? acc : deco.brassHighlight}} />
                {i < T.plan.length - 1 ? <View style={{flex: 1, width: 1, backgroundColor: 'rgba(201,169,97,0.4)'}} /> : null}
              </View>
              <View style={{flex: 1, paddingBottom: 12}}>
                <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{when}</Text>
                <Text style={s.body}>{t}</Text>
              </View>
            </View>
          ))}
          <SampleNote>SAMPLE TRIPS · YOUR ITINERARIES APPEAR WHEN TRAVEL IS CONNECTED IN THE SWITCHBOARD</SampleNote>
        </Animated.View>
      )}
    </View>
  );
}
