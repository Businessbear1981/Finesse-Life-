// The Penthouse interior (shown after the Private Lift opens) — YOUR FLOOR (rooms you add, keys you hand
// out) and HANDYMAN (a vetted pro at your door), from the design. Also "This Is You", the portrait room:
// your stats and exactly what other members can see. Samples are labelled; nothing is dispatched or paid.
import {useState} from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {ActionBar, Chips, GoldFrame, Monogram, SampleNote, SectionHead, Segmented, s} from './shared';

const MODS: Array<[string, string, string]> = [['chef', 'Private chef', 'Dinners at home, menus from your macros'], ['concierge', 'Human concierge', 'A person, any hour'], ['jet', 'Jet & yacht desk', 'Charters on a day’s notice'], ['art', 'Art advisor', 'Acquisitions and loans'], ['security', 'Security detail', 'Discreet, on request'], ['screen', 'Screening room', 'Private premieres'], ['cellar', 'Wine cellar', 'Allocations and storage'], ['spa', 'Wellness suite', 'In-home treatments']];
const JOBS: Array<[string, string, string]> = [['plumbing', 'Plumbing', 'droplets'], ['electrical', 'Electrical', 'zap'], ['locks', 'Locks & doors', 'lock'], ['appliance', 'Appliances', 'refrigerator'], ['ac', 'Heat & AC', 'thermometer'], ['tv', 'TV & Wi-Fi', 'wifi'], ['car', 'Car trouble', 'car'], ['hang', 'Hang & mount', 'hammer'], ['anything', 'Anything else', 'wrench']];
const PROS: Record<string, [string, string]> = {plumbing: ['Marcus T.', 'Master plumber · 4.98 · 12 min away'], electrical: ['Dee A.', 'Licensed electrician · 4.97 · 18 min away'], locks: ['Sam K.', 'Locksmith · 4.99 · 9 min away'], appliance: ['Rosa V.', 'Appliance tech · 4.96 · 25 min away'], ac: ['Jon P.', 'HVAC · 4.95 · 30 min away'], tv: ['Priya N.', 'AV & network · 4.98 · 15 min away'], car: ['Andre L.', 'Mobile mechanic · 4.97 · 20 min away'], hang: ['Theo R.', 'Handyman · 4.99 · 10 min away'], anything: ['Élodie', 'Your concierge is finding the right pro']};

