// Scale (group buys: the price falls as members pledge), The Exchange (consign with provenance and offers)
// and Embassy (partner offers, fully disclosed) — from the design. Pledging never charges; accepting an
// offer or a partner deal here is a preview until the commerce partners are live.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {ActionBar, Chips, GoldFrame, SampleNote, SectionHead, s} from './shared';

const LADDER: Array<[number, number]> = [[50, 520], [100, 460], [150, 412], [250, 360]];

export function Scale({side}: {side: Side}) {
  const acc = track[side].acc;
  const [pledged, setPledged] = useState(false);
  const pledges = 163 + (pledged ? 1 : 0);
  const cur = LADDER.filter(([n]) => pledges >= n).pop()!;
  const next = LADDER.find(([n]) => pledges < n);
  const pct = next ? Math.round(((pledges - cur[0]) / (next[0] - cur[0])) * 100) : 100;
  return (
    <View style={{gap: 12}}>
      <View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}>
        <GoldFrame pad={2}><View style={{width: 76, height: 92, backgroundColor: '#140E0B', alignItems: 'center', justifyContent: 'center'}}><Icon name="shirt" size={28} color={deco.brass} strokeWidth={1.2} /></View></GoldFrame>
        <View style={{flex: 1, gap: 3}}>
          <Text style={{fontFamily: fonts.displayBold, fontSize: 18, color: deco.cream}}>Cashmere travel wrap</Text>
          <Text style={s.small}>Group buy · closes Sunday</Text>
        </View>
      </View>
      <View style={{alignItems: 'center', gap: 2, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.35)'}}>
        <Text style={{fontFamily: fonts.mono, fontSize: 10, color: '#7AF5B8'}}>▼ ${680 - cur[1]} FROM $680</Text>
        <Text style={{fontFamily: fonts.displayHeavy, fontSize: 44, color: deco.brassWhite}}>${cur[1]}</Text>
        <Text style={s.small}>{pledges} members pledged · price falls as more join</Text>
      </View>
      {LADDER.map(([n, p]) => {
        const hit = pledges >= n;
        return (
          <View key={n} style={{flexDirection: 'row', alignItems: 'center', gap: 10, opacity: hit ? 1 : 0.6}}>
            <View style={{width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: deco.brassHighlight, backgroundColor: hit ? deco.brassHighlight : 'transparent'}} />
            <Text style={[s.body, {flex: 1}]}>{n} pledges</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 12, color: cur[0] === n ? deco.brassWhite : deco.brassHighlight}}>${p}</Text>
          </View>
        );
      })}
      <View style={{gap: 5}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>DEMAND</Text>
          <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.cream}}>{next ? `${next[0] - pledges} TO NEXT DROP` : 'LOWEST PRICE REACHED'}</Text>
        </View>
        <View style={{height: 6, backgroundColor: 'rgba(201,169,97,0.15)'}}><Animated.View layout={LinearTransition} style={{height: 6, width: `${pct}%`, backgroundColor: acc}} /></View>
      </View>
      <ActionBar color={pledged ? deco.brass : acc} label={pledged ? 'PLEDGED · TAP TO WITHDRAW' : `PLEDGE AT $${cur[1]}`} onPress={() => setPledged((p) => !p)} />
      <SampleNote>PREVIEW · A PLEDGE NEVER CHARGES · PAYMENT IS ONLY REQUESTED IF THE BUY CLOSES, AND YOU CONFIRM IT</SampleNote>
    </View>
  );
}

const PROV: Array<[string, string]> = [['2022 · PARIS', 'Bought new at the flagship'], ['2022–2026', 'Carried 40 times, stored in dust bag'], ['SEP 2026', 'Authenticated by the house'], ['OCT 2026', 'Listed on the Exchange']];
const OFFERS: Array<[string, string, string]> = [['$2,150', 'a member in Paris', 'EXPIRES 2D'], ['$1,980', 'a member in Atlanta', 'EXPIRES 5H'], ['$2,300', 'a member in Dubai', 'EXPIRES 1D']];

