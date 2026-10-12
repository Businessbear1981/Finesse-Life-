// The Camera — a dark viewfinder with a brass reticle for private visual intake. Consent comes first and is
// explicit; a photo is stored privately (POST /api/camera/uploads) and nothing is analysed until the member
// asks (POST /api/camera/identify). The reticle only "resolves" on real model output — an unrecognised
// piece says so and the member names it. The member reviews and catalogues (POST /api/camera/catalogue),
// then chooses where it goes (POST /api/camera/items/:id/route). Photo and record can be deleted at any time.
import {useEffect, useState} from 'react';
import {ActivityIndicator, Image, Pressable, Text, TextInput, View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import {api, apiUpload} from '@/lib/api';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {ActionBar, Chips, GoldFrame, SampleNote, SectionHead, s} from './shared';
import {ERR_PINK, LiveGate, OK_GREEN, RowBtn, Status} from './live';

type Item = {id: string; viewUrl: string | null; label: string | null; category: string | null; brand_guess: string | null; confidence: number | null; model: string | null; state: string; routed_to: string | null; created_at: string};
type CameraData = {items: Item[]};
const CATS = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'bags', 'accessories', 'jewelry', 'beauty', 'home', 'other'];
const ROUTES: Array<['closet' | 'exchange' | 'bag', string, string]> = [['closet', 'HANG IN MY CLOSET', 'Hung privately in your Closet.'], ['exchange', 'OFFER ON THE EXCHANGE', 'Marked for the Exchange as your choice. Nothing is listed until you consign it there.'], ['bag', 'FIND A MATCH IN THE BAG', 'Marked for the Bag as your choice. Nothing is bought from here.']];
const STATE: Record<string, string> = {uploaded: 'STORED · NOT ANALYSED', identified: 'IDENTIFIED · REVIEW IT', unidentified: 'NOT RECOGNISED · NAME IT', catalogued: 'CATALOGUED', routed: 'SENT'};

