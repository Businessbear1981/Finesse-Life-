'use client';

// Nova, the concierge (After Hours). Presentational only: state and the /api/nova call live in
// use-concierge.ts; the design preview (/design/after-hours/concierge) feeds this sample props.

import Link from 'next/link';
import {useState, type CSSProperties, type RefObject} from 'react';
import {AHDisplay, AHEyebrow, AHPill, AHRoom, AHTopBar} from '@/components/after-hours';
import {
  GENDER_OPTIONS, LOOK_OPTIONS, QUICK_ASKS, SETUP_STEPS, VOICE_OPTIONS,
  type AvatarConfig, type Message, type Option, type SetupStep,
} from './nova-model';
import {RequestCard, RequestsSheet} from '@/components/nova/request-card';
import {ReportReply} from '@/components/nova/report-reply';
import {AIConsentSheet, type AIConsentSheetProps} from '@/components/nova/ai-consent';
import './concierge.css';

export type ConciergeViewProps = {
  avatar: AvatarConfig | null;
  setupStep: SetupStep;
  setSetupStep: (s: SetupStep) => void;
  pendingGender: string;
  setPendingGender: (v: string) => void;
  setPendingLook: (v: string) => void;
  setPendingVoice: (v: string) => void;
  pendingName: string;
  setPendingName: (v: string) => void;
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  sending: boolean;
  bottomRef: RefObject<HTMLDivElement | null>;
  finishSetup: () => void;
  resetAvatar: () => void;
  send: (overrideText?: string) => void | Promise<void>;
  /** The one-time AI disclosure sheet (use-concierge → useAiConsent). Absent in the design preview. */
  consentSheet?: AIConsentSheetProps;
  /** Height of fixed app chrome above/below the room (the hotel banner and dock), in px. */
  chromeTop?: number;
  chromeBottom?: number;
};

/* ─── Small pieces ─── */

