// The Lounge — After Hours (mirrors web src/app/(hotel)/lounge/lounge-view.tsx): "Who's out." with the
// city-tonight card, members on the floor in chrome/rose rings with score bars, the house rules, and the
// moments feed with a glass composer. Signed in it is live, from the same sources as the web Lounge page
// (lib/rooms/lounge.ts): members from profiles ranked by the same compat score, moments from /api/posts with
// likes, the composer POST /api/posts, and the open outings members host. Every member post, profile and outing
// carries Report / Block (components/rooms/moderation.tsx) and the first post asks for the house rules & terms.
// After Dark and the Score have no service yet: dev builds show them as "opening soon", the store build hides the
// tabs (RELEASE.loungeAfterDark / loungeScore). No sample dating profiles or named "score" people exist anywhere.
// Signed out, the room is the labelled sample.
import {useState, type ReactNode} from 'react';
import {Pressable, ScrollView, Share, Text, TextInput, View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import {failure, useLive} from '@/lib/live';
import {likePost, postMoment, readLounge, readOpenOutings, type LoungeData, type LoungeOuting, type Post} from '@/lib/rooms/lounge';
import {needsTerms} from '@/lib/rooms/moderation';
import {IS_STORE_BUILD, RELEASE} from '@/lib/release';
import {ago, memberName} from '@/lib/rooms/logic';
import {type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {AHCard, AHChip, AHDisplay, AHEyebrow, AHLiveDot, AHPill, AHRing, AHSmoke} from '@/components/ah';
import {Chips, SampleNote, Segmented, s, sentence} from './shared';
import {LiveGate, Status} from './live';
import {ModerationMenu, useHouseRules} from './moderation';


/* ───────────────────────── small pieces ───────────────────────── */
const ROSE_BAR = ah.rose;

function Eyebrow({children, action}: {children: ReactNode; action?: ReactNode}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18}}>
      <AHEyebrow>{children}</AHEyebrow>
      {action}
    </View>
  );
}

/** Thin rose bar, value 0–100. */
function Bar({value, color = ROSE_BAR, h = 3}: {value: number; color?: string; h?: number}) {
  return (
    <View style={{height: h, borderRadius: h, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', alignSelf: 'stretch'}}>
      <View style={{height: h, borderRadius: h, width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color}} />
    </View>
  );
}

/** A ring with a soft rose halo when selected. */
function Ring({name, size, on}: {name: string; size: number; on?: boolean}) {
  return (
    <View style={{borderRadius: size, shadowColor: ah.rose2, shadowOpacity: on ? 0.8 : 0, shadowRadius: 14, shadowOffset: {width: 0, height: 0}}}>
      <AHRing name={name} size={size} label={false} />
    </View>
  );
}

/** The moment / note card (web CallingCard). */
function Moment({who, when, text, me, menu}: {who: string; when: string; text: string; me?: boolean; menu?: ReactNode}) {
  return (
    <AHCard pad={18} style={me ? {borderColor: 'rgba(232,180,160,0.35)', backgroundColor: 'rgba(183,110,121,0.08)'} : undefined}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <AHRing name={who} size={40} label={false} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text numberOfLines={1} style={{fontFamily: ahFonts.sansBold, fontSize: 15, color: ah.text}}>{who}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2}}>
            <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: me ? ah.rose : when === 'Live' ? ah.ok : ah.rose2}} />
            <Text style={{fontFamily: ahFonts.sans, fontSize: 12, color: ah.mute}}>{when}</Text>
          </View>
        </View>
        {menu}
      </View>
      <Text style={{marginTop: 12, fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: ah.text}}>{text}</Text>
    </AHCard>
  );
}

const RULES: Array<[string, string]> = [
  // Same five rules as the web Lounge (src/app/(hotel)/lounge/lounge-view.tsx).
  ['I', 'Discretion is the house currency.'],
  ['II', 'No business on the floor — the Concierge keeps your affairs.'],
  ['III', 'What is said at the table stays at the table.'],
  ['IV', 'Every member is a guest of the house. Courtesy, without exception.'],
  ['V', "A member's word is their marker."],
];

