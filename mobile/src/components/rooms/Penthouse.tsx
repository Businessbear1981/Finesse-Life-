// The Penthouse interior, After Hours (shown after the Private Lift opens; mirrors web vip/penthouse/penthouse-scene.tsx) — the INNER
// CIRCLE (vip_posts, read like the web /vip room — VIP-only by RLS), YOUR FLOOR (call up a service: Nova drafts a plan through
// the orchestrator, nothing booked) and HANDYMAN (no service partner is connected, so Nova drafts what to do — no one is dispatched). Also "This Is You", the portrait room:
// exactly what other members can see. Signed in it is live — GET /api/identity/context (the public view is
// computed by the server from the allowlist), PATCH /api/identity/projections and /visibility, and the
// GET /api/identity/export download, plus a read-only membership line (GET /api/billing/status). Per App
// Store 3.1.1 the app never sells or links to buying the membership. Samples are labelled; nothing is
// dispatched or paid.
import {useId, useState, type ReactNode} from 'react';
import {Image, Pressable, Share, Text, View, useWindowDimensions} from 'react-native';
import Animated, {FadeIn, FadeInDown, useAnimatedStyle, withTiming} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {api} from '@/lib/api';
import {BILLING_STATUS_PATH, VIP_SOURCE_LABEL, formatDate, type BillingStatus} from '@/lib/billing';
import {track, type Side} from '@/lib/deco';
import {ah, ahFonts, radius} from '@/lib/ah';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {AHCard, AHDisplay, AHEyebrow, AHInput, AHLiveDot, AHMark, AHPill, AHRing, AHSmoke} from '@/components/ah';
import {NightView} from '@/components/lift/LiftScene';
import {ActionBar, Chips, SampleNote, SectionHead, Segmented, s, sentence} from './shared';
import {LiveGate, RowBtn, Status} from './live';
import {PlanWithNova} from './plan-with-nova';
import {readVipFeed, postVip, type VipPost} from '@/lib/rooms/vip';
import {needsTerms} from '@/lib/rooms/moderation';
import {RELEASE} from '@/lib/release';
import {ModerationMenu, useHouseRules} from './moderation';

const SERVICES: Array<[string, string, string]> = [['chef', 'Private chef', 'Dinners at home, menus from your macros'], ['concierge', 'Human concierge', 'A person, any hour'], ['jet', 'Jet & yacht desk', 'Charters on a day’s notice'], ['art', 'Art advisor', 'Acquisitions and loans'], ['security', 'Security detail', 'Discreet, on request'], ['screen', 'Screening room', 'Private premieres'], ['cellar', 'Wine cellar', 'Allocations and storage'], ['spa', 'Wellness suite', 'In-home treatments']];
const JOBS: Array<[string, string, string]> = [['plumbing', 'Plumbing', 'droplets'], ['electrical', 'Electrical', 'zap'], ['locks', 'Locks & doors', 'lock'], ['appliance', 'Appliances', 'refrigerator'], ['ac', 'Heat & AC', 'thermometer'], ['tv', 'TV & Wi-Fi', 'wifi'], ['car', 'Car trouble', 'car'], ['hang', 'Hang & mount', 'hammer'], ['anything', 'Anything else', 'wrench']];

