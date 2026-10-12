// Scrapbook — seasons, a filmstrip of frames, "make a film" and the season's chapters (from the design).
// Signed in it is the member's own archive, the same as the web (src/app/(hotel)/archive/page.tsx):
// scrapbook_entries grouped by season, "log a moment" (POST /api/scrapbook/log) with Nova writing the line
// (persona 'archive'), and a film per moment (Higgsfield via /api/scrapbook/generate-video). A film is never
// faked: the status shown is the server's, and where the app can't start one it says so.
import {useState} from 'react';
import {Image, Linking, Pressable, ScrollView, Text, View} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {ENTRY_LABEL, filmStatus, logMoment, makeFilm, readScrapbook, writeWithNova, type Entry, type EntryType} from '@/lib/rooms/scrapbook';
import {groupBySeason} from '@/lib/rooms/logic';
import {AHCard, AHChip, AHEyebrow, AHInput, AHTitle} from '@/components/ah';
import {ActionBar, Chips, SampleNote, s} from './shared';
import {LiveGate, Meta, NumRow, RowBtn, Status} from './live';
import {Fine} from './RoomKit';

export function Scrapbook({side}: {side: Side}) {
  const {live, reload} = useLive<{entries: Entry[]}>(null, readScrapbook);
  return (
    <LiveGate live={live} reload={() => void reload()} what="your Scrapbook" signedOut={<ScrapbookSample />}>
      {(data) => <ScrapbookLive side={side} entries={data.entries} reload={() => reload(true)} />}
    </LiveGate>
  );
}

function ScrapbookLive({side, entries, reload}: {side: Side; entries: Entry[]; reload: () => Promise<void>}) {
  const seasons = groupBySeason(entries);
  const [season, setSeason] = useState<string | null>(null);
  const cur = seasons.find(([k]) => k === season) ?? seasons[0];
  const [pick, setPick] = useState<string | null>(null);
  const picked = cur?.[1].find((e) => e.id === pick) ?? cur?.[1][0];
  return (
    <View style={{gap: 16}}>
      {seasons.length === 0 ? (
        <AHCard pad={22}>
          <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 24, lineHeight: 28, color: ah.text}}>No moments yet — log your first.</Text>
          <Fine style={{marginTop: 8}}>Each moment files itself under its season. Nova can write the line for you.</Fine>
        </AHCard>
      ) : (
        <>
          <Chips options={seasons.map(([k]) => k)} value={cur![0]} onChange={(v) => { setSeason(v); setPick(null); }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingVertical: 4}}>
            {cur![1].map((e, i) => {
              const on = picked?.id === e.id;
              const photo = e.photo_urls?.[0];
              return (
                <Pressable key={e.id} onPress={() => setPick(e.id)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={e.title} style={{gap: 8}}>
                  <View style={{width: 112, height: 148, borderRadius: 18, borderWidth: 1, borderColor: on ? ah.rose : ah.line, backgroundColor: ah.ink2, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', padding: photo ? 0 : 10}}>
                    {photo ? <Image source={{uri: photo}} style={{width: '100%', height: '100%'}} resizeMode="cover" accessibilityLabel={e.title} /> : (
                      <>
                        <Icon name={e.video_status === 'ready' ? 'clapperboard' : 'image'} size={22} color={on ? ah.rose : ah.faint} strokeWidth={1.2} />
                        <Text numberOfLines={3} style={{fontFamily: ahFonts.serifItalic, fontSize: 14, lineHeight: 17, color: on ? ah.text : ah.mute, textAlign: 'center'}}>{e.title}</Text>
                      </>
                    )}
                  </View>
                  <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10, letterSpacing: 1.2, color: ah.mute, textAlign: 'center'}}>{cur![0].slice(0, 3).toUpperCase()} · {String(i + 1).padStart(2, '0')}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {picked ? <Film key={picked.id} side={side} entry={picked} onChange={reload} /> : null}
          <AHEyebrow style={{marginTop: 8}}>Chapters · {cur![0]}</AHEyebrow>
          <View>
            {cur![1].map((e, i) => (
              <NumRow key={e.id} n={i + 1} title={e.title} sub={e.description ?? undefined} meta={ENTRY_LABEL[e.entry_type as EntryType] ?? e.entry_type} last={i === cur![1].length - 1}
                right={e.video_status === 'ready' ? <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10.5, letterSpacing: 1.2, color: ah.rose}}>FILM</Text> : undefined} />
            ))}
          </View>
        </>
      )}
      <LogMoment side={side} onSaved={reload} />
    </View>
  );
}

