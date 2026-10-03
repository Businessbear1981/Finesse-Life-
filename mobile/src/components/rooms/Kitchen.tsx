// The Kitchen — implemented from "Finesse Kitchen.dc.html": PLAN (day strip, cream menu card, calorie
// ledger, one weekly order), SHOP (the house pan, pots & pans, the Finesse house line, add to Sunday's order
// or check out separately), MASTERS (cook-along classes step by step with an optional chef voice, or book a
// private chef) and THE RECIPE BOOK drawer (your book, and recipe trades with members).
// Confirming the plan records an order *intent* via /api/kitchen/order-intent — nothing is placed or charged
// until a grocery partner asks the member to authorise. Shop checkout and chef requests are previews.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown, LinearTransition} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {api} from '@/lib/api';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {Icon} from '@/lib/icons';
import {ActionBar, SampleNote, Segmented, s} from './shared';

const OX = '#6B1424', INK = '#1A120C', SEPIA = '#5A4630';
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

function mondayISO() {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The design's cream paper card (linear-gradient #F2E8D2 → #E8DBBE). */
function Paper({children, style}: {children: React.ReactNode; style?: object}) {
  return (
    <View style={[{overflow: 'hidden'}, style]}>
      <Svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} preserveAspectRatio="none">
        <Defs><LinearGradient id="kpaper" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#F2E8D2" /><Stop offset="1" stopColor="#E8DBBE" /></LinearGradient></Defs>
        <Rect width="100%" height="100%" fill="url(#kpaper)" />
      </Svg>
      {children}
    </View>
  );
}

/** Diagonal-hatched placeholder (design: repeating-linear-gradient 135deg) for product / video frames. */
function Hatch({h, label, dark, children}: {h: number; label?: string; dark?: boolean; children?: React.ReactNode}) {
  const c = dark ? 'rgba(26,18,12,0.12)' : 'rgba(201,169,97,0.12)';
  return (
    <View style={{height: h, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, borderColor: dark ? 'rgba(26,18,12,0.4)' : 'rgba(201,169,97,0.4)', borderWidth: dark ? 1 : 0, borderBottomWidth: 1}}>
      <Svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
        {Array.from({length: 60}, (_, i) => <Rect key={i} x={i * 16 - 300} y={-200} width={8} height={800} fill={c} transform={`rotate(45 ${i * 16 - 300} 0)`} />)}
      </Svg>
      {children}
      {label ? <Text style={{fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: dark ? SEPIA : deco.brass}}>{label}</Text> : null}
    </View>
  );
}

const capsLabel = {fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2.2, color: deco.brassHighlight} as const;

function AddBtn({on, onPress}: {on: boolean; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{selected: on}}
      style={{minHeight: 44, minWidth: 84, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: deco.brass, backgroundColor: on ? deco.brassHighlight : 'transparent'}}>
      <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.3, color: on ? '#140E08' : deco.brassHighlight}}>{on ? 'IN ORDER ✓' : 'ADD'}</Text>
    </Pressable>
  );
}

function PickRow({init, name, sub, right, rightColor, on, onPress}: {init: string; name: string; sub: string; right: string; rightColor: string; on: boolean; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{selected: on}}
      style={{flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 2, borderColor: on ? deco.brassHighlight : 'rgba(201,169,97,0.4)', backgroundColor: on ? 'rgba(201,169,97,0.12)' : '#120C0A'}}>
      <View style={{width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: OX}}><Text style={{fontFamily: fonts.displayHeavy, fontSize: 18, color: deco.brassWhite}}>{init}</Text></View>
      <View style={{flex: 1, gap: 2}}><Text style={{fontFamily: fonts.label, fontSize: 15, color: deco.cream}}>{name}</Text><Text style={s.small}>{sub}</Text></View>
      <Text style={{fontFamily: fonts.mono, fontSize: 10, color: rightColor}}>{right}</Text>
    </Pressable>
  );
}