/** The Penthouse hero: the city at night through floor-to-ceiling glass (web penthouse-scene.tsx). */
function PenthouseHero() {
  const insets = useSafeAreaInsets();
  const W = Math.min(useWindowDimensions().width, 760);
  const H = 300;
  const fadeId = `phf${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View>
      <View style={{height: H, width: '100%', overflow: 'hidden'}} aria-hidden>
        <View style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center'}}><View style={{width: W, height: H}}><NightView width={W} height={H} glow={0.75} /></View></View>
        {/* glass mullions + fade into the floor */}
        {[1 / 3, 2 / 3].map((f) => <View key={f} style={{position: 'absolute', top: 0, bottom: 0, left: `${f * 100}%`, width: 1, backgroundColor: 'rgba(255,255,255,0.08)'}} />)}
        <View style={{position: 'absolute', left: 0, right: 0, top: H * 0.42, height: 1, backgroundColor: 'rgba(255,255,255,0.08)'}} />
        <Svg width="100%" height={H} style={{position: 'absolute'}}>
          <Defs><LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1"><Stop offset="0.4" stopColor={ah.ink} stopOpacity={0} /><Stop offset="1" stopColor={ah.ink} stopOpacity={1} /></LinearGradient></Defs>
          <Rect width="100%" height={H} fill={`url(#${fadeId})`} />
        </Svg>
        <View style={{position: 'absolute', left: 20, right: 20, top: insets.top > 0 ? 14 : 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <AHMark />
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: ah.line2, backgroundColor: 'rgba(0,0,0,0.4)'}}>
            <Text style={{fontFamily: ahFonts.cond, fontSize: 16, color: ah.text}}>17</Text>
            <View style={{width: 16, height: 1, backgroundColor: ah.mute}} />
            <Text style={{fontFamily: ahFonts.cond, fontSize: 16, color: ah.rose}}>P</Text>
          </View>
        </View>
      </View>
      <View style={{paddingHorizontal: 20, marginTop: -22}}>
        <AHEyebrow>Floor 17 · The top of the house</AHEyebrow>
        <AHDisplay size={64} style={{marginTop: 10}}>The</AHDisplay>
        <AHDisplay size={64} accessibilityRole="text" style={{marginTop: -10}}>Penthouse.</AHDisplay>
        <Text style={{marginTop: 10, fontFamily: ahFonts.serifItalic, fontSize: 22, lineHeight: 26, color: ah.text}}>The lift remembers you.</Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8, marginTop: 16}}>
          {['Private care', 'Styling by appointment', ...(RELEASE.vip ? ['The inner circle'] : [])].map((l) => (
            <View key={l} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <View style={{width: 5, height: 5, borderRadius: 3, backgroundColor: ah.rose}} />
              <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: ah.mute}}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function PenthouseFloor() {
  // The VIP feed is a digital membership benefit sold on the web: hidden in the store build until in-app
  // purchase exists (RELEASE.vip — Apple 3.1.1 / Play Billing).
  const [tab, setTab] = useState<'feed' | 'floor' | 'handy'>(RELEASE.vip ? 'feed' : 'floor');
  const [svc, setSvc] = useState('chef');
  const [job, setJob] = useState('plumbing');
  const S = SERVICES.find((x) => x[0] === svc)!, J = JOBS.find((j) => j[0] === job)!;
  return (
    <View style={{alignSelf: 'stretch'}}>
      <PenthouseHero />
      <View style={{gap: 12, paddingHorizontal: 20, marginTop: 30, width: '100%', maxWidth: 560, alignSelf: 'center'}}>
      <Text style={[s.body, {fontSize: 15, lineHeight: 22, color: ah.mute}]}>{RELEASE.vip ? 'Your floor. The inner circle, the services you call up, and a pro at your door.' : 'Your floor. The services you call up, and a pro at your door.'}</Text>
      <Segmented<'feed' | 'floor' | 'handy'> options={[...(RELEASE.vip ? [['feed', 'Inner circle'] as ['feed', string]] : []), ['floor', 'Your floor'], ['handy', 'Handyman']]} value={tab} onChange={setTab} />
      {tab === 'feed' && RELEASE.vip ? <VipFeed /> : tab === 'floor' || tab === 'feed' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <SectionHead>Call up a service</SectionHead>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10}}>
            {SERVICES.map(([k, name, line]) => {
              const on = k === svc;
              return (
                <Pressable key={k} onPress={() => setSvc(k)} accessibilityRole="button" accessibilityState={{selected: on}}
                  style={({pressed}) => ({width: '48.5%', minHeight: 92, padding: 14, gap: 4, borderRadius: 20, borderWidth: 1, borderColor: on ? 'rgba(232,180,160,0.55)' : ah.line, backgroundColor: on ? 'rgba(183,110,121,0.14)' : ah.ink2, opacity: pressed ? 0.85 : 1})}>
                  <Text style={{fontFamily: ahFonts.serif, fontSize: 19, lineHeight: 21, color: ah.text}}>{name}</Text>
                  <Text style={{fontFamily: ahFonts.sans, fontSize: 12, lineHeight: 16, color: ah.mute}}>{line}</Text>
                </Pressable>
              );
            })}
          </View>
          <PlanWithNova key={svc} room="penthouse-floor" topic="appointment" title={`Penthouse · ${S[1]}`} label={`Ask for: ${S[1].toLowerCase()}`}
            placeholder={`What would you like from the ${S[1].toLowerCase()}?`} acc={ah.rose} withWhen />
          <AHCard style={{gap: 6}}>
            <AHEyebrow>Keys to your floor</AHEyebrow>
            <Text style={s.small}>Guest keys open soon. Until then your floor is yours alone — no one else can see it, and a key will never open your Vault.</Text>
          </AHCard>
          <SampleNote>LIVE · NOVA DRAFTS A PLAN · NO SERVICE PARTNER IS CONNECTED, SO NOTHING IS BOOKED UNTIL YOU ARRANGE IT</SampleNote>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <AHCard pad={16} style={{flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(255,207,110,0.3)'}}>
            <AHLiveDot color={ah.warn} pulse={false} />
            <View style={{flex: 1, gap: 2}}>
              <AHEyebrow color={ah.warn}>Service partner not connected</AHEyebrow>
              <Text style={s.small}>No pro can be dispatched from Finesse yet. Nova drafts what to do and who to call; you arrange it.</Text>
            </View>
          </AHCard>
          <SectionHead>What needs fixing?</SectionHead>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10}}>
            {JOBS.map(([k, label, ic]) => {
              const on = k === job;
              return (
                <Pressable key={k} onPress={() => setJob(k)} accessibilityRole="button" accessibilityState={{selected: on}}
                  style={({pressed}) => ({width: '31.5%', minHeight: 80, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 18, borderWidth: 1, borderColor: on ? 'rgba(232,180,160,0.55)' : ah.line, backgroundColor: on ? 'rgba(183,110,121,0.14)' : ah.ink2, opacity: pressed ? 0.85 : 1})}>
                  <Icon name={ic} size={20} color={on ? ah.rose : ah.mute} />
                  <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 11.5, color: on ? ah.text : ah.mute, textAlign: 'center'}}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <PlanWithNova key={job} room="penthouse-handyman" topic="appointment" title={`Handyman · ${J[1]}`} label={`Get help · ${J[1].toLowerCase()}`}
            placeholder="Tell Nova what happened" acc={ah.rose} withWhen />
          <SampleNote>LIVE · NO ONE IS DISPATCHED UNTIL A SERVICE PARTNER IS CONNECTED · YOU APPROVE ANY QUOTE BEFORE WORK STARTS</SampleNote>
        </Animated.View>
      )}
      </View>
    </View>
  );
}

