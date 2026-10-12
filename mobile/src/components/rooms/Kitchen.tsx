// The Kitchen — implemented from "Finesse Kitchen.dc.html" (After Hours skin): PLAN (day strip, menu card,
// calorie ledger, one weekly order), SHOP (the house pan, pots & pans, the Finesse house line, add to Sunday's
// order or check out separately), MASTERS (cook-along classes step by step with an optional chef voice, or book
// a private chef) and THE RECIPE BOOK drawer (your book, and recipe trades with members).
// PLAN is live when signed in: GET /api/kitchen/plan reads the week, POST /api/kitchen/compose saves it (the
// member can start from the house menu and edit it), and only then does POST /api/kitchen/order-intent record
// one order *intent* — nothing is placed or charged until a grocery partner asks the member to authorise.
// Signed out, PLAN is a labelled sample. Shop checkout and chef requests are previews.
import {useState} from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {api} from '@/lib/api';
import {track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {failure, useLive} from '@/lib/live';
import {AHCard, AHChip, AHEyebrow, AHTitle} from '@/components/ah';
import {radius} from '@/lib/ah';
import {ActionBar, SampleNote, Segmented} from './shared';
import {LiveGate, OK_GREEN, Status} from './live';
import {Fine, Head, Meter, Pick, Row, Round, TextBtn, ah, ahFonts, t} from './RoomKit';

const KDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MENU: Array<Array<[string, string, number]>> = [
  [['BREAKFAST', 'Greek yogurt, figs, pistachio', 380], ['LUNCH', 'Seared salmon, fennel, lemon', 560], ['DINNER', 'Out · dinner hold at 8:30', 700]],
  [['BREAKFAST', 'Eggs, sourdough, avocado', 450], ['LUNCH', 'Chicken, farro, herbs', 610], ['DINNER', 'Miso cod, greens', 520]],
];
type Item = [string, string, string, number];
const FEAT: Item = ['f1', 'Finesse Carbon Steel Pan, 10 in', 'Seasoned at the forge, ready to sear. Oven safe to 600°F. Engraved with your initials on request.', 240];
const COOK: Item[] = [['c1', 'Copper saucier, 3 qt', 'CURATED · Mauviel · tin lined', 385], ['c2', 'Enameled Dutch oven, 5.5 qt', 'CURATED · Staub · cast iron', 420], ['c3', 'Chef’s knife, 8 in', 'HOUSE · Finesse forged, 58 HRC', 310]];
const MER: Item[] = [['g1', 'Waxed canvas apron', 'HOUSE · oxblood, brass hardware', 95], ['g2', 'Linen towel set of 3', 'HOUSE · stonewashed, monogram', 48], ['g3', 'Recipe card box', 'HOUSE · walnut, brass latch', 65]];
const MASTERS: Array<[string, string, string, string, string[]]> = [
  ['ms1', 'Chef Odette Marchand', 'French technique · sauces', '40 MIN', ['Warm the pan, add butter and shallot. Sweat, do not colour.', 'Deglaze with white wine. Reduce by two thirds.', 'Mount with cold butter off the heat, whisking.', 'Taste, salt, and plate at once.']],
  ['ms2', 'Chef Ren Takahashi', 'Knife work · fish', '35 MIN', ['Pat the fish dry. Salt it and rest five minutes.', 'Skin side down in a hot pan, press for ten seconds.', 'Cook three quarters of the way through on the skin.', 'Flip, kill the heat, baste and rest.']],
  ['ms3', 'Chef Lucia Ferrante', 'Handmade pasta', '55 MIN', ['Mound the flour, crack the eggs into the well.', 'Work in with a fork, then knead for ten minutes.', 'Rest under a bowl for thirty minutes.', 'Roll thin, cut, and cook in salted water for ninety seconds.']],
];
const VOICE = ['“Easy heat. Listen for a whisper, not a sizzle.”', '“Patience here. This is where it is won.”', '“Off the heat. Trust me on this one.”', '“Now taste. Fix it. Then serve.”'];
const CHEFS: Array<[string, string, string, number]> = [['ms1', 'Chef Odette Marchand', 'French · tasting menus', 650], ['ms2', 'Chef Ren Takahashi', 'Japanese · fish and knife', 540], ['ms3', 'Chef Lucia Ferrante', 'Italian · family table', 480]];
const SLOTS = ['FRI 7 PM', 'SAT 6 PM', 'SUN 5 PM'];
const REC: Array<[string, string, string]> = [['r1', 'Cacio e pepe', 'NONNA · 25 MIN · 640 KCAL'], ['r2', 'Seared salmon, fennel, lemon', 'OWN · 30 MIN · 560 KCAL'], ['r3', 'Miso cod, greens', 'OWN · 20 MIN · 520 KCAL'], ['r4', 'Figs, yogurt, pistachio', 'OWN · 5 MIN · 380 KCAL']];
const MKT: Array<[string, string, string]> = [['m1', 'Coq au vin', 'CLAIRE M. · 2 HR · 720 KCAL'], ['m2', 'Saffron risotto', 'DEV R. · 40 MIN · 610 KCAL'], ['m3', 'Burnt honey tart', 'INES A. · 90 MIN · 430 KCAL']];

const cap = (x: string) => x.charAt(0) + x.slice(1).toLowerCase();

function mondayISO() {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Photo stand-in for product and class frames, until real imagery is uploaded. */
function Frame({h, label, icon, children}: {h: number; label?: string; icon?: string; children?: React.ReactNode}) {
  return (
    <View style={{height: h, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: ah.ink3, borderBottomWidth: 1, borderColor: ah.line}}>
      {icon ? <Icon name={icon} size={34} color={ah.faint} strokeWidth={1.1} /> : null}
      {children}
      {label ? <Text style={[t.eyebrow, {color: ah.faint, fontSize: 10}]}>{label}</Text> : null}
    </View>
  );
}

function AddBtn({on, onPress}: {on: boolean; onPress: () => void}) {
  return <Pick label={on ? 'In order' : 'Add'} on={on} onPress={onPress} style={{minWidth: 92}} />;
}

function PickRow({init, name, sub, right, rightColor, on, onPress}: {init: string; name: string; sub: string; right: string; rightColor: string; on: boolean; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={`${name}, ${sub}, ${right}`}
      style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, padding: 14, borderRadius: 20, borderWidth: 1,
        borderColor: on ? ah.white : ah.line, backgroundColor: on ? 'rgba(255,255,255,0.07)' : ah.ink2, opacity: pressed ? 0.85 : 1})}>
      <View style={{width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? ah.rose : ah.line2, backgroundColor: '#1B1B1F'}}>
        <Text style={{fontFamily: ahFonts.serifItalic, fontSize: 22, color: ah.text}}>{init}</Text>
      </View>
      <View style={{flex: 1, gap: 2}}><Text style={t.name}>{name}</Text><Text style={t.small}>{sub}</Text></View>
      <Text style={[t.num, {fontSize: 13, color: rightColor}]}>{right}</Text>
    </Pressable>
  );
}

