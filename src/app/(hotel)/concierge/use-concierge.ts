'use client';

// Nova's behaviour: persona load/save (/api/profile + localStorage), setup flow, and /api/nova chat.
// Moved verbatim from the old page.tsx; only the look lives elsewhere (concierge-view.tsx).

import {useEffect, useRef, useState} from 'react';
import type {AvatarConfig, Message, SetupStep} from './nova-model';

export function useConcierge(initialInput = '') {
  const [avatar, setAvatar] = useState<AvatarConfig | null>(null);
  const [setupStep, setSetupStep] = useState<SetupStep>('gender');
  const [pendingGender, setPendingGender] = useState('');
  const [pendingLook, setPendingLook] = useState('');
  const [pendingVoice, setPendingVoice] = useState('');
  const [pendingName, setPendingName] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialInput);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  useEffect(() => {
    // Try profile first (persisted across devices), fall back to localStorage
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d: {nova_persona?: AvatarConfig}) => {
        const config = d.nova_persona;
        if (config?.name) {
          localStorage.setItem('finesse_concierge_avatar', JSON.stringify(config));
          setAvatar(config);
          setSetupStep('done');
          setMessages([{id: 'welcome-back', role: 'concierge', text: `Welcome back. I'm ${config.name}, your concierge. What can I arrange for you tonight?`}]);
          return;
        }
        // Fall back to localStorage
        const saved = localStorage.getItem('finesse_concierge_avatar');
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as AvatarConfig;
            setAvatar(parsed);
            setSetupStep('done');
            setMessages([{id: 'welcome-back', role: 'concierge', text: `Welcome back. I'm ${parsed.name}, your concierge. What can I arrange for you tonight?`}]);
          } catch { /* ignore */ }
        }
      })
      .catch(() => {
        // Pure localStorage fallback
        const saved = localStorage.getItem('finesse_concierge_avatar');
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as AvatarConfig;
            setAvatar(parsed);
            setSetupStep('done');
            setMessages([{id: 'welcome-back', role: 'concierge', text: `Welcome back. I'm ${parsed.name}, your concierge. What can I arrange for you tonight?`}]);
          } catch { /* ignore */ }
        }
      });
  }, []);

  const finishSetup = () => {
    const config: AvatarConfig = {
      name: pendingName || 'Nova',
      gender: pendingGender as AvatarConfig['gender'],
      look: pendingLook,
      voice: pendingVoice,
    };
    setAvatar(config);
    setSetupStep('done');
    localStorage.setItem('finesse_concierge_avatar', JSON.stringify(config));
    // Persist to Supabase profile
    fetch('/api/profile', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({nova_persona: config}),
    }).catch(() => {});
    setMessages([
      {
        id: 'welcome',
        role: 'concierge',
        text: `Good evening. I'm ${config.name}. I'll be your personal concierge — reservations, travel, rides, appointments, reminders, anything you need. Just tell me what you're thinking.`,
      },
    ]);
  };

  const resetAvatar = () => {
    localStorage.removeItem('finesse_concierge_avatar');
    setAvatar(null);
    setSetupStep('gender');
    setPendingGender('');
    setPendingLook('');
    setPendingVoice('');
    setPendingName('');
    setMessages([]);
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || sending) return;
    if (!overrideText) setInput('');

    const userMsg: Message = {id: crypto.randomUUID(), role: 'guest', text};
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    const system = `You are ${avatar?.name || 'Nova'}, a personal AI concierge inside Finesse, a luxury lifestyle app. You are ${avatar?.gender || 'neutral'} with a ${avatar?.voice || 'balanced'} voice and ${avatar?.look || 'professional'} style. You help with: reservations, travel planning, ordering cars, appointments, reminders, shopping, and general lifestyle management. Be concise, warm, and decisive. When a user asks about their vault balance, call check_vault_balance. When asked for recommendations, call get_recommendations. When asked what to do next, call get_next_action. Always log purchase intent with log_intent when the user expresses interest in a specific service. Use real data from tools — never fabricate responses.`;

    try {
      const res = await fetch('/api/nova', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt: text, system, persona: 'concierge'}),
      });
      const data = (await res.json().catch(() => ({}))) as {text?: string; error?: string; retryAfterS?: number; tool_calls?: Array<{name: string; result: unknown}>};

      if (!res.ok || !data.text) {
        // Honest failure: nothing was arranged, so never echo a success line.
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'system',
            text: res.status === 401
              ? 'Sign in to speak with your concierge. Nothing has been arranged.'
              : res.status === 429
                ? `Nova needs a moment — try again ${Number(data.retryAfterS) > 0 ? `in ${Math.ceil(Number(data.retryAfterS))} s` : 'shortly'}. Nothing has been arranged.`
                : "Your concierge couldn't be reached just now. Nothing has been arranged — try again in a moment.",
          },
        ]);
        return;
      }
      const responseText = data.text;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'concierge',
          text: responseText,
          tool_calls: data.tool_calls && data.tool_calls.length > 0 ? data.tool_calls : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {id: crypto.randomUUID(), role: 'system', text: "Your concierge couldn't be reached just now. Nothing has been arranged — try again in a moment."},
      ]);
    } finally {
      setSending(false);
    }
  };

  return {
    avatar,
    setupStep,
    setSetupStep,
    pendingGender,
    setPendingGender,
    setPendingLook,
    setPendingVoice,
    pendingName,
    setPendingName,
    messages,
    input,
    setInput,
    sending,
    bottomRef,
    finishSetup,
    resetAvatar,
    send,
  };
}

export type ConciergeController = ReturnType<typeof useConcierge>;