/** The inner circle — VIP posts, as the web /vip room shows them (RLS keeps it VIP-only). */
function VipFeed() {
  const {live, reload} = useLive<{posts: VipPost[]; me: string}>(null, readVipFeed);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  // Authors blocked from a ••• menu leave the feed at once (RLS keeps them out on the next read).
  const [gone, setGone] = useState<string[]>([]);
  const rules = useHouseRules();
  const post = async () => {
    if (!draft.trim()) return;
    setMsg(null);
    // House rules & terms, once, before a member's first post.
    if (!(await rules.ensure())) return;
    setBusy(true);
    let r = await postVip(draft);
    if (needsTerms(r)) {
      if (!(await rules.require())) { setBusy(false); setMsg({ok: false, text: 'Accept the house rules to post. Nothing was posted.'}); return; }
      r = await postVip(draft);
    }
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: r.status === 403 && r.body.error === 'not_vip' ? 'Only VIP key holders can post in the inner circle. Nothing was posted.' : failure(r.status, r.body, 'Nothing was posted.')}); return; }
    setDraft('');
    void reload(true);
  };
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
      {rules.sheet}
      <AHCard style={{gap: 10}}>
        <AHEyebrow color={ah.rose}>Say something to the inner circle</AHEyebrow>
        <AHInput value={draft} onChangeText={(v) => setDraft(v.slice(0, 1000))} placeholder="Only key holders see this" multiline style={{minHeight: 64, paddingTop: 12}} accessibilityLabel="Post to the inner circle" />
        <AHPill block small label={busy ? 'Posting…' : 'Post'} onPress={() => void post()} disabled={busy || !draft.trim()} />
        <Status msg={msg} />
      </AHCard>
      <LiveGate live={live} reload={() => void reload()} what="the inner circle">
        {(d) => d.posts.length === 0 ? (
          <AHCard><Text style={{fontFamily: ahFonts.serifItalic, fontSize: 22, color: ah.text}}>The inner circle is quiet.</Text><Text style={[s.small, {marginTop: 6}]}>Nothing posted yet — or your VIP key isn’t active. Only key holders see this feed.</Text></AHCard>
        ) : (
          <View style={{gap: 12}}>
            {d.posts.filter((p) => !p.author_id || !gone.includes(p.author_id)).map((p) => {
              const name = p.author?.display_name || p.author?.username || 'A key holder';
              return (
                <AHCard key={p.id} pad={18} style={{gap: 10}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                    {p.author?.avatar_url ? <Image source={{uri: p.author.avatar_url}} style={{width: 40, height: 40, borderRadius: 20}} accessibilityLabel={name} /> : <AHRing name={name} size={40} label={false} />}
                    <View style={{flex: 1}}>
                      <Text style={{fontFamily: ahFonts.sansBold, fontSize: 15, color: ah.text}}>{name}</Text>
                      <Text style={{fontFamily: ahFonts.sans, fontSize: 12, color: ah.mute}}>{new Date(p.created_at).toLocaleString([], {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}{p.author?.vibe ? ` · ${p.author.vibe}` : ''}</Text>
                    </View>
                    <ModerationMenu kind="vip_post" targetId={p.id} memberId={p.author_id} name={name} own={p.author_id === d.me}
                      onBlocked={() => { const a = p.author_id; if (a) setGone((g) => [...g, a]); void reload(true); }} />
                  </View>
                  {p.content ? <Text style={{fontFamily: ahFonts.sans, fontSize: 15, lineHeight: 22, color: ah.text}}>{p.content}</Text> : null}
                  {p.media_urls?.[0] ? <Image source={{uri: p.media_urls[0]}} style={{width: '100%', aspectRatio: 4 / 3, borderRadius: 14}} resizeMode="cover" accessibilityLabel="Attached photo" /> : null}
                </AHCard>
              );
            })}
          </View>
        )}
      </LiveGate>
    </Animated.View>
  );
}

/* ─────────────── This Is You ─────────────── */
const FIELDS = ['Name', 'City', 'Portrait', 'Moments', 'Circles', 'Brands you wear'];

function Switch({on, onPress, label}: {on: boolean; onPress: () => void; label: string}) {
  const knob = useAnimatedStyle(() => ({transform: [{translateX: withTiming(on ? 20 : 0, {duration: 200})}]}));
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{checked: on}} accessibilityLabel={label} hitSlop={10}
      style={{width: 50, height: 30, borderRadius: 15, borderWidth: 1, borderColor: on ? ah.rose : ah.line2, backgroundColor: on ? ah.rose : 'rgba(255,255,255,0.06)', justifyContent: 'center', paddingHorizontal: 3}}>
      <Animated.View style={[{width: 22, height: 22, borderRadius: 11, backgroundColor: on ? '#fff' : ah.mute}, knob]} />
    </Pressable>
  );
}

