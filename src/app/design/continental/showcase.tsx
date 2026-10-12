'use client';

import Link from 'next/link';
import {useState, type ReactNode} from 'react';
import type {CardFinish} from '@/lib/card-finishes';
import {
  BrassButton,
  BrassCounter,
  BrassSurface,
  ChevronInlay,
  Coin,
  DecoFrame,
  Divider,
  EngravedHeading,
  Eyebrow,
  FinesseCard,
  FoilSheen,
  GiltText,
  Guilloche,
  LacquerSurface,
  Lamp,
  MarbleSurface,
  Nameplate,
  PaperSurface,
  Plate,
  Seal,
  Sigil,
  SmokedMirror,
  SteppedFan,
  Sunburst,
  VaultDoor,
  VelvetSurface,
} from '@/components/continental';
import {DepositBoxes, FinishSwatches, FundPanel, VaultChamber, VaultLedger} from '@/app/(hotel)/vault/vault-view';
import {HouseRules, LacquerTable, LoungeHeader, MemberPlate, MomentCard} from '@/app/(hotel)/lounge/lounge-view';
import {PostCard} from '@/app/(hotel)/lounge/post-card';
import {PostComposer} from '@/app/(hotel)/lounge/post-composer';
import {SAMPLE_MEMBERS, SAMPLE_POSTS, SAMPLE_POSTS_FULL, SAMPLE_TRANSACTIONS} from './sample-data';

function Section({id, title, note, children}: {id: string; title: string; note?: string; children: ReactNode}) {
  return (
    <section id={id} className="mx-auto max-w-5xl scroll-mt-6 px-4 py-14 sm:px-8">
      <EngravedHeading as="h2" title={title} size="md" align="left" eyebrow={note} />
      <div className="mt-8 [&_.grid>*]:min-w-0">{children}</div>
    </section>
  );
}

function Label({children}: {children: ReactNode}) {
  return <p className="mt-3 font-label text-[9px] uppercase tracking-[0.3em] text-[var(--ct-text-mute)]">{children}</p>;
}

const SWATCHES: [string, string][] = [
  ['--brass-50', 'brass 50'],
  ['--brass-200', 'brass 200'],
  ['--brass-400', 'brass 400'],
  ['--brass-600', 'brass 600'],
  ['--brass-800', 'brass 800'],
  ['--lacquer', 'lacquer'],
  ['--lacquer-3', 'lacquer 3'],
  ['--oxblood-900', 'oxblood 900'],
  ['--oxblood-700', 'oxblood 700'],
  ['--oxblood-500', 'oxblood 500'],
  ['--ivory', 'ivory'],
  ['--ivory-ink', 'ivory ink'],
  ['--ct-text', 'text'],
  ['--ct-text-soft', 'text soft'],
  ['--ct-text-mute', 'text mute'],
];

