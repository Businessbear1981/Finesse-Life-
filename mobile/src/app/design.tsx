// Dev-only atelier: the Continental kit plus The Vault and The Lounge in their signed-out sample state,
// so the art can be reviewed and screenshotted without a login. Release builds redirect to the entrance.
// Query: ?section=kit|vault|lounge (default: all) · ?w=250 renders rooms at the hotel shell's column width.
import {Redirect, Stack, useLocalSearchParams} from 'expo-router';
import {ScrollView, Text, View, useWindowDimensions} from 'react-native';
import {deco, fonts} from '@/lib/deco';
import {ContentWidth} from '@/lib/layout';
import {BrassButton, BrassToggles, Coin, CornerBrackets, DecoFrame, Divider, EngravedHeading, FoilSheen, GuillocheBand, GuillocheRosette, Plate, Seal, Sigil, Sunburst, Surface, VaultDoor, type Material} from '@/components/continental';
import {Vault} from '@/components/rooms/Vault';
import {Lounge} from '@/components/rooms/Lounge';
import {useState} from 'react';

const MATERIALS: Material[] = ['lacquer', 'marble', 'velvet', 'tufted', 'ivory', 'mirror', 'metal'];

function Kit({w}: {w: number}) {
  const [t, setT] = useState('Circle');
  return (
    <View style={{gap: 22}}>
      <View style={{height: 150, alignItems: 'center', justifyContent: 'flex-end'}}>
        <View style={{position: 'absolute', top: 0}}><Sunburst width={w} height={150} rays={28} opacity={0.4} /></View>
        <EngravedHeading kicker="The Continental Kit" sub="Materials and fittings of the house" size={26}>Finesse</EngravedHeading>
      </View>
      <Divider />
      <Divider label="SURFACES" />
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
        {MATERIALS.map((m, i) => (
          <Surface key={m} kind={m} seed={i + 2} light={m === 'lacquer' || m === 'velvet' ? 0.6 : 0} radius={2} style={{width: (w - 16) / 3, height: 86, justifyContent: 'flex-end', padding: 6}}>
            <Text style={{fontFamily: fonts.capsBold, fontSize: 8, letterSpacing: 1.6, color: m === 'ivory' || m === 'metal' ? '#2A1C0E' : deco.brassLight}}>{m.toUpperCase()}</Text>
          </Surface>
        ))}
      </View>
      <Divider label="PLATES" />
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center'}}>
        <Plate text="No. 07" caption="Room" />
        <Plate text="No. 01" caption="Private safe" enamel width={112} />
        <Plate text="Inès" width={70} height={24} screws={false} font="display" />
        <Plate text="Maya" width={70} height={24} screws={false} font="display" metal="goldLeaf" />
      </View>
      <Divider label="BUTTONS" />
      <BrassButton label="ENTER THE VAULT" />
      <View style={{flexDirection: 'row', gap: 10}}>
        <View style={{flex: 1}}><BrassButton label="RESERVE" variant="lacquer" /></View>
        <View style={{flex: 1}}><BrassButton label="FUND" disabled /></View>
      </View>
      <BrassToggles options={['Circle', 'Like-minded', 'Room']} value={t} onChange={setT} />
      <Divider label="SEALS · MARKERS" />
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'center'}}>
        <Seal size={72} glyph="F" />
        <Seal size={72} glyph="eye" wax="black" seed={8} />
        <Seal size={56} glyph="F" wax="gold" seed={5} />
        <Coin size={96} value="12%" caption="Cashback" />
        <Sigil size={44} />
      </View>
      <Divider label="GUILLOCHÉ" />
      <View style={{alignItems: 'center', gap: 10}}>
        <GuillocheRosette size={Math.min(200, w)} metal="goldLeaf" opacity={0.9} rings={3} />
        <GuillocheBand width={w} height={16} />
      </View>
      <Divider label="FRAMES" />
      <DecoFrame title="HOUSE RULES" material="lacquer" light={0.5}>
        <Text style={{fontFamily: fonts.script, fontSize: 17, color: deco.cream, textAlign: 'center'}}>A double keyline with stepped corners, set on black lacquer.</Text>
      </DecoFrame>
      <DecoFrame material="ivory" ink title="CALLING CARD">
        <Text style={{fontFamily: fonts.script, fontSize: 17, color: '#1A120C', textAlign: 'center'}}>Ivory stock, letterpress keylines.</Text>
      </DecoFrame>
      <Surface kind="velvet" light={0.5} style={{height: 90, alignItems: 'center', justifyContent: 'center'}}>
        <CornerBrackets />
        <Text style={{fontFamily: fonts.capsBold, fontSize: 10, letterSpacing: 3, color: deco.brassLight}}>CORNER BRACKETS ON VELVET</Text>
      </Surface>
      <Surface kind="metal" metal="goldLeaf" style={{height: 60, alignItems: 'center', justifyContent: 'center'}}>
        <FoilSheen period={4000} delay={200} />
        <Text style={{fontFamily: fonts.capsBold, fontSize: 11, letterSpacing: 4, color: '#2A1C0E'}}>FOIL SHEEN</Text>
      </Surface>
      <Divider label="THE VAULT DOOR" />
      <View style={{alignItems: 'center'}}><VaultDoor size={Math.min(300, w)} open={false} /></View>
    </View>
  );
}

export default function Design() {
  const {section, w: wParam} = useLocalSearchParams<{section?: string; w?: string}>();
  const {width} = useWindowDimensions();
  if (!__DEV__) return <Redirect href="/" />;
  const w = wParam ? Math.max(220, Math.min(Number(wParam) || 0, width - 40)) : Math.min(width - 40, 520);
  const show = (k: string) => !section || section === k;
  return (
    <>
      <Stack.Screen options={{title: 'THE ATELIER · DEV'}} />
      <ScrollView style={{flex: 1, backgroundColor: deco.ink}} contentContainerStyle={{paddingVertical: 24, alignItems: 'center', gap: 36}}>
        <ContentWidth.Provider value={w}>
          <View style={{width: w, gap: 36}}>
            {show('kit') ? <Kit w={w} /> : null}
            {show('vault') ? <View style={{gap: 14}}><EngravedHeading kicker="Signed-out sample" size={24}>The Vault</EngravedHeading><Vault side="her" /></View> : null}
            {show('lounge') ? <View style={{gap: 14}}><EngravedHeading kicker="Signed-out sample" size={24}>The Lounge</EngravedHeading><Lounge side="her" /></View> : null}
          </View>
        </ContentWidth.Provider>
      </ScrollView>
    </>
  );
}