/** A grouped list surface (rows separated by hairlines). */
function List({children}: {children: ReactNode}) {
  return <View style={{borderRadius: radius.card, borderWidth: 1, borderColor: ah.line, backgroundColor: ah.ink2, overflow: 'hidden'}}>{children}</View>;
}
const rowStyle = (i: number) => ({flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderColor: ah.line});
const RowTitle = ({children}: {children: ReactNode}) => <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 15, color: ah.text}}>{children}</Text>;
const RowSub = ({children, on}: {children: ReactNode; on?: boolean}) => <Text style={{marginTop: 2, fontFamily: ahFonts.sansMedium, fontSize: 12, color: on ? ah.ok : ah.mute}}>{children}</Text>;

/** The portrait card at the top of This Is You. */
function Portrait({name, avatar, line}: {name: string; avatar?: string | null; line: string}) {
  return (
    <AHSmoke aspect={1 / 0.9}>
      <View style={{alignItems: 'flex-start', gap: 10}}>
        {avatar ? <Image source={{uri: avatar}} style={{width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: ah.rose}} accessibilityLabel="Your portrait" /> : <AHRing name={name} size={92} label={false} />}
        <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 42, lineHeight: 44, color: ah.white}}>{name}</Text>
        <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)'}}>{line}</Text>
      </View>
    </AHSmoke>
  );
}

