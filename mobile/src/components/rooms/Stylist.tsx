// The Stylist — the dressing room. Members take a photo (or choose one) and send it to their stylist.
// Photos go to /api/camera/uploads, which stores them privately and only with explicit consent;
// nothing is analysed until the member asks. The mirror note is the stylist's word, not an AI verdict.
import {useState} from 'react';
import {ActivityIndicator, Image, Pressable, Text, TextInput, View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {apiUpload} from '@/lib/api';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {ActionBar, Chips, GoldFrame, SampleNote, SectionHead, s} from './shared';

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
    <View style={{gap: 12}}>
      <GoldFrame pad={4}>
        <View style={{backgroundColor: '#140E0B', padding: 16, alignItems: 'center', gap: 6}}>
          <Text style={{fontFamily: fonts.script, fontSize: 20, lineHeight: 26, color: deco.cream, textAlign: 'center'}}>“Show me what you’re thinking of wearing. I’ll tell you what to keep, swap or add.”</Text>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 9.5, letterSpacing: 2, color: deco.brassHighlight}}>— A NOTE ON THE MIRROR</Text>
        </View>
      </GoldFrame>

      <View style={{flexDirection: 'row', gap: 10}}>
        <Pressable onPress={shoot} accessibilityRole="button" accessibilityLabel="Take a photo" style={({pressed}) => [{flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: acc, opacity: pressed ? 0.85 : 1}]}>
          <Icon name="camera" size={28} color="#140508" strokeWidth={1.8} />
          <Text style={{fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2, color: '#140508'}}>TAKE A PHOTO</Text>
        </Pressable>
        <Pressable onPress={choose} accessibilityRole="button" accessibilityLabel="Choose from your library" style={({pressed}) => [{flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: deco.brassHighlight, opacity: pressed ? 0.85 : 1}]}>
          <Icon name="image" size={28} color={deco.brassHighlight} strokeWidth={1.6} />
          <Text style={{fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2, color: deco.brassHighlight}}>FROM LIBRARY</Text>
        </Pressable>
      </View>
      {err ? <Text style={[s.small, {color: '#FF8FA9'}]}>{err}</Text> : null}

      {shots.length > 0 ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 10}}>
          <SectionHead>FOR YOUR STYLIST · {shots.length}</SectionHead>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            {shots.map((x) => (
              <Animated.View key={x.id} entering={FadeInDown.duration(300)} style={{width: '31%'}}>
                <GoldFrame pad={2}>
                  <View style={{aspectRatio: 3 / 4, backgroundColor: '#0E0907'}}>
                    <Image source={{uri: x.uri}} style={{width: '100%', height: '100%'}} resizeMode="cover" accessibilityLabel="Your photo" />
                    {x.state === 'sending' ? <View style={{position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,4,6,0.55)'}}><ActivityIndicator color={deco.brassHighlight} /></View> : null}
                    {x.state === 'ready' ? (
                      <Pressable onPress={() => setShots((l) => l.filter((y) => y.id !== x.id))} accessibilityRole="button" accessibilityLabel="Remove photo" hitSlop={8}
                        style={{position: 'absolute', right: 4, top: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,4,6,0.75)'}}>
                        <Text style={{color: deco.cream, fontSize: 13}}>×</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </GoldFrame>
                <Text style={{marginTop: 3, fontFamily: fonts.mono, fontSize: 8, letterSpacing: 0.8, color: x.state === 'sent' ? '#7AF5B8' : x.state === 'failed' ? '#FF8FA9' : deco.brass}} numberOfLines={2}>
                  {x.state === 'sent' ? `SENT · ${x.occasion.toUpperCase()}` : x.state === 'failed' ? (x.msg ?? 'NOT SENT').toUpperCase() : x.state === 'sending' ? 'SENDING…' : 'READY'}
                </Text>
              </Animated.View>
            ))}
          </View>

          {pending.length > 0 ? (
            <>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>WHAT IS IT FOR?</Text>
              <Chips options={OCCASIONS} value={occasion} onChange={setOccasion} />
              <TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 280))} placeholder="A note for your stylist (optional)" placeholderTextColor="rgba(244,232,208,0.4)" multiline accessibilityLabel="Note for your stylist"
                style={{minHeight: 64, padding: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)', fontFamily: fonts.body, fontSize: 13, color: deco.cream, textAlignVertical: 'top'}} />
              <Pressable onPress={() => setConsent((c) => !c)} accessibilityRole="checkbox" accessibilityState={{checked: consent}} style={{flexDirection: 'row', gap: 10, alignItems: 'flex-start'}}>
                <View style={{width: 22, height: 22, marginTop: 1, borderWidth: 1.5, borderColor: deco.brassHighlight, alignItems: 'center', justifyContent: 'center', backgroundColor: consent ? deco.brassHighlight : 'transparent'}}>
                  {consent ? <Text style={{color: '#140E08', fontSize: 13, fontFamily: fonts.bodyStrong}}>✓</Text> : null}
                </View>
                <Text style={[s.small, {flex: 1}]}>I consent to Finesse storing these photos privately so my stylist can see them. I can delete them at any time. Nothing is analysed unless I ask.</Text>
              </Pressable>
              <ActionBar label={`SEND ${pending.length} TO MY STYLIST`} color={acc} onPress={send} disabled={!consent} />
            </>
          ) : null}
        </Animated.View>
      ) : (
        <Text style={[s.small, {textAlign: 'center'}]}>Full-length in good light works best. Mirror selfies are perfect.</Text>
      )}
      <SampleNote>PHOTOS ARE STORED PRIVATELY, ONLY WITH YOUR CONSENT · YOUR STYLIST’S SHORTLIST ARRIVES HERE ONCE THE STYLIST DESK IS LIVE</SampleNote>
    </View>
  );
}
