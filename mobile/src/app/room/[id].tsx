import {useLocalSearchParams, useRouter} from 'expo-router';
import {Text, View} from 'react-native';
import {roomById} from '@/lib/registry';
import {ah} from '@/lib/ah';
import {Panel, RoomPlate, plateText} from '@/components/plate/RoomPlate';
import {INTERIORS} from '@/components/rooms/interiors';
import {useSide} from '@/lib/session';
import {hotelId, manifestId} from '@/lib/room-ids';
import {AHDisplay, AHEyebrow, AHPill} from '@/components/ah';

export default function RoomDetail() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const room = roomById(manifestId(id ?? '')); // accepts hotel ids (perdiem, profile) as well as manifest ids
  const side = useSide(); // hooks run before any early return
  if (!room) {
    return (
      <View style={{flex: 1, backgroundColor: ah.ink, padding: 24, justifyContent: 'center', gap: 16}}>
        <AHEyebrow>Not on the floor plan</AHEyebrow>
        <AHDisplay size={44}>No such room.</AHDisplay>
        <Text style={plateText.small}>This room is not in the directory.</Text>
        <AHPill label="Return to the Lobby" variant="ghost" onPress={() => router.push('/lobby')} />
      </View>
    );
  }
  const Built = INTERIORS[hotelId(room.id)];
  return (
    <RoomPlate room={room}>
      {Built ? <View style={{gap: 14}}><Built side={side} /></View> : (
        <>
          <Panel title="The scene">
            <Text style={plateText.lead}>{room.sceneBlueprint.architecture}.</Text>
            <Text style={plateText.body}>{room.sceneBlueprint.focalObject}. {room.sceneBlueprint.motion}.</Text>
          </Panel>
          <Panel title="What you will do here">
            <Text style={plateText.body}>{room.primaryAction}.</Text>
            <Text style={plateText.small}>This room is being prepared. Nothing here is live yet.</Text>
          </Panel>
        </>
      )}
    </RoomPlate>
  );
}