type IdentityData = {
  self: Record<string, unknown>;
  projection: {public_fields: string[]; visibility: Record<string, string>; updated_at: string | null};
  publicView: Record<string, unknown>;
  projectableFields: string[];
  neverProjected: string[];
};
const FIELD_LABEL: Record<string, string> = {display_name: 'Name', username: 'Handle', avatar_url: 'Portrait', vibe: 'Vibe line', bio: 'Bio', city: 'City', interests: 'Interests'};
const show = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v === null || v === undefined || v === '' ? '—' : String(v));

export function Profile({side}: {side: Side}) {
  const {live, reload} = useLive<IdentityData>('/api/identity/context');
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null); // survives the remount after a save
  return (
    <LiveGate live={live} reload={() => void reload()} what="This Is You" signedOut={<ProfileSample side={side} />}>
      {(data) => <ProfileLive key={`${data.projection.updated_at ?? 'default'}:${data.projection.public_fields.join()}`} data={data} side={side} reload={() => reload(true)} msg={msg} setMsg={setMsg} />}
    </LiveGate>
  );
}

function ProfileLive({data, side, reload, msg, setMsg}: {data: IdentityData; side: Side; reload: () => Promise<void>; msg: {ok: boolean; text: string} | null; setMsg: (m: {ok: boolean; text: string} | null) => void}) {
  const [fields, setFields] = useState<string[]>(data.projection.public_fields);
  const [busy, setBusy] = useState(false);
  const name = show(data.self.display_name ?? data.self.username) === '—' ? 'Member' : show(data.self.display_name ?? data.self.username);
  const avatar = typeof data.self.avatar_url === 'string' && data.self.avatar_url ? data.self.avatar_url : null;
  const since = typeof data.self.created_at === 'string' ? new Date(data.self.created_at).getFullYear() : null;
  const dirty = [...fields].sort().join() !== [...data.projection.public_fields].sort().join();
  const vis = data.projection.visibility;

  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await api<{message?: string; error?: string}>('/api/identity/projections', {method: 'PATCH', json: {publicFields: fields}});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was saved.')}); return; }
    setMsg({ok: true, text: 'Saved. Other members now see only these fields.'});
    void reload();
  };
  const audience = async (patch: Record<string, string>, ok: string) => {
    setBusy(true); setMsg(null);
    const r = await api<{message?: string; error?: string}>('/api/identity/visibility', {method: 'PATCH', json: patch});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body)}); return; }
    setMsg({ok: true, text: ok});
    void reload();
  };
  const exportData = async () => {
    setBusy(true); setMsg(null);
    const r = await api<Record<string, unknown> & {message?: string; error?: string}>('/api/identity/export');
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'Nothing was exported.')}); return; }
    try {
      const res = await Share.share({title: 'My Finesse data', message: JSON.stringify(r.body, null, 2)});
      setMsg(res.action === Share.sharedAction ? {ok: true, text: 'Your export was handed to the app you chose.'} : {ok: true, text: 'Export ready. Nothing was shared.'});
    } catch {
      setMsg({ok: false, text: 'This phone could not open the share sheet. Nothing was shared.'});
    }
  };

  return (
    <View style={{gap: 12}}>
      <Portrait name={name} avatar={avatar} line={[track[side].name, typeof data.self.city === 'string' && data.self.city ? data.self.city : null, since ? `Member since ${since}` : null].filter(Boolean).join(' · ')} />

      <SectionHead>What others see · {fields.length} of {data.projectableFields.length}</SectionHead>
      <List>
        {data.projectableFields.map((f, i) => {
          const on = fields.includes(f);
          return (
            <View key={f} style={rowStyle(i)}>
              <View style={{flex: 1}}>
                <RowTitle>{FIELD_LABEL[f] ?? f}</RowTitle>
                <Text style={s.small} numberOfLines={1}>{show(data.self[f])}</Text>
                <RowSub on={on}>{on ? 'Members can see' : 'Only you'}</RowSub>
              </View>
              <Switch on={on} label={FIELD_LABEL[f] ?? f} onPress={() => setFields((xs) => (on ? xs.filter((x) => x !== f) : [...xs, f]))} />
            </View>
          );
        })}
      </List>
      <ActionBar label={busy ? 'One moment…' : dirty ? 'Save what others see' : 'Saved as shown'} color={dirty ? ah.rose : ah.white} onPress={save} disabled={busy || !dirty} />

      <AHCard style={{gap: 8}}>
        <AHEyebrow>Exactly what members receive</AHEyebrow>
        {Object.keys(data.publicView).length === 0 ? <Text style={s.small}>Nothing. You are a closed door.</Text> : Object.entries(data.publicView).map(([k, v]) => (
          <Text key={k} style={{fontFamily: ahFonts.sans, fontSize: 13, color: ah.text}} numberOfLines={2}><Text style={{color: ah.mute}}>{FIELD_LABEL[k] ?? k} · </Text>{show(v)}</Text>
        ))}
        <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 12, color: ah.faint}}>Computed by the house from your saved choices</Text>
      </AHCard>

      <SectionHead>Audience</SectionHead>
      <List>
        {([
          ['The Lounge', vis.lounge !== 'nobody', vis.lounge === 'nobody' ? 'Hidden from the Lounge' : 'Members can see your public stage', () => audience({lounge: vis.lounge === 'nobody' ? 'members' : 'nobody'}, vis.lounge === 'nobody' ? 'The Lounge can see your public stage.' : 'You are hidden from the Lounge.')],
          ['Backstage', vis.backstage !== 'nobody', vis.backstage === 'nobody' ? 'Nobody' : 'Only those you grant (VIP)', () => audience({backstage: vis.backstage === 'nobody' ? 'vip_grant_only' : 'nobody'}, vis.backstage === 'nobody' ? 'Backstage opens only to those you grant.' : 'Backstage is closed to everyone.')],
        ] as Array<[string, boolean, string, () => void]>).map(([l, on, sub, f], i) => (
          <View key={l} style={rowStyle(i)}>
            <View style={{flex: 1}}>
              <RowTitle>{l}</RowTitle>
              <RowSub on={on}>{sub}</RowSub>
            </View>
            <Switch on={on} label={l} onPress={busy ? () => {} : f} />
          </View>
        ))}
        <View style={rowStyle(1)}>
          <View style={{flex: 1}}>
            <RowTitle>Your traffic</RowTitle>
            <RowSub>Only you · always</RowSub>
          </View>
          <Icon name="lock" size={16} color={ah.mute} />
        </View>
      </List>
      <Membership />

      <Status msg={msg} />
      <RowBtn label={busy ? 'ONE MOMENT…' : 'EXPORT MY DATA'} onPress={exportData} disabled={busy} />
      <Text style={s.small}>Never shown to anyone: {data.neverProjected.map((f) => f.replace(/_/g, ' ')).join(', ')}. Your social score is never shown to you.</Text>
      <SampleNote>LIVE · SAVED ONLY WHEN THE HOUSE CONFIRMS · DELETE YOUR ACCOUNT FROM YOUR KEY BELOW</SampleNote>
    </View>
  );
}