export function Showcase() {
  const [finish, setFinish] = useState<CardFinish>('nano_black');
  const [flipped, setFlipped] = useState(false);
  const [doorKey, setDoorKey] = useState(0);

  return (
    <main className="min-h-screen pb-24 text-[var(--ct-text)]" style={{background: 'var(--lacquer)'}}>
      {/* ── Masthead ── */}
      <MarbleSurface seed={4} className="border-b border-[rgb(201_169_97/0.3)]">
        <Sunburst origin="bottom" rays={30} className="absolute inset-x-0 bottom-0 h-full w-full" opacity={0.35} />
        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-16 text-center sm:px-8">
          <Sigil size={40} className="mx-auto mb-6" />
          <EngravedHeading eyebrow="Finesse · Design system" title="Continental" script="A members' club inside a 1920s grand hotel." size="xl" />
          <nav className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 font-label text-[10px] uppercase tracking-[0.3em] text-[var(--ct-text-soft)]">
            {['palette', 'surfaces', 'type', 'plates', 'ornaments', 'objects', 'buttons', 'vault', 'lounge'].map((s) => (
              <a key={s} href={`#${s}`} className="py-2 hover:text-[var(--brass-100)]">{s}</a>
            ))}
          </nav>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/design/continental/vault" className="py-2 font-label text-[10px] uppercase tracking-[0.3em] text-[var(--brass-200)] underline-offset-4 hover:underline">The Vault in the shell ›</Link>
            <Link href="/design/continental/lounge" className="py-2 font-label text-[10px] uppercase tracking-[0.3em] text-[var(--brass-200)] underline-offset-4 hover:underline">The Lounge in the shell ›</Link>
          </div>
        </div>
      </MarbleSurface>

      <Section id="palette" title="Palette" note="Tokens · globals.css">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {SWATCHES.map(([v, l]) => (
            <div key={v}>
              <div className="h-14 shadow-[inset_0_0_0_1px_rgb(201_169_97/0.3)]" style={{background: `var(${v})`}} />
              <Label>{l}</Label>
            </div>
          ))}
        </div>
      </Section>

      <Section id="surfaces" title="Materials" note="Surfaces">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div><LacquerSurface sparkle className="h-36 shadow-[inset_0_0_0_1px_rgb(201_169_97/0.25)]" /><Label>LacquerSurface · sparkle</Label></div>
          <div><MarbleSurface className="h-36" /><Label>MarbleSurface · Nero Marquina</Label></div>
          <div><VelvetSurface channel className="h-36" /><Label>VelvetSurface · channel</Label></div>
          <div><VelvetSurface className="h-36" /><Label>VelvetSurface</Label></div>
          <div><PaperSurface className="h-36" /><Label>PaperSurface · ivory stock</Label></div>
          <div><BrassSurface className="h-36" /><Label>BrassSurface · brushed</Label></div>
          <div><SmokedMirror className="h-36" /><Label>SmokedMirror</Label></div>
        </div>
      </Section>

      <Section id="type" title="Lettering" note="Typography">
        <div className="grid gap-10 sm:grid-cols-2">
          <div className="space-y-8">
            <EngravedHeading eyebrow="Room 06 · Private floor" title="The Vault" script="your finesse card" />
            <EngravedHeading title="House Rules" size="sm" rule={false} />
            <div>
              <Eyebrow>Eyebrow · signage caps</Eyebrow>
              <p className="mt-2"><GiltText className="font-display text-4xl italic">Gilt script</GiltText></p>
              <p className="mt-2 font-body text-[18px] leading-relaxed text-[var(--ct-text-soft)]">Cormorant body on lacquer — the conversation in the room, set at 18px for an easy read at the bar.</p>
            </div>
          </div>
          <div className="space-y-6">
            <BrassSurface className="px-6 py-5">
              <p className="ct-engraved font-label text-[14px] font-bold uppercase tracking-[0.4em]">Engraved in brass</p>
              <p className="ct-engraved mt-2 font-body text-[17px] font-semibold">Cut lettering with a lit lower lip.</p>
            </BrassSurface>
            <SmokedMirror className="px-6 py-5">
              <p className="ct-etched font-label text-[14px] uppercase tracking-[0.4em]">Etched in glass</p>
            </SmokedMirror>
            <PaperSurface className="px-6 py-5">
              <p className="font-label text-[13px] font-bold uppercase tracking-[0.28em]" style={{textShadow: '0 1px 0 rgb(255 255 255 / 70%)'}}>Letterpress on ivory</p>
              <p className="mt-1 font-body text-[17px] italic">With the compliments of the house.</p>
            </PaperSurface>
          </div>
        </div>
      </Section>

      <Section id="plates" title="Plates & Signage" note="Plate · Nameplate">
        <div className="flex flex-wrap items-end gap-6">
          <Plate number="06" label="The Vault" size="lg" />
          <Plate number="02" label="The Lounge" />
          <Plate number="23" label="VIP" finish="nickel" />
          <Plate finish="enamel" number="31" label="Camera" />
          <Plate label="Private" size="sm" />
          <Plate number="101" size="sm" screws={false} />
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <Nameplate name="Vivienne Ashford" />
          <Nameplate name="Julian Marlowe" finish="nickel" />
        </div>
      </Section>

      <Section id="ornaments" title="Ornament" note="Frames · rules · motifs">
        <div className="grid gap-6 sm:grid-cols-2">
          <DecoFrame className="p-8 text-center">
            <Eyebrow>DecoFrame</Eyebrow>
            <p className="mt-2 font-body text-[17px] text-[var(--ct-text-soft)]">Hairline double keyline, stepped brass corners.</p>
          </DecoFrame>
          <div className="space-y-6 py-4">
            <Divider />
            <Divider label="Recent Transactions" />
            <ChevronInlay />
          </div>
          <div className="relative h-48 overflow-hidden bg-[var(--lacquer-2)]"><Sunburst className="absolute inset-0 h-full w-full" /><Label>Sunburst</Label></div>
          <div className="flex h-48 items-end justify-center bg-[var(--lacquer-2)]"><SteppedFan className="w-72" /></div>
          <div className="flex h-56 items-center justify-center bg-[var(--lacquer-2)]"><Guilloche className="h-52 w-52" /></div>
          <PaperSurface className="flex h-56 flex-col justify-center gap-6 px-4">
            <Guilloche variant="band" className="h-6 w-full" color="#9c8455" />
            <div className="flex justify-center gap-6"><Sigil size={56} /><Sigil size={56} tone="ink" /></div>
          </PaperSurface>
        </div>
      </Section>

      <Section id="objects" title="Objects" note="Coin · Seal · Lamp · Counter">
        <div className="flex flex-wrap items-center gap-8">
          <Coin size={150} value="12%" caption="CASHBACK" title="12% house marker" />
          <Coin size={110} face="sigil" />
          <Seal size={96} />
          <Seal size={84} mark="sigil" wax="black" variant={1} />
          <Seal size={72} mark="V" wax="gold" variant={2} />
          <Lamp size={56} />
          <BrassCounter value="$12,480.00" label="$12,480.00" size={26} />
        </div>
      </Section>

      <Section id="buttons" title="Buttons" note="BrassButton · BrassLink">
        <div className="flex flex-wrap items-center gap-4">
          <BrassButton size="lg">Fund Your Vault</BrassButton>
          <BrassButton>Reserve</BrassButton>
          <BrassButton size="sm">post</BrassButton>
          <BrassButton variant="lacquer">Close</BrassButton>
          <BrassButton variant="ivory">Send the card</BrassButton>
          <BrassButton disabled>Disabled</BrassButton>
        </div>
        <div className="mt-8">
          <FoilSheen delay={0.2}><span className="ct-gilt font-label text-[40px] font-semibold uppercase tracking-[0.2em]">FoilSheen</span></FoilSheen>
        </div>
      </Section>

      <Divider className="mx-auto max-w-3xl px-4" />

      {/* ═══ VAULT ═══ */}
      <section id="vault" className="mx-auto max-w-[760px] py-14">
        <div className="px-4">
          <EngravedHeading as="h2" eyebrow="Room 06 · flagship" title="The Vault" size="md" />
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setDoorKey((k) => k + 1)} className="min-h-11 font-label text-[10px] uppercase tracking-[0.3em] text-[var(--brass-200)] underline-offset-4 hover:underline">Replay door ›</button>
          </div>
        </div>
        <div className="mt-6">
          <VaultChamber key={doorKey} finish={finish} onFinish={setFinish} flipped={flipped} onFlip={() => setFlipped((f) => !f)} brand="FINESSE" holder="VIVIENNE ASHFORD" accent="#FF4D7D" />
        </div>

        <div className="mt-14 grid gap-8 px-4 sm:grid-cols-2">
          {(['nano_black', 'platinum', 'rose_gold'] as CardFinish[]).map((f) => (
            <div key={f}>
              <FinesseCard finish={f} holder="VIVIENNE ASHFORD" />
            </div>
          ))}
          <div>
            <FinesseCard finish="platinum" holder="VIVIENNE ASHFORD" flipped />
          </div>
        </div>
        <div className="mt-8 px-4"><FinishSwatches value={finish} onChange={setFinish} /></div>

        <div className="mx-auto mt-14 max-w-[560px] space-y-10 px-4">
          <VaultLedger loading={false} balanceCents={124850} cashbackCents={15052} />
          <BrassButton block size="lg">Fund Your Vault</BrassButton>
          <DepositBoxes loading={false} transactions={SAMPLE_TRANSACTIONS} onFund={() => {}} />
          <DepositBoxes loading={false} transactions={[]} onFund={() => {}} />
          <div className="mx-auto max-w-sm"><FundPanel loading={false} onConfirm={() => {}} onClose={() => {}} /></div>
        </div>
        <div className="mt-14">
          <Eyebrow className="mb-4 text-center">Locked · signed-out view</Eyebrow>
          <div className="overflow-hidden"><VaultDoor state="closed" /></div>
        </div>
      </section>

      <Divider className="mx-auto max-w-3xl px-4" />

      {/* ═══ LOUNGE ═══ */}
      <section id="lounge" className="py-14">
        <LoungeHeader />
        <div className="mx-auto max-w-2xl px-4">
          <div className="mt-10"><HouseRules /></div>
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {SAMPLE_MEMBERS.map((m, i) => (
              <MemberPlate key={m.id} member={m} index={i} />
            ))}
          </div>
          <div className="mt-14">
            <LacquerTable>
              <PostComposer userId="preview" onPost={() => {}} />
              <PostComposer userId="preview" onPost={() => {}} defaultOpen />
              <div className="space-y-5">
                {SAMPLE_POSTS.map((p, i) => (
                  <MomentCard key={p.id} post={p} index={i} />
                ))}
                <PostCard post={SAMPLE_POSTS_FULL[8]} userId={null} index={0} />
              </div>
            </LacquerTable>
          </div>
        </div>
      </section>
    </main>
  );
}