function HouseRules() {
  return (
    <AHCard pad={22} style={{gap: 12}}>
      <AHEyebrow style={{marginBottom: 2}}>House rules</AHEyebrow>
      {RULES.map(([n, t]) => (
        <View key={n} style={{flexDirection: 'row', alignItems: 'baseline'}}>
          <Text style={{width: 32, fontFamily: ahFonts.serifItalic, fontSize: 16, color: ah.rose}}>{n}</Text>
          <Text style={{flex: 1, fontFamily: ahFonts.serif, fontSize: 19, lineHeight: 24, color: ah.text}}>{t}</Text>
        </View>
      ))}
    </AHCard>
  );
}

/** A card in the floor grid: ring, name, line, score bar. */
function MemberCard({name, score, dist, on, onPress, width}: {name: string; score: number; dist: string; on: boolean; onPress: () => void; width: number}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, ${dist}, match ${score}`} accessibilityState={{selected: on}}
      style={({pressed}) => ({width, alignItems: 'center', paddingTop: 18, paddingBottom: 14, paddingHorizontal: 12, borderRadius: radius.card,
        backgroundColor: on ? 'rgba(183,110,121,0.12)' : ah.ink2, borderWidth: 1, borderColor: on ? 'rgba(232,180,160,0.5)' : ah.line, opacity: pressed ? 0.85 : 1})}>
      <Ring name={name} size={60} on={on} />
      <Text numberOfLines={1} style={{marginTop: 10, fontFamily: ahFonts.serif, fontSize: 21, lineHeight: 23, color: ah.text}}>{name}</Text>
      <Text style={{marginTop: 2, fontFamily: ahFonts.sans, fontSize: 12, color: ah.mute}}>{dist}</Text>
      <View style={{marginTop: 12, alignSelf: 'stretch'}}><Bar value={score} /></View>
      <Text style={{marginTop: 6, fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 0.8, color: ah.rose}}>Match {score}</Text>
    </Pressable>
  );
}

/* ───────────────────────── data ───────────────────────── */
type Mode = 'social' | 'outings' | 'dating' | 'score';
type Person = [string, number, string, string];
const CLUSTERS: Array<[string, string, string, Person[]]> = [
  ['Your circle', 'Friends', ah.ok, [['Maya', 92, '0.3 mi', 'Friends since 2024 · both at the Jazz Club tonight'], ['Theo', 88, '1.1 mi', 'Friends · saved you a seat in the Ballroom'], ['Sana', 85, '2 mi', 'Friends · arriving 9:30']]],
  ['Like-minded', 'Same style + interests', ah.rose, [['Inès', 90, '0.8 mi', 'Both: Old Hollywood, gold hardware, jazz'], ['Kofi', 84, '1.4 mi', 'Both: vintage watches, first editions'], ['Lena', 81, '2.2 mi', 'Both: tailoring, gallery openings'], ['Ravi', 79, '3 mi', 'Both: travel, quiet luxury']]],
  ['You might bump into', 'Nearby, not yet met', ah.platinum, [['Noor', 76, '0.2 mi', 'Two tables over at Lucian'], ['Elio', 72, '0.5 mi', 'At the bar downstairs'], ['Ada', 70, '0.9 mi', 'Leaving the gallery on Peachtree']]],
];
const GEO = {NEARBY: 'Buckhead · 3 mi', CITY: 'Atlanta', ANYWHERE: 'All houses'} as const;
type Rad = keyof typeof GEO;
const CHAT: Array<[string, string, boolean]> = [['MAYA · 8:12 PM', 'Who’s at Lucian? The bar is perfect right now.', false], ['KOFI · 8:20 PM', 'Jazz Club late set starts 10:30. Worth it.', false], ['INÈS · 8:31 PM', 'Gallery on Peachtree has the after-party upstairs.', false]];
const PLACES = ['Lucian', 'Jazz Club', 'Gallery on Peachtree', 'Rooftop at Lumen'];
const VIS = ['Circle', 'Like-minded', 'Room'];
const OUTINGS: Array<[string, string, string, string, number, number, string]> = [
  ['Fri · 8:00 PM', 'Maya', 'Drinks before the late set', 'Bar Céleste → Jazz Club', 4, 8, 'Group rate $45 pp at 6+'],
  ['Sat · 11:00 AM', 'Inès', 'Gallery walk and brunch', 'Westside galleries, brunch at Nove', 5, 10, ''],
  ['Sun · 2:00 PM', 'Kofi', 'Vintage watch fair', 'The Exchange pop-up, Midtown', 3, 12, 'Members enter free'],
];
const toggle = (l: string[], k: string) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]);
// After Dark (dating) and the Score need a full safety set before they ship: hidden in the store build.
const MODES: Array<[Mode, string]> = [
  ['social', 'Lounge'], ['outings', 'Outings'],
  ...(RELEASE.loungeAfterDark ? [['dating', 'After Dark'] as [Mode, string]] : []),
  ...(RELEASE.loungeScore ? [['score', 'Score'] as [Mode, string]] : []),
];

/** The one card After Dark and the Score show in dev builds — no people, no numbers. */
function OpeningSoon({mode}: {mode: Mode}) {
  return (
    <Animated.View entering={FadeIn.duration(350)}>
      <AHCard style={{gap: 8}}>
        <AHEyebrow color={ah.rose}>{mode === 'dating' ? 'After Dark' : 'The Score'}</AHEyebrow>
        <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 24, lineHeight: 28, color: ah.text}}>Opening soon.</Text>
        <Text style={s.small}>{mode === 'dating'
          ? 'After Dark opens to verified members once verification and its safety tools are live. No profiles are shown until it does.'
          : 'Nothing is scored or shown until the service and its safeguards are live.'}</Text>
      </AHCard>
    </Animated.View>
  );
}
/** "MAYA · 8:12 PM" → ["Maya", "8:12 PM"] */
const splitWho = (who: string): [string, string] => {
  const [n, ...rest] = who.split(' · ');
  const name = n.toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return [name, sentence(rest.join(' · '))];
};

const Card = ({children, style}: {children: ReactNode; style?: StyleProp<ViewStyle>}) => <AHCard style={[{gap: 10}, style]}>{children}</AHCard>;

/* ───────────────────────── the room ───────────────────────── */
export function Lounge({side: _side}: {side: Side}) {
  const {live, reload} = useLive<LoungeData>(null, readLounge);
  return (
    <LiveGate live={live} reload={() => void reload()} what="the Lounge" signedOut={<View style={{marginTop: 14}}><LoungeSample /></View>}>
      {(data) => <LoungeLive data={data} reload={() => reload(true)} />}
    </LiveGate>
  );
}

/* ───────────────────────── signed-in: the live room ───────────────────────── */
function LoungeLive({data, reload}: {data: LoungeData; reload: () => Promise<void>}) {
  const [mode, setMode] = useState<Mode>('social');
  const [pick, setPick] = useState<string | null>(data.members[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  // Members blocked from a ••• menu leave the room at once (the server hides them on the next read too).
  const [gone, setGone] = useState<string[]>([]);
  const rules = useHouseRules();
  const authorOf = (p: Post) => p.author_id ?? p.profiles?.id ?? null;
  const members = data.members.filter((m) => !gone.includes(m.id));
  const posts = data.posts.filter((p) => !gone.includes(authorOf(p) ?? ''));
  const blocked = (id: string | null) => { if (id) setGone((g) => [...g, id]); void reload(); };
  const sel = members.find((m) => m.id === pick) ?? members[0];
  const send = async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setMsg(null);
    // The house rules & terms sheet, once, before a member's first post.
    if (!(await rules.ensure())) return;
    setPosting(true);
    let r = await postMoment(text);
    if (needsTerms(r)) {
      if (!(await rules.require())) { setPosting(false); setMsg({ok: false, text: 'Accept the house rules to post. Nothing was posted.'}); return; }
      r = await postMoment(text);
    }
    setPosting(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was posted.')}); return; }
    setDraft('');
    void reload();
  };
  const like = async (p: Post) => {
    const was = liked[p.id] ?? !!p.liked_by_me;
    setLiked((l) => ({...l, [p.id]: !was}));
    const r = await likePost(p.id);
    if (!r.ok) { setLiked((l) => ({...l, [p.id]: was})); setMsg({ok: false, text: failure(r.status, r.body)}); }
    else if (typeof r.body.liked === 'boolean') setLiked((l) => ({...l, [p.id]: r.body.liked as boolean}));
  };
  return (
    <View style={{gap: 14}}>
      {rules.sheet}
      <View>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <AHEyebrow>The Lounge</AHEyebrow>
          <AHChip label="Members only" />
        </View>
        <AHDisplay size={52} style={{marginTop: 8}}>Who’s out.</AHDisplay>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8}}>
          <AHLiveDot />
          <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: ah.mute}}>{members.length} members on the floor</Text>
        </View>
      </View>
      {/* The live map is web-only for now; store builds leave the card out rather than point elsewhere. */}
      {IS_STORE_BUILD ? null : (
        <View accessible accessibilityLabel="The city, tonight. The live map is on the web.">
          <AHSmoke tone="city" aspect={4 / 2.3} top={<AHChip label="Live map · on the web" />}>
            <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 34, lineHeight: 36, color: ah.white}}>The city, tonight.</Text>
            <Text style={{marginTop: 6, fontFamily: ahFonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.72)'}}>Who’s out, and where the night is. The live map is on the web for now.</Text>
          </AHSmoke>
        </View>
      )}
      <View style={{marginTop: 6}}><Segmented options={MODES} value={mode} onChange={setMode} /></View>

      {mode === 'social' ? (
        <Animated.View entering={FadeIn.duration(350)} style={{gap: 14}}>
          <Eyebrow>{`On the floor · ${members.length}`}</Eyebrow>
          {members.length === 0 ? (
            <AHCard><Text style={{fontFamily: ahFonts.serifItalic, fontSize: 22, color: ah.text}}>The floor is quiet tonight.</Text><Text style={[s.small, {marginTop: 6}]}>No other member is in the Lounge yet.</Text></AHCard>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12, paddingRight: 8}} style={{marginHorizontal: -2}}>
              {members.map((m) => <MemberCard key={m.id} name={memberName(m)} score={m.score} dist={m.city ?? (m.vibe ?? 'Member')} on={m.id === sel?.id} width={148} onPress={() => setPick(m.id)} />)}
            </ScrollView>
          )}
          {sel ? (
            <Animated.View key={sel.id} entering={FadeInDown.duration(350)}>
              <AHCard glass pad={20} style={{gap: 12, borderColor: 'rgba(232,180,160,0.28)'}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
                  <Ring name={memberName(sel)} size={64} on />
                  <View style={{flex: 1}}>
                    <AHEyebrow>{[sel.city, sel.vibe].filter(Boolean).join(' · ') || 'Member'}</AHEyebrow>
                    <Text style={{marginTop: 2, fontFamily: ahFonts.serif, fontSize: 30, lineHeight: 32, color: ah.text}}>{memberName(sel)}</Text>
                  </View>
                  <ModerationMenu kind="profile" targetId={sel.id} memberId={sel.id} name={memberName(sel)} own={sel.id === data.me} onBlocked={() => blocked(sel.id)} />
                </View>
                {sel.interests?.length ? <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>{sel.interests.slice(0, 6).map((i) => <AHChip key={i} label={i} tone="outline" />)}</View> : null}
                <View style={{gap: 6}}>
                  <Bar value={sel.score} />
                  <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 11, letterSpacing: 0.4, color: ah.mute}}>Match {sel.score} · from shared vibe, city and interests</Text>
                </View>
                {IS_STORE_BUILD ? null : <Text style={s.small}>Introductions open soon. Until then, say hello in the moments below.</Text>}
              </AHCard>
            </Animated.View>
          ) : null}
          <View style={{marginTop: 10}}><HouseRules /></View>
          <Eyebrow>Moments</Eyebrow>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18, paddingRight: 6, paddingVertical: 6, borderRadius: radius.card, backgroundColor: 'rgba(22,22,24,0.78)', borderWidth: 1, borderColor: ah.line2}}>
            <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 500))} onSubmitEditing={() => void send()} placeholder="Share a moment with the lounge…" placeholderTextColor={ah.faint} selectionColor={ah.rose} accessibilityLabel="Moment"
              returnKeyType="send" style={{flex: 1, minHeight: 44, fontFamily: ahFonts.sans, fontSize: 15, color: ah.text}} />
            <AHPill small label={posting ? '…' : 'Post'} onPress={() => void send()} disabled={!draft.trim() || posting} accessibilityLabel="Post the moment" />
          </View>
          <Status msg={msg} />
          {data.postsError ? <Text style={s.small}>{data.postsError}</Text> : posts.length === 0 ? (
            <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 18, color: ah.mute}}>No moments yet — be the first.</Text>
          ) : (
            <View style={{gap: 12}}>
              {posts.map((p) => {
                const on = liked[p.id] ?? !!p.liked_by_me;
                const n = Math.max(0, (p.likes_count ?? 0) + (liked[p.id] === undefined ? 0 : (on ? 1 : 0) - (p.liked_by_me ? 1 : 0)));
                const author = authorOf(p);
                const mine = author === data.me;
                return (
                  <Animated.View key={p.id} entering={FadeInDown.duration(300)} layout={LinearTransition} style={{gap: 6}}>
                    <Moment who={mine ? 'You' : memberName(p.profiles)} when={ago(p.created_at)} text={p.content} me={mine}
                      menu={<ModerationMenu kind="post" targetId={p.id} memberId={author} name={memberName(p.profiles)} own={mine} onBlocked={() => blocked(author)} />} />
                    <View style={{flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8}}>
                      <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 12, color: ah.mute}}>{n} {n === 1 ? 'like' : 'likes'}</Text>
                      <Pressable onPress={() => void like(p)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={on ? 'Unlike' : 'Like'} style={{minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center'}}>
                        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 14, color: on ? ah.rose : ah.text}}>{on ? '♥' : '♡'}</Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
          <Text style={{marginTop: 18, textAlign: 'center', fontFamily: ahFonts.serifItalic, fontSize: 18, color: ah.mute}}>The music is low. The company is right.</Text>
        </Animated.View>
      ) : mode === 'outings' ? <LiveOutings me={data.me} /> : <OpeningSoon mode={mode} />}
    </View>
  );
}

function LiveOutings({me}: {me: string}) {
  const {live, reload} = useLive<{outings: LoungeOuting[]}>(null, readOpenOutings);
  const [gone, setGone] = useState<string[]>([]);
  return (
    <Animated.View entering={FadeIn.duration(350)} style={{gap: 12}}>
      <LiveGate live={live} reload={() => void reload()} what="the outings">
        {(d) => d.outings.length === 0 ? (
          <AHCard><Text style={{fontFamily: ahFonts.serifItalic, fontSize: 22, color: ah.text}}>No open outings — plan one.</Text><Text style={[s.small, {marginTop: 6}]}>Plan an outing in the Registry and it shows here.</Text></AHCard>
        ) : (
          <View style={{gap: 12}}>
            {d.outings.filter((o) => !gone.includes(o.host_id)).map((o) => (
              <AHCard key={o.id} pad={18} style={{gap: 6, borderColor: o.host_id === me ? 'rgba(232,180,160,0.45)' : ah.line}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
                  <AHEyebrow color={o.host_id === me ? ah.rose : ah.mute}>{o.host_id === me ? 'Hosted by you' : (o.occasion_type || 'Outing')}</AHEyebrow>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    {o.date_at ? <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12, color: ah.text}}>{new Date(o.date_at).toLocaleString([], {weekday: 'short', hour: 'numeric', minute: '2-digit'})}</Text> : null}
                    <ModerationMenu kind="outing" targetId={o.id} memberId={o.host_id} name="the host" own={o.host_id === me}
                      onBlocked={() => { setGone((g) => [...g, o.host_id]); void reload(true); }} />
                  </View>
                </View>
                <Text style={{fontFamily: ahFonts.serif, fontSize: 22, lineHeight: 25, color: ah.text}}>{o.title}</Text>
                {o.note ? <Text style={s.small}>{o.note}</Text> : null}
              </AHCard>
            ))}
            {IS_STORE_BUILD ? null : <Text style={s.small}>Joining an outing from the app opens soon.</Text>}
          </View>
        )}
      </LiveGate>
    </Animated.View>
  );
}

/* ───────────────────────── signed-out: the labelled sample ───────────────────────── */
function LoungeSample() {
  const [mode, setMode] = useState<Mode>('social');
  const [rad, setRad] = useState<Rad>('NEARBY');
  const [pick, setPick] = useState('Inès');
  const [hellos, setHellos] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [place, setPlace] = useState('Jazz Club');
  const [vis, setVis] = useState('Circle');
  const [shared, setShared] = useState(false);
  const [mine, setMine] = useState(false);
  const [ins, setIns] = useState<string[]>([]);

  const geo = GEO[rad];
  let sel: Person = CLUSTERS[1][3][0];
  CLUSTERS.forEach((c) => c[3].forEach((p) => { if (p[0] === pick) sel = p; }));
  const send = () => { const t = draft.trim().slice(0, 140); if (t) { setMsgs((m) => [...m, t]); setDraft(''); } };
  const outings = [...(mine ? [['Fri · 9:30 PM', 'You', `Late table at ${place}`, `${place} · open to ${vis.toLowerCase()}`, 0, 6, ''] as (typeof OUTINGS)[number]] : []), ...OUTINGS];
  const feed: Array<[string, string, boolean]> = [...msgs.map((t) => ['YOU · NOW', t, true] as [string, string, boolean]).reverse(), ...CHAT];

  return (
    <View style={{gap: 14}}>
      {/* header */}
      <View>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <AHEyebrow>The Lounge</AHEyebrow>
          <AHChip label="Members only" />
        </View>
        <AHDisplay size={52} style={{marginTop: 8}}>Who’s out.</AHDisplay>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8}}>
          <AHLiveDot />
          <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: ah.mute}}>42 in the room tonight · sample</Text>
        </View>
      </View>

      {/* the city tonight (the live map is web-only for now) */}
      {IS_STORE_BUILD ? null : (
        <View accessible accessibilityLabel="The city, tonight. The live map is coming to the app.">
          <AHSmoke tone="city" aspect={4 / 2.3} top={<AHChip label="Live map · on the web" />}>
            <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 34, lineHeight: 36, color: ah.white}}>The city, tonight.</Text>
            <Text style={{marginTop: 6, fontFamily: ahFonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.72)'}}>Who’s out, and where the night is. The live map is coming to the app.</Text>
          </AHSmoke>
        </View>
      )}

      <View style={{marginTop: 6}}>
        <Segmented options={MODES} value={mode} onChange={setMode} />
      </View>

      {mode === 'social' ? (
        <Animated.View entering={FadeIn.duration(350)} style={{gap: 14}}>
          <Segmented options={(Object.keys(GEO) as Rad[]).map((k) => [k, sentence(k)] as [Rad, string])} value={rad} onChange={setRad} />
          {CLUSTERS.map(([label, why, color, people], ci) => (
            <Animated.View key={label} entering={FadeInDown.delay(ci * 90).duration(400)} style={{gap: 12}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10}}>
                <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: color}} />
                <AHEyebrow>{label}</AHEyebrow>
                <Text style={{fontFamily: ahFonts.sans, fontSize: 12, color: ah.faint}}>· {why}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12, paddingRight: 8}} style={{marginHorizontal: -2}}>
                {people.map(([name, score, dist]) => <MemberCard key={name} name={name} score={score} dist={dist} on={name === pick} width={148} onPress={() => setPick(name)} />)}
              </ScrollView>
            </Animated.View>
          ))}

          <Animated.View key={sel[0]} entering={FadeInDown.duration(350)}>
            <AHCard glass pad={20} style={{gap: 14, borderColor: 'rgba(232,180,160,0.28)'}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
                <Ring name={sel[0]} size={64} on />
                <View style={{flex: 1}}>
                  <AHEyebrow>Selected · {sel[2]}</AHEyebrow>
                  <Text style={{marginTop: 2, fontFamily: ahFonts.serif, fontSize: 30, lineHeight: 32, color: ah.text}}>{sel[0]}</Text>
                </View>
              </View>
              <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 19, lineHeight: 24, color: ah.text}}>{sel[3]}</Text>
              <View style={{gap: 6}}>
                <Bar value={sel[1]} />
                <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 11, letterSpacing: 0.4, color: ah.mute}}>Match {sel[1]} · from shared style and interests</Text>
              </View>
              {/* Introductions have no service yet: the store build leaves the sample control out. */}
              {IS_STORE_BUILD ? null : <AHPill block variant={hellos.includes(sel[0]) ? 'ghost' : 'solid'} label={hellos.includes(sel[0]) ? `Hello sent to ${sel[0]}` : 'Say hello'} onPress={() => setHellos((h) => toggle(h, sel[0]))} />}
            </AHCard>
          </Animated.View>

          <View style={{marginTop: 10}}><HouseRules /></View>

          <Eyebrow>{`Moments · ${geo}`}</Eyebrow>
          {/* glass composer */}
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18, paddingRight: 6, paddingVertical: 6, borderRadius: radius.card, backgroundColor: 'rgba(22,22,24,0.78)', borderWidth: 1, borderColor: ah.line2}}>
            <TextInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 140))} onSubmitEditing={send} placeholder="Share a moment with the lounge…" placeholderTextColor={ah.faint} selectionColor={ah.rose} accessibilityLabel="Message"
              returnKeyType="send" style={{flex: 1, minHeight: 44, fontFamily: ahFonts.sans, fontSize: 15, color: ah.text}} />
            <AHPill small label="Post" onPress={send} disabled={!draft.trim()} accessibilityLabel="Send" />
          </View>
          <View style={{gap: 12}}>
            {feed.map(([who, t, me], i) => {
              const [n, when] = me ? ['You', 'Just now'] : splitWho(who);
              return (
                <Animated.View key={`${who}${i}${t.length}`} entering={FadeInDown.duration(400)} layout={LinearTransition}>
                  <Moment who={n} when={when} text={t} me={me} />
                </Animated.View>
              );
            })}
          </View>
          <Text style={{marginTop: 18, textAlign: 'center', fontFamily: ahFonts.serifItalic, fontSize: 18, color: ah.mute}}>The music is low. The company is right.</Text>
          <SampleNote>SAMPLE ROOM · PEOPLE AND CHAT ARE ILLUSTRATIVE · YOUR MESSAGES STAY ON THIS DEVICE UNTIL ROOM CHAT GOES LIVE</SampleNote>
        </Animated.View>
      ) : null}

      {mode === 'outings' ? (
        <Animated.View entering={FadeIn.duration(350)} style={{gap: 14}}>
          <Card>
            <AHEyebrow>Where are you going?</AHEyebrow>
            <Chips options={PLACES} value={place} onChange={(v) => { setPlace(v); setShared(false); }} />
            <AHEyebrow style={{marginTop: 6}}>Who can see</AHEyebrow>
            <Chips options={VIS} value={vis} onChange={(v) => { setVis(v); setShared(false); }} />
            <AHPill block style={{marginTop: 6}} variant={shared ? 'ghost' : 'solid'} label={shared ? `Shared with ${vis.toLowerCase()} · ${place}` : `Share · I’m going to ${place}`}
              onPress={() => { if (!shared) setMsgs((m) => [...m, `Heading to ${place} tonight.`]); setShared(!shared); }} />
          </Card>
          <Eyebrow action={<Pressable onPress={() => setMine(true)} accessibilityRole="button" hitSlop={12} style={{minHeight: 44, justifyContent: 'center'}}><Text style={{fontFamily: ahFonts.sansSemi, fontSize: 13, color: ah.rose}}>+ Plan one</Text></Pressable>}>Group outings</Eyebrow>
          {outings.map(([when, host, title, where, n, cap, deal], oi) => {
            const you = host === 'You', joined = you || ins.includes(title), cnt = n + (joined ? 1 : 0);
            return (
              <Animated.View key={title} entering={FadeInDown.delay(oi * 80).duration(400)} layout={LinearTransition}>
                <AHCard pad={18} style={{gap: 8, borderColor: joined ? 'rgba(232,180,160,0.45)' : ah.line}}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <AHEyebrow color={joined ? ah.rose : ah.mute}>{you ? 'Hosted by you' : `Hosted by ${host}`}</AHEyebrow>
                    <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12, color: ah.text}}>{when}</Text>
                  </View>
                  <Text style={{fontFamily: ahFonts.serif, fontSize: 24, lineHeight: 26, color: ah.text}}>{title}</Text>
                  <Text style={{fontFamily: ahFonts.sans, fontSize: 13, color: ah.mute}}>{where}</Text>
                  {deal ? <AHChip label={deal} tone="rose" /> : null}
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4}}>
                    <View style={{flexDirection: 'row'}}>
                      {Array.from({length: Math.min(4, cnt)}, (_, kk) => <View key={kk} style={{width: 22, height: 22, borderRadius: 11, marginLeft: kk ? -7 : 0, borderWidth: 2, borderColor: ah.ink2, backgroundColor: joined && kk === 0 ? ah.rose : ['#3A3A40', '#55565C', '#2A2A2F', '#6D7076'][kk]}} />)}
                    </View>
                    <Text style={{flex: 1, fontFamily: ahFonts.sansMedium, fontSize: 12, color: ah.mute}}>{cnt} going · {cap - cnt} left</Text>
                  </View>
                  <Bar value={Math.round((cnt / cap) * 100)} />
                  {IS_STORE_BUILD && !you ? null : (
                    <AHPill small block style={{marginTop: 6}} variant={you ? 'ghost' : joined ? 'rose' : 'solid'} label={you ? 'Invite more' : joined ? 'You’re in' : 'I’m in'}
                      onPress={() => { if (you) Share.share({message: `Join me: ${title} — finesselife.vip`}).catch(() => {}); else setIns((l) => toggle(l, title)); }} />
                  )}
                </AHCard>
              </Animated.View>
            );
          })}
          <SampleNote>{IS_STORE_BUILD ? 'SAMPLE OUTINGS · SIGN IN TO SEE THE OUTINGS MEMBERS HOST' : 'SAMPLE OUTINGS · JOINING HERE IS A PREVIEW UNTIL OUTINGS GO LIVE'}</SampleNote>
        </Animated.View>
      ) : null}

      {mode === 'dating' || mode === 'score' ? <OpeningSoon mode={mode} /> : null}
    </View>
  );
}

// Shared with the Concierge room: the After Hours solid pill.
export const btn = {minHeight: 52, paddingHorizontal: 22, borderRadius: 999, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: ah.white};
export const btnText = {fontFamily: ahFonts.sansSemi, fontSize: 15, letterSpacing: 0.2, color: '#000'};
