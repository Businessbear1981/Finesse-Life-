// The Wardrobe — a turning rack, as in the design. Signed in it is the member's own: their posted looks turn
// under the chrome rail (wardrobe_looks), the community floor with likes, and the wishlist — the same data as
// the web Wardrobe (src/app/(hotel)/wardrobe/page.tsx; queries in lib/rooms/wardrobe.ts). Nova styles the
// evening through the orchestrator (style_for_occasion) and price-checks a wish (price_check).
// Signed out, the sample rack stays, clearly labelled.
import {useState} from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {FadeIn, useAnimatedStyle, useReducedMotion, withTiming} from 'react-native-reanimated';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts} from '@/lib/ah';
import {useAvailableWidth} from '@/lib/layout';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {addWish, postLook, readFeed, readMyLooks, readWishlist, removeWish, toggleLike, type Look, type Wish} from '@/lib/rooms/wardrobe';
import {ago, dollars, memberName, parseDollars} from '@/lib/rooms/logic';
import {AHCard, AHEyebrow, AHInput, AHTitle} from '@/components/ah';
import {ActionBar, SampleNote, Segmented, s} from './shared';
import {LiveGate, RowBtn, Status} from './live';
import {NovaAskButton} from './NovaAsk';
import {Fine, Head, Row, TextBtn, t} from './RoomKit';

const TOPS = {her: ['Ivory silk blouse', 'Black corset top', 'Camel knit', 'Oxblood satin cami', 'Cream vest', 'Gold-button cardigan', 'White poplin'],
  him: ['Navy blazer', 'White oxford', 'Black rollneck', 'Camel overcoat', 'Linen shirt', 'Grey polo', 'Dinner jacket']};
const BOTS = {her: ['Wide black trousers', 'Pleated midi', 'Camel cigarette pant', 'Leather pencil skirt', 'Ivory palazzo', 'Dark denim', 'Satin bias skirt'],
  him: ['Charcoal flannel', 'Navy chino', 'Tux trouser', 'Stone linen', 'Selvedge denim', 'Grey pleated', 'Olive cord']};
const DRESS = ['Champagne bias gown', 'Oxblood velvet slip', 'Black column dress', 'Gold lamé midi', 'Ivory satin wrap', 'Emerald silk shift', 'Blush tulle'];

type Piece = {key: string; label: string; photo?: string | null};

export function Wardrobe({side}: {side: Side}) {
  const {live, reload} = useLive<{looks: Look[]}>(null, readMyLooks);
  return (
    <LiveGate live={live} reload={() => void reload()} what="your wardrobe" signedOut={<WardrobeSample side={side} />}>
      {(data) => <WardrobeLive side={side} looks={data.looks} reload={() => reload(true)} />}
    </LiveGate>
  );
}

/* ─────────────── live ─────────────── */

function WardrobeLive({side, looks, reload}: {side: Side; looks: Look[]; reload: () => Promise<void>}) {
  const [tab, setTab] = useState<'rack' | 'feed' | 'wish'>('rack');
  return (
    <View style={{gap: 14}}>
      <Segmented options={[['rack', 'My rack'], ['feed', 'The floor'], ['wish', 'Wishlist']]} value={tab} onChange={setTab} />
      {tab === 'rack' ? <Rack side={side} looks={looks} reload={reload} /> : tab === 'feed' ? <Feed /> : <Wishlist />}
    </View>
  );
}

function Rack({side, looks, reload}: {side: Side; looks: Look[]; reload: () => Promise<void>}) {
  const [idx, setIdx] = useState(0);
  const pieces: Piece[] = looks.map((l) => ({key: l.id, label: l.caption || (l.brands ?? []).join(' · ') || 'Untitled look', photo: l.photo_url}));
  const at = pieces.length ? idx % pieces.length : 0;
  const cur = looks[at];
  return (
    <View style={{gap: 14}}>
      {looks.length === 0 ? (
        <AHCard pad={22}>
          <Text style={t.voice}>No looks on your rack yet.</Text>
          <Fine style={{marginTop: 8}}>Post your first below — it turns on the rail here and members can see it on the floor.</Fine>
        </AHCard>
      ) : (
        <>
          <View style={{height: 2, borderRadius: 1, backgroundColor: ah.platinum, opacity: 0.55, marginTop: 4}} />
          <Tier label="LOOK" items={pieces} w={150} h={210} row={230} index={at}
            onMove={(d) => setIdx((x) => (x + d + pieces.length) % pieces.length)} />
          <View style={{alignItems: 'center', gap: 6, paddingHorizontal: 12}}>
            <AHEyebrow color={ah.rose}>{`${at + 1} of ${pieces.length} · ${cur?.likes_count ?? 0} likes`}</AHEyebrow>
            <View accessibilityLiveRegion="polite"><AHTitle size={26} style={{textAlign: 'center'}}>{pieces[at]?.label}</AHTitle></View>
            {cur?.brands?.length ? <Text style={[t.meta, {textAlign: 'center'}]}>{cur.brands.join(' · ')}</Text> : null}
          </View>
        </>
      )}
      <AHCard style={{gap: 10}}>
        <AHEyebrow color={ah.rose}>Tonight</AHEyebrow>
        <Fine>Nova reads your style and suggests what to wear tonight. Nothing is bought.</Fine>
        <NovaAskButton label="Style me for tonight" kind="style_for_occasion" title="Style me for tonight" room="wardrobe" details={{occasion: 'Tonight', occasion_type: 'evening'}} />
      </AHCard>
      <PostLook side={side} onPosted={reload} />
    </View>
  );
}

