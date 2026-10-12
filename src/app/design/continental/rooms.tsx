'use client';

import {useState} from 'react';
import {FinesseLayout} from '@/components/finesse-layout';
import type {CardFinish} from '@/lib/card-finishes';
import {VaultRoom} from '@/app/(hotel)/vault/vault-view';
import {LoungeRoom} from '@/app/(hotel)/lounge/lounge-view';
import {SAMPLE_MEMBERS, SAMPLE_POSTS_FULL, SAMPLE_TRANSACTIONS} from './sample-data';

function SampleBanner() {
  return (
    <p className="fixed top-[72px] left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap bg-[rgb(8_6_10/0.9)] px-3 py-1 font-label text-[8px] uppercase tracking-[0.3em] text-[var(--ct-text-soft)] shadow-[inset_0_0_0_1px_rgb(201_169_97/0.4)]">
      Design preview · sample data
    </p>
  );
}

/** The live Vault composition, inside the Payload shell, with sample data. */
export function VaultPreview() {
  const [finish, setFinish] = useState<CardFinish>('nano_black');
  const [flipped, setFlipped] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  return (
    <FinesseLayout>
      <SampleBanner />
      <VaultRoom
        toast={null}
        finish={finish}
        onFinish={setFinish}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        brand="FINESSE"
        holder="VIVIENNE ASHFORD"
        accent="#FF4D7D"
        loading={false}
        balanceCents={124850}
        cashbackCents={15052}
        transactions={SAMPLE_TRANSACTIONS}
        fundOpen={fundOpen}
        onFundOpen={setFundOpen}
        fundLoading={false}
        onFundConfirm={() => setFundOpen(false)}
      />
    </FinesseLayout>
  );
}

/** The live Lounge composition, inside the Payload shell, with sample data. */
export function LoungePreview() {
  return (
    <FinesseLayout>
      <SampleBanner />
      <LoungeRoom members={SAMPLE_MEMBERS} membersLoading={false} posts={SAMPLE_POSTS_FULL} postsLoading={false} userId="preview" onNewPost={() => {}} />
    </FinesseLayout>
  );
}
