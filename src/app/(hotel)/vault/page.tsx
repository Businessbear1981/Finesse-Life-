'use client';

import {DEFAULT_CARD_FINISH, isCardFinish, type CardFinish} from '@/lib/card-finishes';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { VaultLoading, VaultLocked, VaultRoom, type VaultTransaction } from './vault-view';

type Edition = 'finesse' | 'carpe_diem';

interface VaultBalance {
  balance_cents: number;
  cashback_earned_cents: number;
  transactions: VaultTransaction[];
}

export default function VaultPage() {
  const [edition, setEdition] = useState<Edition>('finesse');
  const [displayName, setDisplayName] = useState<string>('MEMBER');
  const [isVip, setIsVip] = useState<boolean | null>(null);
  // Why the vault is closed when isVip is false: not signed in, or we couldn't check.
  const [accessIssue, setAccessIssue] = useState<'signed_out' | 'error' | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  // Card finish is a member preference (Nano Black / Platinum / Rose Gold), kept on this device
  // until the card partner is live and the choice is sent with the card order.
  const [finish, setFinish] = useState<CardFinish>(() => {
    if (typeof window === 'undefined') return DEFAULT_CARD_FINISH;
    try {
      const saved = window.localStorage.getItem('finesse_card_finish');
      return isCardFinish(saved) ? saved : DEFAULT_CARD_FINISH;
    } catch {
      return DEFAULT_CARD_FINISH;
    }
  });
  const chooseFinish = (f: CardFinish) => {
    setFinish(f);
    try {
      window.localStorage.setItem('finesse_card_finish', f);
    } catch {
      /* private mode — choice still applies for this visit */
    }
  };

  // Vault data
  const [vaultData, setVaultData] = useState<VaultBalance | null>(null);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [fundLoading, setFundLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Gender detection (SSR-safe)
  useEffect(() => {
    const g = localStorage.getItem('finesse_gender');
    setEdition(g === 'masculine' ? 'carpe_diem' : 'finesse');
  }, []);

  // Auth + profile fetch
  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAccessIssue('signed_out'); setIsVip(false); return; }
        // Own row via the SECURITY DEFINER helper (is_vip is not SELECT-granted, 20261020_s4).
        const { data: rows, error } = await supabase.rpc('get_own_profile');
        const profile = rows?.[0];
        if (error && !profile) {
          setAccessIssue('error');
          setIsVip(false);
        } else if (profile) {
          setDisplayName((profile.display_name as string | null)?.toUpperCase() ?? 'MEMBER');
          setIsVip(profile.is_vip as boolean ?? false);
        } else {
          setIsVip(false);
        }
      } catch {
        // Couldn't verify membership — fail closed, never grant VIP on error.
        setAccessIssue('error');
        setIsVip(false);
      }
    }
    loadProfile();
  }, []);

  // Fetch vault balance from real API
  const fetchVault = useCallback(async () => {
    setVaultLoading(true);
    try {
      const res = await fetch('/api/vault/balance');
      if (res.ok) {
        const data = await res.json() as VaultBalance;
        setVaultData(data);
      }
    } catch {
      // Network error — stay on null, zero defaults will show empty state
    } finally {
      setVaultLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  // Derive display values from real vault data (zero defaults until funded)
  const balanceCents = vaultData?.balance_cents ?? 0;
  const cashbackCents = vaultData?.cashback_earned_cents ?? 0;
  const transactions = vaultData?.transactions ?? [];

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleFund() {
    setFundLoading(true);
    try {
      const res = await fetch('/api/vault/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: 50000 }), // $500
      });
      const data = await res.json() as { funded?: boolean; new_balance_cents?: number; error?: string; message?: string };
      if (res.ok && data.funded) {
        setShowFundModal(false);
        showToast(`$500.00 deposited to your Vault`);
        await fetchVault();
      } else {
        showToast(data.message ?? data.error ?? 'Top-up failed', 'error');
      }
    } catch {
      showToast('Network error — try again', 'error');
    } finally {
      setFundLoading(false);
    }
  }

  const accentColor = edition === 'finesse' ? '#FF4D7D' : '#69C9D0';
  const cardLabel = edition === 'finesse' ? 'FINESSE' : 'CARPE DIEM';

  // Still loading VIP status
  if (isVip === null) return <VaultLoading />;

  // Signed out, or membership couldn't be checked — fail closed with an honest message
  if (!isVip && accessIssue) return <VaultLocked reason={accessIssue} />;

  // Non-VIP locked view
  if (!isVip) return <VaultLocked reason="not_vip" />;

  return (
    <VaultRoom
      toast={toast}
      finish={finish}
      onFinish={chooseFinish}
      flipped={cardFlipped}
      onFlip={() => setCardFlipped((f) => !f)}
      brand={cardLabel}
      holder={displayName}
      accent={accentColor}
      loading={vaultLoading}
      balanceCents={balanceCents}
      cashbackCents={cashbackCents}
      transactions={transactions}
      fundOpen={showFundModal}
      onFundOpen={setShowFundModal}
      fundLoading={fundLoading}
      onFundConfirm={handleFund}
    />
  );
}
