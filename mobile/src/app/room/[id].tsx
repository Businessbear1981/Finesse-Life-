import {useLocalSearchParams, Link} from 'expo-router';
import {StyleSheet, Text, View} from 'react-native';
import {roomById} from '@/lib/registry';
import {deco, fonts} from '@/lib/deco';
import {Panel, RoomPlate, plateText} from '@/components/plate/RoomPlate';
import {Lounge} from '@/components/rooms/Lounge';
import {Concierge} from '@/components/rooms/Concierge';
import {Vault} from '@/components/rooms/Vault';

const BUILT: Record<string, () => React.JSX.Element> = {lounge: Lounge, concierge: Concierge, vault: Vault};

export default function RoomDetail() {
  const {id} = useLocalSearchParams<{id: string}>();
  const room = roomById(id ?? '');
  if (!room) {
    return (
      <View style={styles.missing}>
        <Text style={plateText.lead}>This room is not in the directory.</Text>
        <Link href="/lobby" style={styles.link}>RETURN TO THE LOBBY</Link>
      </View>
    );
  }
  const Built = BUILT[room.id];
  return (
    <RoomPlate room={room}>
      {Built ? <Built /> : (
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
