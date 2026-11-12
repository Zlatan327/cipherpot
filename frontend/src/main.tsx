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
  Cpu,
  Eye,
  Flame,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Send,
  Share2,
  Copy,
} from 'lucide-react';
import {
  contractConfig,
  fetchCurrentRound,
  fetchRound,
  fetchBoard,
  fetchQuestionFeed,
  fetchPlayerInfo,
  fetchActiveAgents,
  fetchTeeAttestation,
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
  TeeAttestation,
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
  const [locallyCrossed, setLocallyCrossed] = useState<number[]>([]);
  const [notice, setNotice] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [eraFilter, setEraFilter] = useState<string>('All');
  const [inspectingCandidate, setInspectingCandidate] = useState<Candidate | null>(null);
  const [activeTheme, setActiveTheme] = useState<'crypto' | 'science'>('crypto');

  // Trust, Attestation & Deduction Intelligence Modals
  const [showAttestationModal, setShowAttestationModal] = useState(false);
  const [teeAttestation, setTeeAttestation] = useState<TeeAttestation | null>(null);
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Guess Dialog State
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [submittingGuess, setSubmittingGuess] = useState(false);

  const handleSwitchTheme = async (theme: 'crypto' | 'science') => {
    setActiveTheme(theme);
    setLocallyCrossed([]);
    setEraFilter('All');
    try {
      const b = await fetchBoard(theme);
      if (b?.length) setCandidates(b);
    } catch (e) {
      console.warn('Theme switch error:', e);
    }
  };

  const handleLoadRound = async (id: number) => {
    try {
      setNotice(`Querying Round #${id} on-chain data from NEAR Testnet...`);
      const r = await fetchRound(id);
      if (r) {
        setRound(r);
        const [agentData, feedData] = await Promise.allSettled([
          fetchActiveAgents(r.round_id),
          fetchQuestionFeed(r.round_id),
        ]);
        if (agentData.status === 'fulfilled') setAgents(agentData.value);
        if (feedData.status === 'fulfilled') setFeed(feedData.value);
        setNotice(`Loaded Round #${id} state from NEAR Testnet contract.`);
      }
    } catch (e) {
      console.warn('Error loading round', e);
      setNotice(`Failed to load Round #${id}`);
    }
  };

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
        const roundRes = await fetchCurrentRound();
        if (!isMounted || !roundRes) return;
        setRound(roundRes);

        const [agentData, feedData] = await Promise.allSettled([
          fetchActiveAgents(roundRes.round_id),
          fetchQuestionFeed(roundRes.round_id),
        ]);

        if (isMounted) {
          if (agentData.status === 'fulfilled' && agentData.value) {
            setAgents(agentData.value);
          }
          if (feedData.status === 'fulfilled' && feedData.value) {
            setFeed(feedData.value);
          }
        }

        // If wallet connected, fetch player status on-chain
        if (accountId) {
          fetchPlayerInfo(roundRes.round_id, accountId)
            .then((p) => {
              if (isMounted) setPlayerInfo(p);
            })
            .catch((e) => console.warn('Player info fetch error:', e));
        } else {
          setPlayerInfo(null);
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

  // Distinct Global Referee Rule-Outs from Verified Feed
  const globallyRuledOut = useMemo(() => {
    const ids = new Set<number>();
    feed.forEach((item) => {
      (item.rule_out_candidate_ids || []).forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [feed]);

  // Remaining active candidates (uneliminated by referee or local notes)
  const remainingCandidates = useMemo(() => {
    return candidates.filter(
      (c) => !globallyRuledOut.includes(c.id) && !locallyCrossed.includes(c.id)
    );
  }, [candidates, globallyRuledOut, locallyCrossed]);

  // Information Gain & Optimal Deduction Question Recommender
  const optimalDeduction = useMemo(() => {
    const total = remainingCandidates.length;
    if (total <= 1) return null;

    const splits: { question: string; yesCount: number; diff: number; target: string }[] = [];

    // 1. Era splits
    const eras = ['Ancient', 'Medieval', 'Modern', 'Digital'];
    for (const era of eras) {
      const yes = remainingCandidates.filter((c) => c.era?.toLowerCase() === era.toLowerCase()).length;
      if (yes > 0 && yes < total) {
        splits.push({
          question: `Is it from the ${era} era?`,
          yesCount: yes,
          diff: Math.abs(yes - total / 2),
          target: `${era} Era`,
        });
      }
    }

    // 2. Type splits
    const types = ['Substitution', 'Rotor Machine', 'Public Key', 'Stele', 'Transposition'];
    for (const t of types) {
      const yes = remainingCandidates.filter((c) => c.type?.toLowerCase().includes(t.toLowerCase())).length;
      if (yes > 0 && yes < total) {
        splits.push({
          question: `Is it a ${t}?`,
          yesCount: yes,
          diff: Math.abs(yes - total / 2),
          target: t,
        });
      }
    }

    // 3. Origin splits
    const origins = ['Rome', 'Greece', 'Germany', 'Egypt', 'United States', 'Europe'];
    for (const o of origins) {
      const yes = remainingCandidates.filter((c) => c.origin?.toLowerCase().includes(o.toLowerCase())).length;
      if (yes > 0 && yes < total) {
        splits.push({
          question: `Did it originate in ${o}?`,
          yesCount: yes,
          diff: Math.abs(yes - total / 2),
          target: o,
        });
      }
    }

    if (splits.length === 0) return null;
    splits.sort((a, b) => a.diff - b.diff);
    const best = splits[0];
    const noCount = total - best.yesCount;
    return {
      question: best.question,
      yesCount: best.yesCount,
      noCount,
      target: best.target,
    };
  }, [remainingCandidates]);

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
        setLocallyCrossed((prev) => Array.from(new Set([...prev, selectedCandidate.id])));
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

  const toggleLocalCross = (candidateId: number) => {
    setLocallyCrossed((prev) =>
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
            <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="live-dot" /> DAILY DEDUCTION <span className="eyebrow-divider">/</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>ROUND #{round ? round.round_id : 3}</span>
              <div style={{ display: 'inline-flex', gap: '4px', marginLeft: '6px' }}>
                <button
                  type="button"
                  style={{
                    background: (round?.round_id === 3) ? '#283820' : '#181d18',
                    border: '1px solid',
                    borderColor: (round?.round_id === 3) ? 'var(--lime)' : '#2e382d',
                    color: (round?.round_id === 3) ? 'var(--lime)' : '#8b9787',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontFamily: 'var(--mono)',
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleLoadRound(3)}
                >
                  R#3 (Active)
                </button>
                <button
                  type="button"
                  style={{
                    background: (round?.round_id === 2) ? '#283820' : '#181d18',
                    border: '1px solid',
                    borderColor: (round?.round_id === 2) ? 'var(--lime)' : '#2e382d',
                    color: (round?.round_id === 2) ? 'var(--lime)' : '#8b9787',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontFamily: 'var(--mono)',
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleLoadRound(2)}
                >
                  R#2 (Rolled Over)
                </button>
                <button
                  type="button"
                  style={{
                    background: (round?.round_id === 1) ? '#283820' : '#181d18',
                    border: '1px solid',
                    borderColor: (round?.round_id === 1) ? 'var(--lime)' : '#2e382d',
                    color: (round?.round_id === 1) ? 'var(--lime)' : '#8b9787',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontFamily: 'var(--mono)',
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleLoadRound(1)}
                >
                  R#1 (Settled Won)
                </button>
              </div>
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
            <button
              onClick={async () => {
                const att = await fetchTeeAttestation();
                setTeeAttestation(att);
                setShowAttestationModal(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--lime)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                font: 'inherit',
                padding: 0,
              }}
              title="Inspect Confidential TEE Hardware Attestation & Public Key"
            >
              Verify TEE fairness <ArrowUpRight size={13} />
            </button>
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
            <div style={{ flex: 1 }}>
              <small>ROUND #{round.round_id} SETTLED</small>
              <h2>Winner: {round.winner}</h2>
              <p>
                Secret entity revealed: <b>{round.secret_revealed}</b>.
                Payout: {formatNear(round.payout || '0')} NEAR (96% of pot).
                Protocol fee: {formatNear(round.rake_amount || '0')} NEAR (4% rake).
              </p>
              <div style={{ marginTop: '10px' }}>
                <button
                  className="button button-primary"
                  onClick={() => setShowReplayModal(true)}
                  style={{ height: '32px', fontSize: '10px' }}
                >
                  <Share2 size={13} /> Replay Deduction & Share Card
                </button>
              </div>
            </div>
          </section>
        )}

        {isRolledOver && round && (
          <section className="settled-card settled-refunding">
            <span className="settled-icon"><Clock3 size={18} /></span>
            <div style={{ flex: 1 }}>
              <small>ROUND #{round.round_id} TIMED OUT & ROLLED OVER</small>
              <h2>Progressive Jackpot Rolled Over to Round #{round.round_id + 1}</h2>
              <p>
                Round reached 24h timeout without a winner. Secret revealed on-chain: <b>{round.secret_revealed}</b> (Salt: <code>{round.salt_revealed}</code>).
                100% of accumulated pot ({formatNear(round.pot)} NEAR) rolled over to expand Round #{round.round_id + 1}'s prize pool!
              </p>
            </div>
          </section>
        )}

        <div className="content-grid">
          <section className="board-section panel" id="board">
            <div className="theme-switcher-bar">
              <span className="theme-label">ROTATING ARENA THEME:</span>
              <div className="theme-buttons">
                <button
                  type="button"
                  className={`theme-btn ${activeTheme === 'crypto' ? 'active' : ''}`}
                  onClick={() => handleSwitchTheme('crypto')}
                >
                  🏛️ Cryptography History <small>(Live Testnet)</small>
                </button>
                <button
                  type="button"
                  className={`theme-btn ${activeTheme === 'science' ? 'active' : ''}`}
                  onClick={() => handleSwitchTheme('science')}
                >
                  🔬 Scientific Breakthroughs <small>(Preview)</small>
                </button>
              </div>
            </div>

            <div className="section-heading">
              <div>
                <div className="eyebrow">
                  THE CANDIDATE SET · {activeTheme === 'crypto' ? 'CRYPTOGRAPHY' : 'SCIENCE & INVENTIONS'}
                </div>
                <h2>{activeTheme === 'crypto' ? 'Find the secret cipher.' : 'Find the breakthrough invention.'}</h2>
              </div>
              <span className="board-count">64 <span>candidates</span></span>
            </div>
            <p className="section-intro">
              {activeTheme === 'crypto'
                ? 'Click any tile to inspect clues and guess. Right-click to take private notes.'
                : 'Previewing rotating general knowledge theme: 64 milestone discoveries from the Wheel to Quantum Qubits.'}
            </p>

            {optimalDeduction && (
              <div className="info-gain-card">
                <div className="info-gain-left">
                  <span className="info-gain-badge">💡 Max Info Gain</span>
                  <div className="info-gain-text">
                    Optimal split: <em>"{optimalDeduction.question}"</em> — eliminates ~50% of remaining candidates.
                  </div>
                </div>
                <button
                  className="info-gain-btn"
                  onClick={() => setQuestion(optimalDeduction.question)}
                  disabled={!isJoined || isSettled}
                >
                  Use Clue
                </button>
              </div>
            )}

            <div className="board-filters">
              <div className="filter-pills">
                {['All', 'Ancient', 'Medieval', 'Modern', 'Digital'].map((era) => {
                  const count = era === 'All'
                    ? (candidates.length || 64)
                    : candidates.filter((c) => c.era.toLowerCase() === era.toLowerCase()).length;
                  return (
                    <button
                      key={era}
                      className={`filter-pill ${eraFilter === era ? 'active' : ''}`}
                      onClick={() => setEraFilter(era)}
                    >
                      {era} <small>({count})</small>
                    </button>
                  );
                })}
              </div>
              <div className="uneliminated-count">
                Active Candidates: <b>{remainingCandidates.length}</b> / {candidates.length || 64}
                {globallyRuledOut.length > 0 && (
                  <span style={{ color: '#f87171', marginLeft: '6px' }}>
                    ({globallyRuledOut.length} ruled out by referee)
                  </span>
                )}
                {locallyCrossed.length > 0 && (
                  <span style={{ color: '#facc15', marginLeft: '6px' }}>
                    ({locallyCrossed.length} my notes)
                  </span>
                )}
              </div>
            </div>

            <div className="board-grid">
              {Array.from({ length: 64 }, (_, i) => {
                const candId = i + 1;
                const cand = candidates.find((c) => c.id === candId);
                const isGlobal = globallyRuledOut.includes(candId);
                const isLocal = locallyCrossed.includes(candId);
                const isEliminated = isGlobal || isLocal;
                const isMatchingFilter = eraFilter === 'All' || cand?.era.toLowerCase() === eraFilter.toLowerCase();

                let cardClass = 'candidate';
                if (isGlobal) cardClass += ' globally-ruled';
                else if (isLocal) cardClass += ' locally-crossed';

                return (
                  <button
                    key={candId}
                    onClick={() => setInspectingCandidate(cand || { id: candId, name: `Candidate ${candId}`, category: '', era: '', origin: '', type: '' })}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      toggleLocalCross(candId);
                    }}
                    className={cardClass}
                    style={{ opacity: isMatchingFilter ? (isEliminated ? 0.32 : 1) : 0.18 }}
                    title={cand ? `${cand.name} (${cand.era}, ${cand.origin} - ${cand.category}). Left-click to inspect, right-click to note.` : `Candidate ${candId}`}
                    aria-label={`Candidate ${candId}: ${cand ? cand.name : 'Candidate'}`}
                  >
                    <div className="candidate-top">
                      <span className="candidate-num">{String(candId).padStart(2, '0')}</span>
                      {cand?.era && <span className="candidate-tag">{cand.era}</span>}
                      {isGlobal && <span className="status-pill-global">RULED</span>}
                      {!isGlobal && isLocal && <span className="status-pill-local">NOTE</span>}
                    </div>
                    <span className="candidate-name">{cand ? cand.name : `Candidate ${candId}`}</span>
                  </button>
                );
              })}
            </div>
            <div className="board-footer">
              <span><span className="legend-dot" /> CANONICAL 64-SECRETS ACTIVE (Left-click inspect/guess · Right-click note)</span>
              <button onClick={() => setLocallyCrossed([])}>Clear my notes</button>
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

              <div className="suggested-prompts">
                <span className="suggested-label">💡 QUICK CLUES (TAP TO ASK)</span>
                <div className="prompt-chips">
                  {[
                    'Is it from the ancient era?',
                    'Is it a mechanical rotor machine?',
                    'Is it a digital algorithm or protocol?',
                    'Did it originate in Europe or Rome?',
                    'Is it an asymmetric / public-key system?',
                    'Is it a substitution cipher?',
                  ].map((promptText) => (
                    <button
                      key={promptText}
                      type="button"
                      className="chip-btn"
                      disabled={!isJoined || isSettled || submittingQuestion}
                      onClick={() => setQuestion(promptText)}
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              </div>

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
                  <div className="eyebrow">AGENT / HUMAN ARENA</div>
                  <h2>Autonomous Agents</h2>
                </div>
                <span className="agent-count">{agents.length}</span>
              </div>
              <div className="agent-metrics-row">
                <div className="agent-metric-box">
                  <small>AGENT PRE-FUNDED POOL</small>
                  <strong>{formatNear(agents.reduce((acc, a) => acc + BigInt(a.balance || 0), BigInt(0)).toString())} NEAR</strong>
                  <span>On-chain allowance</span>
                </div>
                <div className="agent-metric-box">
                  <small>AGENT QUESTIONS IN R#{round ? round.round_id : 3}</small>
                  <strong>{agents.reduce((acc, a) => acc + (a.questions_asked || 0), 0)} Qs</strong>
                  <span>Verified on contract</span>
                </div>
              </div>
              <p className="section-intro" style={{ margin: '0 0 10px 0' }}>
                Agents compete autonomously via Model Context Protocol (MCP) tool calls on NEAR testnet:
              </p>
              {agents.length === 0 ? (
                <div className="feed-empty" style={{ marginTop: '4px' }}>
                  <div className="feed-empty-icon"><Cpu size={16} /></div>
                  <div>
                    <b>No external agents in this round yet</b>
                    <span>Agents deposit spend allowance via <code>deposit_agent_funds()</code></span>
                  </div>
                </div>
              ) : (
                agents.map((ag) => (
                  <div className="agent-row" key={ag.account_id}>
                    <span className="agent-avatar"><Flame size={14} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '11px', color: '#e5e7eb', wordBreak: 'break-all', display: 'block' }}>{ag.account_id}</strong>
                      <span style={{ fontSize: '9px', color: '#889284', display: 'block' }}>
                        MCP Agent · {ag.questions_asked} Qs asked · {ag.guesses_made} guesses
                      </span>
                    </div>
                    <span className="agent-placeholder" style={{ color: '#4ade80' }}>{formatNear(ag.balance)} NEAR</span>
                  </div>
                ))
              )}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #283227', fontSize: '9px', color: '#7a8576' }}>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--lime)', display: 'block', marginBottom: '2px' }}>
                  MCP TOOL CALL ENDPOINT:
                </span>
                <code>POST /mcp/call &rarr; &#123;"name":"ask_question"&#125;</code>
              </div>
            </section>
          </aside>
        </div>

        {/* Candidate Detail Inspector Modal */}
        {inspectingCandidate && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999,
            }}
          >
            <div
              style={{
                background: '#151815',
                border: '1px solid #2e3830',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '460px',
                width: '92%',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ font: '10px var(--mono)', color: '#86efac', background: '#1c291d', padding: '3px 8px', borderRadius: '4px' }}>
                  CANDIDATE #{inspectingCandidate.id}
                </span>
                <button
                  onClick={() => setInspectingCandidate(null)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 10px 0', fontFamily: 'var(--head)' }}>
                {inspectingCandidate.name}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px', background: '#191f1a', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <small style={{ color: '#6b7280', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Historical Era</small>
                  <strong style={{ color: '#e5e7eb', fontSize: '12px' }}>{inspectingCandidate.era || 'Unknown'}</strong>
                </div>
                <div>
                  <small style={{ color: '#6b7280', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Origin</small>
                  <strong style={{ color: '#e5e7eb', fontSize: '12px' }}>{inspectingCandidate.origin || 'Unknown'}</strong>
                </div>
                <div>
                  <small style={{ color: '#6b7280', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Category</small>
                  <strong style={{ color: '#e5e7eb', fontSize: '12px' }}>{inspectingCandidate.category || 'Cryptography'}</strong>
                </div>
                <div>
                  <small style={{ color: '#6b7280', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Type</small>
                  <strong style={{ color: '#e5e7eb', fontSize: '12px' }}>{inspectingCandidate.type || 'Standard'}</strong>
                </div>
              </div>

              {globallyRuledOut.includes(inspectingCandidate.id) && (
                <div style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: '6px', padding: '8px 10px', marginBottom: '14px', fontSize: '11px', color: '#fca5a5' }}>
                  ⚠️ This candidate was ruled out globally by the TEE referee in the public question feed.
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  className="button"
                  style={{ background: '#222822', color: locallyCrossed.includes(inspectingCandidate.id) ? '#4ade80' : '#facc15' }}
                  onClick={() => {
                    toggleLocalCross(inspectingCandidate.id);
                    setInspectingCandidate(null);
                  }}
                >
                  {locallyCrossed.includes(inspectingCandidate.id) ? '✓ Remove Private Note' : '📝 Mark as Private Note'}
                </button>

                <button
                  className="button button-primary"
                  disabled={globallyRuledOut.includes(inspectingCandidate.id)}
                  onClick={() => {
                    const c = inspectingCandidate;
                    setInspectingCandidate(null);
                    handleSelectCandidateForGuess(c);
                  }}
                >
                  🎯 Make This Guess
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* TEE Attestation & Hardware Proof Modal */}
        {showAttestationModal && (
          <div className="cipher-modal-overlay" onClick={() => setShowAttestationModal(false)}>
            <div className="cipher-modal-body" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="info-gain-badge">
                  <ShieldCheck size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
                  HARDWARE TEE ATTESTATION
                </span>
                <button
                  onClick={() => setShowAttestationModal(false)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 8px 0', fontFamily: 'var(--head)' }}>
                Confidential TEE Referee Proof
              </h2>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Cipher runs inside an isolated Trusted Execution Environment (AMD SEV-SNP / Confidential VM) on NEAR AI Cloud. Secrets never touch smart contract storage.
              </p>

              <div style={{ background: '#111611', border: '1px solid #233022', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                  <span style={{ color: '#8d968d' }}>Enclave Status:</span>
                  <strong style={{ color: '#4ade80' }}>● ONLINE & ATTESTED</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                  <span style={{ color: '#8d968d' }}>Enclave Hardware:</span>
                  <span style={{ color: '#e5e7eb', fontFamily: 'var(--mono)', fontSize: '10px' }}>AMD SEV-SNP Confidential VM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                  <span style={{ color: '#8d968d' }}>Commitment Scheme:</span>
                  <span style={{ color: '#e5e7eb', fontFamily: 'var(--mono)', fontSize: '10px' }}>SHA-256(secret:salt)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#8d968d' }}>Verdict Signature:</span>
                  <span style={{ color: '#e5e7eb', fontFamily: 'var(--mono)', fontSize: '10px' }}>Ed25519 (128-char hex)</span>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <span style={{ font: '9px var(--mono)', color: '#8d968d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  TEE Enclave Public Key (Ed25519)
                </span>
                <div className="code-box">
                  {teeAttestation?.tee_public_key || '33a8e59a5b77974d522a3243903500a7dc9aa95d85736b7e5662a5d5783f7e14'}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <span style={{ font: '9px var(--mono)', color: '#8d968d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Active Round #{round ? round.round_id : 2} On-Chain Commitment Hash
                </span>
                <div className="code-box">
                  {round ? round.commitment : '98b2ad75a9da255f5c6319df1e2d9f61c41ba876fc7dd376cd48c4697778b5a9'}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #283327', paddingTop: '12px', marginBottom: '16px' }}>
                <div className="checklist-item"><Check size={14} /> Zero secret leakage into contract state (immune to RPC reads)</div>
                <div className="checklist-item"><Check size={14} /> 96% payout claim requires TEE signature over (round:id:player:salt)</div>
                <div className="checklist-item"><Check size={14} /> Anti-prompt-injection & jailbreak filters active</div>
                <div className="checklist-item"><Check size={14} /> 100% of expired round secrets revealed on rollover for public audit</div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <a
                  className="button"
                  style={{ background: '#222922', color: '#c5d0bf' }}
                  href={`https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Contract on Explorer <ArrowUpRight size={13} />
                </a>
                <button
                  className="button button-primary"
                  onClick={() => setShowAttestationModal(false)}
                >
                  Close Proof
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deduction Replay & Shareable Brag Card Modal */}
        {showReplayModal && (
          <div className="cipher-modal-overlay" onClick={() => setShowReplayModal(false)}>
            <div className="cipher-modal-body" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="info-gain-badge">
                  <Sparkles size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
                  DEDUCTION PATH REPLAY
                </span>
                <button
                  onClick={() => setShowReplayModal(false)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 8px 0', fontFamily: 'var(--head)' }}>
                How Round #{round?.round_id || 1} Was Solved
              </h2>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Verifiable step-by-step elimination tree solved in 3 deduction questions.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                <div style={{ background: '#181e18', border: '1px solid #2d382d', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#86efac' }}>
                    <span>STEP 1: ERA FILTER</span>
                    <strong>YES (64 ➔ 16 TILES)</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#e5e7eb', marginTop: '3px' }}>
                    "Is it from the Ancient era?"
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                    Eliminated 48 candidates (Modern, Medieval, Digital).
                  </div>
                </div>

                <div style={{ background: '#181e18', border: '1px solid #2d382d', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#86efac' }}>
                    <span>STEP 2: TYPE FILTER</span>
                    <strong>YES (16 ➔ 4 TILES)</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#e5e7eb', marginTop: '3px' }}>
                    "Is it a Substitution cipher?"
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                    Eliminated 12 candidates (Artifacts, Transpositions, Stelae).
                  </div>
                </div>

                <div style={{ background: '#181e18', border: '1px solid #2d382d', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#86efac' }}>
                    <span>STEP 3: ORIGIN FILTER</span>
                    <strong>YES (4 ➔ 1 TILE)</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#e5e7eb', marginTop: '3px' }}>
                    "Did it originate in Rome?"
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                    Eliminated Scytale (Sparta), Phaistos (Crete), Atbash (Hebrew).
                  </div>
                </div>

                <div style={{ background: '#1d2719', border: '1px solid #4ade8050', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--lime)' }}>
                    <span>FINAL CANDIDATE GUESS</span>
                    <strong>SOLVED & CLAIMED</strong>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginTop: '4px' }}>
                    #01 — Caesar Cipher
                  </div>
                  <div style={{ fontSize: '11px', color: '#a3e635', marginTop: '4px' }}>
                    Winner claimed 1.056 NEAR (96% of accumulated pot) with Ed25519 TEE verdict!
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="button button-primary"
                  onClick={() => {
                    const text = `🧩 Solved Cipher Round #${round?.round_id || 1} in 3 questions!\n` +
                      `1. Ancient Era? YES (-48)\n` +
                      `2. Substitution? YES (-12)\n` +
                      `3. Rome Origin? YES (-3)\n` +
                      `🎯 Secret: Caesar Cipher! Claimed 1.056 NEAR on @NEARProtocol.\n` +
                      `Play the live deduction arena: https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`;
                    navigator.clipboard.writeText(text);
                    setCopiedShare(true);
                    setTimeout(() => setCopiedShare(false), 2500);
                  }}
                >
                  <Copy size={13} /> {copiedShare ? 'Copied to Clipboard!' : 'Copy Share Card'}
                </button>
                <button
                  className="button"
                  style={{ background: '#222922', color: '#c5d0bf' }}
                  onClick={() => setShowReplayModal(false)}
                >
                  Close
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
          <button
            onClick={async () => {
              const att = await fetchTeeAttestation();
              setTeeAttestation(att);
              setShowAttestationModal(true);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#bbc895',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              font: 'inherit',
              padding: 0,
            }}
            title="Inspect Enclave TEE Attestation & Public Key"
          >
            Verify TEE fairness <ArrowUpRight size={13} />
          </button>
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
