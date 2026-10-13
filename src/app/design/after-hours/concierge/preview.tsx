'use client';

// Design preview only: sample conversation, no network. The real room is /concierge.

import {useRef, useState} from 'react';
import {ConciergeView} from '@/app/(hotel)/concierge/concierge-view';
import type {AvatarConfig, Message, SetupStep} from '@/app/(hotel)/concierge/nova-model';

const AVATAR: AvatarConfig = {name: 'Nova', gender: 'female', look: 'executive', voice: 'warm'};

const WELCOME: Message = {id: 'w', role: 'concierge', text: "Welcome back. I'm Nova, your concierge. What can I arrange for you tonight?"};

const CHAT: Message[] = [
  WELCOME,
  {id: 'g1', role: 'guest', text: 'A table for four tonight. Somewhere with a little noise, not a scene.'},
  {
    id: 'c1',
    role: 'concierge',
    text: 'Three that fit — low light, good room tone, a kitchen open past eleven. Say the word and I will hold one for 9:30.',
    tool_calls: [
      {
        name: 'get_recommendations',
        result: {
          recommendations: [
            {title: 'Bar Mirelle', category: 'Wine bar', price_range: '$$$', why: ''},
            {title: 'Orso Notte', category: 'Italian', price_range: '$$$$', why: ''},
            {title: 'The Velvet Room', category: 'Supper club', price_range: '$$$', why: ''},
          ],
        },
      },
      {name: 'log_intent', result: {logged: true, intent: 'dinner reservation'}},
    ],
  },
  {id: 'g2', role: 'guest', text: 'Orso. And what does the vault look like?'},
  {
    id: 'c2',
    role: 'concierge',
    text: 'Orso it is. Your balance is below — plenty of room for the evening.',
    tool_calls: [{name: 'check_vault_balance', result: {balance_display: '$1,240.00'}}],
  },
  {id: 'g3', role: 'guest', text: 'Perfect. Then a car at 9.'},
];

// Nova's draft_request tool → request cards (src/components/nova/request-card.tsx). Sample ids; Confirm here
// reaches the real hub and answers honestly (401 when signed out).
const REQUESTS: Message[] = [
  WELCOME,
  {id: 'g1', role: 'guest', text: 'Find me black slingbacks under $600, and plan dinner Friday for two.'},
  {
    id: 'c1',
    role: 'concierge',
    text: 'Two drafts for you — confirm and I will get to work. Nothing is booked yet.',
    requests: [
      {id: '00000000-0000-4000-8000-000000000001', kind: 'find_item', title: 'Black slingbacks under $600', status: 'drafted'},
      {id: '00000000-0000-4000-8000-000000000002', kind: 'plan', title: 'Dinner for two, Friday', status: 'drafted'},
    ],
  },
  {id: 'g2', role: 'guest', text: 'Go.'},
  {
    id: 'c2',
    role: 'concierge',
    text: 'Here is what I found, and a plan to approve.',
    requests: [
      {id: '00000000-0000-4000-8000-000000000003', kind: 'find_item', title: 'Black slingbacks under $600', status: 'ready', result: {agent: 'scout', items: [
        {title: 'Patent slingback 85', brand: 'Aquazzura', price_cents: 59500, source: 'web', purchase_url: 'https://example.com/aquazzura', image_url: null, partner: null},
        {title: 'Leather slingback pump', brand: 'Sam Edelman', price_cents: 15000, source: 'nova', purchase_url: null, image_url: null, partner: null},
      ]}},
      {id: '00000000-0000-4000-8000-000000000004', kind: 'plan', title: 'Dinner for two, Friday', status: 'ready', result: {agent: 'planner', booked: false,
        plan: '1. Bar Mirelle, 8:30 — low light, natural wine.\n2. Orso Notte, 9:00 — the room you liked.\nRecommended: Orso Notte at 9.'}},
    ],
  },
];

const ERRORS: Message[] = [
  WELCOME,
  {id: 'g1', role: 'guest', text: 'I need a black car'},
  {id: 's1', role: 'system', text: 'Nova needs a moment — try again in 12 s. Nothing has been arranged.'},
  {id: 'g2', role: 'guest', text: 'Plan the route for my night'},
  {id: 's2', role: 'system', text: 'Sign in to speak with your concierge. Nothing has been arranged.'},
];

function initial(state: string): {step: SetupStep; messages: Message[]; sending: boolean; gender: string} {
  switch (state) {
    case 'setup': return {step: 'gender', messages: [], sending: false, gender: ''};
    case 'look': return {step: 'look', messages: [], sending: false, gender: 'female'};
    case 'name': return {step: 'name', messages: [], sending: false, gender: 'female'};
    case 'empty': return {step: 'done', messages: [WELCOME], sending: false, gender: 'female'};
    case 'errors': return {step: 'done', messages: ERRORS, sending: false, gender: 'female'};
    case 'requests': return {step: 'done', messages: REQUESTS, sending: false, gender: 'female'};
    case 'sending': return {step: 'done', messages: CHAT, sending: true, gender: 'female'};
    default: return {step: 'done', messages: CHAT.slice(0, -1), sending: false, gender: 'female'};
  }
}

export function ConciergePreview({state}: {state: string}) {
  const [init] = useState(() => initial(state));
  const [step, setStep] = useState<SetupStep>(init.step);
  const [gender, setGender] = useState(init.gender);
  const [name, setName] = useState('');
  const [input, setInput] = useState(state === 'empty' ? '' : '');
  const bottomRef = useRef<HTMLDivElement>(null);
  const noop = () => {};

  return (
    <ConciergeView
      avatar={step === 'done' ? AVATAR : null}
      setupStep={step}
      setSetupStep={setStep}
      pendingGender={gender}
      setPendingGender={setGender}
      setPendingLook={noop}
      setPendingVoice={noop}
      pendingName={name}
      setPendingName={setName}
      messages={init.messages}
      input={input}
      setInput={setInput}
      sending={init.sending}
      bottomRef={bottomRef}
      finishSetup={() => setStep('done')}
      resetAvatar={() => setStep('gender')}
      send={noop}
    />
  );
}
