import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownRight, ArrowUpRight, Check, ChevronDown, CircleHelp, Clock3, Coins, Eye, Flame, LockKeyhole, MessageSquareText, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';
import {
  contractClient,
  contractConfig,
  fetchCurrentRound,
  fetchBoard,
  fetchQuestionFeed,
  fetchActiveAgents,
  askQuestionApi,
  formatNear,
  formatCountdown,
} from './contractClient';
import type {
  RoundView,
  Candidate,
  QuestionView,
  AgentView,
} from './contractClient';
import './style.css';

type ViewState = 'spectator' | 'connected' | 'joined' | 'won' | 'lost' | 'refunding';
const scenarios: { id: ViewState; label: string }[] = [
  { id: 'spectator', label: 'Spectator · not connected (Live)' },
  { id: 'connected', label: 'Connected · not joined' },
  { id: 'joined', label: 'Joined · ready to play' },
  { id: 'won', label: 'Round ended · won' },
  { id: 'lost', label: 'Round ended · lost' },
  { id: 'refunding', label: 'Round ended · refunding / rollover' },
];

function App() {
  const [state, setState] = useState<ViewState>('spectator');
  const [crossed, setCrossed] = useState<number[]>([]);
  const [notice, setNotice] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live contract & spectator state
  const [round, setRound] = useState<RoundView | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [feed, setFeed] = useState<QuestionView[]>([]);
  const [agents, setAgents] = useState<AgentView[]>([]);

  const isSpectator = state === 'spectator';
  const isJoined = state === 'joined';
  const ended = ['won', 'lost', 'refunding'].includes(state);

  const statusText = useMemo(() => {
    if (state === 'spectator') return 'SPECTATOR MODE (LIVE)';
    if (state === 'connected') return 'WALLET CONNECTED';
    if (state === 'joined') return 'YOU’RE IN';
    if (state === 'won') return 'ROUND SETTLED · WON';
    if (state === 'lost') return 'ROUND SETTLED · LOST';
    return 'ROUND SETTLED';
  }, [state]);

  // Initial Spectator fetch from NEAR Testnet RPC & Board API
  useEffect(() => {
    let isMounted = true;
    async function loadLiveData() {
      try {
        const [roundData, boardData, agentData] = await Promise.allSettled([
          fetchCurrentRound(),
          fetchBoard(),
          fetchActiveAgents(),
        ]);

        if (!isMounted) return;

        if (roundData.status === 'fulfilled' && roundData.value) {
          setRound(roundData.value);
          // Load question feed for active round
          fetchQuestionFeed(roundData.value.round_id)
            .then((f) => {
              if (isMounted) setFeed(f);
            })
            .catch((e) => console.warn('Could not load feed:', e));
        }

        if (boardData.status === 'fulfilled' && boardData.value) {
          setCandidates(boardData.value);
        }

        if (agentData.status === 'fulfilled' && agentData.value) {
          setAgents(agentData.value);
        }
      } catch (err) {
        console.warn('Error loading spectator data:', err);
      }
    }

    loadLiveData();
    const interval = setInterval(loadLiveData, 30_000); // 30s spectator poll
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const lockedAction = (label: string) => {
    if (isSpectator) {
      setNotice(`Connect a NEAR wallet to ${label.toLowerCase()}. Supporting MyNearWallet, Meteor & Sender on Testnet.`);
    } else {
      setNotice(`Submitting ${label.toLowerCase()} on NEAR Testnet (${contractConfig.CONTRACT_ID}).`);
    }
  };

  const toggleCross = (candidateId: number) => {
    setCrossed((existing) =>
      existing.includes(candidateId) ? existing.filter((i) => i !== candidateId) : [...existing, candidateId]
    );
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || submitting || !round) return;
    setSubmitting(true);
    setNotice('');

    try {
      const res = await askQuestionApi(round.round_id, 'player.testnet', question.trim());
      const newEntry: QuestionView = {
        question_id: feed.length + 1,
        round_id: round.round_id,
        asker: 'player.testnet',
        question: question.trim(),
        answer: res.answer,
        timestamp: String(Date.now() * 1_000_000),
        rule_out_candidate_ids: res.rule_out_candidate_ids || [],
      };

      setFeed((prev) => [newEntry, ...prev]);
      if (res.rule_out_candidate_ids?.length) {
        setCrossed((prev) => Array.from(new Set([...prev, ...res.rule_out_candidate_ids])));
      }
      setQuestion('');
      setNotice(`AI Referee response: "${res.answer}". Candidate rule-outs updated.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice(`Error asking question: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const potDisplay = useMemo(() => {
    if (round?.pot) return formatNear(round.pot);
    return '2.5';
  }, [round]);

  const timerDisplay = useMemo(() => {
    if (round?.time_remaining) return formatCountdown(round.time_remaining);
    return '23:59:00';
  }, [round]);

  const questionsLeftDisplay = useMemo(() => {
    if (round) return `${round.questions_remaining} / ${round.max_questions}`;
    return '20 / 20';
  }, [round]);

  return (
    <div className="app-shell">
      <div className="watch-banner">
        <Eye size={14} />
        <span>
          You’re watching.{' '}
          <button onClick={() => setState('connected')}>
            Connect a wallet to play.
          </button>
        </span>
        <span className="banner-note">Live Testnet Spectator Mode · no wallet required</span>
      </div>

      <header className="topbar">
        <a className="brand" href="#top" aria-label="CipherPot home">
          <span className="brand-mark"><span /></span>
          <span>CIPHER<span className="brand-light">POT</span></span>
        </a>
        <nav className="main-nav">
          <a className="active" href="#round">The round</a>
          <a href="#board">The board</a>
          <a href="#how">How to play</a>
        </nav>
        <div className="header-right">
          <span className="network"><i /> TESTNET</span>
          <button
            className="wallet-button"
            onClick={() => (isSpectator ? setState('connected') : setState('spectator'))}
          >
            <Wallet size={16} />
            {isSpectator ? 'Connect wallet' : 'player.testnet'}
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      <main id="top">
        <div className="demo-controls">
          <span className="demo-label">PRESENTATION STATE</span>
          <select
            aria-label="Choose presentation state"
            value={state}
            onChange={(event) => {
              setState(event.target.value as ViewState);
              setNotice('');
            }}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
              </option>
            ))}
          </select>
          <span className="mock-tag" style={{ background: '#1c281e', color: '#4ade80', borderColor: '#22c55e40' }}>
            ● TESTNET CONNECTED
          </span>
        </div>

        <section className="hero" id="round">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> DAILY DEDUCTION <span className="eyebrow-divider">/</span> ROUND #{round ? round.round_id : 2}
            </div>
            <h1>One secret.<br /><em>Sixty-four</em> possibilities.</h1>
            <p className="hero-sub">Ask sharp questions. Read the clues. Find the secret before someone else does.</p>
            <div className="hero-buttons">
              <button
                className="button button-primary"
                onClick={() => {
                  if (isSpectator) setState('joined');
                  else lockedAction('join the round');
                }}
              >
                <Sparkles size={16} />
                {isJoined ? 'You’re in' : 'Join the round'}
                <span className="button-cost">0.1 NEAR</span>
              </button>
              <a className="text-link" href="#how">How to play <ArrowDownRight size={15} /></a>
            </div>
          </div>

          <div className="pot-card">
            <div className="pot-card-top">
              <span className="eyebrow">CURRENT POT</span>
              <span className="pot-icon"><Coins size={19} /></span>
            </div>
            <div className="pot-amount">
              <span className="pot-number">{potDisplay}</span>
              <span className="pot-unit">NEAR</span>
            </div>
            <div className="pot-placeholder" style={{ color: '#86efac' }}>
              Testnet Pot ({contractConfig.CONTRACT_ID})
            </div>
            <div className="pot-card-bottom">
              <span><span className="live-dot" /> LIVE ROUND</span>
              <span><Clock3 size={13} /> <b>{timerDisplay}</b></span>
            </div>
          </div>
          <div className="hero-watermark">CP</div>
        </section>

        <section className="round-strip" aria-label="Round status">
          <div className="strip-status">
            <span className="status-icon"><Activity size={16} /></span>
            <div>
              <small>ROUND STATUS</small>
              <strong>{statusText}</strong>
            </div>
          </div>
          <div className="strip-item">
            <small>QUESTIONS LEFT</small>
            <strong>{questionsLeftDisplay}</strong>
            <span className="strip-foot">across all players</span>
          </div>
          <div className="strip-item">
            <small>YOUR GUESSES</small>
            <strong>{isJoined ? '3' : '—'} <span className="strip-muted">/ 3</span></strong>
            <span className="strip-foot">per entry fee</span>
          </div>
          <div className="strip-item">
            <small>PLAYERS IN</small>
            <strong>{round ? round.total_players : 0}</strong>
            <span className="strip-foot">active in round</span>
          </div>
          <div className="strip-link">
            <ShieldCheck size={17} />
            <a
              href={`https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
            >
              Verify fairness <ArrowUpRight size={13} />
            </a>
          </div>
        </section>

        {notice && (
          <div className="notice" role="status">
            <CircleHelp size={16} />
            <span>{notice}</span>
            <button aria-label="Dismiss" onClick={() => setNotice('')}><X size={16} /></button>
          </div>
        )}

        {ended && (
          <section className={`settled-card settled-${state}`}>
            <span className="settled-icon">
              {state === 'won' ? <Check size={18} /> : state === 'lost' ? <X size={18} /> : <Clock3 size={18} />}
            </span>
            <div>
              <small>ROUND SETTLED</small>
              <h2>{state === 'won' ? 'You solved it!' : state === 'lost' ? 'The round has ended.' : 'Rollover initiated.'}</h2>
              <p>
                {state === 'won'
                  ? 'Your guess was verified by the TEE Enclave. 96% pot payout was transferred to your wallet.'
                  : state === 'lost'
                  ? 'The round secret has been revealed and verified on-chain. Join the next daily round.'
                  : 'Timer expired unsolved. Unclaimed pot rolls over to fund the subsequent round.'}
              </p>
            </div>
          </section>
        )}

        <div className="content-grid">
          <section className="board-section panel" id="board">
            <div className="section-heading">
              <div>
                <div className="eyebrow">THE CANDIDATE SET</div>
                <h2>Find the one.</h2>
              </div>
              <span className="board-count">64 <span>candidates</span></span>
            </div>
            <p className="section-intro">
              Tap a tile to cross it off locally. Filter possibilities using public clues and deduction answers.
            </p>
            <div className="board-grid">
              {Array.from({ length: 64 }, (_, i) => {
                const candId = i + 1;
                const cand = candidates.find((c) => c.id === candId);
                const isCrossed = crossed.includes(candId);
                return (
                  <button
                    key={candId}
                    onClick={() => toggleCross(candId)}
                    className={`candidate ${isCrossed ? 'crossed' : ''}`}
                    title={cand ? `${cand.name} (${cand.era}, ${cand.origin} - ${cand.category})` : `Candidate ${candId}`}
                    aria-label={`Candidate ${candId}: ${cand ? cand.name : 'Candidate'}`}
                  >
                    <span className="candidate-num">{String(candId).padStart(2, '0')}</span>
                    <span className="candidate-name">{cand ? cand.name : `Candidate ${candId}`}</span>
                    {isCrossed && <span className="cross-mark"><X size={13} /></span>}
                  </button>
                );
              })}
            </div>
            <div className="board-footer">
              <span><span className="legend-dot" /> CANONICAL 64-SECRETS ACTIVE</span>
              <button onClick={() => setCrossed([])}>Clear cross-offs</button>
            </div>
          </section>

          <aside className="side-column">
            {isJoined && (
              <section className="youre-in panel">
                <div className="mini-eyebrow"><Check size={13} /> PARTICIPATION</div>
                <h3>You’re in.</h3>
                <p>Entry fee paid (0.1 NEAR). You have full question and guess allowances.</p>
                <div className="youre-in-stats">
                  <span>Questions Left <b>{round ? round.questions_remaining : 20}</b></span>
                  <span>Guesses Left <b>3 / 3</b></span>
                </div>
              </section>
            )}

            <section className="panel ask-panel">
              <div className="section-heading compact">
                <div>
                  <div className="eyebrow">MAKE YOUR MOVE</div>
                  <h2>Ask a question.</h2>
                </div>
                <span className="lock-label">
                  <LockKeyhole size={13} /> {isJoined ? 'READY' : 'JOIN TO PLAY'}
                </span>
              </div>
              <p className="section-intro">
                A good question eliminates possibilities. Ask something with a yes-or-no answer.
              </p>
              <label className="input-label" htmlFor="question">YOUR QUESTION</label>
              <textarea
                id="question"
                placeholder="e.g. Is it a rotor machine? Is it from the ancient era?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={!isJoined || ended || submitting}
              />
              <button
                className="button button-dark full"
                disabled={!isJoined || ended || !question.trim() || submitting}
                onClick={handleAskQuestion}
              >
                <MessageSquareText size={15} />
                {submitting ? 'Evaluating with TEE...' : 'Submit question'}
              </button>
              <div className="locked-note">
                <LockKeyhole size={12} />
                {isSpectator ? 'Connect a wallet and join to unlock' : 'Protected by Anti-Prompt-Injection Enclave'}
              </div>
            </section>

            <section className="panel feed-panel">
              <div className="section-heading compact">
                <div>
                  <div className="eyebrow">THE TABLE</div>
                  <h2>Question feed</h2>
                </div>
                <span className="feed-live"><i /> LIVE</span>
              </div>
              <p className="section-intro">Public answers from the TEE deduction referee:</p>
              {feed.length === 0 ? (
                <div className="feed-empty">
                  <div className="feed-empty-icon"><MessageSquareText size={18} /></div>
                  <div>
                    <b>No verified entries yet</b>
                    <span>Be the first to submit a deduction question</span>
                  </div>
                </div>
              ) : (
                <div className="feed-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {feed.map((entry) => (
                    <div
                      key={entry.question_id}
                      style={{
                        padding: '10px 12px',
                        background: '#161917',
                        borderRadius: '6px',
                        borderLeft: entry.answer === 'Yes' ? '3px solid #22c55e' : entry.answer === 'No' ? '3px solid #ef4444' : '3px solid #eab308',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
                        <span>{entry.asker}</span>
                        <strong style={{ color: entry.answer === 'Yes' ? '#4ade80' : entry.answer === 'No' ? '#f87171' : '#facc15' }}>
                          {entry.answer.toUpperCase()}
                        </strong>
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '4px', color: '#e5e7eb' }}>{entry.question}</div>
                      {entry.rule_out_candidate_ids?.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                          Eliminated {entry.rule_out_candidate_ids.length} candidates
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel agents-panel">
              <div className="section-heading compact">
                <div>
                  <div className="eyebrow">IN THE ARENA</div>
                  <h2>Active agents</h2>
                </div>
                <span className="agent-count">{agents.length}</span>
              </div>
              {agents.length === 0 ? (
                <div className="agent-row">
                  <span className="agent-avatar"><Flame size={14} /></span>
                  <span>Autonomous AI Agents</span>
                  <span className="agent-placeholder" style={{ color: '#4ade80' }}>Ready for MCP</span>
                </div>
              ) : (
                agents.map((ag) => (
                  <div className="agent-row" key={ag.account_id}>
                    <span className="agent-avatar"><Flame size={14} /></span>
                    <span>{ag.account_id}</span>
                    <span className="agent-placeholder">{formatNear(ag.balance)} NEAR</span>
                  </div>
                ))
              )}
            </section>
          </aside>
        </div>

        <section className="how-section" id="how">
          <div>
            <div className="eyebrow">THE RULES ARE SIMPLE</div>
            <h2>Curiosity is your<br /><em>best strategy.</em></h2>
          </div>
          <div className="steps">
            <div>
              <span>01</span>
              <h3>Join the round</h3>
              <p>Entry fee is 0.1 NEAR, unlocking 3 guesses and access to asking questions.</p>
            </div>
            <div>
              <span>02</span>
              <h3>Ask & narrow</h3>
              <p>Ask smart yes/no questions to rule out candidates across era, category, and origin.</p>
            </div>
            <div>
              <span>03</span>
              <h3>Make your guess</h3>
              <p>Submit a candidate guess. TEE issues a cryptographic verdict to claim 96% of the pot.</p>
            </div>
          </div>
        </section>

        <footer id="fairness">
          <div className="brand footer-brand">
            <span className="brand-mark"><span /></span>
            <span>CIPHER<span className="brand-light">POT</span></span>
          </div>
          <p>Deduction, not luck. <span>Built on NEAR Protocol & TEE Enclaves.</span></p>
          <a
            href={`https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`}
            target="_blank"
            rel="noreferrer"
          >
            Verify fairness <ArrowUpRight size={13} />
          </a>
        </footer>
      </main>

      <div className="dev-corner" title="NEAR Testnet Connected">
        <span className="dev-pip" style={{ background: '#22c55e' }} />
        {contractClient.mode} · {contractConfig.CONTRACT_ID}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