export function Kitchen({side}: {side: Side}) {
  const acc = track[side].acc;
  const [tab, setTab] = useState<'PLAN' | 'SHOP' | 'MASTERS'>('PLAN');
  // PLAN
  const [kd, setKd] = useState(3);
  const [ordered, setOrdered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
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

  const menu = MENU[kd % 2], total = menu.reduce((a, m) => a + m[2], 0);
  const all = [FEAT, ...COOK, ...MER], inCart = all.filter((i) => cart[i[0]]), cartN = inCart.length, cartTot = inCart.reduce((a, i) => a + i[3], 0);
  const toggle = (id: string) => { setCart((c) => ({...c, [id]: !c[id]})); setCartSent(false); setPaid(false); };
  const M = MASTERS.find((m) => m[0] === master);

  const order = async () => {
    if (busy) return;
    setBusy(true);
    const r = await api<{message?: string}>('/api/kitchen/order-intent', {method: 'POST', json: {weekStart: mondayISO(), cancel: ordered}});
    setBusy(false);
    if (r.ok) { setOrdered(!ordered); setNote(r.body.message ?? null); return; }
    if (r.status === 409) { setOrdered(true); setNote('This week already has an order in progress.'); return; }
    setNote(r.status === 0 ? 'The house line is offline. Nothing was ordered.' : r.status === 401 ? 'Sign in to place the week’s order. Nothing was ordered.' : r.status === 422 ? 'Your saved plan has no groceries yet, so there is nothing to order.' : 'The order could not be recorded just now. Nothing was charged.');
  };

  return (
    <View style={{gap: 12}}>
      <Segmented options={[['PLAN', 'PLAN'], ['SHOP', 'SHOP'], ['MASTERS', 'MASTERS']]} value={tab} onChange={setTab} />

      {tab === 'PLAN' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <View style={{flexDirection: 'row', borderWidth: 1, borderColor: deco.brass}}>
            {KDAYS.map((d, i) => {
              const on = i === kd;
              return (
                <Pressable key={d} onPress={() => setKd(i)} accessibilityRole="button" accessibilityState={{selected: on}}
                  style={{flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRightWidth: i < 6 ? 1 : 0, borderColor: 'rgba(201,169,97,0.3)', backgroundColor: on ? deco.brassHighlight : 'transparent'}}>
                  <Text style={{fontFamily: fonts.mono, fontSize: 9, color: on ? '#140E08' : deco.cream}}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
          <Paper>
            <Animated.View key={kd} entering={FadeIn.duration(300)}>
              {menu.map(([when, dish, kcal]) => (
                <View key={when} style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: 'rgba(26,18,12,0.3)'}}>
                  <View style={{flex: 1, gap: 1}}>
                    <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.8, color: OX}}>{when}</Text>
                    <Text style={{fontFamily: fonts.script, fontSize: 17, lineHeight: 20, color: INK}}>{dish}</Text>
                  </View>
                  <Text style={{fontFamily: fonts.mono, fontSize: 10, color: SEPIA}}>{kcal} KCAL</Text>
                </View>
              ))}
            </Animated.View>
          </Paper>
          <View style={{gap: 4}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brass}}>CALORIE LEDGER</Text>
              <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.brass}}>{total.toLocaleString()} / 1,900</Text>
            </View>
            <View style={{height: 8, borderWidth: 1, borderColor: deco.brass}}>
              <Animated.View layout={LinearTransition.duration(500)} style={{height: '100%', width: `${Math.min(100, Math.round((total / 1900) * 100))}%`, overflow: 'hidden'}}>
                <Svg width="100%" height="100%" preserveAspectRatio="none"><Defs><LinearGradient id="kled" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={deco.brassMid} /><Stop offset="1" stopColor={deco.brassWhite} /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#kled)" /></Svg>
              </Animated.View>
            </View>
            <Text style={s.small}>Protein 112g · carbs 160g · fat 58g</Text>
          </View>
          <View style={{padding: 12, gap: 8, borderWidth: 2, borderColor: deco.brass}}>
            <Text style={capsLabel}>ONE ORDER · 14 ITEMS</Text>
            <Text style={[s.body, {fontSize: 12}]}>Everything for the week, from one grocer. Delivered Sunday 10–12.</Text>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 22, color: deco.brassWhite}}>$186.40</Text>
          </View>
          <ActionBar label={busy ? 'RECORDING…' : ordered ? 'ORDERED · ARRIVES SUNDAY' : 'CONFIRM THE ORDER'} color={ordered ? deco.brass : acc} onPress={order} disabled={busy} />
          {note ? <Text style={s.small} accessibilityLiveRegion="polite">{note}</Text> : null}
        </Animated.View>
      ) : null}

      {tab === 'SHOP' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <View style={{borderWidth: 2, borderColor: deco.brass, backgroundColor: '#120C0A'}}>
            <Hatch h={150} label="PRODUCT PHOTO · CARBON STEEL PAN" />
            <View style={{padding: 12, gap: 6}}>
              <Text style={capsLabel}>FEATURED · THE HOUSE PAN</Text>
              <Text style={{fontFamily: fonts.displayHeavy, fontSize: 24, lineHeight: 27, color: deco.brassWhite}}>{FEAT[1]}</Text>
              <Text style={[s.body, {fontSize: 12}]}>{FEAT[2]}</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
                <Text style={{fontFamily: fonts.capsBold, fontSize: 20, color: deco.brassWhite}}>${FEAT[3]}</Text>
                <AddBtn on={!!cart[FEAT[0]]} onPress={() => toggle(FEAT[0])} />
              </View>
            </View>
          </View>
          {([['POTS & PANS', COOK], ['FINESSE HOUSE LINE', MER]] as Array<[string, Item[]]>).map(([title, list]) => (
            <View key={title}>
              <Text style={capsLabel}>{title}</Text>
              {list.map(([id, name, spec, p]) => (
                <View key={id} style={{flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(201,169,97,0.25)'}}>
                  <View style={{flex: 1, gap: 2}}>
                    <Text style={{fontFamily: fonts.label, fontSize: 15, color: deco.cream}}>{name}</Text>
                    <Text style={s.small}>{spec}</Text>
                    <Text style={{fontFamily: fonts.mono, fontSize: 11, color: deco.brassHighlight}}>${p}</Text>
                  </View>
                  <AddBtn on={!!cart[id]} onPress={() => toggle(id)} />
                </View>
              ))}
            </View>
          ))}
          <ActionBar color={cartSent ? deco.brass : cartN ? acc : 'rgba(201,169,97,0.35)'} disabled={!cartN}
            label={cartSent ? 'ADDED TO SUNDAY ORDER' : cartN ? `ADD ${cartN} TO THE ORDER · $${cartTot.toLocaleString()}` : 'CHOOSE AN ITEM'} onPress={() => setCartSent((x) => !x)} />
          <Pressable disabled={!cartN} onPress={() => setPaid((x) => !x)} accessibilityRole="button"
            style={{minHeight: 50, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: deco.brass, opacity: cartN ? 1 : 0.6}}>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 2, color: deco.brassHighlight}}>{paid ? 'CHECKOUT PREVIEW · NOT CHARGED' : cartN ? `OR CHECK OUT SEPARATELY · $${cartTot.toLocaleString()}` : 'OR CHECK OUT SEPARATELY'}</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {tab === 'MASTERS' ? (
        <Animated.View entering={FadeIn.duration(300)} style={{gap: 12}}>
          <Segmented options={[['CLASSES', 'CLASSES'], ['CHEF', 'PRIVATE CHEF']]} value={mMode} onChange={setMMode} />
          {mMode === 'CLASSES' ? (
            <View style={{gap: 10}}>
              <Text style={[s.body, {fontSize: 12}]}>Cook along with a master. Pick a class and the steps run on your counter, one at a time.</Text>
              {MASTERS.map(([id, name, craft, len]) => (
                <PickRow key={id} init={name.split(' ').pop()![0]} name={name} sub={craft} right={len} rightColor="#7AF5B8" on={master === id} onPress={() => { setMaster(id); setStep(0); }} />
              ))}
              {M ? (
                <Animated.View entering={FadeInDown.duration(350)}>
                  <Paper style={{padding: 12, gap: 8}}>
                    <Hatch h={110} dark label={`MASTERCLASS VIDEO · ${M[3]}`}>
                      <View style={{width: 44, height: 44, borderRadius: 22, backgroundColor: OX, alignItems: 'center', justifyContent: 'center'}}><Text style={{color: deco.brassWhite, fontSize: 16}}>▶</Text></View>
                    </Hatch>
                    <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.8, color: OX}}>{M[1].toUpperCase()} · STEP {step + 1} OF {M[4].length}</Text>
                    <Animated.Text key={step} entering={FadeIn.duration(300)} style={{fontFamily: fonts.script, fontSize: 21, lineHeight: 26, color: INK}}>{M[4][step]}</Animated.Text>
                    <Pressable onPress={() => setVoice((v) => !v)} accessibilityRole="switch" accessibilityState={{checked: voice}}
                      style={{minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: OX}}>
                      <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.3, color: OX}}>{voice ? 'CHEF VOICE · ON' : 'CHEF VOICE · OFF'}</Text>
                    </Pressable>
                    {voice ? <Text style={{fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: SEPIA}}>{M[1].split(' ').slice(0, 2).join(' ')}: {VOICE[step % 4]}</Text> : null}
                    <View style={{flexDirection: 'row', gap: 8}}>
                      <Pressable onPress={() => setStep((x) => Math.max(0, x - 1))} accessibilityRole="button" style={{flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: INK}}>
                        <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: INK}}>BACK</Text>
                      </Pressable>
                      <Pressable onPress={() => setStep((x) => (x + 1 >= M[4].length ? 0 : x + 1))} accessibilityRole="button" style={{flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: OX}}>
                        <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: deco.brassWhite}}>{step + 1 >= M[4].length ? 'START OVER' : 'NEXT STEP'}</Text>
                      </Pressable>
                    </View>
                  </Paper>
                </Animated.View>
              ) : null}
            </View>
          ) : (
            <View style={{gap: 12}}>
              <Text style={capsLabel}>BOOK A PRIVATE CHEF</Text>
              <Segmented options={[['AT HOME', 'AT HOME'], ['VIRTUAL', 'VIRTUAL']]} value={fmt} onChange={(v) => { setFmt(v); setChefReq(false); }} />
              {CHEFS.map(([id, name, craft, rate]) => (
                <PickRow key={id} init={name.split(' ').pop()![0]} name={name} sub={craft} right={`$${fmt === 'VIRTUAL' ? Math.round(rate * 0.4) : rate}`} rightColor={deco.brassHighlight} on={chef === id} onPress={() => { setChef(id); setChefReq(false); }} />
              ))}
              <View style={{flexDirection: 'row', gap: 6}}>
                {SLOTS.map((k) => (
                  <Pressable key={k} onPress={() => { setSlot(k); setChefReq(false); }} accessibilityRole="button" accessibilityState={{selected: slot === k}}
                    style={{flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: deco.brass, backgroundColor: slot === k ? deco.brassHighlight : 'transparent'}}>
                    <Text style={{fontFamily: fonts.mono, fontSize: 9, color: slot === k ? '#140E08' : deco.cream}}>{k}</Text>
                  </Pressable>
                ))}
              </View>
              <ActionBar disabled={!(chef && slot)} color={chefReq ? deco.brass : chef && slot ? acc : 'rgba(201,169,97,0.35)'}
                label={chefReq ? 'REQUEST SENT · CONFIRMS IN 1 HR' : chef && slot ? `REQUEST ${slot} · ${fmt}` : 'PICK A CHEF AND A TIME'} onPress={() => setChefReq((x) => !x)} />
            </View>
          )}
        </Animated.View>
      ) : null}

      {/* The Recipe Book — a drawer that slides up from the bottom of the room */}
      <View style={{borderWidth: 2, borderColor: deco.brass, backgroundColor: '#140E08'}}>
        {bookOpen ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Paper style={{padding: 12, gap: 10}}>
              <View style={{flexDirection: 'row', gap: 2, padding: 2, backgroundColor: INK}}>
                {(['MINE', 'TRADE'] as const).map((k) => (
                  <Pressable key={k} onPress={() => setBookTab(k)} accessibilityRole="tab" accessibilityState={{selected: bookTab === k}}
                    style={{flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: bookTab === k ? OX : '#F2E8D2'}}>
                    <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.6, color: bookTab === k ? deco.brassWhite : INK}}>{k === 'MINE' ? 'MY BOOK' : 'TRADE'}</Text>
                  </Pressable>
                ))}
              </View>
              {bookTab === 'MINE' ? REC.map(([id, name, meta]) => {
                const on = !!offered[id];
                return (
                  <View key={id} style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(26,18,12,0.25)'}}>
                    <View style={{flex: 1}}><Text style={{fontFamily: fonts.script, fontSize: 18, lineHeight: 22, color: INK}}>{name}</Text><Text style={{fontFamily: fonts.mono, fontSize: 9, color: SEPIA}}>{meta}</Text></View>
                    <Pressable onPress={() => setOffered((o) => ({...o, [id]: !o[id]}))} accessibilityRole="button" style={{minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 1, borderColor: OX, backgroundColor: on ? OX : 'transparent'}}>
                      <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.2, color: on ? deco.brassWhite : OX}}>{on ? 'OFFERED ✓' : 'OFFER TO TRADE'}</Text>
                    </Pressable>
                  </View>
                );
              }) : (
                <View style={{gap: 8}}>
                  <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.8, color: OX}}>YOU GIVE</Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                    {REC.map(([id, name]) => (
                      <Pressable key={id} onPress={() => setGive(id)} accessibilityRole="button" accessibilityState={{selected: give === id}}
                        style={{minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: OX, backgroundColor: give === id ? OX : 'transparent'}}>
                        <Text style={{fontFamily: fonts.script, fontSize: 15, color: give === id ? deco.brassWhite : INK}}>{name}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.8, color: OX}}>MEMBERS ARE OFFERING</Text>
                  {MKT.map(([id, name, meta]) => {
                    const sent = !!trades[id];
                    return (
                      <View key={id} style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(26,18,12,0.25)'}}>
                        <View style={{flex: 1}}><Text style={{fontFamily: fonts.script, fontSize: 18, lineHeight: 22, color: INK}}>{name}</Text><Text style={{fontFamily: fonts.mono, fontSize: 9, color: SEPIA}}>{meta}</Text></View>
                        <Pressable onPress={() => setTrades((x) => ({...x, [id]: x[id] ? null : give}))} accessibilityRole="button" style={{minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', backgroundColor: sent ? deco.brass : OX}}>
                          <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 1.2, color: sent ? '#140E08' : deco.brassWhite}}>{sent ? 'SENT ✓' : 'PROPOSE TRADE'}</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </Paper>
          </Animated.View>
        ) : null}
        <Pressable onPress={() => setBookOpen((o) => !o)} accessibilityRole="button" accessibilityState={{expanded: bookOpen}}
          style={{minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#140E08'}}>
          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="chefhat" size={16} />
            <Text numberOfLines={1} style={{flexShrink: 1, fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 1.3, color: deco.brassHighlight}}>THE RECIPE BOOK · {REC.length} RECIPES</Text>
          </View>
          <Text style={{fontSize: 14, color: deco.brassHighlight}}>{bookOpen ? '⌄' : '⌃'}</Text>
        </Pressable>
      </View>
      <SampleNote>SAMPLE MENU, SHOP AND CLASSES · THE WEEKLY ORDER IS AN INTENT UNTIL YOUR GROCER AUTHORISES IT · SHOP CHECKOUT AND CHEF REQUESTS ARE PREVIEWS</SampleNote>
    </View>
  );
}