function PostLook({side, onPosted}: {side: Side; onPosted: () => Promise<void>}) {
  const [file, setFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [brands, setBrands] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const choose = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.8, exif: false});
    if (!r.canceled && r.assets[0]) { setFile(r.assets[0]); setMsg(null); }
  };
  const post = async () => {
    if (!file) return;
    setBusy(true); setMsg(null);
    const r = await postLook(file, caption.trim(), brands.split(',').map((b) => b.trim()).filter(Boolean).slice(0, 8));
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was posted.')}); return; }
    setFile(null); setCaption(''); setBrands('');
    setMsg({ok: true, text: 'Posted. It’s on your rack and on the floor.'});
    void onPosted();
  };
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>Post a look</AHEyebrow>
      {file ? <Image source={{uri: file.uri}} style={{width: '100%', aspectRatio: 3 / 4, borderRadius: 16}} resizeMode="cover" accessibilityLabel="Your look" /> : null}
      <RowBtn label={file ? 'Choose another photo' : 'Choose a photo'} onPress={() => void choose()} />
      <AHInput value={caption} onChangeText={(v) => setCaption(v.slice(0, 120))} placeholder="Caption (optional)" accessibilityLabel="Caption" />
      <AHInput value={brands} onChangeText={setBrands} placeholder="Brands, comma separated (optional)" accessibilityLabel="Brands" />
      <Fine>Posted looks are visible to members on the floor.</Fine>
      <ActionBar label={busy ? 'Posting…' : 'Post this look'} color={track[side].acc} onPress={() => void post()} disabled={!file || busy} />
      <Status msg={msg} />
    </AHCard>
  );
}

function Feed() {
  const {live, reload} = useLive<{looks: Look[]; liked: string[]}>(null, readFeed);
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  return (
    <LiveGate live={live} reload={() => void reload()} what="the floor">
      {(data) => {
        if (data.looks.length === 0) return <AHCard pad={22}><Text style={t.voice}>The floor is quiet.</Text><Fine style={{marginTop: 8}}>No member has posted a look yet. Be the first from your rack.</Fine></AHCard>;
        const isLiked = (id: string) => mine[id] ?? data.liked.includes(id);
        const like = async (l: Look) => {
          const was = isLiked(l.id);
          setMine((m) => ({...m, [l.id]: !was})); setErr(null);
          const r = await toggleLike(l.id, was);
          if (!r.ok) { setMine((m) => ({...m, [l.id]: was})); setErr(failure(r.status, r.body)); }
        };
        return (
          <View style={{gap: 12}}>
            {err ? <Status msg={{ok: false, text: err}} /> : null}
            {data.looks.map((l) => {
              const on = isLiked(l.id);
              const delta = mine[l.id] === undefined ? 0 : (on ? 1 : 0) - (data.liked.includes(l.id) ? 1 : 0);
              return (
                <Animated.View key={l.id} entering={FadeIn.duration(250)}>
                  <AHCard pad={0}>
                    {l.photo_url ? <Image source={{uri: l.photo_url}} style={{width: '100%', aspectRatio: 4 / 5, borderTopLeftRadius: 20, borderTopRightRadius: 20}} resizeMode="cover" accessibilityLabel={l.caption ?? 'A member’s look'} /> : null}
                    <View style={{padding: 16, gap: 4}}>
                      <Text style={t.eyebrow}>{memberName(l.profiles)}{l.profiles?.city ? ` · ${l.profiles.city}` : ''} · {ago(l.created_at)}</Text>
                      {l.caption ? <Text style={t.body}>{l.caption}</Text> : null}
                      {l.brands?.length ? <Text style={t.meta}>{l.brands.join(' · ')}</Text> : null}
                      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                        <Text style={t.meta}>{Math.max(0, l.likes_count + delta)} likes</Text>
                        <TextBtn label={on ? '♥ Liked' : '♡ Like'} on={on} onPress={() => void like(l)} a11y={on ? 'Unlike this look' : 'Like this look'} />
                      </View>
                    </View>
                  </AHCard>
                </Animated.View>
              );
            })}
          </View>
        );
      }}
    </LiveGate>
  );
}

