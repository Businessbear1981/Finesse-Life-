import { useLocalSearchParams, Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { roomById } from '@/lib/registry';
import { colors } from '@/lib/tokens';

export default function RoomDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = roomById(id ?? '');
  if (!room) return <View style={styles.page}><Text style={styles.title}>This room is not in the directory.</Text><Link href="/lobby" style={styles.link}>Return to the Lobby</Link></View>;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>ROOM {String(room.number).padStart(2, '0')} · {room.plate.toUpperCase()}</Text>
      <Text style={styles.title}>{room.name}</Text>
      <View style={styles.rule} />
      <Text style={styles.eyebrow}>DESIGN SCENE</Text>
      <Text style={styles.lead}>{room.design}</Text>
      <Text style={styles.body}>{room.sceneBlueprint.architecture}</Text>
      <Text style={styles.eyebrow}>FOCAL OBJECT</Text>
      <Text style={styles.body}>{room.sceneBlueprint.focalObject}</Text>
      <Text style={styles.eyebrow}>MOTION</Text>
      <Text style={styles.body}>{room.sceneBlueprint.motion}</Text>
      <Text style={styles.eyebrow}>MOBILE COMPOSITION</Text>
      <Text style={styles.body}>{room.sceneBlueprint.mobile}</Text>
      <Text style={styles.eyebrow}>PRIMARY ACTION</Text>
      <Text style={styles.body}>{room.primaryAction}</Text>
      <Text style={styles.eyebrow}>CURRENT BUILD TRUTH</Text>
      <Text style={styles.body}>{room.truthState.toUpperCase()} · Phase {room.phase}. This starter is a room map; a label does not claim a live provider connection.</Text>
      <Text style={styles.eyebrow}>API CONTRACTS TO IMPLEMENT</Text>
      {room.api.map((api) => <Text key={api} style={styles.code}>{api}</Text>)}
      <Text style={styles.eyebrow}>REVENUE / RETENTION INTENT</Text>
      {room.revenue.map((item) => <Text key={item} style={styles.body}>— {item}</Text>)}
      <Link href="/lobby" style={styles.link}>← Return to the Lobby</Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.ink, paddingHorizontal: 28, paddingTop: 50, paddingBottom: 90, flexGrow: 1 },
  eyebrow: { color: colors.brass, fontSize: 10, letterSpacing: 2.5, marginTop: 24 },
  title: { color: colors.cream, fontFamily: 'serif', fontSize: 42, marginTop: 14 },
  rule: { height: 1, backgroundColor: colors.brass, marginTop: 32, marginBottom: 15 },
  lead: { color: colors.brassHighlight, fontFamily: 'serif', fontSize: 26, lineHeight: 33, marginTop: 15, marginBottom: 12 },
  body: { color: colors.cream, fontSize: 15, lineHeight: 23, marginTop: 12 },
  code: { color: colors.brassHighlight, fontFamily: 'monospace', fontSize: 13, marginTop: 12 },
  link: { color: colors.brassHighlight, fontSize: 15, marginTop: 42 },
});