/** Read-only membership status. No purchase button and no link that steers to buying (App Store 3.1.1). */
function Membership() {
  const {live, reload} = useLive<BillingStatus>(BILLING_STATUS_PATH);
  if (live.state === 'signed_out' || live.state === 'checking') return null;
  let body;
  if (live.state === 'loading') body = <Text style={s.small}>Checking with the front desk…</Text>;
  else if (live.state !== 'ready') body = (
    <View style={{gap: 6}}>
      <Text style={[s.small, {color: ah.danger}]}>{live.message}</Text>
      <RowBtn label="TRY AGAIN" onPress={() => void reload()} />
    </View>
  );
  else {
    const {vip, subscription: sub} = live.data;
    const periodEnd = formatDate(sub?.currentPeriodEnd);
    const until = formatDate(vip.expiresAt);
    const hasSub = Boolean(sub && sub.status !== 'canceled');
    const rows: Array<[string, string]> = [['Status', vip.active ? 'VIP · key holder' : 'Not a member']];
    if (vip.active && vip.source) rows.push(['Through', VIP_SOURCE_LABEL[vip.source] ?? vip.source]);
    if (hasSub && periodEnd) rows.push([sub?.cancelAtPeriodEnd ? 'Ends' : sub?.status === 'past_due' ? 'Payment due' : 'Renews', periodEnd]);
    if (vip.active && vip.source !== 'subscription') rows.push(['Valid until', until ?? 'No end date']);
    body = (
      <View style={{gap: 8}}>
        {rows.map(([k, v]) => (
          <View key={k} style={{flexDirection: 'row', justifyContent: 'space-between', gap: 10}}>
            <Text style={{fontFamily: ahFonts.sansMedium, fontSize: 13, color: ah.mute}}>{k}</Text>
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 13, color: k === 'Status' && vip.active ? ah.rose : ah.text}}>{v}</Text>
          </View>
        ))}
        {sub?.status === 'past_due' ? <Text style={[s.small, {color: ah.warn}]}>Your last membership payment didn’t go through. VIP stays open for a short grace period.</Text> : null}
        {sub?.cancelAtPeriodEnd && periodEnd ? <Text style={s.small}>Cancelled — it won’t renew. VIP stays open until {periodEnd}.</Text> : null}
      </View>
    );
  }
  return (
    <AHCard style={{gap: 10}}>
      <AHEyebrow>Membership</AHEyebrow>
      {body}
    </AHCard>
  );
}