function Wishlist() {
  const {live, reload} = useLive<{items: Wish[]}>(null, readWishlist);
  const [brand, setBrand] = useState('');
  const [item, setItem] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const add = async () => {
    if (!brand.trim() || !item.trim()) return;
    setBusy(true); setMsg(null);
    const r = await addWish({brand, item, price_est_cents: parseDollars(price) ?? 0});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was saved.')}); return; }
    setBrand(''); setItem(''); setPrice('');
    setMsg({ok: true, text: 'On your wishlist.'});
    void reload(true);
  };
  const remove = async (id: string) => {
    setMsg(null);
    const r = await removeWish(id);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body)}); return; }
    void reload(true);
  };
  return (
    <View style={{gap: 12}}>
      <LiveGate live={live} reload={() => void reload()} what="your wishlist">
        {(data) => data.items.length === 0 ? (
          <AHCard pad={22}><Text style={t.voice}>Nothing on your wishlist yet.</Text><Fine style={{marginTop: 8}}>Add a piece below and Nova can check what it really costs.</Fine></AHCard>
        ) : (
          <View>
            {data.items.map((w, i) => (
              <Row key={w.id} last={i === data.items.length - 1} style={{alignItems: 'flex-start', flexDirection: 'column', gap: 8}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch'}}>
                  <View style={{flex: 1, gap: 2}}>
                    <Text style={t.eyebrow}>{w.brand}{w.added_label ? ` · added ${w.added_label}` : ''}</Text>
                    <Text style={[t.title, {fontSize: 20, lineHeight: 23}]}>{w.item}</Text>
                    {w.price_est_cents ? <Text style={[t.num, {fontSize: 13, color: ah.blush}]}>{dollars(w.price_est_cents)} est.</Text> : null}
                  </View>
                  <TextBtn label="Remove" tone={ah.mute} onPress={() => void remove(w.id)} a11y={`Remove ${w.item}`} />
                </View>
                <NovaAskButton label="Price check" kind="price_check" title={`Price check · ${w.item}`} room="wardrobe"
                  details={{title: w.item, brand: w.brand, category: 'fashion', retail_cents: w.price_est_cents ?? 0}} />
              </Row>
            ))}
          </View>
        )}
      </LiveGate>
      <Head>Add a wish</Head>
      <AHInput value={brand} onChangeText={setBrand} placeholder="Brand" accessibilityLabel="Brand" />
      <AHInput value={item} onChangeText={setItem} placeholder="The piece" accessibilityLabel="The piece" />
      <AHInput value={price} onChangeText={setPrice} placeholder="Price estimate, $ (optional)" keyboardType="decimal-pad" accessibilityLabel="Price estimate in dollars" />
      <RowBtn label={busy ? 'Saving…' : 'Add to wishlist'} onPress={() => void add()} disabled={busy || !brand.trim() || !item.trim()} tone={ah.rose} />
      <Status msg={msg} />
    </View>
  );
}

/* ─────────────── signed-out sample ─────────────── */

