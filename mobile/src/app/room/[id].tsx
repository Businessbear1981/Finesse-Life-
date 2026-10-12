import {useLocalSearchParams, Link} from 'expo-router';
import {StyleSheet, Text, View} from 'react-native';
import {roomById} from '@/lib/registry';
import {deco, fonts} from '@/lib/deco';
import {Panel, RoomPlate, plateText} from '@/components/plate/RoomPlate';
import {INTERIORS} from '@/components/rooms/interiors';
import {useSide} from '@/lib/session';
import {hotelId, manifestId} from '@/lib/room-ids';

export default function RoomDetail() {
  const {id} = useLocalSearchParams<{id: string}>();
  const room = roomById(manifestId(id ?? '')); // accepts hotel ids (perdiem, profile) as well as manifest ids
  const side = useSide(); // hooks run before any early return
  if (!room) {
    return (
      <View style={styles.missing}>
        <Text style={plateText.lead}>This room is not in the directory.</Text>
        <Link href="/lobby" style={styles.link}>RETURN TO THE LOBBY</Link>
      </View>
    );
  }
  const Built = INTERIORS[hotelId(room.id)];
  return (
    <RoomPlate room={room}>
      {Built ? <View style={{gap: 14}}><Built side={side} /></View> : (
        <>
          <Panel title="THE SCENE">
            <Text style={plateText.lead}>{room.sceneBlueprint.architecture}.</Text>
            <Text style={plateText.body}>{room.sceneBlueprint.focalObject}. {room.sceneBlueprint.motion}.</Text>
          </Panel>
          <Panel title="WHAT YOU WILL DO HERE">
            <Text style={plateText.body}>{room.primaryAction}.</Text>
            <Text style={plateText.small}>This room is being prepared. Nothing here is live yet.</Text>
          </Panel>
        </>
      )}
    </RoomPlate>
  );
}

const styles = StyleSheet.create({
  missing: {flex: 1, backgroundColor: deco.ink, padding: 28, justifyContent: 'center', gap: 20},
  link: {fontFamily: fonts.label, fontSize: 11, letterSpacing: 4, color: deco.brassHighlight},
});
