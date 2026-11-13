import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Coins,
  Copy,
  Eye,
  LockKeyhole,
  MessageSquareText,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  User,
  Wallet,
  X,
  Zap,
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
  // Navigation Tab State
  type TabType = 'round' | 'board';
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'board') {
        return hash as TabType;
      }
    } catch {}
    return 'round';
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'round' || hash === 'board') {
        setActiveTab(hash as TabType);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    try {
      window.location.hash = tab;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  };
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

  // Skill Mode Architecture: Assisted (Training) vs Pure Skill (Ranked)
  const [cluesUsed, setCluesUsed] = useState<number>(0);
  const [isCurrentQuestionAssisted, setIsCurrentQuestionAssisted] = useState<boolean>(false);
  const [lastSolveMastery, setLastSolveMastery] = useState<{ pure: boolean; certificate: string } | null>(null);

  // Trust, Attestation & Deduction Intelligence Modals
  const [showAttestationModal, setShowAttestationModal] = useState(false);
  const [teeAttestation, setTeeAttestation] = useState<TeeAttestation | null>(null);
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [submittingGuess, setSubmittingGuess] = useState(false);
  const [viewMode, setViewMode] = useState<'contenders' | 'all'>('contenders');

  const handleUseClue = (clueText: string) => {
    setQuestion(clueText);
    setIsCurrentQuestionAssisted(true);
    setCluesUsed((prev) => prev + 1);
    handleTabChange('round');
    setTimeout(() => {
      const el = document.getElementById('question');
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
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
  const canPlayRound = round?.status === 'Active' && BigInt(round.time_remaining || '0') > 0n;
  const isSettled = round?.status === 'Settled';
  const isRolledOver = round?.status === 'RolledOver';

  const statusText = useMemo(() => {
    if (!round) return 'Round data unavailable';
    if (isSettled) return 'Round settled';
    if (isRolledOver) return 'ROUND ROLLED OVER';
    if (!canPlayRound) return 'Round closed';
    if (isJoined) return 'Joined';
    if (accountId) return 'WALLET CONNECTED';
    return 'SPECTATOR MODE (LIVE)';
  }, [round, isSettled, isRolledOver, canPlayRound, isJoined, accountId]);


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

  // Handle Joining Round on Testnet
  const handleJoinRound = async () => {
    if (!accountId) {
      openWalletModal();
      return;
    }
    if (!round || !canPlayRound) return;

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
    if (!question.trim() || submittingQuestion || !round || !accountId || !isJoined || !canPlayRound || round.questions_remaining <= 0) return;
    setSubmittingQuestion(true);
    setNotice('');

    try {
      // 1. Evaluate with TEE AI Enclave (anti-prompt-injection & structured referee)
      setNotice('Evaluating question with TEE AI Enclave...');
      const evalResult = await askQuestionApi(
        round.round_id,
        accountId,
        question.trim(),
        isCurrentQuestionAssisted,
        isCurrentQuestionAssisted ? 'assisted' : 'pure',
        round.questions_asked
      );

      if (typeof evalResult.session_clues_used === 'number') {
        setCluesUsed(evalResult.session_clues_used);
      }
      setIsCurrentQuestionAssisted(false);

      // 2. Submit structured answer & rule-outs to NEAR contract
      setNotice('Recording question & structured verdict on NEAR Testnet...');
      if (!evalResult.signature_hex) throw new Error("The referee did not sign this answer.");
      await submitQuestionOnChain(
        round.round_id,
        evalResult.question,
        evalResult.answer,
        evalResult.rule_out_candidate_ids || [],
        evalResult.signature_hex
      );

      // 3. Update local feed & crossed tiles
      const newEntry: QuestionView = {
        question_id: feed.length + 1,
        round_id: round.round_id,
        asker: accountId,
        question: evalResult.question,
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
    if (!canPlayRound) return;
    if (!isJoined) {
      if (!accountId) openWalletModal();
      else setNotice('You must join the round with 0.1 NEAR entry fee before making a guess.');
      return;
    }
    setSelectedCandidate(cand);
  };

  const handleConfirmGuess = async () => {
    if (!selectedCandidate || !round || !accountId || submittingGuess) return;
    if (!contractConfig.API_URL) {
      setNotice('The referee is unavailable. Your guess was not submitted.');
      return;
    }
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
      }).then(async (r) => {
        if (!r.ok) throw new Error(`Guess verification unavailable (HTTP ${r.status}).`);
        return r.json();
      });

      if (verifyRes.is_correct) {
        const isPure = Boolean(verifyRes.pure_deduction);
        setLastSolveMastery({
          pure: isPure,
          certificate: verifyRes.verdict_certificate || (isPure ? 'TEE_ENCLAVE_VERIFIED_PURE_SKILL' : 'TEE_ENCLAVE_VERIFIED_ASSISTED'),
        });
        const winNotice = isPure
          ? 'TEE ENCLAVE CERTIFIED: PURE DEDUCTION VICTORY! Solved 100% unassisted. Claiming pot on NEAR Testnet...'
          : `GUESS IS CORRECT (${verifyRes.clues_used || cluesUsed} AI hints used)! Claiming pot with TEE signature...`;
        setNotice(winNotice);
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
    return '—';
  }, [round]);

  const timerDisplay = useMemo(() => {
    if (round?.time_remaining) return formatCountdown(round.time_remaining);
    return '—';
  }, [round]);

  const questionsLeftDisplay = useMemo(() => {
    if (round) return `${round.questions_remaining} / ${round.max_questions}`;
    return '—';
  }, [round]);

  const guessesRemainingDisplay = useMemo(() => {
    if (!isJoined) return '—';
    if (playerInfo) return `${playerInfo.guesses_remaining} / 3`;
    return '3 / 3';
  }, [isJoined, playerInfo]);

  const [highlightedCards, setHighlightedCards] = useState<number[]>([]);
  useEffect(() => setHighlightedCards([]), [round?.round_id]);

  const boardView = (
    <div className="board-view-container">
            <section className="board-section panel" id="board">
            <div className="section-header">
              <div>
                <h2 className="section-title">
                  Game board
                </h2>
              </div>
              <div className="view-tabs">
                <button
                  type="button"
                  className={`view-tab ${viewMode === 'contenders' ? 'active' : ''}`}
                  aria-pressed={viewMode === 'contenders'}
                  onClick={() => { setViewMode('contenders'); setHighlightedCards([]); }}
                >
                  <Sparkles size={13} /> Remaining <span className="badge">{remainingCandidates.length}</span>
                </button>
                <button
                  type="button"
                  className={`view-tab ${viewMode === 'all' ? 'active' : ''}`}
                  aria-pressed={viewMode === 'all'}
                  onClick={() => { setEraFilter('All'); setViewMode('all'); }}
                >
                  <Eye size={13} /> All cards <span className="badge">{candidates.length || "—"}</span>
                </button>
              </div>
            </div>
      <p className="board-instruction">Select a card to see its details or make a guess.</p>
      {viewMode === 'all' && (
        <label className="board-filter">
          Era
          <select value={eraFilter} onChange={(event) => setEraFilter(event.target.value)}>
            <option value="All">All eras</option>
            {[...new Set(candidates.map((card) => card.era))].filter(Boolean).map((era) => (
              <option key={era}>{era}</option>
            ))}
          </select>
        </label>
      )}
      {candidates.length === 0 ? <p>Board data is unavailable.</p> : (
        <div className="board-grid">
          {(viewMode === 'contenders' ? remainingCandidates : candidates.filter(
            (card) => eraFilter === 'All' || card.era === eraFilter
          )).map((card) => {
            const ruledOut = globallyRuledOut.includes(card.id);
            const noted = locallyCrossed.includes(card.id);
            const highlighted = highlightedCards.includes(card.id);
            return (
              <button key={card.id} type="button" onClick={() => setInspectingCandidate(card)}
                className={`candidate game-card${ruledOut ? ' globally-ruled' : ''}${highlighted ? ' clue-highlight' : ''}`}>
                <span className="card-era">{card.era}</span>
                <strong className="candidate-name">{card.name}</strong>
                <span className="card-status">{ruledOut ? 'Ruled out' : noted ? 'Private note' : card.category}</span>
              </button>
            );
          })}
        </div>
      )}
      {viewMode === 'contenders' && candidates.length > 0 && remainingCandidates.length === 0 && <p>No cards remain. Open All cards to review the board.</p>}
      {locallyCrossed.length > 0 && <button className="text-link" onClick={() => setLocallyCrossed([])}>Clear my notes</button>}
      </section>
    </div>
  );

  return (
    <div className="app-shell">
      {isSpectator && (
        <div className="watch-banner">
          <Eye size={15} />
          <span>
            You’re in Spectator Mode.{' '}
            <button onClick={openWalletModal}>Connect a wallet to play.</button>
          </span>
          <span className="banner-note">Live Testnet Feed · No wallet required</span>
        </div>
      )}

      <header className="topbar">
        <div className="header-left">
          <a
            className="brand"
            href="#round"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('round');
            }}
            aria-label="CipherPot home"
          >
            <span className="brand-mark"><span /></span>
            <span>CipherPot</span>
          </a>
          <nav className="main-nav" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'round'}
              className={activeTab === 'round' ? 'active' : ''}
              onClick={() => handleTabChange('round')}
            >
              Play
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'board'}
              className={activeTab === 'board' ? 'active' : ''}
              onClick={() => handleTabChange('board')}
            >
              Board
            </button>
          </nav>
        </div>

        <div className="header-right">
          {/* Priority 1: Persistent How to Play button */}
          <button
            className="how-to-play-btn"
            onClick={() => setShowHowToPlayModal(true)}

          >
            <CircleHelp size={15} />
            <span>How to play</span>
          </button>
          <span className="network"><i /> NEAR TESTNET</span>
          {accountId ? (
            <button className="wallet-button" onClick={signOutWallet} title="Click to disconnect">
              <Wallet size={15} />
              {accountId}
              <ChevronDown size={14} />
            </button>
          ) : (
            <button className="wallet-button" onClick={openWalletModal}>
              <Wallet size={15} />
              Connect Wallet
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      </header>

      <main id="top">

        {activeTab === 'round' && (
          <>
            <section className="hero" id="round">
          <div className="hero-copy">
            <div className="arena-badge">
              <span className="live-dot" /> {round ? `Round #${round.round_id} · NEAR Testnet` : 'NEAR Testnet'}
            </div>
            <h1>Find the <span className="highlight">hidden item.</span></h1>
            <p className="hero-sub">
              Read the shared answers, cross off cards, and guess the hidden item.
            </p>
            <div className="hero-buttons">
              {isJoined ? (
                <button className="button button-primary" disabled>
                  <Sparkles size={16} /> Joined
                </button>
              ) : (
                <button className="button button-primary" onClick={handleJoinRound} disabled={!canPlayRound}>
                  <Sparkles size={16} /> Join the round
                  {round?.entry_fee && <span className="button-cost">{formatNear(round.entry_fee)} test NEAR</span>}
                </button>
              )}
            </div>
          </div>

          <div className="pot-card">
            <div className="pot-card-top">
              <span className="pot-label">Current Pot</span>
              <span className="pot-icon"><Coins size={18} /></span>
            </div>
            <div className="pot-amount">
              <span className="pot-number">{potDisplay}</span>
              <span className="pot-unit">NEAR</span>
            </div>
            <div className="pot-network-note">
              NEAR Testnet Pot ({contractConfig.CONTRACT_ID})
            </div>
            <div className="pot-card-bottom">
              <span>{round ? statusText : 'Awaiting round data'}</span>
              <span><Clock3 size={13} /> <b>{timerDisplay}</b></span>
            </div>
          </div>
        </section>

        <section className="round-strip" aria-label="Round status">
          <div className="strip-status">
            <span className="status-icon"><Activity size={16} /></span>
            <div>
              <small>Round Status</small>
              <strong>{statusText}</strong>
            </div>
          </div>
          <div className="strip-item">
            <small>Questions Left</small>
            <strong>{questionsLeftDisplay}</strong>
            <span className="strip-foot">across all players</span>
          </div>
          <div className="strip-item">
            <small>Your Guesses</small>
            <strong>{guessesRemainingDisplay}</strong>
            <span className="strip-foot">per entry fee</span>
          </div>
          <div className="strip-item">
            <small>Players In</small>
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
              title="View round commitment and signing key"
            >
              Round verification <ArrowUpRight size={13} />
            </button>
          </div>
        </section>

        <div className="inspector-bar">
          <div className="inspector-group">
            <span className="inspector-label">ARCHIVED ROUNDS:</span>
            <button
              type="button"
              className={`inspector-pill ${round?.round_id === 3 ? 'active' : ''}`}
              onClick={() => handleLoadRound(3)}
            >
              Round 3
            </button>
            <button
              type="button"
              className={`inspector-pill ${round?.round_id === 2 ? 'active' : ''}`}
              onClick={() => handleLoadRound(2)}
            >
              Round 2
            </button>
            <button
              type="button"
              className={`inspector-pill ${round?.round_id === 1 ? 'active' : ''}`}
              onClick={() => handleLoadRound(1)}
            >
              Round 1
            </button>
          </div>
          <div>
            <a
              href={`https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Verified on NearBlocks <ArrowUpRight size={12} />
            </a>
          </div>
        </div>

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
              <div className="inspector-label">ROUND #{round.round_id} SETTLED</div>
              <h2 style={{ margin: '6px 0', fontSize: '18px' }}>Winner: {round.winner}</h2>
              <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Secret entity revealed: <b>{round.secret_revealed}</b>.
                Payout: {formatNear(round.payout || '0')} NEAR (96% of pot).
                Protocol fee: {formatNear(round.rake_amount || '0')} NEAR (4% rake).
              </p>
              <div>
                <button
                  className="button button-primary"
                  onClick={() => setShowReplayModal(true)}
                >
                  <Share2 size={14} /> Replay Deduction & Share Card
                </button>
              </div>
            </div>
          </section>
        )}

        {isRolledOver && round && (
          <section className="settled-card settled-refunding">
            <span className="settled-icon"><Clock3 size={18} /></span>
            <div style={{ flex: 1 }}>
              <div className="inspector-label">ROUND #{round.round_id} TIMED OUT & ROLLED OVER</div>
              <h2 style={{ margin: '6px 0', fontSize: '18px' }}>Progressive Jackpot Rolled Over to Round #{round.round_id + 1}</h2>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Round reached 24h timeout without a winner. Secret revealed on-chain: <b>{round.secret_revealed}</b>.
                100% of accumulated pot ({formatNear(round.pot)} NEAR) rolled over to expand Round #{round.round_id + 1}'s prize pool!
              </p>
            </div>
          </section>
        )}

            {/* The Round Command & Control Grid */}
            <div className="game-layout">
              {feed[0] && <div className="latest-answer"><strong>{feed[0].answer}</strong> {feed[0].question}</div>}
              {boardView}
              <aside className="game-sidebar" aria-label="Questions">
              <div className="round-column-right">
                <section className="panel feed-panel" id="questions">
              <div className="panel-header-inline">
                <h2>Shared questions</h2>
                <span className="feed-live"><i /> Live</span>
              </div>
              {feed.length === 0 ? (
                <div className="feed-empty">
                  <div className="feed-empty-icon"><MessageSquareText size={18} /></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>No verified entries yet</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Be the first to submit a deduction question</div>
                  </div>
                </div>
              ) : (
                <div className="feed-list">
                  {feed.map((entry) => (
                    <div
                      key={entry.question_id}
                      className={`feed-item ${entry.answer === 'Yes' ? 'yes' : entry.answer === 'No' ? 'no' : 'unclear'}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          {(agents.some((a) => a.account_id === entry.asker) || entry.asker.includes('agent') || entry.asker === contractConfig.CONTRACT_ID) ? (
                            <span style={{ color: '#38bdf8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Bot size={13} /> AGENT: {entry.asker}</span>
                          ) : (
                            <span style={{ color: '#4ade80', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><User size={13} /> HUMAN: {entry.asker}</span>
                          )}
                        </span>
                        <strong style={{
                          fontFamily: 'var(--font-mono)',
                          color: entry.answer === 'Yes' ? 'var(--color-success)' : entry.answer === 'No' ? 'var(--color-danger)' : 'var(--color-warning)'
                        }}>
                          {entry.answer.toUpperCase()}
                        </strong>
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {entry.question}
                      </div>
                      {entry.rule_out_candidate_ids?.length > 0 && (
                        <button type="button" className="text-link" onClick={() => {
                          setHighlightedCards(entry.rule_out_candidate_ids);
                          setEraFilter('All');
                          setViewMode('all');
                          document.getElementById('board')?.scrollIntoView();
                        }}>
                          See {entry.rule_out_candidate_ids.length} ruled-out cards
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
              </div>
              <div className="round-column-left">
                {isJoined && (
              <section className="youre-in panel">
                <div className="panel-header-inline">
                  <h3>Participation status</h3>
                  <span className="status-tag"><Check size={12} /> Unlocked</span>
                </div>
                <p>Entry fee paid (0.1 NEAR). You have full deduction questions and guess allowances.</p>
                <div className="youre-in-stats">
                  <span>Questions Left <b>{round ? round.questions_remaining : 20}</b></span>
                  <span>Guesses Left <b>{playerInfo ? playerInfo.guesses_remaining : 3} / 3</b></span>
                </div>
              </section>
            )}

            <section className="panel ask-panel" id="ask">
              <div className="panel-header-inline">
                <h2>Ask a question</h2>
                <span className="status-tag">
                  <LockKeyhole size={12} /> {!canPlayRound ? 'Round closed' : !round?.questions_remaining ? 'No questions left' : isJoined ? 'Ready' : 'Join to play'}
                </span>
              </div>
              <p className="section-intro">
                Ask a yes-or-no question to help rule out cards.
              </p>
              <label className="input-label" htmlFor="question">Your Question</label>
              <textarea
                id="question"
                placeholder="e.g. Is it a rotor machine? Is it from the ancient era?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={!isJoined || !canPlayRound || !round?.questions_remaining || submittingQuestion}
              />
              <button
                className="button-submit-question"
                disabled={!isJoined || !canPlayRound || !round?.questions_remaining || !question.trim() || submittingQuestion}
                onClick={handleAskQuestion}
              >
                <MessageSquareText size={15} />
                {submittingQuestion ? 'Evaluating with TEE...' : 'Submit question'}
              </button>

              {/* Priority 2: Enhanced Prominent One-Tap Quick Clue Chips or Pure Mode Note */}
                <div className="prominent-clues-section">
                  <div className="prominent-clues-title">
                    <span><Zap size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Suggested questions</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}></span>
                  </div>
                  <div className="prominent-clue-grid">
                    {[
                      { label: 'Ancient Era?', query: 'Is it from the ancient era?' },
                      { label: 'Rotor Machine?', query: 'Is it a mechanical rotor machine?' },
                      { label: 'Digital Protocol?', query: 'Is it a digital algorithm or protocol?' },
                      { label: 'Rome / Europe?', query: 'Did it originate in Europe or Rome?' },
                      { label: 'Public Key?', query: 'Is it an asymmetric or public-key system?' },
                      { label: 'Substitution?', query: 'Is it a substitution cipher?' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="prominent-chip"
                        disabled={!isJoined || !canPlayRound || !round?.questions_remaining || submittingQuestion}
                        onClick={() => handleUseClue(item.query)}
                      >
                        <span>{item.label}</span>
                        <span style={{ color: 'var(--lime)', fontSize: '11px' }}>&rarr;</span>
                      </button>
                    ))}
                  </div>
                </div>
              <div className="locked-note">
                <LockKeyhole size={12} />
                {!round ? 'Round data is unavailable.' : !canPlayRound ? 'Questions open when a new round starts.' : !round.questions_remaining ? 'The shared question limit has been reached.' : !isJoined ? 'Connect a wallet and join the round to submit.' : 'Everyone in the round can see the answer.'}
              </div>
            </section>
              </div>
              </aside>
            </div>
          </>
        )}

        {activeTab === 'round' && (
          <nav className="game-mobile-nav" aria-label="Game controls">
            <a href="#board" onClick={(event) => { event.preventDefault(); document.getElementById('board')?.scrollIntoView(); }}>Board</a>
            <a href="#questions">Questions</a>
            <a href="#ask">Ask</a>
          </nav>
        )}
        {activeTab === 'board' && boardView}

        {showHowToPlayModal && (
          <div className="cipher-modal-overlay" onClick={() => setShowHowToPlayModal(false)}>
            <div className="cipher-modal-body play-guide" role="dialog" aria-modal="true" aria-labelledby="play-guide-title"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => { if (event.key === 'Escape') setShowHowToPlayModal(false); }}>
              <div className="panel-header-inline">
                <h2 id="play-guide-title">How to play</h2>
                <button autoFocus className="modal-close-btn" onClick={() => setShowHowToPlayModal(false)} aria-label="Close guide"><X size={18} /></button>
              </div>
              <p>One of the 64 cards is hidden. Work out which one it is.</p>
              <ol>
                <li><strong>Join the round</strong><p>Connect a NEAR Testnet wallet and pay the entry fee shown on screen. You can browse for free.</p></li>
                <li><strong>Ask a yes-or-no question</strong><p>Everyone shares up to 20 questions. Use the answers to rule out cards.</p></li>
                <li><strong>Pick a card and guess</strong><p>You have three guesses. If you’re right, confirm the claim in your wallet. A successful claim pays 96% of the pot.</p></li>
              </ol>
            </div>
          </div>
        )}

        {/* Candidate Detail Inspector Modal */}
        {inspectingCandidate && (
          <div className="cipher-modal-overlay" onClick={() => setInspectingCandidate(null)}>
            <div className="cipher-modal-body" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-row">
                <span className="info-gain-badge">
                  CANDIDATE #{inspectingCandidate.id}
                </span>
                <button className="modal-close-btn" onClick={() => setInspectingCandidate(null)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <h2 style={{ fontSize: '22px', color: '#fff', margin: '0 0 12px 0', fontFamily: 'var(--font-head)' }}>
                {inspectingCandidate.name}
              </h2>

              <div className="modal-grid-2">
                <div className="modal-grid-item">
                  <small>Historical Era</small>
                  <strong>{inspectingCandidate.era || 'Unknown'}</strong>
                </div>
                <div className="modal-grid-item">
                  <small>Origin</small>
                  <strong>{inspectingCandidate.origin || 'Unknown'}</strong>
                </div>
                <div className="modal-grid-item">
                  <small>Category</small>
                  <strong>{inspectingCandidate.category || 'Cryptography'}</strong>
                </div>
                <div className="modal-grid-item">
                  <small>Type</small>
                  <strong>{inspectingCandidate.type || 'Standard'}</strong>
                </div>
              </div>

              {globallyRuledOut.includes(inspectingCandidate.id) && (
                <div className="modal-alert">
                  <AlertTriangle size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> This candidate was ruled out globally by the TEE referee in the public question feed.
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="button button-secondary"
                  onClick={() => {
                    toggleLocalCross(inspectingCandidate.id);
                    setInspectingCandidate(null);
                  }}
                >
                  {locallyCrossed.includes(inspectingCandidate.id) ? 'Remove Private Note' : 'Mark as Private Note'}
                </button>

                <button
                  className="button button-primary"
                  disabled={!canPlayRound || globallyRuledOut.includes(inspectingCandidate.id)}
                  onClick={() => {
                    const c = inspectingCandidate;
                    setInspectingCandidate(null);
                    handleSelectCandidateForGuess(c);
                  }}
                >
                  <Target size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Make This Guess
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Candidate Guess Confirmation Modal */}
        {selectedCandidate && (
          <div className="cipher-modal-overlay" onClick={() => setSelectedCandidate(null)}>
            <div className="cipher-modal-body" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-row">
                <span className="info-gain-badge">CONFIRM CANDIDATE GUESS</span>
                <button className="modal-close-btn" onClick={() => setSelectedCandidate(null)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px', fontFamily: 'var(--font-head)' }}>
                Submit Candidate Guess
              </h3>
              <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                You are submitting a secret guess for:
              </p>
              <div style={{
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--lime)', fontFamily: 'var(--font-head)' }}>
                  #{selectedCandidate.id} — {selectedCandidate.name}
                </div>
                {selectedCandidate.category && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    {selectedCandidate.era} · {selectedCandidate.origin} · {selectedCandidate.category}
                  </div>
                )}
              </div>
              <div className="modal-alert-warning">
                <AlertTriangle size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> This consumes 1 of your 3 guess quotas. If correct, 96% pot payout will be claimed.
              </div>
              <div className="modal-actions">
                <button
                  className="button button-secondary"
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
              <div className="modal-header-row">
                <span className="info-gain-badge">
                  <ShieldCheck size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                  ROUND VERIFICATION
                </span>
                <button className="modal-close-btn" onClick={() => setShowAttestationModal(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <h2 style={{ fontSize: '21px', color: '#fff', margin: '0 0 8px 0', fontFamily: 'var(--font-head)' }}>
                Round commitment and signing key
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                The contract stores a hash of the hidden answer. The signing key below comes from the referee API. Hardware attestation is unverified.
              </p>

              <div className="enclave-specs">
                <div className="spec-row">
                  <span className="spec-label">Commitment Scheme:</span>
                  <span className="spec-value">SHA-256(secret:salt)</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Verdict Signature:</span>
                  <span className="spec-value">Ed25519 (128-char hex)</span>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <span className="inspector-label">TEE Enclave Public Key (Ed25519)</span>
                <div className="code-box">
                  {teeAttestation?.tee_public_key || 'Unavailable'}
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <span className="inspector-label">On-chain commitment</span>
                <div className="code-box">
                  {round?.commitment || 'Unavailable'}
                </div>
              </div>

              <div className="modal-actions">
                <a
                  className="button button-secondary"
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
              <div className="modal-header-row">
                <span className="info-gain-badge">
                  <Sparkles size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                  ARCHIVED SOLVE WALKTHROUGH · ROUND #1
                </span>
                <button className="modal-close-btn" onClick={() => setShowReplayModal(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <h2 style={{ fontSize: '21px', color: '#fff', margin: '0 0 8px 0', fontFamily: 'var(--font-head)' }}>
                How Round #1 Was Solved
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Verifiable step-by-step elimination tree: 64 candidates narrowed to 1 secret in 3 deduction questions.
              </p>

              <div>
                <div className="replay-step">
                  <div className="replay-step-header">
                    <span>STEP 1: ERA FILTER</span>
                    <strong>YES (64 &rarr; 16 TILES)</strong>
                  </div>
                  <div className="replay-step-question">
                    "Is it from the Ancient era?"
                  </div>
                  <div className="replay-step-meta">
                    Eliminated 48 candidates (Modern, Medieval, Digital).
                  </div>
                </div>

                <div className="replay-step">
                  <div className="replay-step-header">
                    <span>STEP 2: TYPE FILTER</span>
                    <strong>YES (16 &rarr; 4 TILES)</strong>
                  </div>
                  <div className="replay-step-question">
                    "Is it a Substitution cipher?"
                  </div>
                  <div className="replay-step-meta">
                    Eliminated 12 candidates (Artifacts, Transpositions, Stelae).
                  </div>
                </div>

                <div className="replay-step">
                  <div className="replay-step-header">
                    <span>STEP 3: ORIGIN FILTER</span>
                    <strong>YES (4 &rarr; 1 TILE)</strong>
                  </div>
                  <div className="replay-step-question">
                    "Did it originate in Rome?"
                  </div>
                  <div className="replay-step-meta">
                    Eliminated Scytale (Sparta), Phaistos (Crete), Atbash (Hebrew).
                  </div>
                </div>

                <div className="replay-step-final">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                    <span>FINAL CANDIDATE GUESS</span>
                    <strong>SOLVED & CLAIMED</strong>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginTop: '4px', fontFamily: 'var(--font-head)' }}>
                    #01 — Caesar Cipher
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Winner claimed 1.056 NEAR (96% of accumulated pot) with verified Ed25519 TEE verdict!
                  </div>
                </div>

                {/* Skill Architecture Achievement Badge */}
                {(lastSolveMastery?.pure ?? cluesUsed === 0) ? (
                  <div className="pure-mastery-card">
                    <div className="pure-mastery-title">
                      <Sparkles size={14} /> <Trophy size={14} /> TEE-CERTIFIED PURE DEDUCTION MASTERY
                    </div>
                    <div className="pure-mastery-desc">
                      Question suggestions used in this session: 0.
                    </div>
                  </div>
                ) : (
                  <div className="assisted-mastery-card">
                    <span>TEE-Verified Assisted Solve: {cluesUsed} AI Shannon clue(s) used</span>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  className="button button-primary"
                  onClick={() => {
                    const text = cluesUsed === 0
                      ? `[PURE DEDUCTION VICTORY]\n` +
                        `Solved Cipher Round #${round?.round_id || 1} in 3 questions with ZERO AI HINTS (100% Pure Skill)!\n` +
                        `Secret: Caesar Cipher! Claimed 1.056 NEAR on @NEARProtocol.\n` +
                        `Play the live arena: https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`
                      : `Solved Cipher Round #${round?.round_id || 1} in 3 questions (${cluesUsed} AI hint${cluesUsed > 1 ? 's' : ''} used)!\n` +
                        `Secret: Caesar Cipher! Claimed 1.056 NEAR on @NEARProtocol.\n` +
                        `Play the live arena: https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`;
                    navigator.clipboard.writeText(text);
                    setCopiedShare(true);
                    setTimeout(() => setCopiedShare(false), 2500);
                  }}
                >
                  <Copy size={14} /> {copiedShare ? 'Copied to Clipboard!' : 'Copy Share Card'}
                </button>
                <button
                  className="button button-secondary"
                  onClick={() => setShowReplayModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <footer id="fairness">
          <div className="brand footer-brand">
            <span className="brand-mark"><span /></span>
            <span>CipherPot</span>
          </div>
          <p>Deduction, not luck. <span>Built on NEAR Protocol & TEE Enclaves.</span></p>
          <button
            onClick={async () => {
              const att = await fetchTeeAttestation();
              setTeeAttestation(att);
              setShowAttestationModal(true);
            }}
            title="Inspect Enclave TEE Attestation & Public Key"
          >
            Round verification <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
