// Scrapbook — seasons, a filmstrip of frames, "make a film" and the season's chapters (from the design).
// Frames are empty gold mounts until the member's photos arrive. The film panel is a preview of the
// flow: no film is generated from here yet (Higgsfield runs server-side once entries exist).
import {useEffect, useRef, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import Animated, {FadeIn, LinearTransition} from 'react-native-reanimated';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {ActionBar, Chips, GoldFrame, SampleNote, SectionHead, s} from './shared';

type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';
const SEASONS: Record<Season, Array<[string, string, string, string]>> = {
  Spring: [['I', 'Paris, in the rain', 'Mar 4–9', '42'], ['II', 'Opening night', 'Apr 18', '17'], ['III', 'The garden party', 'May 25', '23']],
  Summer: [['I', 'Amalfi', 'Jun 12–20', '88'], ['II', 'Rooftop birthday', 'Jul 7', '31'], ['III', 'Last swim', 'Aug 30', '12']],
  Autumn: [['I', 'Gallery week', 'Sep 9–14', '26'], ['II', 'Velvet season', 'Oct 2', '9'], ['III', 'Dinner at Lucian', 'Oct 18', '14']],
  Winter: [['I', 'The ball', 'Dec 12', '54'], ['II', 'Aspen', 'Jan 3–8', '61'], ['III', 'Valentine’s', 'Feb 14', '8']],
};
const STYLES = ['Cinematic', 'Super 8', 'Runway', 'Slow-mo'];
const LENS = ['15s', '30s', '60s'];

export function Scrapbook({side}: {side: Side}) {
  const acc = track[side].acc;
  const [season, setSeason] = useState<Season>('Autumn');
  const [style, setStyle] = useState('Cinematic');
  const [len, setLen] = useState('30s');
  const [pct, setPct] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const reset = () => { if (timer.current) clearInterval(timer.current); setPct(null); };
  const go = () => {
    if (pct !== null) return;
    setPct(0);
    timer.current = setInterval(() => setPct((p) => { const n = Math.min(100, (p ?? 0) + 8); if (n >= 100 && timer.current) clearInterval(timer.current); return n; }), 280);
  };
  const running = pct !== null && pct < 100, done = pct === 100;
  const stage = (pct ?? 0) < 30 ? 'READING FRAMES' : (pct ?? 0) < 70 ? 'ADDING MOTION' : 'SCORING';

  return (
    <View style={{gap: 12}}>
      <Chips options={Object.keys(SEASONS) as Season[]} value={season} onChange={(v) => { setSeason(v); reset(); }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingVertical: 4}}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Animated.View key={`${season}${i}`} entering={FadeIn.delay(i * 60).duration(400)} style={{gap: 5}}>
            <GoldFrame pad={3}>
              <View style={{width: 104, height: 132, backgroundColor: '#140E0B', alignItems: 'center', justifyContent: 'center', gap: 6}}>
                <Icon name="clapperboard" size={22} color="rgba(201,169,97,0.55)" strokeWidth={1.2} />
                <Text style={{fontFamily: fonts.label, fontSize: 9, color: 'rgba(244,232,208,0.45)'}}>Frame {i}</Text>
              </View>
            </GoldFrame>
            <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1, color: deco.brass, textAlign: 'center'}}>{season.slice(0, 3).toUpperCase()} · {String(i).padStart(2, '0')}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={{gap: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)', backgroundColor: 'rgba(20,14,10,0.7)'}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2, color: deco.brassHighlight}}>MAKE A FILM</Text>
          <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: deco.brass}}>HIGGSFIELD</Text>
        </View>
        <Text style={s.small}>Turns this season’s frames into a short film with motion and a score.</Text>
        <Chips options={STYLES} value={style} onChange={(v) => { setStyle(v); reset(); }} />
        <Chips options={LENS} value={len} onChange={(v) => { setLen(v); reset(); }} />
        {running ? (
          <View style={{gap: 5}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: deco.cream}}>{stage}</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brassHighlight}}>{pct}%</Text>
            </View>
            <View style={{height: 4, backgroundColor: 'rgba(201,169,97,0.15)'}}><Animated.View layout={LinearTransition} style={{height: 4, width: `${pct}%`, backgroundColor: deco.brassHighlight}} /></View>
          </View>
        ) : null}
        {done ? (
          <Animated.View entering={FadeIn.duration(500)}>
            <GoldFrame pad={3}>
              <View style={{height: 150, backgroundColor: '#0E0907', alignItems: 'center', justifyContent: 'center', gap: 8}}>
                <Text style={{fontSize: 30, color: deco.brassHighlight}}>▶</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: deco.cream}}>{style.toUpperCase()} · {len} · {season.toUpperCase()} · PREVIEW</Text>
              </View>
            </GoldFrame>
          </Animated.View>
        ) : null}
        <ActionBar color={running ? deco.brass : acc} onPress={done ? reset : go} disabled={running}
          label={done ? 'PREVIEW COMPLETE · START OVER' : running ? 'GENERATING…' : `PREVIEW · ${len}`} />
      </View>

      <SectionHead>CHAPTERS · {season.toUpperCase()}</SectionHead>
      {SEASONS[season].map(([n, t, d, k]) => (
        <View key={t} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.2)'}}>
          <Text style={{width: 30, fontFamily: fonts.displayHeavy, fontSize: 20, color: deco.brassHighlight}}>{n}</Text>
          <View style={{flex: 1}}>
            <Text style={{fontFamily: fonts.displayBold, fontSize: 15, color: deco.cream}}>{t}</Text>
            <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{d}</Text>
          </View>
          <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: 'rgba(244,232,208,0.6)'}}>{k} ITEMS</Text>
        </View>
      ))}
      <SampleNote>SAMPLE SEASONS · FRAMES FILL FROM YOUR PHOTOS · THE FILM PANEL IS A PREVIEW, NO FILM IS MADE YET</SampleNote>
    </View>
  );
}
