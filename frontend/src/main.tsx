import { useEffect, useMemo, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from './components/TopBar';
import { ArenaView } from './components/ArenaView';
import { BoardView } from './components/BoardView';
import { LiveFeedView } from './components/LiveFeedView';
import { ArchivesView } from './components/ArchivesView';
import { EnclaveView } from './components/EnclaveView';
import { StandingsView } from './components/StandingsView';
import { ToastNotification } from './components/ToastNotification';
import { HowToPlayModal } from './components/Modals/HowToPlayModal';
import { CandidateInspectorModal } from './components/Modals/CandidateInspectorModal';
import { ConfirmGuessModal } from './components/Modals/ConfirmGuessModal';
import { ReplayModal } from './components/Modals/ReplayModal';
import type {
  TabType,
  SkillMode,
  RoundView,
  Candidate,
  QuestionView,
  PlayerInfoView,
  TeeAttestation,
  ShannonSuggestion,
  ToastMessage,
} from './types';
import {
  contractConfig,
  fetchCurrentRound,
  fetchRound,
  fetchBoard,
  fetchQuestionFeed,
  fetchPlayerInfo,
  fetchAccountBalance,
  fetchTeeAttestation,
  fetchShannonCluesApi,
  askQuestionApi,
  verifyGuessApi,
  formatNear,
  friendlyError,
} from './contractClient';
import {
  initWalletSelector,
  openWalletModal,
  signOutWallet,
  joinRound,
  submitQuestionOnChain,
  submitGuessOnChain,
  claimPotOnChain,
  parseWalletRedirectOutcome,
} from './wallet';
import './style.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
      refetchOnWindowFocus: true,
    },
  },
});