export function Exchange() {
  const [accepted, setAccepted] = useState<number | null>(null);
  return (
    <View style={{gap: 12}}>
      <GoldFrame pad={4}>
        <View style={{height: 190, backgroundColor: '#140E0B', alignItems: 'center', justifyContent: 'center', gap: 8}}>
          <Icon name="briefcase" size={40} color={deco.brass} strokeWidth={1.1} />
          <Text style={{fontFamily: fonts.label, fontSize: 10, color: 'rgba(244,232,208,0.5)'}}>Your listing photo</Text>
        </View>
      </GoldFrame>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <Text style={{fontFamily: fonts.displayBold, fontSize: 20, color: deco.cream}}>Black leather tote</Text>
        <Text style={{fontFamily: fonts.displayHeavy, fontSize: 22, color: deco.brassLight}}>$2,400</Text>
      </View>
      <SectionHead>PROVENANCE</SectionHead>
      {PROV.map(([when, t], i) => (
        <View key={when} style={{flexDirection: 'row', gap: 12}}>
          <View style={{alignItems: 'center', width: 12}}>
            <View style={{width: 10, height: 10, transform: [{rotate: '45deg'}], marginTop: 4, backgroundColor: deco.brassHighlight}} />
            {i < PROV.length - 1 ? <View style={{flex: 1, width: 1, backgroundColor: 'rgba(201,169,97,0.4)'}} /> : null}
          </View>
          <View style={{flex: 1, paddingBottom: 10}}>
            <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{when}</Text>
            <Text style={s.body}>{t}</Text>
          </View>
        </View>
      ))}
      <SectionHead>OFFERS · {accepted != null ? 'PREVIEW PICK' : `${OFFERS.length} OPEN`}</SectionHead>
      {OFFERS.map(([amt, from, exp], i) => {
        const me = accepted === i;
        return (
          <Animated.View key={amt} layout={LinearTransition} style={{padding: 12, gap: 6, backgroundColor: deco.cream, opacity: accepted != null && !me ? 0.4 : 1}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: fonts.displayHeavy, fontSize: 22, color: '#1A120C'}}>{amt}</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, color: '#6B5028'}}>{exp}</Text>
            </View>
            <Text style={{fontFamily: fonts.body, fontSize: 12, color: '#3A2A1A'}}>from {from}</Text>
            <Pressable onPress={() => setAccepted(me ? null : i)} accessibilityRole="button"
              style={{minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#1A120C', backgroundColor: me ? '#1A120C' : 'transparent'}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: me ? '#F2E8D2' : '#1A120C'}}>{me ? 'PREVIEW · NOT ACCEPTED YET' : 'ACCEPT'}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
      <SampleNote>SAMPLE LISTING · FUNDS ARE HELD BY THE PAYMENT PARTNER, NEVER BY FINESSE · ACCEPTING HERE IS A PREVIEW</SampleNote>
    </View>
  );
}

const ENVOYS: Array<[string, string, string, string[], string]> = [
  ['Maison Aurel', 'Partner since 2026 · heritage leather', 'Private fitting for the Aurel evening bag, with a monogram on the house.', ['You answered “Heritage” for houses you return to', 'Gold hardware is in your style read', 'Your budget per piece fits this range'], 'Finesse earns 8% if you buy. Aurel never sees your data unless you accept.'],
  ['Atelier Nuit', 'Partner since 2026 · eveningwear', 'First look at the winter gown edit, two days before release.', ['“Old Hollywood” in your interview', 'Evening-first in your style read', 'Three gala dates in your Diary'], 'Finesse earns 6% if you buy. Offer shown to members whose style read matches.'],
  ['Hôtel Lumen', 'Partner since 2026 · hospitality', 'Suite upgrade for your Amalfi return, late checkout included.', ['Travel picked for your ideal week', 'Amalfi is a season in your Scrapbook', 'You prefer quiet over social'], 'Finesse earns a flat referral fee. No data shared until you book.'],
];

export function Embassy({side}: {side: Side}) {
  const acc = track[side].acc;
  const [ei, setEi] = useState(ENVOYS[0][0]);
  const [st, setSt] = useState<Record<string, 'yes' | 'no' | undefined>>({});
  const E = ENVOYS.find((e) => e[0] === ei)!;
  const state = st[ei];
  return (
    <View style={{gap: 12}}>
      <Chips options={ENVOYS.map((e) => e[0])} value={ei} onChange={setEi} />
      <Animated.View key={ei} entering={FadeInDown.duration(400)}>
        <GoldFrame pad={3}>
          <View style={{backgroundColor: '#140E0B', padding: 14, gap: 14}}>
            <View style={{gap: 2}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2, color: deco.brass}}>PARTNER DOSSIER</Text>
              <Text style={{fontFamily: fonts.displayHeavy, fontSize: 26, color: deco.cream}}>{E[0]}</Text>
              <Text style={s.small}>{E[1]}</Text>
            </View>
            <View style={{gap: 4}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>THE OFFER</Text>
              <Text style={{fontFamily: fonts.script, fontSize: 18, lineHeight: 24, color: deco.cream}}>{E[2]}</Text>
            </View>
            <View style={{gap: 6}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>WHY IT FITS YOU</Text>
              {E[3].map((w) => <Text key={w} style={s.body}><Text style={{color: acc}}>◆ </Text>{w}</Text>)}
            </View>
            <Animated.View entering={FadeIn} style={{padding: 10, backgroundColor: 'rgba(232,200,122,0.08)', borderLeftWidth: 2, borderColor: deco.brassHighlight}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.6, color: deco.brassHighlight}}>DISCLOSED · {E[4].toUpperCase()}</Text>
            </Animated.View>
          </View>
        </GoldFrame>
      </Animated.View>
      <View style={{flexDirection: 'row', gap: 10}}>
        <View style={{flex: 2}}><ActionBar color={state === 'yes' ? deco.brass : acc} label={state === 'yes' ? 'NOTED · PREVIEW, NOTHING BOOKED' : state === 'no' ? 'DECLINED · RECONSIDER' : 'ACCEPT THE OFFER'} onPress={() => setSt((x) => ({...x, [ei]: state === 'yes' ? undefined : 'yes'}))} /></View>
        <Pressable onPress={() => setSt((x) => ({...x, [ei]: 'no'}))} accessibilityRole="button" style={{flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: deco.brass}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: deco.brassHighlight}}>DECLINE</Text>
        </Pressable>
      </View>
      <SampleNote>SAMPLE PARTNERS · EVERY OFFER SHOWS WHAT FINESSE EARNS · NO DATA IS SHARED WITH A PARTNER UNTIL YOU ACCEPT</SampleNote>
    </View>
  );
}
