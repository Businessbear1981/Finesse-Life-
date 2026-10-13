// The Camera — a noir viewfinder with a chrome reticle for private visual intake. Consent comes first and is
// explicit; a photo is stored privately (POST /api/camera/uploads) and nothing is analysed until the member
// asks (POST /api/camera/identify). The reticle only "resolves" on real model output — an unrecognised
// piece says so and the member names it. The member reviews and catalogues (POST /api/camera/catalogue),
// then chooses where it goes (POST /api/camera/items/:id/route). Photo and record can be deleted at any time.
// The model is a third-party AI (AI_PROCESSOR): the consent copy names it, and the first "Ask the reticle" asks
// once for photo-AI consent (AIConsent.tsx, member_consents 'photo_ai').
import {useEffect, useId, useState} from 'react';
import {ActivityIndicator, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import Svg, {Defs, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {api, apiUpload} from '@/lib/api';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {AHCard, AHEyebrow, AHInput, AHTitle} from '@/components/ah';
import {ActionBar, Chips, SampleNote, s} from './shared';
import {Consent, ERR_PINK, LiveGate, Meta, OK_GREEN, RowBtn, Status, Tile} from './live';
import {useAIConsent} from './AIConsent';
import {AI_PROCESSOR} from '@/lib/consents';

type Item = {id: string; viewUrl: string | null; label: string | null; category: string | null; brand_guess: string | null; confidence: number | null; model: string | null; state: string; routed_to: string | null; created_at: string};
type CameraData = {items: Item[]};
const CATS = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'bags', 'accessories', 'jewelry', 'beauty', 'home', 'other'];
const ROUTES: Array<['closet' | 'exchange' | 'bag', string, string]> = [['closet', 'Hang in my Closet', 'Hung privately in your Closet.'], ['exchange', 'Offer on the Exchange', 'Marked for the Exchange as your choice. Nothing is listed until you consign it there.'], ['bag', 'Find a match in the Bag', 'Marked for the Bag as your choice. Nothing is bought from here.']];
const STATE: Record<string, string> = {uploaded: 'Stored · not analysed', identified: 'Identified · review it', unidentified: 'Not recognised · name it', catalogued: 'Catalogued', routed: 'Sent'};

/** Chrome reticle corners over a noir viewfinder. `resolved` tightens the corners (only on real output). */
function Reticle({resolved, small, children}: {resolved?: boolean; small?: boolean; children?: React.ReactNode}) {
  const id = `rt${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const c = resolved ? ah.white : 'rgba(255,255,255,0.45)', k = resolved ? 18 : 26;
  return (
    <View style={{aspectRatio: small ? 1 : 1 / 0.86, borderRadius: small ? 14 : radius.hero, backgroundColor: '#070607', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: ah.line}}>
      {!small ? (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
          <Defs><RadialGradient id={id} cx="0.5" cy="0.55" r="0.6"><Stop offset="0" stopColor={ah.rose2} stopOpacity={0.22} /><Stop offset="1" stopColor={ah.rose2} stopOpacity={0} /></RadialGradient></Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      ) : null}
      {children}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
        {[`M${k} 12 H12 V${k}`, `M${100 - k} 12 H88 V${k}`, `M12 ${100 - k} V88 H${k}`, `M88 ${100 - k} V88 H${100 - k}`].map((d) => <Path key={d} d={d} stroke={c} strokeWidth={small ? 2 : 1.2} fill="none" strokeLinecap="round" />)}
        {!small ? <Path d="M48 50 H52 M50 48 V52" stroke={c} strokeWidth={0.6} /> : null}
      </Svg>
    </View>
  );
}

export function Camera({side}: {side: Side}) {
  const acc = track[side].acc;
  const {live, reload} = useLive<CameraData>('/api/camera/items');
  return (
    <View style={{gap: 16}}>
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
  const off = !consent || !!uploading;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 16}}>
      <Reticle>
        {uploading ? <><Image source={{uri: uploading}} style={{position: 'absolute', width: '100%', height: '100%', opacity: 0.6}} resizeMode="cover" /><ActivityIndicator color={ah.rose} /></> : (
          <View style={{alignItems: 'center', gap: 12, paddingHorizontal: 36}}>
            <Icon name="camera" size={30} color={ah.platinum} strokeWidth={1.2} />
            <AHTitle size={28} style={{textAlign: 'center'}}>{consent ? 'One piece at a time, in good light.' : 'Before the shutter, your consent.'}</AHTitle>
          </View>
        )}
      </Reticle>

      <Consent checked={consent} onToggle={() => setConsent((c) => !c)}>
        I consent to Finesse storing this photo privately and, only when I ask, sending it to {AI_PROCESSOR} — an AI model — to describe it. I can delete the photo and its record at any time.
      </Consent>

      <View style={{flexDirection: 'row', gap: 10}}>
        <Tile icon="camera" label="Scan a piece" a11y="Take a photo" solid rose={acc === ah.rose} onPress={shoot} disabled={off} />
        <Tile icon="image" label="From library" a11y="Choose from your library" onPress={choose} disabled={off} />
      </View>
      <Status msg={msg} />

      <View style={{flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8}}>
        <AHEyebrow>Your intake</AHEyebrow>
        <Text style={{fontFamily: ahFonts.serif, fontSize: 22, color: ah.text}}>{data.items.length}</Text>
      </View>
      {data.items.length === 0 ? <Text style={[s.small, {textAlign: 'center'}]}>Nothing scanned yet. Your photos stay private to you.</Text> : null}
      {data.items.map((it) => <ItemCard key={it.id} item={it} acc={acc} reload={reload} onDeleted={() => setMsg({ok: true, text: 'Deleted — the photo and its record.'})} />)}
      <SampleNote>Private intake · nothing is analysed unless you ask · descriptions are AI ({AI_PROCESSOR}) and can be wrong</SampleNote>
    </Animated.View>
  );
}

function ItemCard({item, acc, reload, onDeleted}: {item: Item; acc: string; reload: () => Promise<void>; onDeleted: () => void}) {
  const [label, setLabel] = useState(item.label ?? '');
  const [cat, setCat] = useState(item.category ?? 'other');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const consent = useAIConsent();
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
  const stateColor = item.state === 'unidentified' ? ERR_PINK : item.state === 'routed' || item.state === 'catalogued' ? OK_GREEN : ah.mute;

  return (
    <Animated.View entering={FadeInDown.duration(300)} layout={LinearTransition}>
      <AHCard pad={14} style={{gap: 14}}>
        <View style={{flexDirection: 'row', gap: 14}}>
          <View style={{width: 92}}>
            <Reticle small resolved={item.state === 'identified' || item.state === 'catalogued' || item.state === 'routed'}>
              {item.viewUrl ? <Image source={{uri: item.viewUrl}} style={{position: 'absolute', width: '100%', height: '100%'}} resizeMode="cover" accessibilityLabel={item.label ?? 'Your photo'} /> : <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 10, color: ah.faint}}>No preview</Text>}
            </Reticle>
          </View>
          <View style={{flex: 1, gap: 6}}>
            <Meta color={stateColor}>
              {STATE[item.state] ?? item.state}{item.confidence !== null ? ` · ${Math.round(item.confidence * 100)}%` : ''}{item.model ? ` · ${item.model}` : ''}
            </Meta>
            {item.label && !reviewing ? <Text style={{fontFamily: ahFonts.serif, fontSize: 22, lineHeight: 25, color: ah.text}}>{item.label}{item.category ? <Text style={[s.small, {fontSize: 13}]}>  · {item.category}</Text> : null}</Text> : null}
            {item.brand_guess ? <Text style={s.small}>Brand read from a visible logo: {item.brand_guess}</Text> : null}
            {item.state === 'uploaded' ? <RowBtn label={busy ? 'Looking…' : 'Ask the reticle'} onPress={() => void consent.ensure('photo_ai', () => void call('/api/camera/identify', {method: 'POST', json: {itemId: item.id}}, 'The AI has described it — it can be wrong. Review before it is filed.'))} disabled={busy} tone={acc} /> : null}
            {item.state === 'routed' ? <Text style={s.small}>{item.routed_to === 'closet' ? 'Hanging privately in your Closet.' : `Marked for the ${item.routed_to} as your choice.`}</Text> : null}
          </View>
        </View>

        {reviewing ? (
          <View style={{gap: 10}}>
            <AHInput value={label} onChangeText={(v) => setLabel(v.slice(0, 120))} placeholder={item.state === 'unidentified' ? 'Not recognised — name it yourself' : 'What is it?'} accessibilityLabel="Label" />
            <Chips options={CATS} value={cat} onChange={setCat} />
            <RowBtn label="Catalogue it" onPress={() => call('/api/camera/catalogue', {method: 'POST', json: {itemId: item.id, label: label.trim(), category: cat}}, 'Catalogued. Choose where it goes, or leave it here.')} disabled={busy || !label.trim()} tone={ah.rose} />
          </View>
        ) : null}
        {item.state === 'catalogued' ? (
          <View style={{gap: 8}}>
            {ROUTES.map(([to, l, ok]) => <RowBtn key={to} label={l} onPress={() => call(`/api/camera/items/${item.id}/route`, {method: 'POST', json: {to}}, ok)} disabled={busy} />)}
          </View>
        ) : null}

        <Pressable onPress={async () => { if (!confirmDel) { setConfirmDel(true); return; } setConfirmDel(false); if (await call(`/api/camera/items/${item.id}`, {method: 'DELETE'}, 'Deleted — the photo and its record.')) onDeleted(); }} disabled={busy} accessibilityRole="button"
          style={{minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start'}}>
          <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12.5, color: confirmDel ? ERR_PINK : ah.faint}}>{confirmDel ? 'Tap again to delete photo and record' : 'Delete photo and record'}</Text>
        </Pressable>
        <Status msg={msg} />
        {consent.sheet}
      </AHCard>
    </Animated.View>
  );
}

function CameraSample() {
  return (
    <View style={{gap: 12, opacity: 0.9}}>
      <Reticle>
        <Icon name="camera" size={34} color={ah.platinum} strokeWidth={1.2} />
      </Reticle>
      <ActionBar label="Scan the rest of the closet" color={ah.platinum} disabled />
      <SampleNote>Sign in to scan · photos are stored privately, only with your consent</SampleNote>
    </View>
  );
}