/** Brass reticle corners over a dark viewfinder. `resolved` tightens the corners (only on real output). */
function Reticle({resolved, children}: {resolved?: boolean; children?: React.ReactNode}) {
  const c = resolved ? deco.brassWhite : deco.brass, k = resolved ? 18 : 26;
  return (
    <View style={{aspectRatio: 1, backgroundColor: '#070504', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
      {children}
      <Svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
        {[[`M${k} 12 H12 V${k}`], [`M${100 - k} 12 H88 V${k}`], [`M12 ${100 - k} V88 H${k}`], [`M88 ${100 - k} V88 H${100 - k}`]].map(([d]) => <Path key={d} d={d} stroke={c} strokeWidth={1.4} fill="none" />)}
        <Path d="M47 50 H53 M50 47 V53" stroke={c} strokeWidth={0.8} />
      </Svg>
    </View>
  );
}

export function Camera({side}: {side: Side}) {
  const acc = track[side].acc;
  const {live, reload} = useLive<CameraData>('/api/camera/items');
  return (
    <View style={{gap: 12}}>
      <LiveGate live={live} reload={() => void reload()} what="the Camera" signedOut={<CameraSample />}>
        {(data) => <CameraLive data={data} acc={acc} reload={() => reload(true)} />}
      </LiveGate>
    </View>
  );
}

function CameraLive({data, acc, reload}: {data: CameraData; acc: string; reload: () => Promise<void>}) {
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);

  const upload = async (r: ImagePicker.ImagePickerResult) => {
    if (r.canceled || !r.assets[0] || !consent) return;
    const a = r.assets[0];
    setUploading(a.uri); setMsg(null);
    const res = await apiUpload<{item?: Item}>('/api/camera/uploads', {uri: a.uri, mimeType: a.mimeType, fileName: a.fileName}, {consent: 'true'});
    setUploading(null);
    if (!res.ok) {
      const text = res.status === 413 ? 'Too large (8 MB max). Nothing was stored.' : res.status === 415 ? 'JPEG, PNG or WebP only. Nothing was stored.' : failure(res.status, res.body, 'Nothing was stored.');
      setMsg({ok: false, text}); return;
    }
    setMsg({ok: true, text: 'Stored privately. Nothing has been analysed — ask the reticle when you are ready.'});
    void reload();
  };
  const shoot = async () => {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) { setMsg({ok: false, text: 'Camera access is off. Allow it in Settings, or choose a photo from your library.'}); return; }
    void upload(await ImagePicker.launchCameraAsync({mediaTypes: ['images'], quality: 0.8, allowsEditing: false, exif: false}));
  };
  const choose = async () => void upload(await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: false, exif: false}));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
      <GoldFrame pad={3}>
        <Reticle>
          {uploading ? <><Image source={{uri: uploading}} style={{position: 'absolute', width: '100%', height: '100%', opacity: 0.6}} resizeMode="cover" /><ActivityIndicator color={deco.brassHighlight} /></> : (
            <View style={{alignItems: 'center', gap: 8, paddingHorizontal: 30}}>
              <Icon name="camera" size={34} color={deco.brass} strokeWidth={1.2} />
              <Text style={{fontFamily: fonts.script, fontSize: 18, lineHeight: 23, color: deco.cream, textAlign: 'center'}}>{consent ? 'One piece at a time, in good light.' : 'Before the shutter, your consent.'}</Text>
            </View>
          )}
        </Reticle>
      </GoldFrame>

      <Pressable onPress={() => setConsent((c) => !c)} accessibilityRole="checkbox" accessibilityState={{checked: consent}} style={{flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderWidth: 1, borderColor: consent ? OK_GREEN : deco.brassHighlight}}>
        <View style={{width: 22, height: 22, marginTop: 1, borderWidth: 1.5, borderColor: deco.brassHighlight, alignItems: 'center', justifyContent: 'center', backgroundColor: consent ? deco.brassHighlight : 'transparent'}}>
          {consent ? <Text style={{color: '#140E08', fontSize: 13, fontFamily: fonts.bodyStrong}}>✓</Text> : null}
        </View>
        <Text style={[s.small, {flex: 1}]}>I consent to Finesse storing this photo privately and, only when I ask, letting the model describe it. I can delete the photo and its record at any time.</Text>
      </Pressable>

      <View style={{flexDirection: 'row', gap: 10}}>
        <Pressable onPress={shoot} disabled={!consent || !!uploading} accessibilityRole="button" accessibilityLabel="Take a photo" accessibilityState={{disabled: !consent}} style={({pressed}) => [{flex: 1, minHeight: 80, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: acc, opacity: !consent || uploading ? 0.4 : pressed ? 0.85 : 1}]}>
          <Icon name="camera" size={24} color="#140508" strokeWidth={1.8} />
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10.5, letterSpacing: 2, color: '#140508'}}>SCAN A PIECE</Text>
        </Pressable>
        <Pressable onPress={choose} disabled={!consent || !!uploading} accessibilityRole="button" accessibilityLabel="Choose from your library" accessibilityState={{disabled: !consent}} style={({pressed}) => [{flex: 1, minHeight: 80, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: deco.brassHighlight, opacity: !consent || uploading ? 0.4 : pressed ? 0.85 : 1}]}>
          <Icon name="image" size={24} color={deco.brassHighlight} strokeWidth={1.6} />
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10.5, letterSpacing: 2, color: deco.brassHighlight}}>FROM LIBRARY</Text>
        </Pressable>
      </View>
      <Status msg={msg} />

      <SectionHead>YOUR INTAKE · {data.items.length}</SectionHead>
      {data.items.length === 0 ? <Text style={[s.small, {textAlign: 'center'}]}>Nothing scanned yet. Your photos stay private to you.</Text> : null}
      {data.items.map((it) => <ItemCard key={it.id} item={it} acc={acc} reload={reload} onDeleted={() => setMsg({ok: true, text: 'Deleted — the photo and its record.'})} />)}
      <SampleNote>PRIVATE INTAKE · NOTHING IS ANALYSED UNLESS YOU ASK · NO GUESSES — UNRECOGNISED MEANS UNRECOGNISED</SampleNote>
    </Animated.View>
  );
}

