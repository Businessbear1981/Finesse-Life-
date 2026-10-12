// The Stylist — the dressing room. Members take a photo (or choose one) and send it to their stylist.
// Photos go to /api/camera/uploads, which stores them privately and only with explicit consent;
// nothing is analysed until the member asks. The mirror note is the stylist's word, not an AI verdict.
import {useState} from 'react';
import {ActivityIndicator, Image, Pressable, Text, View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {apiUpload} from '@/lib/api';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {AHEyebrow, AHInput, AHSmoke, AHTitle} from '@/components/ah';
import {ActionBar, Chips, SampleNote, s} from './shared';
import {Consent, ERR_PINK, Meta, OK_GREEN, Tile} from './live';

type Shot = {id: string; uri: string; mimeType?: string | null; fileName?: string | null; occasion: string; note: string; state: 'ready' | 'sending' | 'sent' | 'failed'; msg?: string};
const OCCASIONS = ['Tonight', 'Work', 'Weekend', 'Event', 'Travel'];

export function Stylist({side}: {side: Side}) {
  const acc = track[side].acc;
  const [shots, setShots] = useState<Shot[]>([]);
  const [occasion, setOccasion] = useState('Tonight');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pending = shots.filter((x) => x.state === 'ready' || x.state === 'failed');

  const add = (r: ImagePicker.ImagePickerResult) => {
    if (r.canceled) return;
    setErr(null);
    setShots((l) => [...r.assets.map((a) => ({id: `${Date.now()}-${a.uri.slice(-12)}`, uri: a.uri, mimeType: a.mimeType, fileName: a.fileName, occasion, note: '', state: 'ready' as const})), ...l].slice(0, 12));
  };
  const shoot = async () => {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) { setErr('Camera access is off. Allow it in Settings, or choose a photo from your library.'); return; }
    add(await ImagePicker.launchCameraAsync({mediaTypes: ['images'], quality: 0.8, allowsEditing: false, exif: false}));
  };
  const choose = async () => {
    add(await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 6, exif: false}));
  };
  const send = async () => {
    if (!consent || pending.length === 0) return;
    for (const shot of pending) {
      setShots((l) => l.map((x) => (x.id === shot.id ? {...x, state: 'sending', occasion, note} : x)));
      const r = await apiUpload<{item?: {id: string}}>('/api/camera/uploads', shot, {consent: 'true', purpose: 'stylist', occasion, note: note.slice(0, 280)});
      const msg = r.ok ? undefined : r.status === 0 ? 'Offline — kept on this phone' : r.status === 401 ? 'Sign in to send' : r.status === 413 ? 'Too large (8 MB max)' : r.status === 415 ? 'JPEG, PNG or WebP only' : r.body.message ?? 'Could not send';
      setShots((l) => l.map((x) => (x.id === shot.id ? {...x, state: r.ok ? 'sent' : 'failed', msg} : x)));
    }
    setNote('');
  };

  return (
    <View style={{gap: 16}}>
      <AHSmoke aspect={1 / 0.82} top={<AHEyebrow color="rgba(242,201,184,0.85)">The dressing room</AHEyebrow>}>
        <AHTitle size={30} style={{lineHeight: 33}}>“Show me what you’re thinking of wearing. I’ll tell you what to keep, swap or add.”</AHTitle>
        <Text style={{marginTop: 12, fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(237,235,231,0.7)'}}>— A note on the mirror</Text>
      </AHSmoke>

      <View style={{flexDirection: 'row', gap: 10}}>
        <Tile icon="camera" label="Take a photo" solid rose={acc === ah.rose} onPress={shoot} />
        <Tile icon="image" label="From library" a11y="Choose from your library" onPress={choose} />
      </View>
      {err ? <Text style={[s.small, {color: ERR_PINK}]}>{err}</Text> : null}

      {shots.length > 0 ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 14}}>
          <View style={{flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8}}>
            <AHEyebrow>For your stylist</AHEyebrow>
            <Text style={{fontFamily: ahFonts.serif, fontSize: 22, color: ah.text}}>{shots.length}</Text>
          </View>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            {shots.map((x) => (
              <Animated.View key={x.id} entering={FadeInDown.duration(300)} style={{width: '31.5%', gap: 6}}>
                <View style={{aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden', backgroundColor: ah.ink3, borderWidth: 1, borderColor: x.state === 'sent' ? 'rgba(126,226,184,0.5)' : ah.line}}>
                  <Image source={{uri: x.uri}} style={{width: '100%', height: '100%'}} resizeMode="cover" accessibilityLabel="Your photo" />
                  {x.state === 'sending' ? <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)'}}><ActivityIndicator color={ah.rose} /></View> : null}
                  {x.state === 'ready' ? (
                    <Pressable onPress={() => setShots((l) => l.filter((y) => y.id !== x.id))} accessibilityRole="button" accessibilityLabel="Remove photo" hitSlop={10}
                      style={{position: 'absolute', right: 6, top: 6, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)'}}>
                      <Text style={{color: ah.white, fontSize: 15, lineHeight: 17}}>×</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Meta color={x.state === 'sent' ? OK_GREEN : x.state === 'failed' ? ERR_PINK : ah.mute} style={{fontSize: 9.5, letterSpacing: 0.8}}>
                  {x.state === 'sent' ? `Sent · ${x.occasion}` : x.state === 'failed' ? (x.msg ?? 'Not sent') : x.state === 'sending' ? 'Sending…' : 'Ready'}
                </Meta>
              </Animated.View>
            ))}
          </View>

          {pending.length > 0 ? (
            <>
              <AHEyebrow style={{marginTop: 8}}>What is it for?</AHEyebrow>
              <Chips options={OCCASIONS} value={occasion} onChange={setOccasion} />
              <AHInput value={note} onChangeText={(v) => setNote(v.slice(0, 280))} placeholder="A note for your stylist (optional)" multiline accessibilityLabel="Note for your stylist"
                style={{minHeight: 84, paddingTop: 14, textAlignVertical: 'top'}} />
              <Consent checked={consent} onToggle={() => setConsent((c) => !c)}>
                I consent to Finesse storing these photos privately so my stylist can see them. I can delete them at any time. Nothing is analysed unless I ask.
              </Consent>
              <ActionBar label={`Send ${pending.length} to my stylist`} color={acc} onPress={send} disabled={!consent} />
            </>
          ) : null}
        </Animated.View>
      ) : (
        <Text style={[s.small, {textAlign: 'center'}]}>Full-length in good light works best. Mirror selfies are perfect.</Text>
      )}
      <SampleNote>Photos are stored privately, only with your consent · your stylist’s shortlist arrives here once the stylist desk is live</SampleNote>
    </View>
  );
}