function WardrobeSample({side}: {side: Side}) {
  const her = side === 'her';
  const [mode, setMode] = useState<'sep' | 'dress'>('sep');
  const [idx, setIdx] = useState<Record<string, number>>({top: 3, bottom: 3, dress: 3});
  const dress = her && mode === 'dress';
  const asPieces = (xs: string[]): Piece[] => xs.map((x) => ({key: x, label: x}));
  const tiers = dress
    ? [{key: 'dress', label: 'DRESS', items: asPieces(DRESS), w: 132, h: 230, row: 250}]
    : [{key: 'top', label: 'TOP', items: asPieces(TOPS[side]), w: 108, h: 128, row: 146}, {key: 'bottom', label: 'BOTTOM', items: asPieces(BOTS[side]), w: 108, h: 128, row: 146}];
  const cur = (tr: (typeof tiers)[number]) => tr.items[idx[tr.key] % tr.items.length].label;
  const outfit = dress ? cur(tiers[0]) : `${cur(tiers[0])} with ${cur(tiers[1]).toLowerCase()}`;
  return (
    <View style={{gap: 14, marginTop: 14}}>
      {her ? <Segmented options={[['sep', 'Top + bottom'], ['dress', 'Dress']]} value={mode} onChange={setMode} /> : null}
      <View style={{height: 2, borderRadius: 1, backgroundColor: ah.platinum, opacity: 0.55, marginTop: 4}} />
      {tiers.map((tr) => (
        <Tier key={tr.key} label={tr.label} items={tr.items} w={tr.w} h={tr.h} row={tr.row} index={idx[tr.key]}
          onMove={(d) => setIdx((x) => ({...x, [tr.key]: (x[tr.key] + d + tr.items.length) % tr.items.length}))} />
      ))}
      <View style={{alignItems: 'center', gap: 6, paddingHorizontal: 12, marginTop: 4}}>
        <AHEyebrow color={ah.rose}>Tonight</AHEyebrow>
        <View accessibilityLiveRegion="polite"><AHTitle size={30} style={{textAlign: 'center'}}>{outfit}</AHTitle></View>
      </View>
      <Text style={[s.small, {textAlign: 'center'}]}>Sign in to turn your own looks on the rail.</Text>
      <SampleNote>Sample rack · signed out · your own looks, the floor and your wishlist appear once you sign in</SampleNote>
    </View>
  );
}

/* ─────────────── the rail ─────────────── */

function Tier({label, items, w, h, row, index, onMove}: {label: string; items: Piece[]; w: number; h: number; row: number; index: number; onMove: (d: 1 | -1) => void}) {
  const W = useAvailableWidth();
  const reduce = useReducedMotion();
  const gap = 12;
  const rail = useAnimatedStyle(() => ({transform: [{translateX: withTiming(W / 2 - w / 2 - index * (w + gap), {duration: reduce ? 0 : 600})}]}));
  const name = label === 'TOP' ? 'top' : label === 'BOTTOM' ? 'bottom' : label === 'DRESS' ? 'dress' : 'look';
  return (
    <View style={{height: row, overflow: 'hidden'}}>
      <Animated.View style={[{position: 'absolute', left: 0, top: (row - h) / 2, flexDirection: 'row', gap}, rail]}>
        {items.map((piece, i) => {
          const d = Math.abs(i - index);
          return (
            <View key={piece.key} style={{width: w, height: h, opacity: d === 0 ? 1 : d === 1 ? 0.5 : 0.22, transform: [{scale: d === 0 ? 1 : 0.86}]}}>
              <View style={{flex: 1, borderRadius: 18, borderWidth: 1, borderColor: d === 0 ? 'rgba(255,255,255,0.3)' : ah.line, backgroundColor: d === 0 ? ah.ink3 : ah.ink2, alignItems: 'center', justifyContent: 'center', padding: piece.photo ? 0 : 10, gap: 8, overflow: 'hidden'}}>
                {piece.photo ? (
                  <Image source={{uri: piece.photo}} style={{width: '100%', height: '100%'}} resizeMode="cover" accessibilityLabel={piece.label} />
                ) : (
                  <>
                    <Icon name={label === 'BOTTOM' ? 'scale' : label === 'DRESS' ? 'sparkles' : 'shirt'} size={d === 0 ? 30 : 22} color={d === 0 ? ah.rose : ah.platinum} strokeWidth={1.2} />
                    <Text style={{fontFamily: ahFonts.serif, fontSize: 15, lineHeight: 17, color: ah.text, textAlign: 'center'}} numberOfLines={2}>{piece.label}</Text>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </Animated.View>
      <View style={{position: 'absolute', left: 0, top: 0, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(5,5,5,0.85)', borderWidth: 1, borderColor: ah.line2}}>
        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10, letterSpacing: 1.4, color: ah.mute}}>{label}</Text>
      </View>
      {items.length > 1 ? <ArrowBtn side="left" onPress={() => onMove(-1)} label={`Previous ${name}`} row={row} /> : null}
      {items.length > 1 ? <ArrowBtn side="right" onPress={() => onMove(1)} label={`Next ${name}`} row={row} /> : null}
    </View>
  );
}

function ArrowBtn({side, onPress, label, row}: {side: 'left' | 'right'; onPress: () => void; label: string; row: number}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({pressed}) => ({position: 'absolute', [side]: 0, top: row / 2 - 22, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: ah.line2, backgroundColor: 'rgba(12,12,14,0.9)', alignItems: 'center', justifyContent: 'center', transform: [{scale: pressed ? 0.94 : 1}]})}>
      <Text style={{color: ah.text, fontSize: 18, fontFamily: ahFonts.sans}}>{side === 'left' ? '←' : '→'}</Text>
    </Pressable>
  );
}
