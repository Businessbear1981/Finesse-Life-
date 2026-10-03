import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { rooms } from '@/lib/registry';
import { colors, touchTarget } from '@/lib/tokens';

export default function Lobby() {
  return (
    <ScrollView contentContainerStyle={styles.page} accessibilityLabel="Finesse hotel room directory">
      <Text style={styles.eyebrow}>THE HOTEL · MEMBERS CLUB</Text>
      <Text style={styles.title}>Finesse Life</Text>
      <Text style={styles.subtitle}>Thirty-one rooms. One life, beautifully orchestrated.</Text>
      <Link href="/penthouse" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Penthouse private lift" style={styles.lift}>
          <Text style={styles.liftMark}>◈</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.liftLabel}>PRIVATE LIFT</Text>
            <Text style={styles.liftTitle}>PENTHOUSE</Text>
          </View>
          <Text style={styles.liftMark}>›</Text>
        </Pressable>
      </Link>
      <Text style={styles.section}>THE ROOM DIRECTORY · 31</Text>
      {rooms.map((room) => (
        <Link key={room.id} href={{ pathname: '/room/[id]', params: { id: room.id } }} asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={`Room ${room.number}, ${room.name}, ${room.truthState}`} style={styles.room}>
            <Text style={styles.number}>{String(room.number).padStart(2, '0')}</Text>
            <View style={styles.roomBody}>
              <Text style={styles.name}>{room.name}</Text>
              <Text style={styles.caption}>{room.design}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.ink, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 96 },
  eyebrow: { color: colors.brass, fontSize: 10, letterSpacing: 4 },
  title: { color: colors.cream, fontFamily: 'serif', fontSize: 48, marginTop: 14 },
  subtitle: { color: colors.brassHighlight, fontSize: 15, lineHeight: 23, marginTop: 8, marginBottom: 32 },
  lift: { minHeight: 112, borderWidth: 1, borderColor: colors.brass, backgroundColor: colors.oxblood, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 42, gap: 20 },
  liftMark: { color: colors.brassHighlight, fontSize: 28 },
  liftLabel: { color: colors.brass, fontSize: 10, letterSpacing: 3 },
  liftTitle: { color: colors.cream, fontFamily: 'serif', fontSize: 26, marginTop: 7, letterSpacing: 2 },
  section: { color: colors.brass, fontSize: 11, letterSpacing: 3, marginBottom: 16 },
  room: { borderTopWidth: 1, borderColor: colors.brassShadow, minHeight: touchTarget + 38, flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 16 },
  number: { color: colors.brass, fontSize: 13, width: 28 },
  roomBody: { flex: 1 },
  name: { color: colors.cream, fontFamily: 'serif', fontSize: 23 },
  caption: { color: colors.brass, opacity: 0.75, fontSize: 12, lineHeight: 17, marginTop: 3 },
  chevron: { color: colors.brass, fontSize: 22 },
});