function CipherApp() {
  // Navigation Tab State (default 'arena')
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (['arena', 'board', 'feed', 'archives', 'enclave', 'standings'].includes(hash)) {
        return hash as TabType;
      }
    } catch {}
    return 'arena';
  });

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    try {
      window.location.hash = tab;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  }, []);

  // Listen for hash changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (['arena', 'board', 'feed', 'archives', 'enclave', 'standings'].includes(hash)) {
        setActiveTab(hash as TabType);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Connected Wallet Account & Balance
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<string | null>(null);

  // Live Data State
  const [round, setRound] = useState<RoundView | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [feed, setFeed] = useState<QuestionView[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfoView | null>(null);
  const [attestation, setAttestation] = useState<TeeAttestation | null>(null);
  const [shannonSuggestions, setShannonSuggestions] = useState<ShannonSuggestion[]>([]);

  // Local Notes & Modals
  const [locallyCrossed, setLocallyCrossed] = useState<number[]>([]);
  const [skillMode, setSkillMode] = useState<SkillMode>('pure');
  const [questionText, setQuestionText] = useState<string>('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [submittingGuess, setSubmittingGuess] = useState(false);
  const [joiningRound, setJoiningRound] = useState(false);

  // Modal Dialogs
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('cipher_seen_onboarding_v2');
    } catch {
      return false;
    }
  });
  const [inspectingCandidate, setInspectingCandidate] = useState<Candidate | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showReplayModal, setShowReplayModal] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);

    const duration = toast.duration || 6000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Close onboarding and save preference
  const handleCloseHowToPlay = useCallback(() => {
    try {
      localStorage.setItem('cipher_seen_onboarding_v2', 'true');
    } catch {}
    setShowHowToPlay(false);
  }, []);

  // Ruled-out IDs from the public feed
  const globallyRuledOut = useMemo(() => {
    const ids = new Set<number>();
    feed.forEach((item) => {
      (item.rule_out_candidate_ids || []).forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [feed]);

  // Remaining contenders (neither globally ruled out nor locally crossed)
  const remainingCandidates = useMemo(() => {
    return candidates.filter(
      (c) => !globallyRuledOut.includes(c.id) && !locallyCrossed.includes(c.id)
    );
  }, [candidates, globallyRuledOut, locallyCrossed]);

  // Load account balance whenever accountId changes
  useEffect(() => {
    if (!accountId) {
      setAccountBalance(null);
      return;
    }
    fetchAccountBalance(accountId)
      .then((bal) => setAccountBalance(bal))
      .catch(() => {});
  }, [accountId]);

  // Initialize Wallet Selector and check redirected outcome from MyNearWallet
  useEffect(() => {
    initWalletSelector((accId) => {
      setAccountId(accId);
    }).catch((err) => console.warn('Wallet init warning:', err));

    // Handle redirected transaction outcome (e.g. MyNearWallet return)
    const outcome = parseWalletRedirectOutcome();
    if (outcome) {
      if (outcome.transactionHashes) {
        addToast({
          type: 'success',
          title: 'Transaction Confirmed on Testnet',
          message: 'Your NEAR transaction was executed and recorded on-chain.',
          txHash: outcome.transactionHashes,
        });
      } else if (outcome.errorCode || outcome.errorMessage) {
        addToast({
          type: 'error',
          title: 'Transaction Error',
          message: outcome.errorMessage || outcome.errorCode || 'Transaction failed in wallet.',
        });
      }
    }
  }, [addToast]);

  // Load initial board & TEE attestation
  useEffect(() => {
    fetchBoard()
      .then((b) => {
        if (b?.length) setCandidates(b);
      })
      .catch((e) => console.warn('Board load fallback:', e));

    fetchTeeAttestation()
      .then((att) => setAttestation(att))
      .catch((e) => console.warn('Attestation load fallback:', e));
  }, []);

  // Fetch Live On-Chain Data with 10s Interval
  const refreshData = useCallback(async () => {
    try {
      const currentRound = await fetchCurrentRound();
      if (!currentRound) return;
      setRound(currentRound);

      // Fetch Question Feed
      const feedItems = await fetchQuestionFeed(currentRound.round_id);
      if (feedItems) setFeed(feedItems);

      // Fetch Player Info if connected
      if (accountId) {
        const pInfo = await fetchPlayerInfo(currentRound.round_id, accountId);
        setPlayerInfo(pInfo);
      } else {
        setPlayerInfo(null);
      }
    } catch (err) {
      console.warn('Data sync warning:', err);
    }
  }, [accountId]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10_000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Fetch Shannon clues in Assisted Mode
  useEffect(() => {
    if (skillMode !== 'assisted') {
      setShannonSuggestions([]);
      return;
    }
    const uneliminatedIds = remainingCandidates.map((c) => c.id);
    fetchShannonCluesApi(uneliminatedIds)
      .then((res) => {
        if (res?.length) setShannonSuggestions(res);
      })
      .catch(() => {});
  }, [skillMode, remainingCandidates]);

  // Action: Join Round (0.1 NEAR)
  const handleJoinRound = async () => {
    if (!accountId) {
      openWalletModal();
      return;
    }
    if (!round) return;

    setJoiningRound(true);
    try {
      addToast({
        type: 'info',
        title: 'Joining Round #3',
        message: 'Confirming 0.1 NEAR entry fee transaction in your wallet...',
      });

      const res = await joinRound(round.round_id, round.entry_fee || '100000000000000000000000');
      const txHash = res?.transaction?.hash || res?.transaction_outcome?.id;

      addToast({
        type: 'success',
        title: 'Welcome to the Arena!',
        message: 'Successfully joined Round #3. You have 3 guess quotas and access to deduction questions.',
        txHash,
      });

      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast({
        type: 'error',
        title: 'Join Failed',
        message: friendlyError(msg).message,
      });
    } finally {
      setJoiningRound(false);
    }
  };

  // Action: Ask Question
  const handleAskQuestion = async () => {
    if (!questionText.trim() || submittingQuestion || !round || !accountId) return;

    setSubmittingQuestion(true);
    try {
      addToast({
        type: 'info',
        title: 'Evaluating Question',
        message: 'Sanitizing against injection and querying TEE AI Enclave...',
      });

      // 1. Evaluate with TEE Enclave API
      const isAssisted = skillMode === 'assisted';
      const evalRes = await askQuestionApi(
        round.round_id,
        accountId,
        questionText.trim(),
        isAssisted,
        skillMode
      );

      // 2. Submit verified answer & rule-outs to NEAR contract
      addToast({
        type: 'info',
        title: `Referee Verdict: ${evalRes.answer.toUpperCase()}`,
        message: `Recording question and ruling out ${evalRes.rule_out_candidate_ids?.length || 0} candidates on-chain...`,
      });

      const tx = await submitQuestionOnChain(
        round.round_id,
        questionText.trim(),
        evalRes.answer,
        evalRes.rule_out_candidate_ids || []
      );
      const txHash = tx?.transaction?.hash || tx?.transaction_outcome?.id;

      // 3. Update local feed immediately
      const newEntry: QuestionView = {
        question_id: feed.length + 1,
        round_id: round.round_id,
        asker: accountId,
        question: questionText.trim(),
        answer: evalRes.answer,
        timestamp: String(Date.now() * 1_000_000),
        rule_out_candidate_ids: evalRes.rule_out_candidate_ids || [],
      };
      setFeed((prev) => [newEntry, ...prev]);
      setQuestionText('');

      addToast({
        type: 'success',
        title: `Question Recorded: "${evalRes.answer.toUpperCase()}"`,
        message: `Ruled out ${evalRes.rule_out_candidate_ids?.length || 0} candidates on NEAR Testnet!`,
        txHash,
      });

      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast({
        type: 'error',
        title: 'Question Failed',
        message: friendlyError(msg).message,
      });
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Action: Confirm Guess & Settlement Flow
  const handleConfirmGuess = async () => {
    if (!selectedCandidate || !round || !accountId || submittingGuess) return;

    setSubmittingGuess(true);
    try {
      // 1. Record guess attempt on-chain
      addToast({
        type: 'info',
        title: 'Submitting Guess',
        message: `Recording guess for "${selectedCandidate.name}" on NEAR Testnet...`,
      });

      await submitGuessOnChain(round.round_id, selectedCandidate.id, selectedCandidate.name);

      // 2. Query TEE Enclave verification
      const verifyRes = await verifyGuessApi(
        round.round_id,
        selectedCandidate.id,
        selectedCandidate.name,
        accountId
      );

      if (verifyRes.is_correct && verifyRes.salt) {
        addToast({
          type: 'success',
          title: 'VERIFIED! SECRET SOLVED!',
          message: 'The TEE Enclave verified your guess. Claiming 96% pot payout on NEAR Testnet...',
        });

        const claimTx = await claimPotOnChain(
          round.round_id,
          selectedCandidate.id,
          selectedCandidate.name,
          verifyRes.salt,
          verifyRes.signature_hex || undefined
        );
        const claimHash = claimTx?.transaction?.hash || claimTx?.transaction_outcome?.id;

        addToast({
          type: 'success',
          title: 'Prize Claimed Successfully!',
          message: `96% pot payout transferred directly to ${accountId}. You are the Champion!`,
          txHash: claimHash,
        });

        setSelectedCandidate(null);
        await refreshData();
      } else {
        addToast({
          type: 'error',
          title: 'Incorrect Guess',
          message: `"${selectedCandidate.name}" is not the secret. 1 guess quota consumed.`,
        });

        // Mark candidate crossed locally
        setLocallyCrossed((prev) => Array.from(new Set([...prev, selectedCandidate.id])));
        setSelectedCandidate(null);
        await refreshData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast({
        type: 'error',
        title: 'Guess Attempt Error',
        message: friendlyError(msg).message,
      });
    } finally {
      setSubmittingGuess(false);
    }
  };

  const handleToggleLocalCross = useCallback((candidateId: number) => {
    setLocallyCrossed((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]
    );
  }, []);

  const handleUseClue = useCallback((clueText: string) => {
    setQuestionText(clueText);
    handleTabChange('arena');
    setTimeout(() => {
      const el = document.querySelector('.question-textarea') as HTMLTextAreaElement;
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, [handleTabChange]);

  const potDisplay = useMemo(() => {
    if (round?.pot) return formatNear(round.pot);
    return '2.60';
  }, [round]);

  return (
    <div className="app-shell framo-app">
      {/* Toast System */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />

      {/* TopBar with Nostalgia-Computer / Framo navigation & wallet pill */}
      <TopBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        accountId={accountId}
        accountBalance={accountBalance}
        potDisplay={potDisplay}
        onConnectWallet={openWalletModal}
        onSignOut={async () => {
          await signOutWallet();
          setAccountId(null);
          setPlayerInfo(null);
          addToast({
            type: 'info',
            title: 'Disconnected',
            message: 'Your wallet has been disconnected.',
          });
        }}
        onOpenHowToPlay={() => setShowHowToPlay(true)}
      />

      {/* Main Sequential / Dedicated Views */}
      <main className="framo-main-stage">
        {/* 1. The Arena (Sequential Live Round Stage) */}
        {activeTab === 'arena' && (
          <ArenaView
            round={round}
            playerInfo={playerInfo}
            accountId={accountId}
            remainingCandidates={remainingCandidates}
            globallyRuledOut={globallyRuledOut}
            skillMode={skillMode}
            onSkillModeChange={setSkillMode}
            questionText={questionText}
            onQuestionTextChange={setQuestionText}
            submittingQuestion={submittingQuestion}
            onAskQuestion={handleAskQuestion}
            shannonSuggestions={shannonSuggestions}
            onUseClue={handleUseClue}
            joiningRound={joiningRound}
            onJoinRound={handleJoinRound}
            onSelectCandidateForGuess={(cand) => setSelectedCandidate(cand)}
            onTabChange={handleTabChange}
            onOpenAttestation={() => handleTabChange('enclave')}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
            latestQuestion={feed[0]}
          />
        )}

        {/* 2. The Board (Dedicated 64 Candidates Directory) */}
        {activeTab === 'board' && (
          <BoardView
            candidates={candidates}
            globallyRuledOut={globallyRuledOut}
            locallyCrossed={locallyCrossed}
            isJoined={Boolean(playerInfo?.is_joined)}
            onInspectCandidate={(cand) => setInspectingCandidate(cand)}
            onSelectCandidateForGuess={(cand) => setSelectedCandidate(cand)}
            onToggleLocalCross={handleToggleLocalCross}
          />
        )}

        {/* 3. Live Feed (Dedicated Shared Clue Stream) */}
        {activeTab === 'feed' && (
          <LiveFeedView
            feed={feed}
            roundId={round?.round_id || 3}
          />
        )}

        {/* 4. Archives (Round History & Audit Ledgers) */}
        {activeTab === 'archives' && (
          <ArchivesView
            currentRound={round}
            onOpenReplay={() => setShowReplayModal(true)}
            onSelectRoundToView={(roundId) => {
              if (roundId === 3) handleTabChange('arena');
              else {
                fetchRound(roundId).then((r) => {
                  if (r) {
                    setRound(r);
                    addToast({
                      type: 'info',
                      title: `Loaded Round #${roundId}`,
                      message: `Viewing historical on-chain state of Round #${roundId}.`,
                    });
                    handleTabChange('arena');
                  }
                });
              }
            }}
          />
        )}

        {/* 5. TEE Enclave (Trust & Hardware Proofs) */}
        {activeTab === 'enclave' && (
          <EnclaveView
            attestation={attestation}
            currentRound={round}
          />
        )}

        {/* 6. Standings (Competitive Leaderboard & Economy) */}
        {activeTab === 'standings' && (
          <StandingsView
            accountId={accountId}
            isJoined={Boolean(playerInfo?.is_joined)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="framo-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand-dot" />
            <span className="footer-brand-text">CIPHER</span>
            <span className="footer-brand-sub">NEAR TESTNET ARENA</span>
          </div>
          <p className="footer-tagline">
            Deduction, not luck. Powered by AMD SEV-SNP Confidential Enclaves & NEAR Protocol.
          </p>
          <div className="footer-links">
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => handleTabChange('enclave')}
            >
              Verify TEE Fairness Proofs
            </button>
            <span className="footer-sep">·</span>
            <a
              href={`https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              Contract Explorer
            </a>
            <span className="footer-sep">·</span>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => setShowHowToPlay(true)}
            >
              How to Play Guide
            </button>
          </div>
        </div>
      </footer>

      {/* Modal Dialogs */}
      {showHowToPlay && (
        <HowToPlayModal onClose={handleCloseHowToPlay} />
      )}

      {inspectingCandidate && (
        <CandidateInspectorModal
          candidate={inspectingCandidate}
          isGloballyRuledOut={globallyRuledOut.includes(inspectingCandidate.id)}
          isLocallyCrossed={locallyCrossed.includes(inspectingCandidate.id)}
          isJoined={Boolean(playerInfo?.is_joined)}
          onToggleLocalCross={handleToggleLocalCross}
          onSelectCandidateForGuess={(cand) => {
            setInspectingCandidate(null);
            setSelectedCandidate(cand);
          }}
          onClose={() => setInspectingCandidate(null)}
        />
      )}

      {selectedCandidate && (
        <ConfirmGuessModal
          candidate={selectedCandidate}
          submittingGuess={submittingGuess}
          onConfirm={handleConfirmGuess}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {showReplayModal && (
        <ReplayModal onClose={() => setShowReplayModal(false)} />
      )}
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CipherApp />
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
