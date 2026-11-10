import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownRight, ArrowUpRight, Check, ChevronDown, CircleHelp, Clock3, Coins, Eye, Flame, LockKeyhole, MessageSquareText, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';
import { contractClient, contractConfig } from './contractClient';
import './style.css';

type ViewState = 'spectator' | 'connected' | 'joined' | 'won' | 'lost' | 'refunding';
const scenarios: { id: ViewState; label: string }[] = [
  { id: 'spectator', label: 'Spectator · not connected' },
  { id: 'connected', label: 'Connected · not joined' },
  { id: 'joined', label: 'Joined' },
  { id: 'won', label: 'Round ended · won' },
  { id: 'lost', label: 'Round ended · lost' },
  { id: 'refunding', label: 'Round ended · refunding' },
];

function App() {
  const [state, setState] = useState<ViewState>('spectator');
  const [crossed, setCrossed] = useState<number[]>([]);
  const [notice, setNotice] = useState('');
  const [question, setQuestion] = useState('');
  const isSpectator = state === 'spectator';
  const isJoined = state === 'joined';
  const ended = ['won', 'lost', 'refunding'].includes(state);
  const statusText = useMemo(() => ({
    spectator: 'SPECTATOR MODE', connected: 'WALLET CONNECTED', joined: 'YOU’RE IN', won: 'ROUND SETTLED', lost: 'ROUND SETTLED', refunding: 'ROUND SETTLED',
  } as Record<ViewState, string>)[state], [state]);

  const lockedAction = (label: string) => {
    if (isSpectator) setNotice(`Connect a wallet to ${label.toLowerCase()}. Wallet integration is a placeholder until configured.`);
    else setNotice('This action is disabled in the prototype until the contract handoff is supplied.');
  };

  const toggleCross = (n: number) => setCrossed((existing) => existing.includes(n) ? existing.filter((i) => i !== n) : [...existing, n]);

  return (
    <div className="app-shell">
      <div className="watch-banner"><Eye size={14} /><span>You’re watching. <button onClick={() => setNotice('Wallet connection flow is pending SDK setup.')}>Connect a wallet to play.</button></span><span className="banner-note">Read-only viewing · no wallet required</span></div>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CipherPot home"><span className="brand-mark"><span /></span><span>CIPHER<span className="brand-light">POT</span></span></a>
        <nav className="main-nav"><a className="active" href="#round">The round</a><a href="#board">The board</a><a href="#how">How to play</a></nav>
        <div className="header-right"><span className="network"><i /> TESTNET</span><button className="wallet-button" onClick={() => lockedAction('connect wallet')}><Wallet size={16} />{isSpectator ? 'Connect wallet' : 'player.testnet'}<ChevronDown size={14} /></button></div>
      </header>

      <main id="top">
        <div className="demo-controls"><span className="demo-label">PROTOTYPE STATE</span><select aria-label="Choose prototype state" value={state} onChange={(event) => { setState(event.target.value as ViewState); setNotice(''); }}>
          {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}
        </select><span className="mock-tag">MOCK · INTERFACE PENDING</span></div>

        <section className="hero" id="round">
          <div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> DAILY DEDUCTION <span className="eyebrow-divider">/</span> ROUND #<span className="placeholder">— placeholder</span></div>
            <h1>One secret.<br /><em>Sixty-four</em> possibilities.</h1>
            <p className="hero-sub">Ask sharp questions. Read the clues. Find the secret before someone else does.</p>
            <div className="hero-buttons"><button className="button button-primary" onClick={() => lockedAction('join the round')}><Sparkles size={16} />{isJoined ? 'You’re in' : 'Join the round'}<span className="button-cost">entry fee TBD</span></button><a className="text-link" href="#how">How to play <ArrowDownRight size={15} /></a></div>
          </div>
          <div className="pot-card"><div className="pot-card-top"><span className="eyebrow">CURRENT POT</span><span className="pot-icon"><Coins size={19} /></span></div><div className="pot-amount"><span className="pot-number">—</span><span className="pot-unit">NEAR</span></div><div className="pot-placeholder">Amount unavailable · awaiting documented response</div><div className="pot-card-bottom"><span><span className="live-dot" /> LIVE ROUND</span><span><Clock3 size={13} /> <b>--:--</b> <small>timer unavailable</small></span></div></div>
          <div className="hero-watermark">CP</div>
        </section>

        <section className="round-strip" aria-label="Round status">
          <div className="strip-status"><span className="status-icon"><Activity size={16} /></span><div><small>ROUND STATUS</small><strong>{statusText}</strong></div></div>
          <div className="strip-item"><small>QUESTIONS LEFT</small><strong>— <span className="strip-muted">/ 20</span></strong><span className="strip-foot">placeholder counter</span></div>
          <div className="strip-item"><small>YOUR GUESSES</small><strong>— <span className="strip-muted">/ 3</span></strong><span className="strip-foot">per entry · placeholder</span></div>
          <div className="strip-item"><small>PLAYERS IN</small><strong>—</strong><span className="strip-foot">placeholder count</span></div>
          <div className="strip-link"><ShieldCheck size={17} /><a href="#fairness">Verify fairness <ArrowUpRight size={13} /></a></div>
        </section>

        {notice && <div className="notice" role="status"><CircleHelp size={16} /><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice('')}><X size={16} /></button></div>}
        {ended && <section className={`settled-card settled-${state}`}><span className="settled-icon">{state === 'won' ? <Check size={18} /> : state === 'lost' ? <X size={18} /> : <Clock3 size={18} />}</span><div><small>ROUND SUMMARY · MOCK PLACEHOLDER</small><h2>{state === 'won' ? 'You solved it.' : state === 'lost' ? 'The round has ended.' : 'Refund status unavailable.'}</h2><p>{state === 'won' ? 'Settlement details and claim availability require the documented handoff.' : state === 'lost' ? 'Winner and reveal details are not available in the supplied interface.' : 'Refund behavior is not defined in the supplied interface; the product spec describes rollover on timeout.'}</p></div></section>}

        <div className="content-grid">
          <section className="board-section panel" id="board">
            <div className="section-heading"><div><div className="eyebrow">THE CANDIDATE SET</div><h2>Find the one.</h2></div><span className="board-count">64 <span>candidates</span></span></div>
            <p className="section-intro">Tap a tile to cross it off locally. Candidate names and facts are pending the canonical board dataset.</p>
            <div className="board-grid">{Array.from({ length: 64 }, (_, i) => <button key={i} onClick={() => toggleCross(i)} className={`candidate ${crossed.includes(i) ? 'crossed' : ''}`} aria-label={`Candidate ${String(i + 1).padStart(2, '0')} placeholder${crossed.includes(i) ? ', crossed off' : ''}`}><span className="candidate-num">{String(i + 1).padStart(2, '0')}</span><span className="candidate-name">Candidate</span>{crossed.includes(i) && <span className="cross-mark"><X size={13} /></span>}</button>)}</div>
            <div className="board-footer"><span><span className="legend-dot" /> CANONICAL NAMES NOT PROVIDED</span><button onClick={() => setCrossed([])}>Clear cross-offs</button></div>
          </section>

          <aside className="side-column">
            {isJoined && <section className="youre-in panel"><div className="mini-eyebrow"><Check size={13} /> PARTICIPATION</div><h3>You’re in.</h3><p>Your participation counters are placeholders until connected to the documented player read.</p><div className="youre-in-stats"><span>Questions <b>—</b></span><span>Guesses <b>—</b></span></div></section>}
            <section className="panel ask-panel"><div className="section-heading compact"><div><div className="eyebrow">MAKE YOUR MOVE</div><h2>Ask a question.</h2></div><span className="lock-label"><LockKeyhole size={13} /> {isJoined ? 'LOCKED' : 'JOIN TO PLAY'}</span></div><p className="section-intro">A good question eliminates possibilities. Ask something with a yes-or-no answer.</p><label className="input-label" htmlFor="question">YOUR QUESTION</label><textarea id="question" placeholder="e.g. Is it something you’d find outdoors?" value={question} onChange={(event) => setQuestion(event.target.value)} disabled={!isJoined || ended} /><button className="button button-dark full" disabled={!isJoined || ended || !question.trim()} onClick={() => lockedAction('submit a question')}><MessageSquareText size={15} /> Submit question <span>— left</span></button><div className="locked-note"><LockKeyhole size={12} /> {isSpectator ? 'Connect a wallet and join to unlock' : 'Question submission awaits the handoff'}</div></section>
            <section className="panel feed-panel"><div className="section-heading compact"><div><div className="eyebrow">THE TABLE</div><h2>Question feed</h2></div><span className="feed-live"><i /> LIVE</span></div><p className="section-intro">Public feed entries will appear here when a documented source is provided.</p><div className="feed-empty"><div className="feed-empty-icon"><MessageSquareText size={18} /></div><div><b>No verified entries yet</b><span>Feed data unavailable · placeholder</span></div></div><div className="ruleout-placeholder"><span><X size={13} /> RULE-OUTS</span><span>Waiting for public answers</span></div></section>
            <section className="panel agents-panel"><div className="section-heading compact"><div><div className="eyebrow">IN THE ARENA</div><h2>Active agents</h2></div><span className="agent-count">—</span></div><div className="agent-row"><span className="agent-avatar"><Flame size={14} /></span><span>Agent list unavailable</span><span className="agent-placeholder">placeholder</span></div></section>
          </aside>
        </div>

        <section className="how-section" id="how"><div><div className="eyebrow">THE RULES ARE SIMPLE</div><h2>Curiosity is your<br /><em>best strategy.</em></h2></div><div className="steps"><div><span>01</span><h3>Join the round</h3><p>Entry fee and confirmed quotas are awaiting the contract handoff.</p></div><div><span>02</span><h3>Ask & narrow</h3><p>Ask smart yes/no questions and use the public answers to rule out candidates.</p></div><div><span>03</span><h3>Make your guess</h3><p>Guess limits, verification and settlement details require the documented interface.</p></div></div></section>
        <footer id="fairness"><div className="brand footer-brand"><span className="brand-mark"><span /></span><span>CIPHER<span className="brand-light">POT</span></span></div><p>Deduction, not luck. <span>Prototype · no contract calls active.</span></p><a href="#fairness" onClick={(event) => { event.preventDefault(); setNotice('Fairness verification link target is pending backend documentation.'); }}>Verify fairness <ArrowUpRight size={13} /></a></footer>
      </main>
      <div className="dev-corner" title="No contract or API calls are active"><span className="dev-pip" />{contractClient.mode} · {contractClient.callsImplemented} calls · {Object.values(contractConfig).filter(Boolean).length}/4 env configured</div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
