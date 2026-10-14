import { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { router, usePathname, Slot } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Power, User, Crown } from 'lucide-react-native';
import { RAIL_LEFT, RAIL_LEFT_HIM, RAIL_RIGHT, RAIL_RIGHT_HIM, DOCK_LEFT, DOCK_RIGHT, routeFor, type Room } from '../../src/data/rooms';
import { NovaPanel } from '../../src/components/NovaPanel';
import { useSession } from '../../src/lib/session';
import { C, F, brand } from '../../src/theme';

/** Hotel shell: top bar (profile · brand · VIP), left rail, right rail, centre = current room, dock with Nova on/off. */
export default function HotelShell() {
  const { side } = useSession();
  const path = usePathname();
  const [nova, setNova] = useState(false);
  const left = side === 'him' ? RAIL_LEFT_HIM : RAIL_LEFT;
  const right = side === 'him' ? RAIL_RIGHT_HIM : RAIL_RIGHT;
  const isOn = (r: Room) => path === routeFor(r.id);
  const go = (r: Room) => { Haptics.selectionAsync(); router.replace(routeFor(r.id) as any); };

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <SafeAreaView edges={['top']} style={s.top}>
        <Pressable onPress={() => router.replace('/profile')} accessibilityLabel="Profile" style={[s.corner, path === '/profile' && { borderColor: C.gold }]}><User size={18} color={C.gold} /></Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.brand}>{brand(side).toUpperCase()}</Text>
          <Text style={s.est}>EST. MMXXVI</Text>
        </View>
        <Pressable onPress={() => router.replace('/vip')} accessibilityLabel="VIP" style={[s.corner, path === '/vip' && { borderColor: C.him, backgroundColor: 'rgba(255,169,107,0.12)' }]}><Crown size={18} color={C.him} /></Pressable>
      </SafeAreaView>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Rail rooms={left} isOn={isOn} go={go} side="left" />
        <View style={{ flex: 1 }}>
          <Slot />
          {nova && <NovaPanel />}
        </View>
        <Rail rooms={right} isOn={isOn} go={go} side="right" />
      </View>

      <SafeAreaView edges={['bottom']} style={s.dock}>
        {DOCK_LEFT.map((r) => <DockTile key={r.id} room={r} on={isOn(r)} go={go} />)}
        <View style={s.novaCell}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setNova((v) => !v); }}
            accessibilityRole="switch" accessibilityState={{ checked: nova }} accessibilityLabel="Nova"
            style={[s.novaBtn, nova && s.novaOn]}>
            <LinearGradient colors={['#4A3416', C.goldHi, C.brassDeep, C.goldHot, C.brassDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 36 }]} />
            <View style={s.novaFace}><Power size={26} color={nova ? C.her : C.gold} /></View>
          </Pressable>
          <Text style={[s.dockLabel, { color: nova ? C.her : C.gold }]}>{nova ? 'NOVA · ON' : 'NOVA'}</Text>
        </View>
        {DOCK_RIGHT.map((r) => <DockTile key={r.id} room={r} on={isOn(r)} go={go} />)}
      </SafeAreaView>
    </View>
  );
}

function Rail({ rooms, isOn, go, side }: { rooms: Room[]; isOn: (r: Room) => boolean; go: (r: Room) => void; side: 'left' | 'right' }) {
  return (
    <View style={[s.rail, side === 'left' ? { borderRightWidth: 2 } : { borderLeftWidth: 2 }]}>
      {rooms.map((r) => {
        const on = isOn(r);
        return (
          <Pressable key={r.id + side} onPress={() => go(r)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={r.label} style={[s.tile, on && s.tileOn]}>
            <r.Icon size={20} color={on ? C.lampOn : 'rgba(244,232,208,0.6)'} strokeWidth={on ? 2.2 : 1.5} />
            <Text numberOfLines={1} style={[s.tileLabel, on && { color: '#7AF5B8' }]}>{r.label}</Text>
            <View style={[s.lamp, on && s.lampOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

function DockTile({ room, on, go }: { room: Room; on: boolean; go: (r: Room) => void }) {
  return (
    <Pressable onPress={() => go(room)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.dockTile, on && { borderTopColor: C.gold }]}>
      <room.Icon size={20} color={on ? C.gold : 'rgba(244,232,208,0.55)'} />
      <Text style={[s.dockLabel, { color: on ? C.gold : 'rgba(244,232,208,0.55)' }]}>{room.label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 8, backgroundColor: '#0E0608', borderBottomWidth: 2, borderBottomColor: C.brass },
  corner: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(201,169,97,0.35)', backgroundColor: 'rgba(10,4,6,0.6)' },
  brand: { fontFamily: F.displayReg, fontSize: 22, letterSpacing: 3.5, color: C.gold },
  est: { fontFamily: F.capsSemi, fontSize: 8, letterSpacing: 4, color: 'rgba(201,169,97,0.6)' },
  rail: { width: 58, borderColor: 'rgba(201,169,97,0.35)', backgroundColor: 'rgba(10,4,6,0.96)' },
  tile: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 3, borderBottomWidth: 1, borderBottomColor: 'rgba(201,169,97,0.12)' },
  tileOn: { backgroundColor: 'rgba(0,255,136,0.07)' },
  tileLabel: { fontFamily: F.deco, fontSize: 8, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(244,232,208,0.5)' },
  lamp: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.lampOff },
  lampOn: { backgroundColor: C.lampOn, shadowColor: C.lampOn, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  dock: { flexDirection: 'row', backgroundColor: '#0A0406', borderTopWidth: 2, borderTopColor: C.brass, minHeight: 70 },
  dockTile: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderTopWidth: 3, borderTopColor: 'transparent', marginTop: -2 },
  dockLabel: { fontFamily: F.deco, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  novaCell: { width: 92, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(201,169,97,0.3)' },
  novaBtn: { position: 'absolute', top: -30, width: 72, height: 72, borderRadius: 36, shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  novaOn: { borderWidth: 3, borderColor: C.her, shadowColor: C.her, shadowOpacity: 0.7, shadowRadius: 20 },
  novaFace: { position: 'absolute', top: 7, left: 7, right: 7, bottom: 7, borderRadius: 30, backgroundColor: '#0A0807', alignItems: 'center', justifyContent: 'center' },
});
