// /lobby: the house directory on its own page (the hotel's Lobby is in /hotel). After Hours edition.
import {useCallback} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ah, ahFonts} from '@/lib/ah';
import {type Room} from '@/lib/registry';
import {RELEASE} from '@/lib/release';
import {Icon} from '@/lib/icons';
import {AHBody, AHCard, AHDisplay, AHEyebrow, AHGlow, AHSection} from '@/components/ah';
import {HouseIndex, visibleRoomCount} from '@/components/scenes/DecoLobby';

export default function Lobby() {
  const router = useRouter();
  const open = useCallback((room: Room) => router.push({pathname: '/room/[id]', params: {id: room.id}}), [router]);
  return (
    <View style={{flex: 1, backgroundColor: ah.ink}}>
      <AHGlow />
      <ScrollView accessibilityLabel="Finesse hotel room directory" showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: 20, paddingTop: 24, paddingBottom: 96, width: '100%', maxWidth: 560, alignSelf: 'center'}}>
        <AHEyebrow>The hotel · Members club</AHEyebrow>
        <AHDisplay size={52} style={{marginTop: 10}}>Finesse Life.</AHDisplay>
        <AHBody mute style={{marginTop: 8}}>{visibleRoomCount} rooms. One life, beautifully orchestrated.</AHBody>

        {RELEASE.vip ? <Pressable onPress={() => router.push('/penthouse')} accessibilityRole="button" accessibilityLabel="Open Penthouse private lift"
          style={({pressed}) => ({marginTop: 26, opacity: pressed ? 0.8 : 1})}>
          <AHCard style={{flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: 'rgba(232,180,160,0.28)'}} pad={16}>
            <View style={{width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(232,180,160,0.4)', backgroundColor: 'rgba(232,180,160,0.08)'}}>
              <Icon name="crown" size={18} color={ah.rose} />
            </View>
            <View style={{flex: 1}}>
              <AHEyebrow color={ah.rose} style={{fontSize: 11}}>Private lift</AHEyebrow>
              <Text style={{marginTop: 4, fontFamily: ahFonts.serif, fontSize: 26, lineHeight: 28, color: ah.text}}>The Penthouse</Text>
            </View>
            <Text style={{color: ah.mute, fontSize: 16}}>→</Text>
          </AHCard>
        </Pressable> : null}

        <AHSection title={`The room directory · ${visibleRoomCount}`}>
          <HouseIndex onPick={open} bleed={20} />
        </AHSection>
      </ScrollView>
    </View>
  );
}