function ItemCard({item, acc, reload, onDeleted}: {item: Item; acc: string; reload: () => Promise<void>; onDeleted: () => void}) {
  const [label, setLabel] = useState(item.label ?? '');
  const [cat, setCat] = useState(item.category ?? 'other');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  useEffect(() => { setLabel(item.label ?? ''); setCat(item.category ?? 'other'); }, [item.label, item.category]);
  const call = async (path: string, init: {method: string; json?: unknown}, ok: string) => {
    setBusy(true); setMsg(null);
    const r = await api<{message?: string; error?: string; item?: Item}>(path, init);
    setBusy(false);
    if (!r.ok) {
      setMsg({ok: false, text: r.body.error === 'model_unavailable' ? (r.body.message ?? 'The reticle has no lens yet — no model is connected. Name the piece yourself.') : failure(r.status, r.body)});
      return false;
    }
    if (path.endsWith('/identify') && r.body.item?.state === 'unidentified') setMsg({ok: false, text: 'The model could not clearly see one piece. Nothing was guessed — name it yourself.'});
    else setMsg({ok: true, text: ok});
    void reload();
    return true;
  };
  const reviewing = item.state === 'uploaded' || item.state === 'identified' || item.state === 'unidentified';

  return (
    <Animated.View entering={FadeInDown.duration(300)} layout={LinearTransition} style={{flexDirection: 'row', gap: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(201,169,97,0.35)'}}>
      <View style={{width: 96}}>
        <GoldFrame pad={2}>
          <Reticle resolved={item.state === 'identified' || item.state === 'catalogued' || item.state === 'routed'}>
            {item.viewUrl ? <Image source={{uri: item.viewUrl}} style={{position: 'absolute', width: '100%', height: '100%'}} resizeMode="cover" accessibilityLabel={item.label ?? 'Your photo'} /> : <Text style={{fontFamily: fonts.mono, fontSize: 7, color: deco.brass}}>NO PREVIEW</Text>}
          </Reticle>
        </GoldFrame>
      </View>
      <View style={{flex: 1, gap: 6}}>
        <Text style={{fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 0.8, color: item.state === 'unidentified' ? ERR_PINK : item.state === 'routed' || item.state === 'catalogued' ? OK_GREEN : deco.brass}}>
          {STATE[item.state] ?? item.state.toUpperCase()}{item.confidence !== null ? ` · ${Math.round(item.confidence * 100)}%` : ''}{item.model ? ` · ${item.model}` : ''}
        </Text>
        {item.label && !reviewing ? <Text style={{fontFamily: fonts.displayBold, fontSize: 16, color: deco.cream}}>{item.label}{item.category ? <Text style={s.small}>  · {item.category}</Text> : null}</Text> : null}
        {item.brand_guess ? <Text style={s.small}>Brand read from a visible logo: {item.brand_guess}</Text> : null}

        {item.state === 'uploaded' ? <RowBtn label={busy ? 'LOOKING…' : 'ASK THE RETICLE'} onPress={() => call('/api/camera/identify', {method: 'POST', json: {itemId: item.id}}, 'The model has described it. Review before it is filed.')} disabled={busy} tone={acc} /> : null}
        {reviewing ? (
          <View style={{gap: 6}}>
            <TextInput value={label} onChangeText={(v) => setLabel(v.slice(0, 120))} placeholder={item.state === 'unidentified' ? 'Not recognised — name it yourself' : 'What is it?'} placeholderTextColor="rgba(244,232,208,0.4)" accessibilityLabel="Label"
              style={{minHeight: 40, paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)', fontFamily: fonts.body, fontSize: 12.5, color: deco.cream}} />
            <Chips options={CATS} value={cat} onChange={setCat} />
            <RowBtn label="CATALOGUE IT" onPress={() => call('/api/camera/catalogue', {method: 'POST', json: {itemId: item.id, label: label.trim(), category: cat}}, 'Catalogued. Choose where it goes, or leave it here.')} disabled={busy || !label.trim()} tone={deco.brassHighlight} />
          </View>
        ) : null}
        {item.state === 'catalogued' ? (
          <View style={{gap: 6}}>
            {ROUTES.map(([to, l, ok]) => <RowBtn key={to} label={l} onPress={() => call(`/api/camera/items/${item.id}/route`, {method: 'POST', json: {to}}, ok)} disabled={busy} />)}
          </View>
        ) : null}
        {item.state === 'routed' ? <Text style={s.small}>{item.routed_to === 'closet' ? 'Hanging privately in your Closet.' : `Marked for the ${item.routed_to} as your choice.`}</Text> : null}

        <Pressable onPress={async () => { if (!confirmDel) { setConfirmDel(true); return; } setConfirmDel(false); if (await call(`/api/camera/items/${item.id}`, {method: 'DELETE'}, 'Deleted — the photo and its record.')) onDeleted(); }} disabled={busy} accessibilityRole="button" style={{minHeight: 34, justifyContent: 'center'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 8.5, letterSpacing: 1.3, color: confirmDel ? ERR_PINK : 'rgba(244,232,208,0.5)'}}>{confirmDel ? 'TAP AGAIN TO DELETE PHOTO AND RECORD' : 'DELETE PHOTO AND RECORD'}</Text>
        </Pressable>
        <Status msg={msg} />
      </View>
    </Animated.View>
  );
}

function CameraSample() {
  return (
    <View style={{gap: 8, opacity: 0.85}}>
      <GoldFrame pad={3}><Reticle><Icon name="camera" size={34} color={deco.brass} strokeWidth={1.2} /></Reticle></GoldFrame>
      <ActionBar label="SCAN THE REST OF THE CLOSET" color={deco.brass} disabled />
      <SampleNote>SIGN IN TO SCAN · PHOTOS ARE STORED PRIVATELY, ONLY WITH YOUR CONSENT</SampleNote>
    </View>
  );
}