export function PenthouseFloor() {
  const [tab, setTab] = useState<'floor' | 'handy'>('floor');
  const [mods, setMods] = useState<string[]>(['chef', 'concierge']);
  const [extraKey, setExtraKey] = useState(false);
  const [job, setJob] = useState('plumbing');
  const [when, setWhen] = useState('Now');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const guests: Array<[string, string]> = [['Theo', 'KEY ACCEPTED'], ['Maya', 'KEY SENT'], ...(extraKey ? [['New key', 'READY TO SEND'] as [string, string]] : [])];
  const P = PROS[job], J = JOBS.find((j) => j[0] === job)!;
  return (
    <View style={{gap: 12, alignSelf: 'stretch'}}>
      <Text style={{fontFamily: fonts.displayHeavy, fontSize: 32, color: deco.cream, textAlign: 'center'}}>The Penthouse</Text>
      <Text style={[s.body, {textAlign: 'center'}]}>Your floor. Nobody sees it unless you hand them a key. Build it the way you live.</Text>
      <Segmented options={[['floor', 'YOUR FLOOR'], ['handy', 'HANDYMAN']]} value={tab} onChange={setTab} />
      {tab === 'floor' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <SectionHead>BUILD YOUR FLOOR · {mods.length} ROOMS</SectionHead>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            {MODS.map(([k, name, line]) => {
              const on = mods.includes(k);
              return (
                <Pressable key={k} onPress={() => setMods((m) => (on ? m.filter((x) => x !== k) : [...m, k]))} accessibilityRole="button" accessibilityState={{selected: on}}
                  style={{width: '48%', minHeight: 78, padding: 10, gap: 3, borderWidth: 1, borderColor: on ? deco.brassHighlight : 'rgba(201,169,97,0.3)', backgroundColor: on ? deco.brassHighlight : 'rgba(10,4,6,0.5)'}}>
                  <Text style={{fontFamily: fonts.displayBold, fontSize: 14, color: on ? '#140E08' : deco.cream}}>{name}</Text>
                  <Text style={{fontFamily: fonts.body, fontSize: 10.5, lineHeight: 14, color: on ? '#3A2A1A' : 'rgba(244,232,208,0.65)'}}>{line}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)'}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>KEYS TO HAND OUT</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.cream}}>{3 - guests.length} LEFT</Text>
            </View>
            {guests.map(([n, st]) => (
              <View key={n} style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <Icon name="lock" size={14} />
                <Text style={[s.body, {flex: 1}]}>{n}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: st === 'KEY ACCEPTED' ? '#7AF5B8' : deco.brass}}>{st}</Text>
              </View>
            ))}
            <Pressable disabled={guests.length >= 3} onPress={() => setExtraKey(true)} accessibilityRole="button" style={{minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: deco.brassHighlight, opacity: guests.length >= 3 ? 0.45 : 1}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: deco.brassHighlight}}>CUT A NEW KEY</Text>
            </Pressable>
          </View>
          <SampleNote>SAMPLE FLOOR · ROOMS ARE REQUESTS TO THE CONCIERGE · KEYS GIVE ACCESS TO YOUR FLOOR ONLY, NEVER YOUR VAULT</SampleNote>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(122,245,184,0.45)'}}>
            <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#7AF5B8'}} />
            <View style={{flex: 1}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: '#7AF5B8'}}>PREVIEW · SERVICE PARTNER NOT LIVE YET</Text>
              <Text style={s.small}>Fix anything, day or night — once the service partner is live. The pros below are samples.</Text>
            </View>
          </View>
          <SectionHead>WHAT NEEDS FIXING?</SectionHead>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            {JOBS.map(([k, label, ic]) => {
              const on = k === job;
              return (
                <Pressable key={k} onPress={() => { setJob(k); setSent(false); }} accessibilityRole="button" accessibilityState={{selected: on}}
                  style={{width: '31%', minHeight: 70, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: on ? deco.brassHighlight : 'rgba(201,169,97,0.3)', backgroundColor: on ? 'rgba(232,200,122,0.1)' : 'transparent'}}>
                  <Icon name={ic} size={20} color={on ? deco.brassWhite : deco.brass} />
                  <Text style={{fontFamily: fonts.label, fontSize: 10, color: on ? deco.brassWhite : 'rgba(244,232,208,0.8)', textAlign: 'center'}}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 140))} placeholder="Tell us what happened (optional)" placeholderTextColor="rgba(244,232,208,0.4)" accessibilityLabel="What happened"
            style={{minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)', fontFamily: fonts.body, fontSize: 13, color: deco.cream}} />
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>WHEN</Text>
          <Chips options={['Now', 'Tonight', 'Tomorrow AM']} value={when} onChange={(v) => { setWhen(v); setSent(false); }} />
          {sent ? (
            <Animated.View entering={FadeInDown.duration(300)} style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: deco.brassHighlight}}>
              <Monogram name={P[0]} size={42} />
              <View style={{flex: 1}}>
                <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: '#7AF5B8'}}>{when === 'Now' ? 'PREVIEW · NO ONE DISPATCHED' : `PREVIEW · NOT BOOKED · ${when.toUpperCase()}`}</Text>
                <Text style={{fontFamily: fonts.displayBold, fontSize: 16, color: deco.cream}}>{P[0]}</Text>
                <Text style={s.small}>{P[1]}</Text>
              </View>
            </Animated.View>
          ) : null}
          <ActionBar color={sent ? deco.brass : deco.lamp} label={sent ? `PREVIEW · NOT SENT · ${J[1].toUpperCase()}` : `SEND A PRO · ${J[1].toUpperCase()}`} onPress={() => setSent((x) => !x)} />
          <SampleNote>PREVIEW · NO ONE IS DISPATCHED UNTIL THE SERVICE PARTNER IS LIVE · YOU APPROVE ANY QUOTE BEFORE WORK STARTS</SampleNote>
        </Animated.View>
      )}
    </View>
  );
}