function Mono({name, size}: {name: string; size: number}) {
  return (
    <span className="nv-mono" style={{width: size, height: size}} aria-hidden>
      <span style={{fontSize: size * 0.46}}>{name[0]?.toUpperCase() || 'N'}</span>
    </span>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ArrowUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

/* ─── Tool Result Card (same rules as before, new skin) ─── */

function ToolResultCard({name, result}: {name: string; result: unknown}) {
  const data = result as Record<string, unknown>;

  if (name === 'check_vault_balance') {
    const display = (data.balance_display as string) ?? 'unavailable';
    return (
      <div className="nv-tool">
        <span className="nv-tool-k">Vault balance</span>
        <span className="nv-tool-big ah-num">{display}</span>
      </div>
    );
  }

  if (name === 'get_recommendations') {
    const recs = (data.recommendations as Array<{title: string; category: string; price_range: string; why: string}>) ?? [];
    if (!recs.length) return null;
    return (
      <div className="nv-tool">
        <span className="nv-tool-k">Recommendations</span>
        <ul>
          {recs.map((r, i) => (
            <li key={i}>
              <span className="nv-tool-title">{r.title}</span>
              <span className="nv-tool-sub">{r.price_range} · {r.category}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (name === 'get_next_action') {
    const action = (data.action as string) ?? '';
    const reason = (data.reason as string) ?? '';
    const confidence = typeof data.confidence === 'number' ? Math.round(data.confidence * 100) : null;
    if (!action) return null;
    return (
      <div className="nv-tool">
        <span className="nv-tool-k">Suggested next</span>
        <span className="nv-tool-title" style={{fontFamily: 'var(--ah-serif)', fontStyle: 'italic', fontSize: 19, textTransform: 'capitalize'}}>
          {action.replace(/_/g, ' ')}
        </span>
        {reason && <span className="nv-tool-sub">{reason}</span>}
        {confidence !== null && <span className="nv-tool-sub ah-num" style={{color: 'var(--ah-faint)'}}>{confidence}% confidence</span>}
      </div>
    );
  }

  if (name === 'log_intent') {
    const intent = (data.intent as string) ?? '';
    if (!data.logged) return null;
    return <span className="nv-tool-quiet">Noted · {intent}</span>;
  }

  return null;
}

/* ─── Setup ─── */

const STEP_COPY: Record<Exclude<SetupStep, 'done'>, {eyebrow: string; title: string; line: string}> = {
  gender: {eyebrow: 'Design your concierge', title: 'Who answers after midnight?', line: 'Your concierge is yours alone. Start with who they are.'},
  look: {eyebrow: 'Their style', title: 'How they carry it.', line: 'The look they bring to the table.'},
  voice: {eyebrow: 'Their voice', title: 'How they sound.', line: 'Tone for every reply, from a car at midnight to a table at nine.'},
  name: {eyebrow: 'Last thing', title: 'Name them.', line: 'Leave it blank and they will answer to Nova.'},
};

function Options({options, onPick, single}: {options: Option[]; onPick: (key: string) => void; single?: boolean}) {
  return (
    <div className={single ? 'nv-opts nv-opts-3' : 'nv-opts'}>
      {options.map((o) => (
        <button key={o.key} type="button" className={single ? 'nv-opt nv-opt-row' : 'nv-opt'} onClick={() => onPick(o.key)}>
          <span className="nv-opt-name">{o.label}</span>
          <span className="nv-opt-desc">{o.desc}</span>
        </button>
      ))}
    </div>
  );
}

function SetupView(p: Omit<ConciergeViewProps, 'bottomRef'>) {
  const step = p.setupStep === 'done' ? 'gender' : p.setupStep;
  const idx = SETUP_STEPS.indexOf(step);
  const copy = STEP_COPY[step];
  const looks = LOOK_OPTIONS[p.pendingGender] || [];
  const voices = VOICE_OPTIONS[p.pendingGender] || [];
  const back = idx > 0 ? SETUP_STEPS[idx - 1] : null;

  return (
    <div className="nv-setup">
      <AHTopBar
        left={
          <Link href="/lobby" className="nv-head-btn" style={{marginLeft: -8}}>
            <Chevron /> Lobby
          </Link>
        }
        right={<span className="ah-num ah-eyebrow">{String(idx + 1).padStart(2, '0')} / 04</span>}
      />

      <AHEyebrow>{copy.eyebrow}</AHEyebrow>
      <AHDisplay size="m" style={{marginTop: 12}}>{copy.title}</AHDisplay>
      <p className="nv-intro-line" style={{marginTop: 12, maxWidth: 'none'}}>{copy.line}</p>

      <div className="nv-steps" aria-hidden>
        {SETUP_STEPS.map((s, i) => <span key={s} data-on={i <= idx ? '' : undefined} />)}
      </div>

      <div className="nv-stage" key={step}>
        {step === 'gender' && (
          <Options single options={GENDER_OPTIONS} onPick={(k) => {p.setPendingGender(k); p.setSetupStep('look');}} />
        )}
        {step === 'look' && (
          <Options options={looks} onPick={(k) => {p.setPendingLook(k); p.setSetupStep('voice');}} />
        )}
        {step === 'voice' && (
          <Options options={voices} onPick={(k) => {p.setPendingVoice(k); p.setSetupStep('name');}} />
        )}
        {step === 'name' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              p.finishSetup();
            }}
          >
            <label htmlFor="nv-name" className="ah-eyebrow" style={{display: 'block', textAlign: 'center', marginBottom: 4}}>
              Name your concierge
            </label>
            <input
              id="nv-name"
              type="text"
              className="nv-name"
              value={p.pendingName}
              onChange={(e) => p.setPendingName(e.target.value)}
              placeholder="Nova"
              autoFocus
              autoComplete="off"
              maxLength={40}
            />
            <p className="nv-fine" style={{marginBottom: 26}}>Or press enter to keep the default</p>
            <AHPill type="submit" variant="rose" block>Activate concierge</AHPill>
          </form>
        )}
      </div>

      {back && (
        <button type="button" className="nv-head-btn nv-back" style={{marginLeft: -8}} onClick={() => p.setSetupStep(back)}>
          <Chevron /> Back
        </button>
      )}
    </div>
  );
}

/* ─── Chat ─── */

function ChatView({bottomRef, ...p}: ConciergeViewProps) {
  const [sheet, setSheet] = useState(false);
  const name = p.avatar?.name || 'Concierge';
  const firstVisit = !p.messages.some((m) => m.role === 'guest');
  const meta = [p.avatar?.look?.replace(/-/g, ' '), p.avatar?.voice && `${p.avatar.voice} voice`].filter(Boolean) as string[];

  return (
    <>
      <header className="nv-head">
        <Link href="/lobby" className="nv-head-btn" style={{justifySelf: 'start'}} aria-label="Return to the lobby">
          <Chevron /> Lobby
        </Link>
        <div className="nv-who">
          <span className="nv-who-name">{name}</span>
          <span className="nv-presence" data-writing={p.sending ? '' : undefined} role="status">
            <i aria-hidden /> {p.sending ? 'Writing' : 'Online'}
          </span>
        </div>
        <button type="button" className="nv-head-btn" style={{justifySelf: 'end'}} onClick={p.resetAvatar}>
          Customize
        </button>
      </header>

      <div className="nv-intro">
        <Mono name={name} size={firstVisit ? 88 : 64} />
        {firstVisit ? (
          <>
            <AHEyebrow style={{marginTop: 20}}>Your private line</AHEyebrow>
            <AHDisplay size="l" as="h1" style={{marginTop: 10}}>{name}</AHDisplay>
            <p className="nv-intro-line">Tables, cars, the route, the look. Text it the way you would at 1am — it is handled.</p>
          </>
        ) : (
          <>
            <h1 className="ah-serif-i" style={{margin: '12px 0 0', fontSize: 26, lineHeight: 1}}>{name}</h1>
            <p className="nv-intro-line" style={{marginTop: 6, fontSize: 13}}>Your private line</p>
          </>
        )}
        {meta.length > 0 && (
          <div className="nv-intro-meta">
            {meta.map((m) => <span key={m} className="nv-tag">{m}</span>)}
          </div>
        )}
        <button type="button" className="nv-head-btn nv-requests-btn" onClick={() => setSheet(true)}>
          Your requests
        </button>
      </div>
      <RequestsSheet open={sheet} onClose={() => setSheet(false)} accent="var(--ah-rose)" />

      <ol className="nv-thread" role="log" aria-live="polite" aria-label={`Conversation with ${name}`}>
        {p.messages.map((msg, i) => {
          if (msg.role === 'system') {
            return (
              <li key={msg.id} className="nv-msg" style={{justifyContent: 'center'}}>
                <p className="nv-system" style={{margin: 0}}><i aria-hidden />{msg.text}</p>
              </li>
            );
          }
          if (msg.role === 'guest') {
            return (
              <li key={msg.id} className="nv-msg nv-msg-guest">
                <span style={srOnly}>You: </span>
                <p className="nv-bubble-guest" style={{margin: 0}}>{msg.text}</p>
              </li>
            );
          }
          const showLabel = p.messages[i - 1]?.role !== 'concierge';
          return (
            <li key={msg.id} className="nv-msg">
              <div className="nv-nova">
                <div className="nv-nova-body">
                  {showLabel ? <span className="nv-nova-label">{name}</span> : <span style={srOnly}>{name}: </span>}
                  <p className="nv-nova-text">{msg.text}</p>
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="nv-tools">
                      {msg.tool_calls.map((tc, idx) => <ToolResultCard key={idx} name={tc.name} result={tc.result} />)}
                    </div>
                  )}
                  {msg.requests?.map((r) => <RequestCard key={r.id} request={r} accent="var(--ah-rose)" />)}
                  {!msg.id.startsWith('welcome') && <ReportReply targetId={`concierge:${msg.id}`} text={msg.text} />}
                </div>
              </div>
            </li>
          );
        })}

        {p.sending && (
          <li className="nv-msg" aria-label={`${name} is writing`}>
            <div className="nv-nova-body">
              <span className="nv-nova-label">{name}</span>
              <span className="nv-dots" aria-hidden><span /><span /><span /></span>
            </div>
          </li>
        )}
      </ol>

      <div ref={bottomRef} className="nv-end" />

      <div className="nv-composer">
        <div className="nv-chips" role="group" aria-label="Quick asks">
          {QUICK_ASKS.map((a) => (
            <button key={a.key} type="button" className="nv-chip" onClick={() => p.send(a.prompt)} disabled={p.sending}>
              {a.label}
            </button>
          ))}
        </div>
        <form
          className="nv-form"
          onSubmit={(e) => {
            e.preventDefault();
            p.send();
          }}
        >
          <label htmlFor="nv-input" style={srOnly}>Message {name}</label>
          <input
            id="nv-input"
            type="text"
            className="nv-field"
            value={p.input}
            onChange={(e) => p.setInput(e.target.value)}
            placeholder={`Text ${p.avatar?.name || 'your concierge'}…`}
            autoComplete="off"
            enterKeyHint="send"
          />
          <button type="submit" className="nv-send" disabled={p.sending || !p.input.trim()} aria-label="Send">
            <ArrowUp />
          </button>
        </form>
        <p className="nv-fine nv-ai-note">
          {name} is an AI concierge (powered by Anthropic Claude). Don’t share sensitive info. Replies can be wrong — nothing is booked until you confirm it.
        </p>
      </div>
      {p.consentSheet && <AIConsentSheet {...p.consentSheet} />}
    </>
  );
}

const srOnly: CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
};

export function ConciergeView({bottomRef, ...props}: ConciergeViewProps) {
  const style = {'--nv-top': `${props.chromeTop ?? 0}px`, '--nv-bottom': `${props.chromeBottom ?? 0}px`} as CSSProperties;
  return (
    <div style={style} className="nv-vars">
      <AHRoom className="nv-room">
        {props.setupStep !== 'done' ? <SetupView {...props} /> : <ChatView {...props} bottomRef={bottomRef} />}
      </AHRoom>
    </div>
  );
}
