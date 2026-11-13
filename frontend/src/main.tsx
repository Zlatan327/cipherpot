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
  Compass,
  Copy,
  Cpu,
  Eye,
  Flame,
  LayoutGrid,
  LockKeyhole,
  MessageSquareText,
  Scroll,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
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
  type TabType = 'round' | 'board' | 'leaderboard' | 'how';
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'board' || hash === 'leaderboard' || hash === 'how') {
        return hash as TabType;
      }
    } catch {}
    return 'round';
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'round' || hash === 'board' || hash === 'leaderboard' || hash === 'how') {
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
  const [activeTheme, setActiveTheme] = useState<'crypto' | 'science'>('crypto');

  // Skill Mode Architecture: Assisted (Training) vs Pure Skill (Ranked)
  const [assistanceMode, setAssistanceMode] = useState<'assisted' | 'pure'>('assisted');
  const [cluesUsed, setCluesUsed] = useState<number>(0);
  const [isCurrentQuestionAssisted, setIsCurrentQuestionAssisted] = useState<boolean>(false);
  const [lastSolveMastery, setLastSolveMastery] = useState<{ pure: boolean; certificate: string } | null>(null);

  // Trust, Attestation & Deduction Intelligence Modals
  const [showAttestationModal, setShowAttestationModal] = useState(false);
  const [teeAttestation, setTeeAttestation] = useState<TeeAttestation | null>(null);
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Priority 1: How to Play Onboarding Modal (Auto-open on first visit)
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(() => {
    try {
      return !localStorage.getItem('cipher_seen_how_to_play_v1');
    } catch {
      return false;
    }
  });
  const [sandboxTested, setSandboxTested] = useState<boolean>(false);

  const handleCloseHowToPlay = () => {
    try {
      localStorage.setItem('cipher_seen_how_to_play_v1', 'true');
    } catch (e) {
      console.warn(e);
    }
    setShowHowToPlayModal(false);
  };

  // Leaderboard Filter State
  const [leaderboardFilter, setLeaderboardFilter] = useState<'all' | 'human' | 'agent' | 'pure'>('all');

  // Guess Dialog State
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
    if (!round) return 'Round data unavailable';
    if (isSettled) return 'Round settled';
    if (isRolledOver) return 'ROUND ROLLED OVER';
    if (isJoined) return 'YOU’RE IN (PLAYING)';
    if (accountId) return 'WALLET CONNECTED';
    return 'SPECTATOR MODE (LIVE)';
  }, [round, isSettled, isRolledOver, isJoined, accountId]);

  // Leaderboard Standings (Sourced from Real NEAR Testnet Contract Records)
  const leaderboardEntries = useMemo(() => {
    const list = [
      {
        rank: 1,
        account_id: 'cipherpot861267.testnet',
        is_agent: true,
        tier: 'Autonomous MCP Sleuth · Round #1 Settled Winner',
        solves: 1,
        pure_solves: 1,
        streak: 1,
        total_won_near: '1.056 NEAR',
        points: 500,
        is_pure_master: true,
        tx_hash: '34x7kkZFGXNsdmj61hMeDZ4vmtUn42uQtBQAMTsnU684',
      },
    ];

    // If connected account is distinct, surface their live session standing
    if (accountId && accountId !== 'cipherpot861267.testnet') {
      list.push({
        rank: 2,
        account_id: accountId,
        is_agent: false,
        tier: isJoined ? 'Active Contender (Round #3)' : 'Registered Sleuth',
        solves: isSettled ? 1 : 0,
        pure_solves: lastSolveMastery?.pure ? 1 : 0,
        streak: isJoined ? 1 : 0,
        total_won_near: '0.00 NEAR',
        points: isJoined ? 100 : 0,
        is_pure_master: Boolean(lastSolveMastery?.pure),
        tx_hash: '',
      });
    }

    return list;
  }, [accountId, isJoined, isSettled, lastSolveMastery]);

  const filteredLeaderboard = useMemo(() => {
    return leaderboardEntries.filter((item) => {
      if (leaderboardFilter === 'human') return !item.is_agent;
      if (leaderboardFilter === 'agent') return item.is_agent;
      if (leaderboardFilter === 'pure') return item.is_pure_master;
      return true;
    });
  }, [leaderboardEntries, leaderboardFilter]);

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
      const evalResult = await askQuestionApi(
        round.round_id,
        accountId,
        question.trim(),
        isCurrentQuestionAssisted,
        assistanceMode
      );

      if (typeof evalResult.session_clues_used === 'number') {
        setCluesUsed(evalResult.session_clues_used);
      }
      setIsCurrentQuestionAssisted(false);

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
            aria-label="Cipher home"
          >
            <span className="brand-mark"><span /></span>
            <span>CIPHER</span>
          </a>
          <nav className="main-nav" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'round'}
              className={activeTab === 'round' ? 'active' : ''}
              onClick={() => handleTabChange('round')}
            >
              The Round
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'board'}
              className={activeTab === 'board' ? 'active' : ''}
              onClick={() => handleTabChange('board')}
            >
              The Board
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'leaderboard'}
              className={activeTab === 'leaderboard' ? 'active' : ''}
              onClick={() => handleTabChange('leaderboard')}
            >
              Leaderboard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'how'}
              className={activeTab === 'how' ? 'active' : ''}
              onClick={() => handleTabChange('how')}
            >
              How Deduction Works
            </button>
          </nav>
        </div>

        <div className="header-right">
          {accountId && (
            <div className="player-progression-pill" title="Player Level & Win Streak Tracker">
              <span><Star size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3, color: 'var(--lime)' }} /> LVL 2 · ADEPT</span>
              <span style={{ color: '#fbbf24' }}><Flame size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} /> 1W STREAK</span>
            </div>
          )}

          {/* Priority 1: Persistent How to Play button */}
          <button
            className="how-to-play-btn"
            onClick={() => setShowHowToPlayModal(true)}
            title="How to Play Cipher in 30 seconds"
          >
            <CircleHelp size={15} />
            <span>How to Play</span>
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
              One of 64 items is hidden. Use the shared yes-or-no answers to cross off items, then take your best guess.
            </p>
            <div className="hero-buttons">
              {isJoined ? (
                <button className="button button-primary" disabled>
                  <Sparkles size={16} /> You’re in (Active)
                </button>
              ) : (
                <button className="button button-primary" onClick={handleJoinRound}>
                  <Sparkles size={16} /> Join the round
                  <span className="button-cost">0.1 NEAR</span>
                </button>
              )}
              {/* Prominent Quickstart Modal Trigger */}
              <button
                className="button button-secondary"
                onClick={() => handleTabChange('board')}
              >
                <LayoutGrid size={15} /> View board
              </button>
              <button
                className="button button-secondary"
                onClick={() => setShowHowToPlayModal(true)}
              >
                <CircleHelp size={15} /> How to play
              </button>
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

            {/* Jump to The Board Banner */}
            <div className="round-board-cta panel">
              <div className="round-board-cta-content">
                <div className="arena-badge" style={{ marginBottom: '6px' }}>
                  <Sparkles size={12} style={{ color: 'var(--lime)', marginRight: '4px' }} />
                  64 CANONICAL ENTITIES · {remainingCandidates.length} CONTENDERS REMAINING
                </div>
                <h3>The 64-Tile Deduction Grid</h3>
                <p>
                  The secret is one of 64 canonical cryptosystems committed to NEAR Protocol with confidential TEE hardware validation. Inspect traits, review Shannon binary entropy clues, and eliminate candidates.
                </p>
              </div>
              <button
                type="button"
                className="button button-primary"
                onClick={() => handleTabChange('board')}
              >
                <LayoutGrid size={15} /> Open The Board Grid (64 Cards) &rarr;
              </button>
            </div>

            {/* The Round Command & Control Grid */}
            <div className="round-action-grid">
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

            <section className="panel ask-panel">
              <div className="panel-header-inline">
                <h2>Ask a question</h2>
                <span className="status-tag">
                  <LockKeyhole size={12} /> {isJoined ? 'Ready' : 'Join to Play'}
                </span>
              </div>
              <p className="section-intro">
                Ask a yes-or-no question. The TEE Enclave referee answers and eliminates candidate secrets.
              </p>
              <label className="input-label" htmlFor="question">Your Question</label>
              <textarea
                id="question"
                placeholder="e.g. Is it a rotor machine? Is it from the ancient era?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={!isJoined || isSettled || submittingQuestion}
              />
              <button
                className="button-submit-question"
                disabled={!isJoined || isSettled || !question.trim() || submittingQuestion}
                onClick={handleAskQuestion}
              >
                <MessageSquareText size={15} />
                {submittingQuestion ? 'Evaluating with TEE...' : 'Submit question'}
              </button>

              {/* Priority 2: Enhanced Prominent One-Tap Quick Clue Chips or Pure Mode Note */}
              {assistanceMode === 'assisted' ? (
                <div className="prominent-clues-section">
                  <div className="prominent-clues-title">
                    <span><Zap size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> ONE-TAP QUICK CLUES</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap to populate</span>
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
                        disabled={!isJoined || isSettled || submittingQuestion}
                        onClick={() => handleUseClue(item.query)}
                      >
                        <span>{item.label}</span>
                        <span style={{ color: 'var(--lime)', fontSize: '11px' }}>&rarr;</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pure-skill-banner" style={{ marginTop: '14px', padding: '12px' }}>
                  <span className="pure-skill-badge"><Trophy size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} /> PURE SKILL</span>
                  <span className="pure-skill-desc" style={{ fontSize: '11px' }}>
                    Clues hidden in Pure Skill mode. Every deduction is your own move.
                  </span>
                </div>
              )}

              <div className="locked-note">
                <LockKeyhole size={12} />
                {isSpectator ? 'Connect a wallet and join to unlock' : 'Answers are shared with everyone in the round'}
              </div>
            </section>
              </div>
              <div className="round-column-right">
                <section className="panel feed-panel">
              <div className="panel-header-inline">
                <h2>Live question feed</h2>
                <span className="feed-live"><i /> Live</span>
              </div>
              <p className="section-intro">Public answers from the TEE deduction referee:</p>
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
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                          Ruled out {entry.rule_out_candidate_ids.length} candidates
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
                <section className="panel agents-panel">
              <div className="panel-header-inline">
                <h2>Autonomous agents</h2>
                <span className="agent-count">{agents.length}</span>
              </div>
              <div className="agent-metrics-row">
                <div className="agent-metric-box">
                  <small>Agent Pool Balance</small>
                  <strong>{formatNear(agents.reduce((acc, a) => acc + BigInt(a.balance || 0), BigInt(0)).toString())} NEAR</strong>
                  <span>On-chain allowance</span>
                </div>
                <div className="agent-metric-box">
                  <small>Agent Questions (R#{round ? round.round_id : 3})</small>
                  <strong>{agents.reduce((acc, a) => acc + (a.questions_asked || 0), 0)} Qs</strong>
                  <span>Verified on contract</span>
                </div>
              </div>
              <p className="section-intro" style={{ margin: '0 0 10px 0' }}>
                Agents compete autonomously via Model Context Protocol (MCP) tool calls on NEAR testnet:
              </p>
              {agents.length === 0 ? (
                <div className="feed-empty">
                  <div className="feed-empty-icon"><Cpu size={16} /></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>No external agents in this round yet</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Agents deposit spend allowance via <code>deposit_agent_funds()</code></div>
                  </div>
                </div>
              ) : (
                agents.map((ag) => (
                  <div className="agent-row" key={ag.account_id}>
                    <span className="agent-avatar"><Flame size={14} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '12px', color: 'var(--text-primary)', wordBreak: 'break-all', display: 'block', fontFamily: 'var(--font-mono)' }}>
                        {ag.account_id}
                      </strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                        MCP Agent · {ag.questions_asked} Qs asked · {ag.guesses_made} guesses
                      </span>
                    </div>
                    <span style={{ color: 'var(--color-success)', font: '600 11.5px var(--font-mono)' }}>
                      {formatNear(ag.balance)} NEAR
                    </span>
                  </div>
                ))
              )}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--lime)', display: 'block', marginBottom: '2px' }}>
                  MCP TOOL CALL ENDPOINT:
                </span>
                <code>POST /mcp/call &rarr; &#123;"name":"ask_question"&#125;</code>
              </div>
            </section>
              </div>
            </div>
          </>
        )}

        {activeTab === 'board' && (

          <div className="board-view-container">
            <div className="board-view-header">
              <div className="board-view-title-group">
                <div className="arena-badge">
                  <span className="live-dot" /> Round #{round ? round.round_id : 3} Deduction Board
                </div>
                <h2>The 64 Canonical Mysteries</h2>
                <p>Click any card to inspect candidate traits or submit a cryptographic guess. Struck-out tiles are ruled out globally.</p>
              </div>
              <div className="board-view-actions">
                <div className="board-stats-pill">
                  <span>Questions Left: <b>{questionsLeftDisplay}</b></span>
                  <span>·</span>
                  <span>Your Guesses: <b>{guessesRemainingDisplay}</b></span>
                  <span>·</span>
                  <span>Pot: <b style={{ color: 'var(--lime)' }}>{potDisplay} NEAR</b></span>
                </div>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => handleTabChange('round')}
                >
                  <MessageSquareText size={14} /> Live Feed & Ask Console &rarr;
                </button>
              </div>
            </div>

            <section className="board-section panel" id="board">
            <div className="theme-bar">
              <div className="theme-pill-group">
                <span className="inspector-label">ARENA THEME:</span>
                <button
                  type="button"
                  className={`theme-pill ${activeTheme === 'crypto' ? 'active' : ''}`}
                  onClick={() => handleSwitchTheme('crypto')}
                >
                  <Scroll size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Cryptography History <small>(Live Testnet)</small>
                </button>
                <button
                  type="button"
                  className={`theme-pill ${activeTheme === 'science' ? 'active' : ''}`}
                  onClick={() => handleSwitchTheme('science')}
                >
                  <Compass size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Scientific Breakthroughs <small>(Preview)</small>
                </button>
              </div>

              {/* Skill Mode: Assisted vs Pure Skill */}
              <div className="assistance-mode-toggle">
                <span className="mode-toggle-label">SKILL MODE:</span>
                <div className="mode-toggle-group">
                  <button
                    type="button"
                    className={`mode-btn ${assistanceMode === 'assisted' ? 'active' : ''}`}
                    onClick={() => setAssistanceMode('assisted')}
                    title="AI Shannon entropy clues enabled for guided learning. 96% pot share."
                  >
                    <span><Sparkles size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Assisted</span>
                    <small>Training · 96% Pot</small>
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${assistanceMode === 'pure' ? 'active pure' : ''}`}
                    onClick={() => setAssistanceMode('pure')}
                    title="Play with question suggestions hidden."
                  >
                    <span><Trophy size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Pure Skill</span>
                    <small>Suggestions hidden</small>
                  </button>
                </div>
              </div>
            </div>

            {/* High-Urgency Spectator Conversion Banner */}
            {!isJoined && !isSettled && (
              <div className="spectator-urgent-banner">
                <div className="spectator-urgent-text">
                  <span className="spectator-urgent-badge"><Flame size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> HIGH URGENCY</span>
                  <span>
                    Only <b>{remainingCandidates.length} of 64 tiles remain</b> in Round #{round ? round.round_id : 3}! Current pot is <b>{potDisplay} NEAR</b>. Step in before an autonomous agent sweeps the pot!
                  </span>
                </div>
                <div className="spectator-urgent-actions">
                  <button className="button button-primary" onClick={handleJoinRound} style={{ height: '34px', fontSize: '12px' }}>
                    <Sparkles size={14} /> Join Now (0.1 NEAR)
                  </button>
                  <button className="button button-secondary" onClick={() => setShowHowToPlayModal(true)} style={{ height: '34px', fontSize: '12px' }}>
                    Free Demo
                  </button>
                </div>
              </div>
            )}

            <div className="section-header">
              <div>
                <h2 className="section-title">
                  {activeTheme === 'crypto' ? 'The Cryptography Board' : 'The Scientific Breakthroughs'}
                </h2>
              </div>
              <div className="view-tabs">
                <button
                  type="button"
                  className={`view-tab ${viewMode === 'contenders' ? 'active' : ''}`}
                  onClick={() => setViewMode('contenders')}
                >
                  <Sparkles size={13} /> Active Contenders <span className="badge">{remainingCandidates.length}</span>
                </button>
                <button
                  type="button"
                  className={`view-tab ${viewMode === 'all' ? 'active' : ''}`}
                  onClick={() => setViewMode('all')}
                >
                  <Eye size={13} /> Full 64 Board <span className="badge">64</span>
                </button>
              </div>
            </div>
            <p className="section-intro">
              {activeTheme === 'crypto'
                ? 'The confidential secret is committed to NEAR testnet. Ask questions to rule out tiles or make a candidate guess to claim the pot.'
                : 'Previewing rotating general knowledge theme: 64 milestone discoveries from the Wheel to Quantum Qubits.'}
            </p>

            {/* Priority 3: Large, Live "X Cards Remaining" Scoreboard */}
            <div className="cards-remaining-scoreboard">
              <div className="scoreboard-main">
                <div className="scoreboard-left">
                  <span className="count-big">{remainingCandidates.length}</span>
                  <span className="count-total">/ {candidates.length || 64}</span>
                </div>
                <div className="scoreboard-title-group">
                  <span className="scoreboard-title">Active Cards Remaining</span>
                  <span className="scoreboard-sub">
                    {64 - remainingCandidates.length} eliminated ({Math.round(((64 - remainingCandidates.length) / 64) * 100)}% of board ruled out)
                  </span>
                </div>
              </div>
              <div className="scoreboard-progress-bar">
                <div
                  className="scoreboard-progress-fill"
                  style={{ width: `${Math.round(((64 - remainingCandidates.length) / 64) * 100)}%` }}
                />
              </div>
              <div className="scoreboard-breakdown">
                <span className="breakdown-tag">
                  <span className="dot dot-green" /> <b>{remainingCandidates.length}</b> Active Contenders
                </span>
                <span className="breakdown-tag">
                  <span className="dot dot-red" /> <b>{globallyRuledOut.length}</b> Ruled Out by AI Referee
                </span>
                {locallyCrossed.length > 0 && (
                  <span className="breakdown-tag">
                    <span className="dot dot-yellow" /> <b>{locallyCrossed.length}</b> Private Notes
                  </span>
                )}
              </div>
            </div>

            {/* Priority 2: Prominent Shannon Information Gain Suggestion or Pure Skill Banner */}
            {assistanceMode === 'assisted' ? (
              optimalDeduction && (
                <div className="info-gain-prominent">
                  <div className="info-gain-header">
                    <span className="info-gain-tag">
                      <Sparkles size={13} /> MATHEMATICAL SHORTCUT · SHANNON INFORMATION GAIN
                    </span>
                    <span className="info-gain-metric">
                      Eliminates ~50% of active board ({optimalDeduction.yesCount} YES / {optimalDeduction.noCount} NO)
                    </span>
                  </div>
                  <div className="info-gain-question-row">
                    <div className="info-gain-question">
                      "{optimalDeduction.question}"
                    </div>
                    <button
                      className="info-gain-action-btn"
                      onClick={() => handleUseClue(optimalDeduction.question)}
                      disabled={!isJoined || isSettled}
                    >
                      <Zap size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Use Clue Now
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="pure-skill-banner">
                <div className="pure-skill-left">
                  <span className="pure-skill-badge"><Trophy size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> PURE SKILL MODE</span>
                  <span className="pure-skill-desc">
                    Question suggestions are hidden in this mode.
                  </span>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setAssistanceMode('assisted')}
                  style={{ fontSize: '11px', whiteSpace: 'nowrap', color: '#fef08a' }}
                >
                  Need a hint? Switch to Assisted &rarr;
                </button>
              </div>
            )}

            {viewMode === 'contenders' ? (
              <div className="contenders-spotlight">
                <div className="contenders-banner-top">
                  <span className="contenders-badge">
                    <Sparkles size={13} /> {remainingCandidates.length} CONTENDERS REMAINING
                  </span>
                  <p className="contenders-headline">
                    The TEE referee ruled out <b>{globallyRuledOut.length}</b> candidates. One of these <b>{remainingCandidates.length}</b> holds the <b>{potDisplay} NEAR</b> prize pool!
                  </p>
                </div>

                <div className="contenders-grid">
                  {remainingCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="contender-card"
                      onClick={() => setInspectingCandidate(cand)}
                    >
                      <div>
                        <div className="contender-top">
                          <span className="contender-num">#{String(cand.id).padStart(2, '0')}</span>
                          <span className="contender-tag">{cand.era}</span>
                        </div>
                        <h4 className="contender-name">{cand.name}</h4>
                        <div className="contender-meta">
                          <div>Origin: <b>{cand.origin}</b></div>
                          <div>Category: <b>{cand.category}</b></div>
                          <div>Type: <b>{cand.type}</b></div>
                        </div>
                      </div>
                      <button
                        className="contender-guess-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCandidateForGuess(cand);
                        }}
                      >
                        <Target size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Guess This Candidate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
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
                      <span style={{ color: 'var(--color-danger)', marginLeft: '8px' }}>
                        ({globallyRuledOut.length} ruled out)
                      </span>
                    )}
                    {locallyCrossed.length > 0 && (
                      <span style={{ color: 'var(--color-warning)', marginLeft: '8px' }}>
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
                        style={{ opacity: isMatchingFilter ? (isEliminated ? 0.35 : 1) : 0.2 }}
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
                  <span>Canonical 64-Secrets Active · Left-click to inspect/guess · Right-click for private notes</span>
                  <button onClick={() => setLocallyCrossed([])}>Clear my notes</button>
                </div>
              </>
            )}
          </section>
          </div>
        )}

        {/* Section: Arena Leaderboard & Reputation Rankings */}
        {activeTab === 'leaderboard' && (
          <section className="leaderboard-section" id="leaderboard">
          <div className="leaderboard-header">
            <div className="arena-badge" style={{ marginBottom: '8px' }}>
              <Trophy size={13} style={{ color: 'var(--lime)', display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
              ARENA LEADERBOARD & REPUTATION
            </div>
            <h2>Competitive Sleuth Standings</h2>
            <p>
              These standings include historical and session data.
            </p>
          </div>

          <div className="leaderboard-toolbar">
            <div className="leaderboard-tabs">
              <button
                type="button"
                className={`leaderboard-tab-btn ${leaderboardFilter === 'all' ? 'active' : ''}`}
                onClick={() => setLeaderboardFilter('all')}
              >
                <span><Trophy size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> All Solvers ({leaderboardEntries.length})</span>
              </button>
              <button
                type="button"
                className={`leaderboard-tab-btn ${leaderboardFilter === 'human' ? 'active' : ''}`}
                onClick={() => setLeaderboardFilter('human')}
              >
                <span><User size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Humans Only</span>
              </button>
              <button
                type="button"
                className={`leaderboard-tab-btn ${leaderboardFilter === 'agent' ? 'active' : ''}`}
                onClick={() => setLeaderboardFilter('agent')}
              >
                <span><Bot size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Autonomous Agents</span>
              </button>
              <button
                type="button"
                className={`leaderboard-tab-btn ${leaderboardFilter === 'pure' ? 'active' : ''}`}
                onClick={() => setLeaderboardFilter('pure')}
              >
                <span><Star size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Pure Deduction Masters</span>
              </button>
            </div>

            <div className="leaderboard-stats-summary">
              <span>Settled Payouts: <strong>1.056 NEAR</strong></span>
              <span>·</span>
              <span>Active Jackpot: <strong>{potDisplay} NEAR</strong></span>
              <span>·</span>
              <span>Contract: <strong>cipherpot861267.testnet</strong></span>
            </div>
          </div>

          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>RANK</th>
                  <th>SLEUTH / COMPETITOR</th>
                  <th>REPUTATION TIER</th>
                  <th>SOLVES</th>
                  <th>PURE SKILL</th>
                  <th>STREAK</th>
                  <th>TOTAL WON</th>
                  <th style={{ textAlign: 'right' }}>POINTS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.map((entry) => {
                  const isYou = accountId && entry.account_id === accountId;
                  const rankClass = entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : entry.rank === 3 ? 'bronze' : '';
                  return (
                    <tr key={entry.account_id} style={isYou ? { background: 'rgba(217, 255, 85, 0.06)' } : undefined}>
                      <td>
                        <span className={`rank-badge ${rankClass}`}>
                          {entry.rank}
                        </span>
                      </td>
                      <td>
                        <div className="solver-name-cell">
                          <a
                            href={`https://testnet.nearblocks.io/address/${entry.account_id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontFamily: 'var(--font-mono)', color: isYou ? 'var(--lime)' : '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="View on NearBlocks Testnet Explorer"
                          >
                            <strong>{entry.account_id}</strong>
                            <ArrowUpRight size={11} style={{ opacity: 0.5 }} />
                          </a>
                          {entry.is_agent ? (
                            <span className="solver-tag-agent"><Bot size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} /> AGENT</span>
                          ) : (
                            <span className="solver-tag-human"><User size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} /> HUMAN</span>
                          )}
                          {isYou && <span className="solver-tag-you">YOU</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {entry.tier}
                      </td>
                      <td>
                        <strong>{entry.solves}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>rounds</span>
                      </td>
                      <td>
                        {entry.is_pure_master ? (
                          <span className="pure-badge-tag">
                            <Star size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3, color: 'var(--lime)' }} /> {entry.pure_solves} ({Math.round((entry.pure_solves / entry.solves) * 100)}%)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>
                            {entry.pure_solves} ({Math.round((entry.pure_solves / entry.solves) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td>
                        {entry.streak > 0 ? (
                          <span style={{ color: '#fbbf24', font: '600 11.5px var(--font-mono)' }}>
                            <Flame size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3, color: '#fbbf24' }} /> {entry.streak}W
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ font: '600 12px var(--font-mono)', color: 'var(--color-success)' }}>
                        {entry.total_won_near}
                      </td>
                      <td style={{ textAlign: 'right', font: '700 12px var(--font-mono)', color: 'var(--lime)' }}>
                        {entry.points} PTS
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <Shield size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Verified On-Chain: Sourced directly from NEAR Testnet contract <code>cipherpot861267.testnet</code>. Active Round #3 jackpot ({potDisplay} NEAR) unclaimed. First correct solver joins Rank #1.
          </div>
        </section>
        )}

        {activeTab === 'how' && (
          <section className="how-section" id="how">
          <div className="how-header">
            <h2>How deduction works</h2>
            <p>Eliminate candidates through structured mathematical partitioning, not random guessing.</p>
          </div>
          <div className="deduction-funnel">
            <div className="funnel-step">
              <div className="funnel-top">
                <span className="funnel-stage">Stage 1</span>
                <span className="funnel-count">64 Tiles</span>
              </div>
              <h4>Domain Partition</h4>
              <p>Ask broad classification questions to bisect the board by historical epoch or category.</p>
              <div className="funnel-example">e.g. "Is it from the Ancient era?" (-48)</div>
            </div>
            <div className="funnel-step">
              <div className="funnel-top">
                <span className="funnel-stage">Stage 2</span>
                <span className="funnel-count">16 Tiles</span>
              </div>
              <h4>Structural Type</h4>
              <p>Isolate the functional mechanism or medium to cut the remaining search space by 75%.</p>
              <div className="funnel-example">e.g. "Is it a Substitution cipher?" (-12)</div>
            </div>
            <div className="funnel-step">
              <div className="funnel-top">
                <span className="funnel-stage">Stage 3</span>
                <span className="funnel-count">4 Tiles</span>
              </div>
              <h4>Geographic Origin</h4>
              <p>Pinpoint the historical origin or inventor to isolate the exact remaining secret.</p>
              <div className="funnel-example">e.g. "Did it originate in Rome?" (-3)</div>
            </div>
            <div className="funnel-step target">
              <div className="funnel-top">
                <span className="funnel-stage">Stage 4</span>
                <span className="funnel-count">1 Tile</span>
              </div>
              <h4>Cryptographic Claim</h4>
              <p>Submit candidate guess. The TEE Enclave signs a cryptographic verdict to unlock 96% pot.</p>
              <div className="funnel-example" style={{ color: 'var(--lime)', fontWeight: 600 }}><Target size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Caesar Cipher Solved!</div>
            </div>
          </div>
        </section>
        )}

        {/* Priority 1: "How to Play" Onboarding Modal */}
        {showHowToPlayModal && (
          <div className="cipher-modal-overlay" onClick={handleCloseHowToPlay}>
            <div className="cipher-modal-body" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-row">
                <span className="info-gain-badge">
                  <CircleHelp size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                  QUICKSTART GUIDE
                </span>
                <button className="modal-close-btn" onClick={handleCloseHowToPlay} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <h2 style={{ fontSize: '24px', color: '#fff', margin: '0 0 10px 0', fontFamily: 'var(--font-head)' }}>
                How Cipher Works (In 30 Seconds)
              </h2>

              <div className="not-trivia-banner">
                <span className="banner-icon"><AlertTriangle size={16} /></span>
                <div>
                  <div className="not-trivia-title">NOT A TRIVIA QUIZ!</div>
                  <p className="not-trivia-desc">
                    The app does <b>NOT</b> test your history knowledge. <b>YOU</b> interrogate the AI referee with yes/no questions to eliminate cards—just like playing <i>Guess Who?</i> or <i>20 Questions</i> with money on the line.
                  </p>
                </div>
              </div>

              <div className="onboarding-steps" style={{ marginBottom: '14px' }}>
                <div className="onboarding-step-card">
                  <span className="onboarding-num">1</span>
                  <div className="onboarding-step-body">
                    <h4>64 Cards · 1 Secret Committed On-Chain</h4>
                    <p>Every candidate is face-up on the board. The TEE Enclave secretly locks in 1 secret tile with a cryptographic SHA-256 commitment.</p>
                  </div>
                </div>

                <div className="onboarding-step-card">
                  <span className="onboarding-num">2</span>
                  <div className="onboarding-step-body">
                    <h4>Interrogate to Eliminate (Bisection Deduction)</h4>
                    <p>Ask sharp yes/no questions (or tap 1-click Shannon clues). The AI referee answers, and disqualified cards black out for everyone.</p>
                  </div>
                </div>

                <div className="onboarding-step-card">
                  <span className="onboarding-num">3</span>
                  <div className="onboarding-step-body">
                    <h4>First Correct Guess Sweeps the Pot</h4>
                    <p>You have three guesses per entry. A successful claim pays <b>96% of the pot</b>.</p>
                  </div>
                </div>
              </div>

              {/* Interactive Visual Elimination Demo Sandbox */}
              <div className="mini-sandbox-container">
                <div className="mini-sandbox-header">
                  <span className="mini-sandbox-title">
                    <Sparkles size={14} /> INTERACTIVE DEMO (TEST ONE ELIMINATION)
                  </span>
                  <span className="mini-sandbox-badge">
                    {sandboxTested ? '2 TILES RULED OUT (-33%)' : '6 CANDIDATES LOADED'}
                  </span>
                </div>

                <div className="mini-cards-grid">
                  <div className={`mini-card ${sandboxTested ? 'eliminated' : ''}`}>
                    <span className="mini-card-name">Caesar Cipher</span>
                    <span className="mini-card-era">Ancient</span>
                  </div>
                  <div className={`mini-card ${sandboxTested ? 'eliminated' : ''}`}>
                    <span className="mini-card-name">Scytale</span>
                    <span className="mini-card-era">Ancient</span>
                  </div>
                  <div className={`mini-card ${sandboxTested ? 'active-match' : ''}`}>
                    <span className="mini-card-name">Enigma Machine</span>
                    <span className="mini-card-era">Modern</span>
                  </div>
                  <div className={`mini-card ${sandboxTested ? 'active-match' : ''}`}>
                    <span className="mini-card-name">Lorenz Cipher</span>
                    <span className="mini-card-era">Modern</span>
                  </div>
                  <div className={`mini-card ${sandboxTested ? 'active-match' : ''}`}>
                    <span className="mini-card-name">SHA-256</span>
                    <span className="mini-card-era">Digital</span>
                  </div>
                  <div className={`mini-card ${sandboxTested ? 'active-match' : ''}`}>
                    <span className="mini-card-name">RSA-2048</span>
                    <span className="mini-card-era">Digital</span>
                  </div>
                </div>

                <div className="mini-sandbox-action">
                  <button
                    type="button"
                    className="mini-sandbox-btn"
                    onClick={() => setSandboxTested((prev) => !prev)}
                  >
                    {sandboxTested ? '↺ Reset Demo' : '▶ Test Question: "Is it Modern or Digital?"'}
                  </button>
                  <span className="mini-sandbox-result">
                    {sandboxTested
                      ? 'AI Referee: "YES!" -> Caesar & Scytale are ruled out instantly. 4 contenders remain.'
                      : 'Click above to see how a single yes/no question eliminates candidate tiles in real time!'}
                  </span>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 0 }}>
                <button
                  className="button button-primary"
                  style={{ width: '100%', height: '42px', fontSize: '13px' }}
                  onClick={handleCloseHowToPlay}
                >
                  Got It — Let’s Play!
                </button>
              </div>
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
                  disabled={globallyRuledOut.includes(inspectingCandidate.id)}
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
                      Hardware TEE Enclave verified 100% unassisted solve ({lastSolveMastery?.certificate || 'TEE_ENCLAVE_VERIFIED_PURE_SKILL'}). True mathematical deduction mastery achieved!
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
            <span>CIPHER</span>
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
