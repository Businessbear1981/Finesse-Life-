// Starmaker — the music room (After Hours skin). Write with Nova, record vocals or a podcast in the Booth
// (studio-clean mic), load beats, hooks and samples into the Crate, then take the
// session to the studio tools: Pro Tools, Suno, ElevenLabs, Meshy, CapCut, and release through Spotify for
// Artists and Apple Music for Artists. Tools open their official apps/sites; Finesse doesn't connect to
// their accounts until each partnership/API is in place, and says so.
import {useEffect, useState} from 'react';
import {ActivityIndicator, Linking, Platform, Pressable, Text, TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import {type RecordingInput, type RecordingOptions, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState} from 'expo-audio';
import {CONSENT_DECLINED_TEXT, aiApi} from '@/lib/consents';
import {track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {AHCard, AHChip, AHEyebrow, AHSmoke, AHTitle} from '@/components/ah';
import {radius} from '@/lib/ah';
import {ActionBar, Chips, SampleNote, Segmented} from './shared';
import {Fine, Head, Num, Pick, Row, TextBtn, Tile, ah, ahFonts, t} from './RoomKit';
import {useAIConsent} from './AIConsent';
import {NovaReport} from './NovaReport';

type Stage = 'write' | 'booth' | 'crate' | 'studio' | 'release';
type Take = {id: string; uri: string; ms: number; at: string; kind: 'VOCAL' | 'PODCAST'; title: string; marks: number[]; clean: boolean};
type Crate = 'BEATS' | 'HOOKS' | 'SAMPLES';
type Sound = {id: string; uri: string; name: string; crate: Crate; size?: number};
// Studio clean: the OS voice-processing path (noise suppression, echo cancel, auto gain) where the platform offers it.
const CLEAN: RecordingOptions = {...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true,
  android: {...RecordingPresets.HIGH_QUALITY.android, audioSource: 'voice_communication'}};
const RAW: RecordingOptions = {...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true,
  android: {...RecordingPresets.HIGH_QUALITY.android, audioSource: 'unprocessed'}};
type Tool = {name: string; role: string; url: string; icon: string};
const STUDIO: Array<[string, Tool[]]> = [
  ['PRODUCE', [
    {name: 'Pro Tools', role: 'Record, edit and mix · the industry DAW', url: 'https://www.avid.com/pro-tools', icon: 'music'},
    {name: 'Suno', role: 'Sketch a full song from a prompt', url: 'https://suno.com', icon: 'sparkles'},
  ]],
  ['VOICE', [
    {name: 'ElevenLabs', role: 'Voice design, dubbing and narration', url: 'https://elevenlabs.io', icon: 'mic'},
  ]],
  ['VISUALS', [
    {name: 'Meshy', role: '3D artwork and stage objects from text or images', url: 'https://www.meshy.ai', icon: 'image'},
    {name: 'CapCut', role: 'Cut the video, lyric clips and teasers', url: 'https://www.capcut.com', icon: 'clapperboard'},
  ]],
];
const RELEASE: Tool[] = [
  {name: 'Spotify for Artists', role: 'Pitch, profile and stats once you are distributed', url: 'https://artists.spotify.com', icon: 'trendingup'},
  {name: 'Apple Music for Artists', role: 'Apple Music & iTunes profile and insights', url: 'https://artists.apple.com', icon: 'trendingup'},
];
const GENRES = ['R&B', 'Hip-hop', 'Pop', 'Jazz', 'Afrobeats', 'House'];
const MOODS = ['Late night', 'Confident', 'Heartbreak', 'Celebration'];
const SYSTEM = 'You are Nova, the in-house songwriter at Starmaker in the Finesse hotel. Write original lyrics only — never reproduce or imitate existing songs or named artists. Return a title, a 4-line hook, and one 8-line verse. Keep it tasteful.';
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
const REC_RED = '#FF4D5E';

/** The room's hero: smoky stage light, the ON AIR state and a live level meter while recording. */
function StudioHero({live, level}: {live: boolean; level: number}) {
  return (
    <AHSmoke aspect={1.05} top={
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
        {live ? <AHChip label="On air" live tone="rose" /> : <AHChip label="The booth" />}
        <AHChip label="Starmaker" tone="outline" />
      </View>
    }>
      <AHEyebrow color={ah.blush}>The music room</AHEyebrow>
      <AHTitle size={34} style={{marginTop: 8}}>Write it. Record it. Drop it.</AHTitle>
      <View style={{flexDirection: 'row', gap: 3, height: 22, alignItems: 'flex-end', marginTop: 16}} aria-hidden>
        {Array.from({length: 28}, (_, i) => {
          const h = live ? Math.max(3, level * 22 - Math.abs(14 - i) * 1.2) : 3 + ((i * 7) % 5);
          return <View key={i} style={{flex: 1, height: h, borderRadius: 2, backgroundColor: live && i > 22 ? REC_RED : ah.white, opacity: live ? 0.95 : 0.25}} />;
        })}
      </View>
    </AHSmoke>
  );
}

function ToolRow({t: tool, last}: {t: Tool; last?: boolean}) {
  return (
    <Pressable onPress={() => Linking.openURL(tool.url).catch(() => {})} accessibilityRole="link" accessibilityLabel={`Open ${tool.name}`}
      style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderColor: ah.line, opacity: pressed ? 0.7 : 1})}>
      <Tile icon={tool.icon} size={46} round />
      <View style={{flex: 1, gap: 2}}>
        <Text style={t.title}>{tool.name}</Text>
        <Text style={t.small}>{tool.role}</Text>
      </View>
      <View style={{alignItems: 'flex-end', gap: 3}}>
        <Text style={[t.name, {fontSize: 13}]}>Open ↗</Text>
        <Text style={[t.meta, {fontSize: 11, color: ah.faint}]}>Not linked</Text>
      </View>
    </Pressable>
  );
}