export function Kitchen({side}: {side: Side}) {
  const acc = track[side].acc;
  const [tab, setTab] = useState<'PLAN' | 'SHOP' | 'MASTERS'>('PLAN');
  // SHOP
  const [cart, setCart] = useState<Record<string, boolean>>({});
  const [cartSent, setCartSent] = useState(false);
  const [paid, setPaid] = useState(false);
  // MASTERS
  const [mMode, setMMode] = useState<'CLASSES' | 'CHEF'>('CLASSES');
  const [master, setMaster] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [voice, setVoice] = useState(false);
  const [fmt, setFmt] = useState<'AT HOME' | 'VIRTUAL'>('AT HOME');
  const [chef, setChef] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [chefReq, setChefReq] = useState(false);
  // RECIPE BOOK
  const [bookOpen, setBookOpen] = useState(false);
  const [bookTab, setBookTab] = useState<'MINE' | 'TRADE'>('MINE');
  const [offered, setOffered] = useState<Record<string, boolean>>({});
  const [give, setGive] = useState('r1');
  const [trades, setTrades] = useState<Record<string, string | null>>({});

  const all = [FEAT, ...COOK, ...MER], inCart = all.filter((i) => cart[i[0]]), cartN = inCart.length, cartTot = inCart.reduce((a, i) => a + i[3], 0);
  const toggle = (id: string) => { setCart((c) => ({...c, [id]: !c[id]})); setCartSent(false); setPaid(false); };
  const M = MASTERS.find((m) => m[0] === master);

  return (
    <View style={{gap: 16}}>
      <View style={{gap: 6}}>
        <AHTitle size={34}>Plan the week, stock the pan, cook with a master.</AHTitle>
      </View>
      <Segmented options={[['PLAN', 'Plan'], ['SHOP', 'Shop'], ['MASTERS', 'Masters']]} value={tab} onChange={setTab} />

      {tab === 'PLAN' ? <PlanTab acc={acc} /> : null}

      {tab === 'SHOP' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 16}}>
          <AHCard pad={0}>
            <Frame h={170} icon="chefhat" label="Product photo · carbon steel pan" />
            <View style={{padding: 20, gap: 8}}>
              <AHChip label="Featured · the house pan" tone="rose" />
              <AHTitle size={30} italic={false} style={{marginTop: 4}}>{FEAT[1]}</AHTitle>
              <Text style={t.small}>{FEAT[2]}</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6}}>
                <Text style={{fontFamily: ahFonts.serif, fontSize: 34, color: ah.text}}>${FEAT[3]}</Text>
                <AddBtn on={!!cart[FEAT[0]]} onPress={() => toggle(FEAT[0])} />
              </View>
            </View>
          </AHCard>
          {([['Pots & pans', COOK], ['Finesse house line', MER]] as Array<[string, Item[]]>).map(([title, list]) => (
            <View key={title}>
              <Head>{title}</Head>
              {list.map(([id, name, spec, p], i) => (
                <Row key={id} last={i === list.length - 1}>
                  <View style={{flex: 1, gap: 3}}>
                    <Text style={t.title}>{name}</Text>
                    <Text style={t.small}>{spec}</Text>
                    <Text style={[t.num, {fontSize: 14, color: ah.blush}]}>${p}</Text>
                  </View>
                  <AddBtn on={!!cart[id]} onPress={() => toggle(id)} />
                </Row>
              ))}
            </View>
          ))}
          <ActionBar color={cartSent ? ah.white : acc} disabled={!cartN}
            label={cartSent ? 'Added to Sunday order' : cartN ? `Add ${cartN} to the order · $${cartTot.toLocaleString()}` : 'Choose an item'} onPress={() => setCartSent((x) => !x)} />
          <Pick disabled={!cartN} onPress={() => setPaid((x) => !x)} on={paid} style={{minHeight: 52}}
            label={paid ? 'Checkout preview · not charged' : cartN ? `Or check out separately · $${cartTot.toLocaleString()}` : 'Or check out separately'} />
        </Animated.View>
      ) : null}

      {tab === 'MASTERS' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 14}}>
          <Segmented options={[['CLASSES', 'Classes'], ['CHEF', 'Private chef']]} value={mMode} onChange={setMMode} />
          {mMode === 'CLASSES' ? (
            <View style={{gap: 10}}>
              <Fine>Cook along with a master. Pick a class and the steps run on your counter, one at a time.</Fine>
              {MASTERS.map(([id, name, craft, len]) => (
                <PickRow key={id} init={name.split(' ').pop()![0]} name={name} sub={craft} right={cap(len.split(' ')[0]) + ' min'} rightColor={ah.ok} on={master === id} onPress={() => { setMaster(id); setStep(0); }} />
              ))}
              {M ? (
                <Animated.View entering={FadeInDown.duration(350)}>
                  <AHCard pad={0} style={{backgroundColor: ah.ink3}}>
                    <Frame h={130} label={`Masterclass video · ${M[3].toLowerCase()}`}>
                      <View style={{width: 52, height: 52, borderRadius: 26, backgroundColor: ah.white, alignItems: 'center', justifyContent: 'center'}}><Text style={{color: '#000', fontSize: 16, marginLeft: 3}}>▶</Text></View>
                    </Frame>
                    <View style={{padding: 20, gap: 12}}>
                      <AHEyebrow color={ah.blush}>{M[1]} · step {step + 1} of {M[4].length}</AHEyebrow>
                      <Animated.Text key={step} entering={FadeIn.duration(300)} style={[t.voice, {fontSize: 25, lineHeight: 31}]}>{M[4][step]}</Animated.Text>
                      <View style={{flexDirection: 'row', gap: 4}}>{M[4].map((_, i) => <View key={i} style={{flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? ah.rose : ah.line2}} />)}</View>
                      <Pick role="switch" on={voice} onPress={() => setVoice((v) => !v)} label={voice ? 'Chef voice · on' : 'Chef voice · off'} a11y="Chef voice" style={{alignSelf: 'flex-start'}} />
                      {voice ? <Text style={t.small}>{M[1].split(' ').slice(0, 2).join(' ')}: {VOICE[step % 4]}</Text> : null}
                      <View style={{flexDirection: 'row', gap: 10}}>
                        <Pick label="Back" flex onPress={() => setStep((x) => Math.max(0, x - 1))} />
                        <Pick label={step + 1 >= M[4].length ? 'Start over' : 'Next step'} on flex onPress={() => setStep((x) => (x + 1 >= M[4].length ? 0 : x + 1))} />
                      </View>
                    </View>
                  </AHCard>
                </Animated.View>
              ) : null}
            </View>
          ) : (
            <View style={{gap: 12}}>
              <Head>Book a private chef</Head>
              <Segmented options={[['AT HOME', 'At home'], ['VIRTUAL', 'Virtual']]} value={fmt} onChange={(v) => { setFmt(v); setChefReq(false); }} />
              {CHEFS.map(([id, name, craft, rate]) => (
                <PickRow key={id} init={name.split(' ').pop()![0]} name={name} sub={craft} right={`$${fmt === 'VIRTUAL' ? Math.round(rate * 0.4) : rate}`} rightColor={ah.text} on={chef === id} onPress={() => { setChef(id); setChefReq(false); }} />
              ))}
              <View style={{flexDirection: 'row', gap: 8}}>
                {SLOTS.map((k) => <Pick key={k} label={cap(k.slice(0, 3)) + k.slice(3).toLowerCase().replace('pm', 'PM')} flex on={slot === k} onPress={() => { setSlot(k); setChefReq(false); }} />)}
              </View>
              <ActionBar disabled={!(chef && slot)} color={chefReq ? ah.white : acc}
                label={chefReq ? 'Preview · not sent · chef desk not live' : chef && slot ? `Request ${cap(slot.slice(0, 3))}${slot.slice(3)} · ${fmt === 'AT HOME' ? 'at home' : 'virtual'}` : 'Pick a chef and a time'} onPress={() => setChefReq((x) => !x)} />
            </View>
          )}
        </Animated.View>
      ) : null}

      {/* The Recipe Book — a drawer at the foot of the room */}
      <AHCard pad={0} style={{backgroundColor: ah.ink3}}>
        {bookOpen ? (
          <Animated.View entering={FadeInDown.duration(300)} style={{padding: 16, gap: 12, borderBottomWidth: 1, borderColor: ah.line}}>
            <Segmented options={[['MINE', 'My book'], ['TRADE', 'Trade']]} value={bookTab} onChange={setBookTab} />
            {bookTab === 'MINE' ? REC.map(([id, name, meta], i) => {
              const on = !!offered[id];
              return (
                <Row key={id} last={i === REC.length - 1}>
                  <View style={{flex: 1}}><Text style={t.titleI}>{name}</Text><Text style={t.meta}>{meta}</Text></View>
                  <Pick label={on ? 'Offered' : 'Offer to trade'} on={on} rose onPress={() => setOffered((o) => ({...o, [id]: !o[id]}))} />
                </Row>
              );
            }) : (
              <View style={{gap: 10}}>
                <Head style={{marginTop: 0}}>You give</Head>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                  {REC.map(([id, name]) => <Pick key={id} label={name} on={give === id} onPress={() => setGive(id)} />)}
                </View>
                <Head>Members are offering</Head>
                {MKT.map(([id, name, meta], i) => {
                  const sent = !!trades[id];
                  return (
                    <Row key={id} last={i === MKT.length - 1}>
                      <View style={{flex: 1}}><Text style={t.titleI}>{name}</Text><Text style={t.meta}>{meta}</Text></View>
                      <Pick label={sent ? 'Sent' : 'Propose trade'} on={!sent} rose={!sent} onPress={() => setTrades((x) => ({...x, [id]: x[id] ? null : give}))} />
                    </Row>
                  );
                })}
              </View>
            )}
          </Animated.View>
        ) : null}
        <Pressable onPress={() => setBookOpen((o) => !o)} accessibilityRole="button" accessibilityState={{expanded: bookOpen}} accessibilityLabel={`The recipe book, ${REC.length} recipes`}
          style={({pressed}) => ({minHeight: 60, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.8 : 1})}>
          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <Icon name="chefhat" size={18} color={ah.rose} />
            <Text numberOfLines={1} style={[t.title, {flexShrink: 1, fontSize: 20}]}>The recipe book</Text>
            <Text style={t.meta}>{REC.length} recipes</Text>
          </View>
          <Text style={{fontSize: 16, color: ah.mute}}>{bookOpen ? '⌄' : '⌃'}</Text>
        </Pressable>
      </AHCard>
      <SampleNote>Sample menu, shop and classes · The weekly order is an intent until your grocer authorises it · Shop checkout and chef requests are previews</SampleNote>
    </View>
  );
}

