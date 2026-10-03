// The Kitchen — day strip, the meal plan table, the calorie ledger and ONE grocery order (from the design).
// Confirming records an order *intent* via /api/kitchen/order-intent: nothing is placed or charged
// until a grocery partner asks the member to authorise.
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn, LinearTransition} from 'react-native-reanimated';
import {api} from '@/lib/api';
import {deco, fonts, track, type Side} from '@/lib/deco';
import {ActionBar, GoldFrame, SampleNote, SectionHead, s} from './shared';

const KDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MENU: Array<Array<[string, string, number]>> = [
  [['BREAKFAST', 'Greek yogurt, figs, pistachio', 380], ['LUNCH', 'Seared salmon, fennel, lemon', 560], ['DINNER', 'Out · dinner hold at 8:30', 700]],
  [['BREAKFAST', 'Eggs, sourdough, avocado', 450], ['LUNCH', 'Chicken, farro, herbs', 610], ['DINNER', 'Miso cod, greens', 520]],
];
const GOAL = 1900;

function mondayISO() {
  const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function Kitchen({side}: {side: Side}) {
  const acc = track[side].acc;
  const [kd, setKd] = useState(3);
  const [ordered, setOrdered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const menu = MENU[kd % 2];
  const total = menu.reduce((a, m) => a + m[2], 0);

  const order = async () => {
    if (busy) return;
    setBusy(true);
    const r = await api<{message?: string}>('/api/kitchen/order-intent', {method: 'POST', json: {weekStart: mondayISO(), cancel: ordered}});
    setBusy(false);
    if (r.ok) { setOrdered(!ordered); setNote(r.body.message ?? (ordered ? 'Order intent cancelled.' : 'Order intent recorded.')); return; }
    if (r.status === 0) setNote('The house line is offline. Nothing was ordered.');
    else if (r.status === 401) setNote('Sign in to place the week’s order. Nothing was ordered.');
    else if (r.status === 409) { setOrdered(true); setNote('This week already has an order in progress.'); }
    else if (r.status === 422) setNote('Your saved plan has no groceries yet, so there is nothing to order.');
    else setNote('The order could not be recorded just now. Nothing was charged.');
  };

  return (
    <View style={{gap: 12}}>
      <View style={{flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(201,169,97,0.5)'}}>
        {KDAYS.map((d, i) => {
          const on = i === kd;
          return (
            <Pressable key={d} onPress={() => setKd(i)} accessibilityRole="button" accessibilityState={{selected: on}}
              style={{flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? deco.brassHighlight : 'transparent'}}>
              <Text style={{fontFamily: fonts.capsBold, fontSize: 9, letterSpacing: 0.8, color: on ? '#140E08' : deco.cream}}>{d}</Text>
            </Pressable>
          );
        })}
      </View>

      <GoldFrame pad={3}>
        <Animated.View key={kd} entering={FadeIn.duration(350)} style={{backgroundColor: '#14100C'}}>
          {menu.map(([when, dish, kcal], i) => (
            <View key={when} style={{flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: i ? 1 : 0, borderColor: 'rgba(201,169,97,0.25)'}}>
              <View style={{flex: 1, gap: 3}}>
                <Text style={{fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2, color: deco.brass}}>{when}</Text>
                <Text style={{fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 20, color: deco.cream}}>{dish}</Text>
              </View>
              <Text style={{fontFamily: fonts.mono, fontSize: 11, color: deco.brassHighlight}}>{kcal}</Text>
            </View>
          ))}
        </Animated.View>
      </GoldFrame>

      <View style={{gap: 6, padding: 12, borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)'}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 2, color: deco.brassHighlight}}>CALORIE LEDGER</Text>
          <Text style={{fontFamily: fonts.mono, fontSize: 10, color: deco.cream}}>{total.toLocaleString()} / {GOAL.toLocaleString()}</Text>
        </View>
        <View style={{height: 6, backgroundColor: 'rgba(201,169,97,0.15)'}}><Animated.View layout={LinearTransition.duration(600)} style={{height: 6, width: `${Math.min(100, (total / GOAL) * 100)}%`, backgroundColor: acc}} /></View>
        <Text style={s.small}>Protein 112g · carbs 160g · fat 58g</Text>
      </View>

      <SectionHead>ONE ORDER · 14 ITEMS</SectionHead>
      <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 10}}>
        <Text style={[s.body, {flex: 1}]}>Everything for the week, from one grocer. Delivered Sunday 10–12.</Text>
        <Text style={{fontFamily: fonts.displayHeavy, fontSize: 24, color: deco.brassLight}}>$186.40</Text>
      </View>
      <ActionBar label={busy ? 'RECORDING…' : ordered ? 'ORDER INTENT RECORDED · CANCEL' : 'CONFIRM THE ORDER'} color={ordered ? deco.brass : acc} onPress={order} disabled={busy} />
      {note ? <Text style={s.small} accessibilityLiveRegion="polite">{note}</Text> : null}
      <SampleNote>SAMPLE MENU · YOUR PLAN COMES FROM THE KITCHEN ONCE YOU SAVE ONE · NOTHING IS CHARGED WITHOUT YOUR GROCER’S AUTHORISATION</SampleNote>
    </View>
  );
}