function PlayBtn({on, onPress, solid}: {on: boolean; onPress: () => void; solid?: boolean}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={on ? 'Pause' : 'Play'}
      style={({pressed}) => ({width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: solid || on ? ah.white : ah.line2, backgroundColor: solid || on ? ah.white : 'transparent', opacity: pressed ? 0.8 : 1})}>
      <Text style={{fontSize: 14, color: solid || on ? '#000' : ah.text, marginLeft: on ? 0 : 2}}>{on ? '❚❚' : '▶'}</Text>
    </Pressable>
  );
}

export function Starmaker({side}: {side: Side}) {
  const acc = track[side].acc;
  const [stage, setStage] = useState<Stage>('booth');
  // Booth: two recorders so "studio clean" and "raw" each keep their own capture path.
  const [clean, setClean] = useState(true);
  const [kind, setKind] = useState<'VOCAL' | 'PODCAST'>('VOCAL');
  const recClean = useAudioRecorder(CLEAN);
  const recRaw = useAudioRecorder(RAW);
  const recorder = clean ? recClean : recRaw;
  const rs = useAudioRecorderState(recorder, 120);
  const player = useAudioPlayer(null);
  const ps = useAudioPlayerStatus(player);
  const [takes, setTakes] = useState<Take[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [boothMsg, setBoothMsg] = useState<string | null>(null);
  const [inputs, setInputs] = useState<RecordingInput[]>([]);
  const [input, setInput] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [marks, setMarks] = useState<number[]>([]);
  const level = rs.isRecording && typeof rs.metering === 'number' ? Math.max(0, Math.min(1, (rs.metering + 60) / 60)) : 0;
  // Crate
  const [crate, setCrate] = useState<Crate>('BEATS');
  const [sounds, setSounds] = useState<Sound[]>([]);
  // Write
  const [genre, setGenre] = useState('R&B');
  const [mood, setMood] = useState('Late night');
  const [idea, setIdea] = useState('');
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [lyricsId, setLyricsId] = useState<string | null>(null); // set only when the text is Nova's (reportable)
  const consent = useAIConsent();

  useEffect(() => { if (ps.didJustFinish) setPlaying(null); }, [ps.didJustFinish]);

  const findMics = async () => {
    try {
      const list = recorder.getAvailableInputs();
      setInputs(list);
      if (list.length <= 1) setBoothMsg('Only the built-in mic is connected. Plug in a USB‑C or Lightning condenser mic for studio sound.');
    } catch { setBoothMsg('Mic selection is available in the phone app.'); }
  };
  const record = async () => {
    setBoothMsg(null);
    if (rs.isRecording) {
      const ms = rs.durationMillis;
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) setTakes((l) => [{id: String(Date.now()), uri, ms, at: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), kind, title: title.trim() || (kind === 'PODCAST' ? 'Untitled episode' : `Take ${l.length + 1}`), marks, clean}, ...l]);
      setMarks([]);
      return;
    }
    const p = await requestRecordingPermissionsAsync();
    if (!p.granted) { setBoothMsg('Microphone access is off. Allow it in Settings to record.'); return; }
    try {
      await setAudioModeAsync({allowsRecording: true, playsInSilentMode: true});
      await recorder.prepareToRecordAsync();
      if (input) { try { recorder.setInput(input); } catch { /* keep default mic */ } }
      recorder.record();
    } catch {
      setBoothMsg(Platform.OS === 'web' ? 'This browser blocked the microphone. Try the phone app.' : 'The booth could not start recording.');
    }
  };
  const playUri = (id: string, uri: string) => {
    if (playing === id) { player.pause(); setPlaying(null); return; }
    player.replace({uri}); player.seekTo(0); player.play(); setPlaying(id);
  };
  const loadSounds = async () => {
    const r = await DocumentPicker.getDocumentAsync({type: 'audio/*', multiple: true, copyToCacheDirectory: true});
    if (r.canceled) return;
    setSounds((l) => [...r.assets.map((a) => ({id: `${Date.now()}-${a.name}`, uri: a.uri, name: a.name.replace(/\.[a-z0-9]+$/i, ''), crate, size: a.size})), ...l]);
  };
  const write = async () => {
    if (writing) return;
    setWriting(true);
    const prompt = `Genre: ${genre}. Mood: ${mood}. ${idea.trim() ? `Idea: ${idea.trim().slice(0, 300)}` : ''}`;
    const r = await aiApi<{text?: string; error?: string}>('/api/nova', {method: 'POST', json: {prompt, persona: 'lyricist', system: SYSTEM}});
    const ok = !!(r.ok && r.body.text);
    setLyricsId(ok ? `lyrics:${Date.now()}` : null);
    setLyrics(ok ? r.body.text! : r.status === 0 ? 'The house line is offline. Nova will write when we are connected.' : r.status === 401 ? 'Sign in and Nova will write with you.'
      : r.status === 403 && r.body.error === 'consent_required' ? CONSENT_DECLINED_TEXT : 'Nova is in another session. Try again in a moment.');
    setWriting(false);
  };
  const inCrate = sounds.filter((x) => x.crate === crate);
  const crateName = crate.charAt(0) + crate.slice(1).toLowerCase();

  return (
    <View style={{gap: 16}}>
      <StudioHero live={rs.isRecording} level={level} />
      <Segmented options={[['write', 'Write'], ['booth', 'Booth'], ['crate', 'Crate'], ['studio', 'Tools'], ['release', 'Drop']]} value={stage} onChange={setStage} />

      {stage === 'booth' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 16}}>
          <Segmented options={[['VOCAL', 'Vocals'], ['PODCAST', 'Podcast']]} value={kind} onChange={(k) => { if (!rs.isRecording) setKind(k); }} />
          <AHCard pad={18}>
            <AHEyebrow>The mic</AHEyebrow>
            <View style={{gap: 8, marginTop: 12}}>
              {([[true, 'Condenser · studio clean'], [false, 'Raw · no processing']] as Array<[boolean, string]>).map(([v, l]) => (
                <Pick key={l} label={l} on={clean === v} disabled={rs.isRecording} onPress={() => setClean(v)} />
              ))}
            </View>
            <Fine style={{marginTop: 12}}>{clean ? 'Noise suppression, echo cancel and level control from the phone’s voice processor. Best for podcasts and rooms with noise.' : 'Untouched signal for treated rooms or an external condenser.'}</Fine>
            <View style={{alignItems: 'flex-start', marginTop: 4}}>
              <TextBtn label="Find a plugged-in mic →" tone={ah.rose} onPress={() => { if (!rs.isRecording) void findMics(); }} />
            </View>
            {inputs.length > 1 ? <Chips options={inputs.map((i) => i.name)} value={inputs.find((i) => i.uid === input)?.name ?? inputs[0].name} onChange={(n) => setInput(inputs.find((i) => i.name === n)?.uid ?? null)} /> : null}
          </AHCard>
          {kind === 'PODCAST' ? (
            <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 80))} placeholder="Episode title" placeholderTextColor={ah.faint} selectionColor={ah.rose} accessibilityLabel="Episode title"
              style={{minHeight: 52, paddingHorizontal: 18, borderRadius: radius.input, borderWidth: 1, borderColor: ah.line2, backgroundColor: 'rgba(0,0,0,0.35)', fontFamily: ahFonts.serifItalic, fontSize: 22, color: ah.text}} />
          ) : null}
          <View style={{alignItems: 'center', gap: 14, paddingVertical: 8}}>
            <Text style={{fontFamily: ahFonts.serif, fontSize: 56, lineHeight: 60, color: rs.isRecording ? REC_RED : ah.text, fontVariant: ['tabular-nums']}} accessibilityLabel={`Recording time ${mmss(rs.isRecording ? rs.durationMillis : 0)}`}>{mmss(rs.isRecording ? rs.durationMillis : 0)}</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 22}}>
              {kind === 'PODCAST' ? (
                <Pressable disabled={!rs.isRecording} onPress={() => setMarks((m) => [...m, rs.durationMillis])} accessibilityRole="button" accessibilityLabel="Mark a chapter"
                  style={{width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: ah.line2, alignItems: 'center', justifyContent: 'center', opacity: rs.isRecording ? 1 : 0.35}}>
                  <Text style={[t.name, {fontSize: 13}]}>Mark</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={record} accessibilityRole="button" accessibilityLabel={rs.isRecording ? 'Stop recording' : 'Start recording'}
                style={({pressed}) => ({width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: ah.white, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1})}>
                <View style={{width: rs.isRecording ? 32 : 66, height: rs.isRecording ? 32 : 66, borderRadius: rs.isRecording ? 8 : 33, backgroundColor: REC_RED}} />
              </Pressable>
              {kind === 'PODCAST' ? <View style={{width: 58, alignItems: 'center'}}><Text style={t.meta}>{marks.length} ch</Text></View> : null}
            </View>
            <Text style={t.eyebrow}>{rs.isRecording ? 'Tap to stop' : kind === 'PODCAST' ? 'Tap to go on air' : 'Tap to record a take'}</Text>
          </View>
          {boothMsg ? <Text style={[t.small, {color: ah.danger, textAlign: 'center'}]} accessibilityLiveRegion="polite">{boothMsg}</Text> : null}
          <Head right={String(takes.length)}>Takes & episodes</Head>
          {takes.length === 0 ? <Fine>Lay a verse, catch a hook, or start a podcast on the fly. Headphones on for a clean take.</Fine> : null}
          {takes.map((tk) => (
            <Animated.View key={tk.id} entering={FadeInDown.duration(300)}>
              <AHCard pad={14} style={playing === tk.id ? {borderColor: 'rgba(232,180,160,0.45)'} : undefined}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <PlayBtn on={playing === tk.id} solid onPress={() => playUri(tk.id, tk.uri)} />
                  <View style={{flex: 1}}>
                    <Text style={t.title} numberOfLines={1}>{tk.title}</Text>
                    <Text style={t.meta}>{tk.kind === 'VOCAL' ? 'Vocal' : 'Podcast'} · {mmss(tk.ms)} · {tk.clean ? 'clean' : 'raw'} · {tk.at}</Text>
                  </View>
                  <TextBtn label="Delete" tone={ah.mute} onPress={() => { if (playing === tk.id) { player.pause(); setPlaying(null); } setTakes((l) => l.filter((x) => x.id !== tk.id)); }} />
                </View>
                {tk.marks.length ? (
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12}}>
                    {tk.marks.map((m, i) => (
                      <Pick key={m} label={`Ch ${i + 1} · ${mmss(m)}`} onPress={() => { if (playing !== tk.id) { player.replace({uri: tk.uri}); setPlaying(tk.id); } player.seekTo(m / 1000); player.play(); }} />
                    ))}
                  </View>
                ) : null}
              </AHCard>
            </Animated.View>
          ))}
          <SampleNote>Takes and episodes stay on this device · Studio clean uses the phone’s voice processing · An external condenser gives true studio sound</SampleNote>
        </Animated.View>
      ) : null}

      {stage === 'crate' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 14}}>
          <Segmented options={[['BEATS', 'Beats'], ['HOOKS', 'Hooks'], ['SAMPLES', 'Samples']]} value={crate} onChange={setCrate} />
          <Pressable onPress={loadSounds} accessibilityRole="button" accessibilityLabel={`Upload ${crateName.toLowerCase()}`}
            style={({pressed}) => ({minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: ah.line2, backgroundColor: ah.ink2, opacity: pressed ? 0.8 : 1})}>
            <Icon name="music" size={26} color={ah.rose} />
            <Text style={t.title}>Upload {crateName.toLowerCase()}</Text>
            <Text style={t.small}>WAV, MP3, AIFF or M4A from your files</Text>
          </Pressable>
          {inCrate.length === 0 ? <Fine style={{textAlign: 'center'}}>The crate is empty. Load your {crate.toLowerCase()} and audition them here.</Fine> : null}
          {inCrate.map((x, i) => (
            <Animated.View key={x.id} entering={FadeInDown.duration(300)}>
              <Row last={i === inCrate.length - 1}>
                <PlayBtn on={playing === x.id} onPress={() => playUri(x.id, x.uri)} />
                <View style={{flex: 1}}>
                  <Text style={t.title} numberOfLines={1}>{x.name}</Text>
                  <Text style={t.meta}>{crateName}{x.size ? ` · ${(x.size / 1048576).toFixed(1)} MB` : ''}</Text>
                </View>
                <TextBtn label="Remove" tone={ah.mute} onPress={() => { if (playing === x.id) { player.pause(); setPlaying(null); } setSounds((l) => l.filter((y) => y.id !== x.id)); }} />
              </Row>
            </Animated.View>
          ))}
          <SampleNote>Only upload sounds you own or have cleared · The crate lives on this device until cloud sync is live</SampleNote>
        </Animated.View>
      ) : null}

      {stage === 'write' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 14}}>
          <Head>Genre</Head>
          <Chips options={GENRES} value={genre} onChange={setGenre} />
          <Head>Mood</Head>
          <Chips options={MOODS} value={mood} onChange={setMood} />
          <TextInput value={idea} onChangeText={setIdea} placeholder="The idea, a line, a feeling…" placeholderTextColor={ah.faint} selectionColor={ah.rose} multiline accessibilityLabel="Song idea"
            style={{minHeight: 96, padding: 16, borderRadius: radius.input, borderWidth: 1, borderColor: ah.line2, backgroundColor: 'rgba(0,0,0,0.35)', fontFamily: ahFonts.sans, fontSize: 16, lineHeight: 22, color: ah.text, textAlignVertical: 'top'}} />
          <ActionBar label={writing ? 'Nova is writing…' : 'Write with Nova'} color={acc} onPress={() => { if (!writing) void consent.ensure('ai_processing', () => void write()); }} disabled={writing} />
          {writing ? <ActivityIndicator color={ah.rose} /> : null}
          {lyrics ? (
            <Animated.View entering={FadeInDown.duration(400)}>
              <AHCard pad={22} style={{backgroundColor: ah.ink3}}>
                <AHEyebrow color={ah.blush}>Nova · {genre} · {mood.toLowerCase()}</AHEyebrow>
                <Text selectable style={[t.voice, {fontSize: 21, lineHeight: 29, marginTop: 12}]}>{lyrics}</Text>
                {lyricsId ? <View style={{marginTop: 8}}><NovaReport key={lyricsId} targetId={lyricsId} text={lyrics} /></View> : null}
              </AHCard>
            </Animated.View>
          ) : null}
          <SampleNote>Nova writes original lyrics only · You own what you make here</SampleNote>
        </Animated.View>
      ) : null}

      {stage === 'studio' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 6}}>
          {STUDIO.map(([group, tools]) => (
            <View key={group}>
              <Head>{group}</Head>
              {tools.map((tool, i) => <ToolRow key={tool.name} t={tool} last={i === tools.length - 1} />)}
            </View>
          ))}
          <SampleNote>Opens each tool’s official app or site · Finesse is not affiliated and does not access your accounts until a connection is live</SampleNote>
        </Animated.View>
      ) : null}

      {stage === 'release' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 6}}>
          <Head>The roll-out</Head>
          {['Master the final mix', 'Distribute through your distributor of choice', 'Claim your artist profiles', 'Pitch the single 7+ days before release', 'Cut the teasers in CapCut'].map((x, i, a) => (
            <Row key={x} last={i === a.length - 1}>
              <Num n={i + 1} />
              <Text style={[t.title, {flex: 1, fontSize: 21}]}>{x}</Text>
            </Row>
          ))}
          <Head style={{marginTop: 18}}>Artist profiles</Head>
          {RELEASE.map((tool, i) => <ToolRow key={tool.name} t={tool} last={i === RELEASE.length - 1} />)}
          <SampleNote>Releases go through a distributor · Finesse does not upload to streaming services</SampleNote>
        </Animated.View>
      ) : null}
    </View>
  );
}
