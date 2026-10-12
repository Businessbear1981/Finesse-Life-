// Scrapbook — seasons, a filmstrip of frames, "make a film" and the season's chapters (from the design).
// Frames are empty mounts until the member's photos arrive. The film panel is a preview of the
// flow: no film is generated from here yet (Higgsfield runs server-side once entries exist).
import {useEffect, useRef, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import Animated, {FadeIn, LinearTransition} from 'react-native-reanimated';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {Icon} from '@/lib/icons';
import {AHCard, AHChip, AHEyebrow, AHSmoke, AHTitle} from '@/components/ah';
import {ActionBar, Chips, SampleNote, s} from './shared';
import {Meta, NumRow} from './live';

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
  const stage = (pct ?? 0) < 30 ? 'Reading frames' : (pct ?? 0) < 70 ? 'Adding motion' : 'Scoring';

  return (
    <View style={{gap: 16}}>
      <Chips options={Object.keys(SEASONS) as Season[]} value={season} onChange={(v) => { setSeason(v); reset(); }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingVertical: 4}}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Animated.View key={`${season}${i}`} entering={FadeIn.delay(i * 60).duration(400)} style={{gap: 8}}>
            <View style={{width: 112, height: 148, borderRadius: 18, borderWidth: 1, borderColor: ah.line, backgroundColor: ah.ink2, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden'}}>
              <View style={{position: 'absolute', top: 8, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between'}}>
                {[0, 1, 2, 3, 4].map((h) => <View key={h} style={{width: 8, height: 4, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.08)'}} />)}
              </View>
              <Icon name="clapperboard" size={22} color={ah.faint} strokeWidth={1.2} />
              <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 15, color: ah.faint}}>Frame {i}</Text>
            </View>
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10, letterSpacing: 1.2, color: ah.mute, textAlign: 'center'}}>{season.slice(0, 3).toUpperCase()} · {String(i).padStart(2, '0')}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      <AHCard style={{gap: 14}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <AHTitle size={30}>Make a film</AHTitle>
          <AHChip label="Higgsfield" tone="outline" />
        </View>
        <Text style={s.small}>Turns this season’s frames into a short film with motion and a score.</Text>
        <Meta style={{marginTop: 4}}>Style</Meta>
        <Chips options={STYLES} value={style} onChange={(v) => { setStyle(v); reset(); }} />
        <Meta>Length</Meta>
        <Chips options={LENS} value={len} onChange={(v) => { setLen(v); reset(); }} />
        {running ? (
          <View style={{gap: 8}} accessibilityLiveRegion="polite">
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color: ah.text}}>{stage}</Text>
              <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color: ah.rose}}>{pct}%</Text>
            </View>
            <View style={{height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden'}}><Animated.View layout={LinearTransition} style={{height: 4, borderRadius: 2, width: `${pct}%`, backgroundColor: ah.rose}} /></View>
          </View>
        ) : null}
        {done ? (
          <Animated.View entering={FadeIn.duration(500)}>
            <AHSmoke aspect={16 / 10} top={<AHChip label="Preview" tone="glass" />}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
                <View style={{width: 52, height: 52, borderRadius: 26, backgroundColor: ah.white, alignItems: 'center', justifyContent: 'center'}}>
                  <Text style={{fontSize: 18, color: '#000', marginLeft: 3}}>▶</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 26, lineHeight: 28, color: ah.text}}>{season}</Text>
                  <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(237,235,231,0.7)'}}>{style} · {len} · preview</Text>
                </View>
              </View>
            </AHSmoke>
          </Animated.View>
        ) : null}
        <ActionBar color={running ? ah.platinum : acc} onPress={done ? reset : go} disabled={running}
          label={done ? 'Preview complete · start over' : running ? 'Generating…' : `Preview · ${len}`} />
      </AHCard>

      <AHEyebrow style={{marginTop: 8}}>Chapters · {season}</AHEyebrow>
      <View>
        {SEASONS[season].map(([n, t, d, k], i) => (
          <NumRow key={t} n={n} title={t} sub={d} last={i === SEASONS[season].length - 1}
            right={<Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10.5, letterSpacing: 1.2, color: ah.mute}}>{k} ITEMS</Text>} />
        ))}
      </View>
      <SampleNote>Sample seasons · frames fill from your photos · the film panel is a preview, no film is made yet</SampleNote>
    </View>
  );
}