function Film({side, entry, onChange}: {side: Side; entry: Entry; onChange: () => Promise<void>}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const status = entry.video_status ?? 'none';
  const start = async () => {
    setBusy(true); setMsg(null);
    const r = await makeFilm(entry.id);
    setBusy(false);
    setMsg({ok: r.state === 'started', text: r.text});
    if (r.state === 'started') void onChange();
  };
  const check = async () => {
    setBusy(true); setMsg(null);
    const r = await filmStatus(entry.id);
    setBusy(false);
    if (r.status === 401) { setMsg({ok: false, text: 'Film status is checked on the web for now. Open the Scrapbook at finesselife.vip.'}); return; }
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing changed.')}); return; }
    setMsg({ok: r.body.status === 'ready', text: r.body.status === 'ready' ? 'Your film is ready.' : r.body.status === 'failed' ? 'The studio couldn’t finish this film.' : 'Still developing.'});
    void onChange();
  };
  return (
    <AHCard style={{gap: 12}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10}}>
        <AHTitle size={26} style={{flexShrink: 1}}>{entry.title}</AHTitle>
        <AHChip label="Higgsfield" tone="outline" />
      </View>
      {entry.description ? <Text style={s.small}>{entry.description}</Text> : null}
      {status === 'ready' && entry.video_url ? (
        <ActionBar label="Watch the film" color={track[side].acc} onPress={() => void Linking.openURL(entry.video_url!).catch(() => {})} />
      ) : status === 'pending' ? (
        <View style={{gap: 8}}>
          <Meta color={ah.warn}>Developing · the studio is working on it</Meta>
          <RowBtn label={busy ? 'Checking…' : 'Check on it'} onPress={() => void check()} disabled={busy} />
        </View>
      ) : (
        <View style={{gap: 8}}>
          {status === 'failed' ? <Meta color={ah.danger}>The last film didn’t finish</Meta> : null}
          <Text style={s.small}>Turns this moment into a short cinematic film.</Text>
          <ActionBar label={busy ? 'Starting…' : status === 'failed' ? 'Try the film again' : 'Make a film'} color={track[side].acc} onPress={() => void start()} disabled={busy} />
        </View>
      )}
      <Status msg={msg} />
    </AHCard>
  );
}

const TYPES = Object.keys(ENTRY_LABEL) as EntryType[];

function LogMoment({side, onSaved}: {side: Side; onSaved: () => Promise<void>}) {
  const [type, setType] = useState<EntryType>('nova_moment');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState<'nova' | 'save' | null>(null);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const nova = async () => {
    setBusy('nova'); setMsg(null);
    const r = await writeWithNova(title, type);
    setBusy(null);
    if (r.ok) setDesc(r.text); else setMsg({ok: false, text: r.text});
  };
  const save = async () => {
    setBusy('save'); setMsg(null);
    const r = await logMoment({entry_type: type, title, description: desc});
    setBusy(null);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was saved.')}); return; }
    setTitle(''); setDesc(''); setType('nova_moment');
    setMsg({ok: true, text: `Saved to ${r.body.season ?? 'your seasons'}.`});
    void onSaved();
  };
  const labels = TYPES.map((k) => ENTRY_LABEL[k]);
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>Log a moment</AHEyebrow>
      <Chips options={labels} value={ENTRY_LABEL[type]} onChange={(l) => setType(TYPES[labels.indexOf(l)] ?? 'nova_moment')} />
      <AHInput value={title} onChangeText={(v) => setTitle(v.slice(0, 200))} placeholder="What happened? (e.g. Dinner at Lucian)" accessibilityLabel="Moment" />
      <AHInput value={desc} onChangeText={(v) => setDesc(v.slice(0, 4000))} placeholder="A line about it (optional)" multiline style={{minHeight: 70, paddingTop: 12}} accessibilityLabel="Description" />
      <RowBtn label={busy === 'nova' ? 'Nova is writing…' : 'Write it with Nova'} onPress={() => void nova()} disabled={busy !== null || !title.trim()} tone={ah.rose} />
      <ActionBar label={busy === 'save' ? 'Saving…' : 'Log this moment'} color={track[side].acc} onPress={() => void save()} disabled={busy !== null || !title.trim()} />
      <Status msg={msg} />
    </AHCard>
  );
}

/* ─────────────── signed-out sample ─────────────── */

type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';
const SEASONS: Record<Season, Array<[string, string, string, string]>> = {
  Spring: [['I', 'Paris, in the rain', 'Mar 4–9', '42'], ['II', 'Opening night', 'Apr 18', '17'], ['III', 'The garden party', 'May 25', '23']],
  Summer: [['I', 'Amalfi', 'Jun 12–20', '88'], ['II', 'Rooftop birthday', 'Jul 7', '31'], ['III', 'Last swim', 'Aug 30', '12']],
  Autumn: [['I', 'Gallery week', 'Sep 9–14', '26'], ['II', 'Velvet season', 'Oct 2', '9'], ['III', 'Dinner at Lucian', 'Oct 18', '14']],
  Winter: [['I', 'The ball', 'Dec 12', '54'], ['II', 'Aspen', 'Jan 3–8', '61'], ['III', 'Valentine’s', 'Feb 14', '8']],
};

function ScrapbookSample() {
  const [season, setSeason] = useState<Season>('Autumn');
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 16, marginTop: 14}}>
      <Chips options={Object.keys(SEASONS) as Season[]} value={season} onChange={setSeason} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingVertical: 4}}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={`${season}${i}`} style={{width: 112, height: 148, borderRadius: 18, borderWidth: 1, borderColor: ah.line, backgroundColor: ah.ink2, alignItems: 'center', justifyContent: 'center', gap: 8}}>
            <Icon name="clapperboard" size={22} color={ah.faint} strokeWidth={1.2} />
            <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 15, color: ah.faint}}>Frame {i}</Text>
          </View>
        ))}
      </ScrollView>
      <AHEyebrow>Chapters · {season}</AHEyebrow>
      <View>
        {SEASONS[season].map(([n, title, d, k], i) => (
          <NumRow key={title} n={n} title={title} sub={d} last={i === SEASONS[season].length - 1}
            right={<Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10.5, letterSpacing: 1.2, color: ah.mute}}>{k} ITEMS</Text>} />
        ))}
      </View>
      <SampleNote>Sample seasons · signed out · your own moments and films appear once you sign in</SampleNote>
    </Animated.View>
  );
}
