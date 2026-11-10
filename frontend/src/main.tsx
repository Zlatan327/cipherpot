import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Coins,
  Eye,
  Flame,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Send,
} from 'lucide-react';
import {
  contractConfig,
  fetchCurrentRound,
  fetchBoard,
  fetchQuestionFeed,
  fetchPlayerInfo,
  fetchActiveAgents,
  askQuestionApi,
  formatNear,
  formatCountdown,
  friendlyError,
} from './contractClient';
import type {
  RoundView,
  Candidate,
  QuestionView,
  PlayerInfoView,
  AgentView,
} from './contractClient';
import {
  initWalletSelector,
  openWalletModal,
  signOutWallet,
  joinRound,
  submitQuestionOnChain,
  submitGuessOnChain,
  claimPotOnChain,
} from './wallet';
import './style.css';

function App() {
  // Real Account & Wallet State
  const [accountId, setAccountId] = useState<string | null>(null);
  const isSpectator = !accountId;

  // Real On-Chain Game Data
  const [round, setRound] = useState<RoundView | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [feed, setFeed] = useState<QuestionView[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfoView | null>(null);
  const [agents, setAgents] = useState<AgentView[]>([]);

  // User Local Cross-offs & Form State
  const [crossed, setCrossed] = useState<number[]>([]);
  const [notice, setNotice] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  // Guess Dialog State
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [submittingGuess, setSubmittingGuess] = useState(false);

  // Initialize Wallet Selector on load
  useEffect(() => {
    initWalletSelector((accId) => {
      setAccountId(accId);
    }).catch((err) => console.warn('Wallet selector init warning:', err));
  }, []);

  // Fetch Live On-Chain Data (Spectator Mode & Player Mode)
  useEffect(() => {
    let isMounted = true;

    // Load board candidates immediately without waiting for RPC
    fetchBoard()
      .then((b) => {
        if (isMounted && b?.length) setCandidates(b);
      })
      .catch((e) => console.warn('Board load error:', e));

    async function loadData() {
      try {
        const [roundData, agentData] = await Promise.allSettled([
          fetchCurrentRound(),
          fetchActiveAgents(),
        ]);

        if (!isMounted) return;

        if (roundData.status === 'fulfilled' && roundData.value) {
          const r = roundData.value;
          setRound(r);

          // Fetch Question feed
          fetchQuestionFeed(r.round_id)
            .then((f) => {
              if (isMounted) setFeed(f);
            })
            .catch((e) => console.warn('Feed fetch error:', e));

          // If wallet connected, fetch player status on-chain
          if (accountId) {
            fetchPlayerInfo(r.round_id, accountId)
              .then((p) => {
                if (isMounted) setPlayerInfo(p);
              })
              .catch((e) => console.warn('Player info fetch error:', e));
          } else {
            setPlayerInfo(null);
          }
        }

        if (agentData.status === 'fulfilled' && agentData.value) {
          setAgents(agentData.value);
        }
      } catch (err) {
        console.warn('Live RPC fetch error:', err);
      }
    }

    loadData();
    const timer = setInterval(loadData, 15_000); // 15s live refresh
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [accountId]);

  const isJoined = Boolean(playerInfo?.is_joined);
  const isSettled = round?.status === 'Settled';
  const isRolledOver = round?.status === 'RolledOver';

  const statusText = useMemo(() => {
    if (isSettled) return 'ROUND SETTLED';
    if (isRolledOver) return 'ROUND ROLLED OVER';
    if (isJoined) return 'YOU’RE IN (PLAYING)';
    if (accountId) return 'WALLET CONNECTED';
    return 'SPECTATOR MODE (LIVE)';
  }, [isSettled, isRolledOver, isJoined, accountId]);

  // Handle Joining Round on Testnet
  const handleJoinRound = async () => {
    if (!accountId) {
      openWalletModal();
      return;
    }
    if (!round) return;

    try {
      setNotice('Initiating Join Round transaction on NEAR Testnet (0.1 NEAR)...');
      await joinRound(round.round_id, round.entry_fee || '100000000000000000000000');
      setNotice('Join successful! Question and guess quotas unlocked.');
      // Refresh player info
      const p = await fetchPlayerInfo(round.round_id, accountId);
      setPlayerInfo(p);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice(`Join error: ${friendlyError(msg).message}`);
    }
  };

  // Handle Question Submission via AI Referee & Smart Contract
  const handleAskQuestion = async () => {
    if (!question.trim() || submittingQuestion || !round || !accountId) return;
    setSubmittingQuestion(true);
    setNotice('');

    try {
      // 1. Evaluate with TEE AI Enclave (anti-prompt-injection & structured referee)
      setNotice('Evaluating question with TEE AI Enclave...');
      const evalResult = await askQuestionApi(round.round_id, accountId, question.trim());

      // 2. Submit structured answer & rule-outs to NEAR contract
      setNotice('Recording question & structured verdict on NEAR Testnet...');
      await submitQuestionOnChain(
        round.round_id,
        question.trim(),
        evalResult.answer,
        evalResult.rule_out_candidate_ids || []
      );

      // 3. Update local feed & crossed tiles
      const newEntry: QuestionView = {
        question_id: feed.length + 1,
        round_id: round.round_id,
        asker: accountId,
        question: question.trim(),
        answer: evalResult.answer,
        timestamp: String(Date.now() * 1_000_000),
        rule_out_candidate_ids: evalResult.rule_out_candidate_ids || [],
      };
      setFeed((prev) => [newEntry, ...prev]);

      if (evalResult.rule_out_candidate_ids?.length) {
        setCrossed((prev) => Array.from(new Set([...prev, ...evalResult.rule_out_candidate_ids])));
      }

      setQuestion('');
      setNotice(`AI Enclave Verdict: "${evalResult.answer}". Ruled out ${evalResult.rule_out_candidate_ids?.length || 0} candidates.`);

      // Refresh player quota
      const p = await fetchPlayerInfo(round.round_id, accountId);
      setPlayerInfo(p);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice(`Question failed: ${friendlyError(msg).message}`);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Handle Guess Submission & Claim Flow
  const handleSelectCandidateForGuess = (cand: Candidate) => {
    if (!isJoined) {
      if (!accountId) openWalletModal();
      else setNotice('You must join the round with 0.1 NEAR entry fee before making a guess.');
      return;
    }
    setSelectedCandidate(cand);
  };

  const handleConfirmGuess = async () => {
    if (!selectedCandidate || !round || !accountId || submittingGuess) return;
    setSubmittingGuess(true);
    setNotice('');

    try {
      // 1. Record guess attempt on-chain
      setNotice(`Submitting guess for "${selectedCandidate.name}" on NEAR Testnet...`);
      await submitGuessOnChain(round.round_id, selectedCandidate.id, selectedCandidate.name);

      // 2. Request TEE Enclave verification
      setNotice('Verifying secret with TEE Cryptographic Signer...');
      const verifyRes = await fetch(`${contractConfig.API_URL}/tee/verify-guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: round.round_id,
          candidate_id: selectedCandidate.id,
          candidate_name: selectedCandidate.name,
          account_id: accountId,
        }),
      }).then((r) => r.json());

      if (verifyRes.is_correct) {
        setNotice('GUESS IS CORRECT! Claiming pot with TEE signature...');
        await claimPotOnChain(
          round.round_id,
          selectedCandidate.id,
          selectedCandidate.name,
          verifyRes.salt,
          verifyRes.signature_hex
        );
        setNotice(`Congratulations! You solved Round #${round.round_id}! 96% pot payout transferred to ${accountId}.`);
        setSelectedCandidate(null);
        // Refresh round
        const r = await fetchCurrentRound();
        setRound(r);
      } else {
        setNotice(`Incorrect guess: "${selectedCandidate.name}". 1 guess quota consumed.`);
        // Cross off candidate locally
        setCrossed((prev) => Array.from(new Set([...prev, selectedCandidate.id])));
        setSelectedCandidate(null);
        const p = await fetchPlayerInfo(round.round_id, accountId);
        setPlayerInfo(p);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice(`Guess error: ${friendlyError(msg).message}`);
    } finally {
      setSubmittingGuess(false);
    }
  };

  const toggleCross = (candidateId: number) => {
    setCrossed((prev) =>
      prev.includes(candidateId) ? prev.filter((i) => i !== candidateId) : [...prev, candidateId]
    );
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

  const guessesRemainingDisplay = useMemo(() => {
    if (!isJoined) return '—';
    if (playerInfo) return `${playerInfo.guesses_remaining} / 3`;
    return '3 / 3';
  }, [isJoined, playerInfo]);

  return (
    <div className="app-shell">
      {isSpectator && (
        <div className="watch-banner">
          <Eye size={14} />
          <span>
            You’re watching.{' '}
            <button onClick={openWalletModal}>Connect a wallet to play.</button>
          </span>
          <span className="banner-note">Live Testnet Spectator Mode · no wallet required</span>
        </div>
      )}

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Cipher home">
          <span className="brand-mark"><span /></span>
          <span>CIPHER</span>
        </a>
        <nav className="main-nav">
          <a className="active" href="#round">The round</a>
          <a href="#board">The board</a>
          <a href="#how">How to play</a>
        </nav>
        <div className="header-right">
          <span className="network"><i /> TESTNET</span>
          {accountId ? (
            <button className="wallet-button" onClick={signOutWallet} title="Click to disconnect">
              <Wallet size={16} />
              {accountId}
              <ChevronDown size={14} />
            </button>
          ) : (
            <button className="wallet-button" onClick={openWalletModal}>
              <Wallet size={16} />
              Connect wallet
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      </header>

      <main id="top">
        <section className="hero" id="round">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> DAILY DEDUCTION <span className="eyebrow-divider">/</span> ROUND #{round ? round.round_id : 2}
            </div>
            <h1>One secret.<br /><em>Sixty-four</em> possibilities.</h1>
            <p className="hero-sub">Ask sharp questions. Read the clues. Find the secret before someone else does.</p>
            <div className="hero-buttons">
              {isJoined ? (
                <button className="button button-primary" disabled>
                  <Sparkles size={16} /> You’re in
                </button>
              ) : (
                <button className="button button-primary" onClick={handleJoinRound}>
                  <Sparkles size={16} /> Join the round
                  <span className="button-cost">0.1 NEAR</span>
                </button>
              )}
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
              <span><span className="live-dot" /> {isSettled ? 'SETTLED' : 'LIVE ROUND'}</span>
              <span><Clock3 size={13} /> <b>{timerDisplay}</b></span>
            </div>
          </div>
          <div className="hero-watermark">C</div>
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
            <strong>{guessesRemainingDisplay}</strong>
            <span className="strip-foot">per entry fee</span>
          </div>
          <div className="strip-item">
            <small>PLAYERS IN</small>
            <strong>{round ? round.total_players : 0}</strong>
            <span className="strip-foot">joined this round</span>
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

        {isSettled && round && (
          <section className="settled-card settled-won">
            <span className="settled-icon"><Check size={18} /></span>
            <div>
              <small>ROUND #{round.round_id} SETTLED</small>
              <h2>Winner: {round.winner}</h2>
              <p>
                Secret entity revealed: <b>{round.secret_revealed}</b>.
                Payout: {formatNear(round.payout || '0')} NEAR (96% of pot).
                Protocol fee: {formatNear(round.rake_amount || '0')} NEAR (4% rake).
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
              Tap a tile to cross it off locally, or click to guess. Target entity is committed on-chain.
            </p>
            <div className="board-grid">
              {Array.from({ length: 64 }, (_, i) => {
                const candId = i + 1;
                const cand = candidates.find((c) => c.id === candId);
                const isCrossed = crossed.includes(candId);
                return (
                  <button
                    key={candId}
                    onClick={() => handleSelectCandidateForGuess(cand || { id: candId, name: `Candidate ${candId}`, category: '', era: '', origin: '', type: '' })}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      toggleCross(candId);
                    }}
                    className={`candidate ${isCrossed ? 'crossed' : ''}`}
                    title={cand ? `${cand.name} (${cand.era}, ${cand.origin} - ${cand.category}). Right-click to cross off.` : `Candidate ${candId}`}
                    aria-label={`Candidate ${candId}: ${cand ? cand.name : 'Candidate'}`}
                  >
                    <div className="candidate-top">
                      <span className="candidate-num">{String(candId).padStart(2, '0')}</span>
                      {cand?.era && <span className="candidate-tag">{cand.era}</span>}
                      {isCrossed && <span className="cross-mark"><X size={11} /></span>}
                    </div>
                    <span className="candidate-name">{cand ? cand.name : `Candidate ${candId}`}</span>
                  </button>
                );
              })}
            </div>
            <div className="board-footer">
              <span><span className="legend-dot" /> CANONICAL 64-SECRETS ACTIVE (Right-click tile to cross off)</span>
              <button onClick={() => setCrossed([])}>Clear cross-offs</button>
            </div>
          </section>

          <aside className="side-column">
            {isJoined && (
              <section className="youre-in panel">
                <div className="mini-eyebrow"><Check size={13} /> PARTICIPATION</div>
                <h3>You’re in.</h3>
                <p>Entry fee paid (0.1 NEAR). You have full deduction and guess allowances.</p>
                <div className="youre-in-stats">
                  <span>Questions Left <b>{round ? round.questions_remaining : 20}</b></span>
                  <span>Guesses Left <b>{playerInfo ? playerInfo.guesses_remaining : 3} / 3</b></span>
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
                Ask a yes-or-no question. The TEE Enclave referee answers and eliminates candidate secrets.
              </p>
              <label className="input-label" htmlFor="question">YOUR QUESTION</label>
              <textarea
                id="question"
                placeholder="e.g. Is it a rotor machine? Is it from the ancient era?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={!isJoined || isSettled || submittingQuestion}
              />
              <button
                className="button button-dark full"
                disabled={!isJoined || isSettled || !question.trim() || submittingQuestion}
                onClick={handleAskQuestion}
              >
                <MessageSquareText size={15} />
                {submittingQuestion ? 'Evaluating with TEE...' : 'Submit question'}
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
                <div className="feed-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
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
                          Ruled out {entry.rule_out_candidate_ids.length} candidates
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

        {/* Candidate Guess Confirmation Modal */}
        {selectedCandidate && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: '#151815',
                border: '1px solid #2e3830',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '440px',
                width: '90%',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px' }}>
                Submit Candidate Guess
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#9ca3af', fontSize: '13px' }}>
                You are submitting a secret guess for:
              </p>
              <div
                style={{
                  background: '#1c221e',
                  border: '1px solid #22c55e40',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#4ade80' }}>
                  #{selectedCandidate.id} — {selectedCandidate.name}
                </div>
                {selectedCandidate.category && (
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    {selectedCandidate.era} · {selectedCandidate.origin} · {selectedCandidate.category}
                  </div>
                )}
              </div>
              <p style={{ fontSize: '12px', color: '#eab308', margin: '0 0 16px 0' }}>
                ⚠️ This consumes 1 of your 3 guess quotas. If correct, 96% pot payout will be claimed.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="button"
                  style={{ background: '#262c27', color: '#ccc' }}
                  onClick={() => setSelectedCandidate(null)}
                  disabled={submittingGuess}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  onClick={handleConfirmGuess}
                  disabled={submittingGuess}
                >
                  <Send size={14} />
                  {submittingGuess ? 'Verifying with TEE...' : 'Confirm Guess'}
                </button>
              </div>
            </div>
          </div>
        )}

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
            <span>CIPHER</span>
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
        NEAR Testnet · {contractConfig.CONTRACT_ID}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