/* ─────────────── PLAN ─────────────── */
type Slot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type Meal = {day: number; slot: Slot; name: string; kcal?: number | null};
type Grocery = {item: string; qty: string};
type PlanData = {weekStart: string; dailyKcalTarget: number | null; meals: Meal[]; dailyTotals: number[]; groceryList: Grocery[]; order: {id: string; state: string; partner: string | null; created_at: string} | null; stage: string};
const SLOT_ORDER: Slot[] = ['breakfast', 'lunch', 'snack', 'dinner'];
// The house's suggested week — offered to the member as a starting point, saved only when they choose it.
const HOUSE_MEALS: Meal[] = Array.from({length: 7}, (_, day) => (day % 2
  ? [['breakfast', 'Eggs, sourdough, avocado', 450], ['lunch', 'Chicken, farro, herbs', 610], ['dinner', 'Miso cod, greens', 520]]
  : [['breakfast', 'Greek yogurt, figs, pistachio', 380], ['lunch', 'Seared salmon, fennel, lemon', 560], ['dinner', 'Dinner out', 700]]
).map(([slot, name, kcal]) => ({day, slot: slot as Slot, name: name as string, kcal: kcal as number}))).flat();
const HOUSE_GROCERIES: Grocery[] = [['Greek yogurt', '2 tubs'], ['Figs', '8'], ['Pistachios', '1 bag'], ['Salmon fillets', '4'], ['Fennel', '2 bulbs'], ['Lemons', '4'], ['Eggs', '1 dozen'], ['Sourdough', '1 loaf'], ['Avocados', '4'], ['Chicken breast', '1.5 lb'], ['Farro', '1 bag'], ['Fresh herbs', '2 bunches'], ['Black cod', '3 fillets'], ['Miso & greens', '1 each']].map(([item, qty]) => ({item, qty}));