function ProfileSample({side}: {side: Side}) {
  const name = side === 'her' ? 'Amara' : 'Julian';
  const [hidden, setHidden] = useState<string[]>(['Circles', 'Brands you wear']);
  const shown = FIELDS.length - hidden.length;
  return (
    <View style={{gap: 12}}>
      <Portrait name={name} line={`${track[side].name} · Atlanta · Member since 2026`} />
      <View style={{flexDirection: 'row', gap: 10}}>
        {[['14', 'outings'], ['3', 'vouches'], ['212', 'profile visits']].map(([n, l]) => (
          <AHCard key={l} pad={14} style={{flex: 1, alignItems: 'center'}}>
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 26, letterSpacing: -0.6, color: ah.text}}>{n}</Text>
            <Text style={s.small}>{l}</Text>
          </AHCard>
        ))}
      </View>
      <SectionHead>What others see · {shown} of {FIELDS.length}</SectionHead>
      <List>
        {FIELDS.map((f, i) => {
          const on = !hidden.includes(f);
          return (
            <View key={f} style={rowStyle(i)}>
              <View style={{flex: 1}}>
                <RowTitle>{f}</RowTitle>
                <RowSub on={on}>{on ? 'Members can see' : 'Only you'}</RowSub>
              </View>
              <Switch on={on} label={f} onPress={() => setHidden((h) => (on ? [...h, f] : h.filter((x) => x !== f)))} />
            </View>
          );
        })}
      </List>
      <SectionHead>Your traffic · this week</SectionHead>
      <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 92}}>
        {[12, 18, 9, 26, 31, 44, 22].map((v, i) => (
          <View key={i} style={{flex: 1, alignItems: 'center', gap: 6}}>
            <View style={{width: '100%', height: v * 1.5, borderRadius: 6, backgroundColor: i === 5 ? ah.rose : 'rgba(255,255,255,0.14)'}} />
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 10, color: ah.faint}}>{'MTWTFSS'[i]}</Text>
          </View>
        ))}
      </View>
      <Text style={s.small}>Your social score is never shown to you. Hidden fields stay private, including from partners. Sign in to export your data or delete your account.</Text>
      <SampleNote>SAMPLE PORTRAIT · SIGN IN TO SEE AND SAVE YOUR OWN</SampleNote>
    </View>
  );
}