/* ─────────────── This Is You ─────────────── */
const FIELDS = ['Name', 'City', 'Portrait', 'Moments', 'Circles', 'Brands you wear'];

function Switch({on, onPress, label}: {on: boolean; onPress: () => void; label: string}) {
  const knob = useAnimatedStyle(() => ({transform: [{translateX: withTiming(on ? 22 : 0, {duration: 200})}]}));
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{checked: on}} accessibilityLabel={label} hitSlop={8}
      style={{width: 48, height: 26, borderRadius: 13, borderWidth: 1, borderColor: on ? '#00FF88' : deco.brass, backgroundColor: on ? 'rgba(0,255,136,0.18)' : 'transparent', justifyContent: 'center', paddingHorizontal: 2}}>
      <Animated.View style={[{width: 20, height: 20, borderRadius: 10, backgroundColor: on ? '#7AF5B8' : deco.brass}, knob]} />
    </Pressable>
  );
}

export function Profile({side}: {side: Side}) {
  const acc = track[side].acc;
  const name = side === 'her' ? 'Amara' : 'Julian';
  const [hidden, setHidden] = useState<string[]>(['Circles', 'Brands you wear']);
  const shown = FIELDS.length - hidden.length;
  return (
    <View style={{gap: 12}}>
      <GoldFrame pad={4}>
        <View style={{backgroundColor: '#140E0B', padding: 16, alignItems: 'center', gap: 6}}>
          <Monogram name={name} size={96} ring={acc} />
          <Text style={{fontFamily: fonts.displayHeavy, fontSize: 28, color: deco.cream}}>{name}</Text>
          <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2, color: deco.brass}}>{track[side].name.toUpperCase()} · ATLANTA · MEMBER SINCE 2026</Text>
        </View>
      </GoldFrame>
      <View style={{flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.35)'}}>
        {[['14', 'outings'], ['3', 'vouches'], ['212', 'profile visits']].map(([n, l], i) => (
          <View key={l} style={{flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: i ? 1 : 0, borderColor: 'rgba(201,169,97,0.35)'}}>
            <Text style={{fontFamily: fonts.displayHeavy, fontSize: 24, color: deco.brassLight}}>{n}</Text>
            <Text style={s.small}>{l}</Text>
          </View>
        ))}
      </View>
      <SectionHead>WHAT OTHERS SEE · {shown} OF {FIELDS.length}</SectionHead>
      <View style={{borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)'}}>
        {FIELDS.map((f, i) => {
          const on = !hidden.includes(f);
          return (
            <View key={f} style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderColor: 'rgba(201,169,97,0.2)'}}>
              <View style={{flex: 1}}>
                <Text style={{fontFamily: fonts.label, fontSize: 14, color: deco.cream}}>{f}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 0.8, color: on ? '#7AF5B8' : 'rgba(244,232,208,0.55)'}}>{on ? 'MEMBERS CAN SEE' : 'ONLY YOU'}</Text>
              </View>
              <Switch on={on} label={f} onPress={() => setHidden((h) => (on ? [...h, f] : h.filter((x) => x !== f)))} />
            </View>
          );
        })}
      </View>
      <SectionHead>YOUR TRAFFIC · THIS WEEK</SectionHead>
      <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80}}>
        {[12, 18, 9, 26, 31, 44, 22].map((v, i) => (
          <View key={i} style={{flex: 1, alignItems: 'center', gap: 4}}>
            <View style={{width: '100%', height: v * 1.5, backgroundColor: i === 5 ? acc : 'rgba(232,200,122,0.5)'}} />
            <Text style={{fontFamily: fonts.mono, fontSize: 8, color: deco.brass}}>{'MTWTFSS'[i]}</Text>
          </View>
        ))}
      </View>
      <Text style={s.small}>Your social score is never shown to you. Hidden fields stay private, including from partners. You can export or delete everything from here once your account is live.</Text>
      <SampleNote>SAMPLE PORTRAIT · THESE SWITCHES ARE A PREVIEW AND ARE NOT SAVED YET</SampleNote>
    </View>
  );
}