function Ledger({total, target}: {total: number; target: number | null}) {
  const goal = target ?? 0;
  return (
    <View style={{gap: 8}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <Text style={t.eyebrow}>Calorie ledger</Text>
        <Text style={[t.num, {fontSize: 13}]}>{total.toLocaleString()}<Text style={{color: ah.mute}}>{goal ? ` / ${goal.toLocaleString()} kcal` : ' · no target set'}</Text></Text>
      </View>
      <Meter pct={goal ? Math.min(100, Math.round((total / goal) * 100)) : 0} />
    </View>
  );
}

function DayStrip({kd, setKd}: {kd: number; setKd: (n: number) => void}) {
  return (
    <View style={{flexDirection: 'row', gap: 4}}>
      {KDAYS.map((d, i) => {
        const on = i === kd;
        return (
          <Pressable key={d} onPress={() => setKd(i)} accessibilityRole="button" accessibilityState={{selected: on}} accessibilityLabel={d}
            style={{flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? ah.white : 'rgba(255,255,255,0.05)'}}>
            <Text style={{fontFamily: ahFonts.sansSemi, fontSize: 11, letterSpacing: 0.4, color: on ? '#000' : ah.mute}}>{cap(d)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PlanTab({acc}: {acc: string}) {
  const week = mondayISO();
  const {live, reload} = useLive<PlanData>(`/api/kitchen/plan?week=${week}`);
  // The status line lives here so it survives the plan re-reading (and remounting) after a save.
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{gap: 14}}>
      <LiveGate live={live} reload={() => void reload()} what="your week in the Kitchen" signedOut={<SamplePlan />}>
        {(data) => <LivePlan key={`${data.weekStart}:${data.stage}:${JSON.stringify(data.meals)}:${JSON.stringify(data.groceryList)}`} data={data} acc={acc} reload={() => reload(true)} setMsg={setMsg} />}
      </LiveGate>
      <Status msg={live.state === 'ready' ? msg : null} />
    </Animated.View>
  );
}

function MealLine({when, children, right}: {when: string; children: React.ReactNode; right: React.ReactNode}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingVertical: 12, borderBottomWidth: 1, borderColor: ah.line}}>
      <View style={{flex: 1, gap: 3}}>
        <Text style={[t.eyebrow, {fontSize: 10, color: ah.blush}]}>{when}</Text>
        {children}
      </View>
      {right}
    </View>
  );
}

function SamplePlan() {
  const [kd, setKd] = useState(3);
  const menu = MENU[kd % 2], total = menu.reduce((a, m) => a + m[2], 0);
  return (
    <View style={{gap: 14, marginTop: 4}}>
      <DayStrip kd={kd} setKd={setKd} />
      <AHCard pad={4} style={{paddingHorizontal: 18}}>
        <Animated.View key={kd} entering={FadeIn.duration(300)}>
          {menu.map(([when, dish, kcal]) => (
            <MealLine key={when} when={when} right={<Text style={t.meta}>{kcal} kcal</Text>}>
              <Text style={t.titleI}>{dish}</Text>
            </MealLine>
          ))}
        </Animated.View>
        <View style={{paddingVertical: 16}}><Ledger total={total} target={1900} /></View>
      </AHCard>
      <ActionBar label="Sign in to plan your week" color={ah.white} disabled />
      <SampleNote>Sample menu · Not your plan · Nothing is ordered</SampleNote>
    </View>
  );
}

function LivePlan({data, acc, reload, setMsg}: {data: PlanData; acc: string; reload: () => Promise<void>; setMsg: (m: {ok: boolean; text: string} | null) => void}) {
  const [kd, setKd] = useState(() => (new Date().getDay() + 6) % 7);
  const [meals, setMeals] = useState<Meal[]>(data.meals);
  const [groc, setGroc] = useState<Grocery[]>(data.groceryList);
  const [newItem, setNewItem] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(meals) !== JSON.stringify(data.meals) || JSON.stringify(groc) !== JSON.stringify(data.groceryList);
  const blank = data.stage === 'empty' && meals.length === 0;
  const today = meals.map((m, i) => ({m, i})).filter(({m}) => m.day === kd).sort((a, b) => SLOT_ORDER.indexOf(a.m.slot) - SLOT_ORDER.indexOf(b.m.slot));
  const total = today.reduce((a, {m}) => a + (m.kcal ?? 0), 0);
  const order = data.order;
  const intent = order?.state === 'intent';
  const addItem = () => { if (newItem.trim()) { setGroc((xs) => [...xs, {item: newItem.trim(), qty: '1'}]); setNewItem(''); } };

  const compose = async (nextMeals: Meal[], nextGroc: Grocery[], ok: string) => {
    setBusy(true); setMsg(null);
    const r = await api<{message?: string; error?: string}>('/api/kitchen/compose', {method: 'POST', json: {weekStart: data.weekStart, dailyKcal: data.dailyKcalTarget, meals: nextMeals.map((m) => ({day: m.day, slot: m.slot, name: m.name.trim() || 'Meal', kcal: m.kcal ?? null})), groceryList: nextGroc}});
    setBusy(false);
    if (!r.ok) { setMsg({ok: false, text: failure(r.status, r.body, 'The plan was not saved.')}); return; }
    setMsg({ok: true, text: ok});
    void reload();
  };
  const orderIntent = async (cancel: boolean) => {
    setBusy(true); setMsg(null);
    const r = await api<{message?: string; error?: string; cancelled?: number}>('/api/kitchen/order-intent', {method: 'POST', json: {weekStart: data.weekStart, ...(cancel ? {cancel: true} : {})}});
    setBusy(false);
    if (r.ok) {
      setMsg({ok: true, text: cancel ? (r.body.cancelled ? 'The order intent is withdrawn. Nothing was ordered.' : 'There was no open intent to withdraw.') : (r.body.message ?? 'Order intent recorded. Nothing has been charged.')});
      void reload(); return;
    }
    setMsg({ok: false, text: r.status === 422 ? 'The saved plan has no groceries yet, so there is nothing to order.' : failure(r.status, r.body, 'Nothing was ordered or charged.')});
    if (r.status === 409) void reload();
  };

  if (blank) {
    return (
      <View style={{gap: 14}}>
        <AHCard pad={24} style={{alignItems: 'center'}}>
          <AHEyebrow>Week of {data.weekStart}</AHEyebrow>
          <Text style={[t.voice, {textAlign: 'center', marginTop: 10}]}>A blank menu. Nothing is planned for this week yet.</Text>
        </AHCard>
        <Fine>Start from the house menu — seven days, three plates a day and one grocery list — then change anything before you order.</Fine>
        <ActionBar label={busy ? 'Saving…' : 'Start from the house menu'} color={acc} onPress={() => compose(HOUSE_MEALS, HOUSE_GROCERIES, 'Your week is saved from the house menu. Edit any plate, then confirm the order.')} disabled={busy} />
      </View>
    );
  }

  return (
    <View style={{gap: 14}}>
      <DayStrip kd={kd} setKd={setKd} />
      <AHCard pad={4} style={{paddingHorizontal: 18}}>
        <Animated.View key={kd} entering={FadeIn.duration(300)}>
          {today.length === 0 ? <Text style={[t.titleI, {color: ah.mute, textAlign: 'center', paddingVertical: 18}]}>Nothing planned this day.</Text> : today.map(({m, i}) => (
            <MealLine key={i} when={m.slot} right={
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <Text style={t.meta}>{m.kcal != null ? `${m.kcal} kcal` : '— kcal'}</Text>
                <Pressable onPress={() => setMeals((xs) => xs.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Remove ${m.name}`} style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}>
                  <Text style={{color: ah.mute, fontSize: 18}}>×</Text>
                </Pressable>
              </View>
            }>
              <TextInput value={m.name} onChangeText={(v) => setMeals((xs) => xs.map((x, j) => (j === i ? {...x, name: v.slice(0, 120)} : x)))} accessibilityLabel={`${m.slot} on ${KDAYS[kd]}`}
                placeholder="Name this plate" placeholderTextColor={ah.faint} selectionColor={ah.rose}
                style={{fontFamily: ahFonts.serifItalic, fontSize: 22, lineHeight: 26, color: ah.text, paddingVertical: 2}} />
            </MealLine>
          ))}
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 14}}>
            {SLOT_ORDER.filter((sl) => !today.some(({m}) => m.slot === sl)).map((sl) => (
              <Pick key={sl} label={`+ ${cap(sl)}`} onPress={() => setMeals((xs) => [...xs, {day: kd, slot: sl, name: '', kcal: null}])} a11y={`Add ${sl}`} />
            ))}
          </View>
        </Animated.View>
        <View style={{paddingBottom: 16}}><Ledger total={total} target={data.dailyKcalTarget} /></View>
      </AHCard>

      <AHCard pad={20}>
        <Head style={{marginTop: 0}} right={`${groc.length} items`}>One order</Head>
        <View style={{marginTop: 6}}>
          {groc.map((g, i) => (
            <View key={`${g.item}${i}`} style={{flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderBottomWidth: 1, borderColor: ah.line}}>
              <Text style={[t.body, {flex: 1}]}>{g.item}</Text>
              <Text style={t.meta}>{g.qty}</Text>
              <Pressable onPress={() => setGroc((xs) => xs.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Remove ${g.item}`} style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}>
                <Text style={{color: ah.mute, fontSize: 18}}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 4, paddingLeft: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: ah.line2}}>
          <TextInput value={newItem} onChangeText={(v) => setNewItem(v.slice(0, 80))} placeholder="Add to the list" placeholderTextColor={ah.faint} selectionColor={ah.rose} accessibilityLabel="Add a grocery item"
            onSubmitEditing={addItem} style={{flex: 1, minWidth: 0, minHeight: 44, fontFamily: ahFonts.sans, fontSize: 15, color: ah.text}} />
          <Round label="+" a11y="Add" solid size={40} onPress={addItem} disabled={!newItem.trim() || groc.length >= 80} />
        </View>
        <Fine style={{marginTop: 12}}>Priced by the grocer once a partner is connected. Delivery is arranged with them, not here.</Fine>
      </AHCard>

      {dirty ? <ActionBar label={busy ? 'Saving…' : 'Save the plan'} color={acc} onPress={() => compose(meals, groc, 'The plan is saved.')} disabled={busy} /> : null}
      {order && !intent ? (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.input, borderWidth: 1, borderColor: 'rgba(122,245,184,0.35)'}}>
          <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: OK_GREEN}} />
          <Text style={[t.name, {color: OK_GREEN, fontSize: 13}]}>Order {order.state}{order.partner ? ` · ${order.partner}` : ''}</Text>
        </View>
      ) : intent ? (
        <View style={{gap: 10}}>
          <AHCard pad={16} style={{borderColor: 'rgba(232,180,160,0.35)'}}>
            <AHEyebrow color={ah.rose}>Order intent recorded · not placed · not charged</AHEyebrow>
            <Fine style={{marginTop: 6}}>A grocery partner will ask you to authorise before anything is ordered.</Fine>
          </AHCard>
          <Pick label={busy ? 'One moment…' : 'Withdraw the intent'} onPress={() => orderIntent(true)} disabled={busy} style={{minHeight: 50}} />
        </View>
      ) : (
        <ActionBar label={busy ? 'Recording…' : dirty ? 'Save the plan to order' : groc.length ? 'Confirm the order' : 'Add groceries to order'} color={acc} onPress={() => orderIntent(false)} disabled={busy || dirty || groc.length === 0} />
      )}
      <SampleNote>Your plan · Confirming records an intent only · Nothing is placed or charged here</SampleNote>
    </View>
  );
}

