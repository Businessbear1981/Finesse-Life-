// Starmaker — the music room. Write with Nova, record vocals or a podcast in the Booth (studio-clean mic),
// load beats, hooks and samples into the Crate, then take the
// session to the studio tools: Pro Tools, Suno, ElevenLabs, Meshy, CapCut, and release through Spotify for
// Artists and Apple Music for Artists. Tools open their official apps/sites; Finesse doesn't connect to
// their accounts until each partnership/API is in place, and says so.
import {useEffect, useState} from 'react';
import {ActivityIndicator, Linking, Platform, Pressable, Text, TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing} from 'react-native-reanimated';
import Svg, {Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker';
import {type RecordingInput, type RecordingOptions, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState} from 'expo-audio';
import {api} from '@/lib/api';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {useAvailableWidth} from '@/lib/layout';
import {Icon} from '@/lib/icons';
import {ActionBar, Chips, GoldFrame, SampleNote, SectionHead, Segmented, s} from './shared';

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

/** The live room: a ribbon microphone under a sunburst, with a red ON AIR lamp while recording. */
function StudioScene({live, level}: {live: boolean; level: number}) {
  const W = Math.min(useAvailableWidth(), 420), H = W * 0.5;
  const glow = useSharedValue(0.3);
  useEffect(() => { glow.value = live ? withRepeat(withTiming(1, {duration: 700, easing: Easing.inOut(Easing.quad)}), -1, true) : withTiming(0.25, {duration: 400}); }, [live, glow]);
  const lamp = useAnimatedStyle(() => ({opacity: glow.value}));
  return (
    <View style={{width: W, height: H, alignSelf: 'center'}}>
      <Svg width={W} height={H} viewBox="0 0 400 200" style={{position: 'absolute'}}>
        <Defs>
          <RadialGradient id="sm-room" cx="200" cy="200" r="260" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#2A1220" /><Stop offset="1" stopColor={deco.ink} /></RadialGradient>
          <LinearGradient id="sm-brass" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={deco.brassWhite} /><Stop offset="0.5" stopColor={deco.brass} /><Stop offset="1" stopColor={deco.brassShadow} /></LinearGradient>
        </Defs>
        <Rect width={400} height={200} fill="url(#sm-room)" />
        {Array.from({length: 19}, (_, i) => { const a = Math.PI + (i / 18) * Math.PI; return <Path key={i} d={`M200 196 L${200 + Math.cos(a) * 240} ${196 + Math.sin(a) * 240}`} stroke={deco.brass} strokeOpacity={i % 2 ? 0.08 : 0.16} />; })}
        {/* acoustic panels */}
        {[24, 64, 312, 352].map((x) => <Rect key={x} x={x} y={40} width={26} height={110} fill="#1A0A12" stroke={deco.brass} strokeOpacity={0.3} />)}
        {/* ribbon mic */}
        <Rect x={170} y={34} width={60} height={92} rx={30} fill="url(#sm-brass)" />
        {Array.from({length: 9}, (_, i) => <Path key={i} d={`M176 ${48 + i * 9} H224`} stroke={deco.brassShadow} strokeOpacity={0.7} />)}
        <Rect x={180} y={124} width={40} height={10} fill={deco.brassShadow} />
        <Path d="M200 134 V184 M170 186 H230" stroke="url(#sm-brass)" strokeWidth={5} strokeLinecap="round" />
        {/* VU meter */}
        <Rect x={258} y={150} width={50} height={30} rx={3} fill="#120A06" stroke={deco.brass} />
        <Path d={`M283 176 L${283 + Math.cos(Math.PI * (1.15 + 0.7 * level)) * 20} ${176 + Math.sin(Math.PI * (1.15 + 0.7 * level)) * 20}`} stroke={deco.cream} strokeWidth={1.5} />
      </Svg>
      <Animated.View style={[{position: 'absolute', left: W * 0.08, top: H * 0.07, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FF3B4E', backgroundColor: live ? 'rgba(255,59,78,0.25)' : 'transparent'}, lamp]}>
        <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 2, color: '#FF6B7A'}}>ON AIR</Text>
      </Animated.View>
    </View>
  );
}

function ToolRow({t}: {t: Tool}) {
  return (
    <Pressable onPress={() => Linking.openURL(t.url).catch(() => {})} accessibilityRole="link" accessibilityLabel={`Open ${t.name}`}
      style={({pressed}) => [{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)', backgroundColor: pressed ? 'rgba(232,200,122,0.08)' : 'rgba(20,12,10,0.7)'}]}>
      <View style={{width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: deco.brass, alignItems: 'center', justifyContent: 'center'}}><Icon name={t.icon} size={18} /></View>
      <View style={{flex: 1, gap: 2}}>
        <Text style={{fontFamily: fonts.displayBold, fontSize: 16, color: deco.cream}}>{t.name}</Text>
        <Text style={s.small}>{t.role}</Text>
      </View>
      <View style={{alignItems: 'flex-end', gap: 3}}>
        <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.6, color: deco.brassHighlight}}>OPEN ↗</Text>
        <Text style={{fontFamily: fonts.mono, fontSize: 7.5, color: 'rgba(244,232,208,0.45)'}}>NOT LINKED</Text>
      </View>
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
    const r = await api<{text?: string}>('/api/nova', {method: 'POST', json: {prompt, persona: 'lyricist', system: SYSTEM}});
    setLyrics(r.ok && r.body.text ? r.body.text : r.status === 0 ? 'The house line is offline. Nova will write when we are connected.' : r.status === 401 ? 'Sign in and Nova will write with you.' : 'Nova is in another session. Try again in a moment.');
    setWriting(false);
  };
  const label = {fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight} as const;
  const inCrate = sounds.filter((x) => x.crate === crate);

  return (
    <View style={{gap: 12}}>
      <StudioScene live={rs.isRecording} level={level} />
      <Segmented options={[['write', 'WRITE'], ['booth', 'BOOTH'], ['crate', 'CRATE'], ['studio', 'TOOLS'], ['release', 'DROP']]} value={stage} onChange={setStage} />

      {stage === 'booth' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <Segmented options={[['VOCAL', 'VOCALS'], ['PODCAST', 'PODCAST']]} value={kind} onChange={(k) => { if (!rs.isRecording) setKind(k); }} />
          <View style={{gap: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(201,169,97,0.45)', backgroundColor: 'rgba(20,12,10,0.7)'}}>
            <Text style={label}>THE MIC</Text>
            <View style={{flexDirection: 'row', gap: 8}}>
              {([[true, 'CONDENSER · STUDIO CLEAN'], [false, 'RAW · NO PROCESSING']] as Array<[boolean, string]>).map(([v, l]) => (
                <Pressable key={l} disabled={rs.isRecording} onPress={() => setClean(v)} accessibilityRole="button" accessibilityState={{selected: clean === v}}
                  style={{flex: 1, minHeight: 44, padding: 8, justifyContent: 'center', borderWidth: 1, borderColor: clean === v ? deco.brassHighlight : 'rgba(201,169,97,0.4)', backgroundColor: clean === v ? deco.brassHighlight : 'transparent'}}>
                  <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.2, color: clean === v ? '#140E08' : deco.cream, textAlign: 'center'}}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.small}>{clean ? 'Noise suppression, echo cancel and level control from the phone’s voice processor. Best for podcasts and rooms with noise.' : 'Untouched signal for treated rooms or an external condenser.'}</Text>
            <Pressable onPress={findMics} disabled={rs.isRecording} accessibilityRole="button"><Text style={[label, {color: acc}]}>FIND A PLUGGED-IN MIC</Text></Pressable>
            {inputs.length > 1 ? <Chips options={inputs.map((i) => i.name)} value={inputs.find((i) => i.uid === input)?.name ?? inputs[0].name} onChange={(n) => setInput(inputs.find((i) => i.name === n)?.uid ?? null)} /> : null}
          </View>
          {kind === 'PODCAST' ? (
            <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 80))} placeholder="Episode title" placeholderTextColor="rgba(244,232,208,0.4)" accessibilityLabel="Episode title"
              style={{minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)', fontFamily: fonts.displayBold, fontSize: 15, color: deco.cream}} />
          ) : null}
          <View style={{alignItems: 'center', gap: 10, paddingVertical: 6}}>
            <Text style={{fontFamily: fonts.mono, fontSize: 28, color: rs.isRecording ? '#FF6B7A' : deco.cream}}>{mmss(rs.isRecording ? rs.durationMillis : 0)}</Text>
            <View style={{flexDirection: 'row', gap: 3, height: 26, alignItems: 'flex-end'}}>
              {Array.from({length: 24}, (_, i) => <View key={i} style={{width: 5, height: 4 + (rs.isRecording ? Math.max(0, level * 22 - Math.abs(12 - i) * 1.4) : 0), backgroundColor: i > 18 ? '#FF6B7A' : deco.brassHighlight, opacity: rs.isRecording ? 1 : 0.3}} />)}
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 22}}>
              {kind === 'PODCAST' ? (
                <Pressable disabled={!rs.isRecording} onPress={() => setMarks((m) => [...m, rs.durationMillis])} accessibilityRole="button" accessibilityLabel="Mark a chapter"
                  style={{width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: deco.brassHighlight, alignItems: 'center', justifyContent: 'center', opacity: rs.isRecording ? 1 : 0.35}}>
                  <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1, color: deco.brassHighlight}}>MARK</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={record} accessibilityRole="button" accessibilityLabel={rs.isRecording ? 'Stop recording' : 'Start recording'}
                style={({pressed}) => ({width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: deco.brassHighlight, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1})}>
                <View style={{width: rs.isRecording ? 30 : 58, height: rs.isRecording ? 30 : 58, borderRadius: rs.isRecording ? 4 : 29, backgroundColor: '#E0243A'}} />
              </Pressable>
              {kind === 'PODCAST' ? <View style={{width: 56, alignItems: 'center'}}><Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brass}}>{marks.length} CH</Text></View> : null}
            </View>
            <Text style={label}>{rs.isRecording ? 'TAP TO STOP' : kind === 'PODCAST' ? 'TAP TO GO ON AIR' : 'TAP TO RECORD A TAKE'}</Text>
          </View>
          {boothMsg ? <Text style={[s.small, {color: '#FF8FA9', textAlign: 'center'}]}>{boothMsg}</Text> : null}
          <SectionHead>TAKES & EPISODES · {takes.length}</SectionHead>
          {takes.length === 0 ? <Text style={s.small}>Lay a verse, catch a hook, or start a podcast on the fly. Headphones on for a clean take.</Text> : null}
          {takes.map((t) => (
            <Animated.View key={t.id} entering={FadeInDown.duration(300)} style={{gap: 6, padding: 10, borderWidth: 1, borderColor: playing === t.id ? acc : 'rgba(201,169,97,0.35)'}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <Pressable onPress={() => playUri(t.id, t.uri)} accessibilityRole="button" accessibilityLabel={playing === t.id ? 'Pause' : 'Play'} style={{width: 40, height: 40, borderRadius: 20, backgroundColor: acc, alignItems: 'center', justifyContent: 'center'}}>
                  <Text style={{fontSize: 14, color: '#140508'}}>{playing === t.id ? '❚❚' : '▶'}</Text>
                </Pressable>
                <View style={{flex: 1}}>
                  <Text style={{fontFamily: fonts.displayBold, fontSize: 15, color: deco.cream}} numberOfLines={1}>{t.title}</Text>
                  <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{t.kind} · {mmss(t.ms)} · {t.clean ? 'CLEAN' : 'RAW'} · {t.at}</Text>
                </View>
                <Pressable onPress={() => { if (playing === t.id) { player.pause(); setPlaying(null); } setTakes((l) => l.filter((x) => x.id !== t.id)); }} accessibilityRole="button" accessibilityLabel="Delete" hitSlop={8}>
                  <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.4, color: 'rgba(244,232,208,0.55)'}}>DELETE</Text>
                </Pressable>
              </View>
              {t.marks.length ? (
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                  {t.marks.map((m, i) => (
                    <Pressable key={m} onPress={() => { if (playing !== t.id) { player.replace({uri: t.uri}); setPlaying(t.id); } player.seekTo(m / 1000); player.play(); }} accessibilityRole="button"
                      style={{paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)'}}>
                      <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brassHighlight}}>CH {i + 1} · {mmss(m)}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Animated.View>
          ))}
          <SampleNote>TAKES AND EPISODES STAY ON THIS DEVICE · STUDIO CLEAN USES THE PHONE’S VOICE PROCESSING · AN EXTERNAL CONDENSER GIVES TRUE STUDIO SOUND</SampleNote>
        </Animated.View>
      ) : null}

      {stage === 'crate' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <Segmented options={[['BEATS', 'BEATS'], ['HOOKS', 'HOOKS'], ['SAMPLES', 'SAMPLES']]} value={crate} onChange={setCrate} />
          <Pressable onPress={loadSounds} accessibilityRole="button" style={({pressed}) => ({minHeight: 80, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: deco.brassHighlight, opacity: pressed ? 0.8 : 1})}>
            <Icon name="music" size={24} />
            <Text style={label}>UPLOAD {crate}</Text>
            <Text style={s.small}>WAV, MP3, AIFF or M4A from your files</Text>
          </Pressable>
          {inCrate.length === 0 ? <Text style={[s.small, {textAlign: 'center'}]}>The crate is empty. Load your {crate.toLowerCase()} and audition them here.</Text> : null}
          {inCrate.map((x) => (
            <Animated.View key={x.id} entering={FadeInDown.duration(300)} style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1, borderColor: playing === x.id ? acc : 'rgba(201,169,97,0.35)'}}>
              <Pressable onPress={() => playUri(x.id, x.uri)} accessibilityRole="button" accessibilityLabel={playing === x.id ? 'Pause' : 'Play'} style={{width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: acc, alignItems: 'center', justifyContent: 'center'}}>
                <Text style={{fontSize: 14, color: acc}}>{playing === x.id ? '❚❚' : '▶'}</Text>
              </Pressable>
              <View style={{flex: 1}}>
                <Text style={{fontFamily: fonts.displayBold, fontSize: 15, color: deco.cream}} numberOfLines={1}>{x.name}</Text>
                <Text style={{fontFamily: fonts.mono, fontSize: 9, color: deco.brass}}>{x.crate}{x.size ? ` · ${(x.size / 1048576).toFixed(1)} MB` : ''}</Text>
              </View>
              <Pressable onPress={() => { if (playing === x.id) { player.pause(); setPlaying(null); } setSounds((l) => l.filter((y) => y.id !== x.id)); }} accessibilityRole="button" accessibilityLabel="Remove" hitSlop={8}>
                <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.4, color: 'rgba(244,232,208,0.55)'}}>REMOVE</Text>
              </Pressable>
            </Animated.View>
          ))}
          <SampleNote>ONLY UPLOAD SOUNDS YOU OWN OR HAVE CLEARED · THE CRATE LIVES ON THIS DEVICE UNTIL CLOUD SYNC IS LIVE</SampleNote>
        </Animated.View>
      ) : null}

      {stage === 'write' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>GENRE</Text>
          <Chips options={GENRES} value={genre} onChange={setGenre} />
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>MOOD</Text>
          <Chips options={MOODS} value={mood} onChange={setMood} />
          <TextInput value={idea} onChangeText={setIdea} placeholder="The idea, a line, a feeling…" placeholderTextColor="rgba(244,232,208,0.4)" multiline accessibilityLabel="Song idea"
            style={{minHeight: 70, padding: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)', fontFamily: fonts.body, fontSize: 13, color: deco.cream, textAlignVertical: 'top'}} />
          <ActionBar label={writing ? 'NOVA IS WRITING…' : 'WRITE WITH NOVA'} color={acc} onPress={write} disabled={writing} />
          {writing ? <ActivityIndicator color={deco.brassHighlight} /> : null}
          {lyrics ? (
            <GoldFrame pad={3}>
              <View style={{backgroundColor: '#140E0B', padding: 14}}>
                <Text selectable style={{fontFamily: fonts.script, fontSize: 18, lineHeight: 26, color: deco.cream}}>{lyrics}</Text>
              </View>
            </GoldFrame>
          ) : null}
          <SampleNote>NOVA WRITES ORIGINAL LYRICS ONLY · YOU OWN WHAT YOU MAKE HERE</SampleNote>
        </Animated.View>
      ) : null}

      {stage === 'studio' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 10}}>
          {STUDIO.map(([group, tools]) => (
            <View key={group} style={{gap: 8}}>
              <SectionHead>{group}</SectionHead>
              {tools.map((t) => <ToolRow key={t.name} t={t} />)}
            </View>
          ))}
          <SampleNote>OPENS EACH TOOL’S OFFICIAL APP OR SITE · FINESSE IS NOT AFFILIATED AND DOES NOT ACCESS YOUR ACCOUNTS UNTIL A CONNECTION IS LIVE</SampleNote>
        </Animated.View>
      ) : null}

      {stage === 'release' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 10}}>
          <SectionHead>THE ROLL-OUT</SectionHead>
          {['Master the final mix', 'Distribute through your distributor of choice', 'Claim your artist profiles', 'Pitch the single 7+ days before release', 'Cut the teasers in CapCut'].map((t, i) => (
            <View key={t} style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <Text style={{width: 26, fontFamily: fonts.displayHeavy, fontSize: 18, color: deco.brassHighlight}}>{['I', 'II', 'III', 'IV', 'V'][i]}</Text>
              <Text style={[s.body, {flex: 1}]}>{t}</Text>
            </View>
          ))}
          <SectionHead>ARTIST PROFILES</SectionHead>
          {RELEASE.map((t) => <ToolRow key={t.name} t={t} />)}
          <SampleNote>RELEASES GO THROUGH A DISTRIBUTOR · FINESSE DOES NOT UPLOAD TO STREAMING SERVICES</SampleNote>
        </Animated.View>
      ) : null}
    </View>
  );
}
