// Departures — RIDE (Finesse Black, Uber Black, Lyft Lux) and FLY (black-and-chrome boarding pass, weather,
// car, itinerary), from the design. Sample until ride and travel partners are connected; nothing is booked here.
import {useId, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, RadialGradient, Rect, Stop} from 'react-native-svg';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {Icon} from '@/lib/icons';
import {AHCard, AHDisplay, AHEyebrow} from '@/components/ah';
import {ActionBar, Chips, SampleNote, Segmented, s} from './shared';
import {Meta} from './live';

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
const mins = (eta: string) => eta.replace(' AWAY', '').toLowerCase().replace('min', 'min away');

/** The boarding pass: nano-black lacquer, a brushed-chrome sheen, a chrome hairline and a perforated tear. */
function BoardingPass({children, stub}: {children: React.ReactNode; stub: React.ReactNode}) {
  const id = `bp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{borderRadius: radius.card, overflow: 'hidden', backgroundColor: '#09090A', shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 28, shadowOffset: {width: 0, height: 20}, elevation: 10}}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#2B2B2E" /><Stop offset="0.4" stopColor="#0B0B0D" /><Stop offset="0.7" stopColor="#1C1C1F" /><Stop offset="1" stopColor="#050506" /></LinearGradient>
          <LinearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0.55"><Stop offset="0.3" stopColor="#fff" stopOpacity={0} /><Stop offset="0.46" stopColor="#fff" stopOpacity={0.09} /><Stop offset="0.6" stopColor="#fff" stopOpacity={0} /></LinearGradient>
          <RadialGradient id={`${id}r`} cx="1" cy="0" r="0.7"><Stop offset="0" stopColor={ah.rose2} stopOpacity={0.22} /><Stop offset="1" stopColor={ah.rose2} stopOpacity={0} /></RadialGradient>
          <LinearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45} /><Stop offset="0.5" stopColor="#B9BCC2" stopOpacity={0.12} /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.3} /></LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}g)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}r)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}s)`} />
        <Rect x="0.5" y="0.5" width="99.7%" height="99.6%" rx={radius.card} fill="none" stroke={`url(#${id}e)`} strokeWidth={1} />
      </Svg>
      <View style={{padding: 22, gap: 18}}>{children}</View>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <View style={{width: 22, height: 22, borderRadius: 11, marginLeft: -11, backgroundColor: ah.ink}} />
        <View style={{flex: 1, height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.18)'}} />
        <View style={{width: 22, height: 22, borderRadius: 11, marginRight: -11, backgroundColor: ah.ink}} />
      </View>
      <View style={{paddingHorizontal: 22, paddingTop: 16, paddingBottom: 20}}>{stub}</View>
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

  return (
    <View style={{gap: 16}}>
      <Segmented options={[['ride', 'Ride'], ['fly', 'Fly']]} value={tab} onChange={setTab} />
      {tab === 'ride' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <AHCard style={{gap: 0}}>
            {[['Pickup', 'Home · Buckhead', ah.ok], ['Drop-off', 'Lucian · dinner at 8:30', acc]].map(([k, v, c], i) => (
              <View key={k} style={{flexDirection: 'row', gap: 14}}>
                <View style={{alignItems: 'center', width: 12, paddingTop: 6}}>
                  <View style={{width: 10, height: 10, borderRadius: i === 0 ? 5 : 2, backgroundColor: c}} />
                  {i === 0 ? <View style={{flex: 1, width: 1, marginVertical: 4, backgroundColor: ah.line2}} /> : null}
                </View>
                <View style={{flex: 1, paddingBottom: i === 0 ? 16 : 0}}>
                  <Meta>{k}</Meta>
                  <Text style={{fontFamily: ahFonts.serif, fontSize: 22, lineHeight: 26, color: ah.text}}>{v}</Text>
                </View>
              </View>
            ))}
          </AHCard>
          {RIDES.map(([k, name, car, eta, p]) => {
            const on = k === ride;
            return (
              <Pressable key={k} onPress={() => { setRide(k); setBooked(false); }} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${name}, ${car}, ${mins(eta)}, $${p}`}
                style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, borderWidth: on ? 1.5 : 1, borderColor: on ? ah.white : ah.line,
                  backgroundColor: on ? ah.ink3 : ah.ink2, opacity: pressed ? 0.85 : 1})}>
                <View style={{width: 44, height: 44, borderRadius: 22, backgroundColor: on ? ah.white : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name="car" size={20} color={on ? '#000' : ah.platinum} />
                </View>
                <View style={{flex: 1, gap: 2}}>
                  <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 16, color: ah.text}}>{name}</Text>
                  <Text style={s.small}>{car}</Text>
                  <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 12, color: ah.ok}}>{mins(eta)}</Text>
                </View>
                <Text style={{fontFamily: ahFonts.serif, fontSize: 30, color: ah.text}}>${p}</Text>
              </Pressable>
            );
          })}
          <AHCard pad={16} style={{gap: 6, backgroundColor: 'transparent'}}>
            <Meta color={ah.text}>Finesse Black</Meta>
            <Text style={s.small}>The house fleet. Vetted chauffeurs who know your name, your music and your door. Water, charger, silence on request.</Text>
          </AHCard>
          <ActionBar color={booked ? ah.platinum : acc} label={booked ? `${RD[1]} · ${mins(RD[3])}` : `Request ${RD[1]} · $${RD[4]}`} onPress={() => setBooked((b) => !b)} />
          <SampleNote>Preview · no ride is requested until the fleet and ride partners are connected</SampleNote>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 16}}>
          <Chips options={TRIPS.map((t) => t.label)} value={ti} onChange={setTi} />
          <Animated.View key={ti} entering={FadeInDown.duration(450)}>
            <BoardingPass stub={
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                {[['Departs', T.time], ['Gate', T.gate], ['Seat', T.seat]].map(([k, v]) => (
                  <View key={k} style={{gap: 2}}><Meta>{k}</Meta><Text style={{fontFamily: ahFonts.sansSemi, fontSize: 18, color: ah.white}}>{v}</Text></View>
                ))}
              </View>
            }>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={{fontFamily: ahFonts.sansBold, fontSize: 10, letterSpacing: 3.5, color: 'rgba(237,235,231,0.85)'}}>FINESSE</Text>
                <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10, letterSpacing: 2, color: ah.mute}}>BOARDING PASS · {T.flight}</Text>
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <View style={{flex: 1}}>
                  <AHDisplay size={54} accessibilityRole="text">{T.from}</AHDisplay>
                  <Text style={[s.small, {fontSize: 12.5}]}>{T.fromCity}</Text>
                </View>
                <View style={{alignItems: 'center', gap: 4}}>
                  <Icon name="plane" size={22} color={ah.rose} />
                  <View style={{width: 44, height: 1, backgroundColor: ah.line2}} />
                </View>
                <View style={{flex: 1, alignItems: 'flex-end'}}>
                  <View style={{width: 116}}><AHDisplay size={54} accessibilityRole="text" style={{alignItems: 'flex-end'}}>{T.to}</AHDisplay></View>
                  <Text style={[s.small, {fontSize: 12.5}]}>{T.toCity}</Text>
                </View>
              </View>
            </BoardingPass>
          </Animated.View>
          <View style={{flexDirection: 'row', gap: 10}}>
            {[['Weather', T.weather], ['Car at', T.car]].map(([k, v]) => (
              <AHCard key={k} pad={16} style={{flex: 1, gap: 4}}>
                <Meta>{k}</Meta>
                <Text style={{fontFamily: ahFonts.serif, fontSize: 20, lineHeight: 23, color: ah.text}}>{v}</Text>
              </AHCard>
            ))}
          </View>
          <AHEyebrow style={{marginTop: 8}}>Itinerary</AHEyebrow>
          <View>
            {T.plan.map(([when, t], i) => (
              <View key={when} style={{flexDirection: 'row', gap: 14}}>
                <View style={{alignItems: 'center', width: 14}}>
                  <View style={{width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: i === 0 ? acc : 'transparent', borderWidth: i === 0 ? 0 : 1.5, borderColor: ah.platinum}} />
                  {i < T.plan.length - 1 ? <View style={{flex: 1, width: 1, marginTop: 4, backgroundColor: ah.line2}} /> : null}
                </View>
                <View style={{flex: 1, paddingBottom: 18, gap: 2}}>
                  <Meta>{when}</Meta>
                  <Text style={{fontFamily: ahFonts.serif, fontSize: 21, lineHeight: 24, color: ah.text}}>{t}</Text>
                </View>
              </View>
            ))}
          </View>
          <SampleNote>Sample trips · your itineraries appear when travel is connected in the Switchboard</SampleNote>
        </Animated.View>
      )}
    </View>
  );
}
