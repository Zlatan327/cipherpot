import React from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Target,
  ArrowRight,
  Clock,
  Coins,
  Send,
  ExternalLink,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import type {
  RoundView,
  Candidate,
  PlayerInfoView,
  SkillMode,
  ShannonSuggestion,
  TabType,
  QuestionView,
} from '../types';
import { contractConfig, formatNear, formatCountdown } from '../contractClient';

interface ArenaViewProps {
  round: RoundView | null;
  playerInfo: PlayerInfoView | null;
  accountId: string | null;
  remainingCandidates: Candidate[];
  globallyRuledOut: number[];
  skillMode: SkillMode;
  onSkillModeChange: (mode: SkillMode) => void;
  questionText: string;
  onQuestionTextChange: (text: string) => void;
  submittingQuestion: boolean;
  onAskQuestion: () => void;
  shannonSuggestions: ShannonSuggestion[];
  onUseClue: (clueText: string) => void;
  joiningRound: boolean;
  onJoinRound: () => void;
  onSelectCandidateForGuess: (candidate: Candidate) => void;
  onTabChange: (tab: TabType) => void;
  onOpenAttestation: () => void;
  onOpenHowToPlay: () => void;
  latestQuestion?: QuestionView;
}

export const ArenaView: React.FC<ArenaViewProps> = ({
  round,
  playerInfo,
  accountId,
  remainingCandidates,
  globallyRuledOut,
  skillMode,
  onSkillModeChange,
  questionText,
  onQuestionTextChange,
  submittingQuestion,
  onAskQuestion,
  shannonSuggestions,
  onUseClue,
  joiningRound,
  onJoinRound,
  onSelectCandidateForGuess,
  onTabChange,
  onOpenAttestation,
  onOpenHowToPlay,
  latestQuestion,
}) => {
  const isJoined = Boolean(playerInfo?.is_joined);
  const isSettled = round?.status === 'Settled';

  const potNear = round?.pot ? formatNear(round.pot) : '2.60';
  const timerText = round?.time_remaining ? formatCountdown(round.time_remaining) : '00:00:00';
  const isTimerExpired = timerText === '00:00:00';

  const questionsAsked = round?.questions_asked ?? 1;
  const maxQuestions = round?.max_questions ?? 20;
  const questionsLeft = round?.questions_remaining ?? (maxQuestions - questionsAsked);

  const guessesLeft = playerInfo ? playerInfo.guesses_remaining : 3;

  // Determine current active step in the sequential flow
  let currentStep = 1;
  if (isSettled) {
    currentStep = 4;
  } else if (isJoined) {
    currentStep = 3;
  } else if (accountId) {
    currentStep = 2;
  } else {
    currentStep = 1;
  }

  return (
    <div className="arena-view-wrapper">
      {/* Cinematic Telemetry Ticker */}
      <div className="framo-telemetry-strip">
        <div className="strip-container">
          <div className="strip-pill">
            <span className="strip-dot" />
            <span>SEASON 1 ACTIVE</span>
          </div>
          <div className="strip-item">
            <Sparkles size={13} className="text-lime" />
            <span>Round #1 Settled: <strong>Caesar Cipher</strong> solved by <code>cipherpot861267.testnet</code> (1.056 NEAR)</span>
          </div>
          <div className="strip-divider" />
          <div className="strip-item">
            <Zap size={13} className="text-warning" />
            <span>Round #2 Rolled Over: <strong>2.50 NEAR</strong> rolled into active jackpot!</span>
          </div>
          <div className="strip-divider" />
          <div className="strip-item">
            <ShieldCheck size={13} className="text-success" />
            <span>Hardware Enclave: <strong>AMD SEV-SNP Active</strong></span>
          </div>
        </div>
      </div>

      {/* Hero Mission Stage */}
      <section className="arena-hero-section">
        <div className="hero-content">
          <div className="hero-kicker">
            <span className="kicker-badge">NEAR TESTNET · ROUND #{round?.round_id || 3}</span>
            <button type="button" className="tee-verified-chip" onClick={onOpenAttestation}>
              <ShieldCheck size={12} />
              <span>TEE Enclave Verified</span>
            </button>
            <button type="button" className="tee-verified-chip" onClick={onOpenHowToPlay}>
              <span>How to Play</span>
            </button>
          </div>

          <h1 className="hero-title">
            The Daily Deduction Arena
          </h1>
          <p className="hero-subtitle">
            One confidential cryptographic secret. Sixty-four possibilities. Twenty shared deduction questions.
            Evaluated inside an AMD SEV-SNP Confidential VM on NEAR AI Cloud.
          </p>

          {/* Key Stat Cards Grid */}
          <div className="hero-stats-grid">
            {/* Jackpot Stat */}
            <div className="stat-card jackpot-card">
              <div className="stat-label">
                <Coins size={14} className="text-lime" />
                <span>CURRENT PRIZE POT</span>
              </div>
              <div className="stat-value text-lime">
                {potNear} <span className="stat-unit">NEAR</span>
              </div>
              <div className="stat-meta">
                {round?.total_players || 1} participant staked · 96% winner payout
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="stat-card timer-card">
              <div className="stat-label">
                <Clock size={14} />
                <span>ROUND COUNTDOWN</span>
              </div>
              <div className="stat-value font-mono">
                {isTimerExpired ? 'EXPIRED' : timerText}
              </div>
              <div className="stat-meta">
                {isTimerExpired
                  ? 'Rollover window open (Round active until solved)'
                  : '24-hour round window on NEAR Testnet'}
              </div>
            </div>

            {/* Questions Meter */}
            <div className="stat-card questions-card">
              <div className="stat-label">
                <Target size={14} />
                <span>QUESTIONS REMAINING</span>
              </div>
              <div className="stat-value">
                {questionsLeft} <span className="stat-unit">/ {maxQuestions}</span>
              </div>
              <div className="stat-meta">
                {questionsAsked} questions evaluated on-chain
              </div>
            </div>

            {/* Contenders Remaining */}
            <div className="stat-card contenders-card">
              <div className="stat-label">
                <Sparkles size={14} />
                <span>ACTIVE CONTENDERS</span>
              </div>
              <div className="stat-value">
                {remainingCandidates.length} <span className="stat-unit">/ 64</span>
              </div>
              <div className="stat-meta">
                {globallyRuledOut.length} candidates eliminated by TEE referee
              </div>
            </div>
          </div>

          {/* Commitment Hash Verification Bar */}
          <div className="hero-commitment-bar">
            <span className="hash-label">ACTIVE SHA-256 COMMITMENT:</span>
            <code className="hash-code">
              {round?.commitment || 'df83542772583eaf45a554c2f91db19368f52b6a39b896f41d70baa78936c18f'}
            </code>
            <a
              href={`https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
              className="hash-link"
              title="Inspect smart contract on Nearblocks"
            >
              Verify on-chain <ExternalLink size={12} />
            </a>
          </div>

          {/* Latest Verified Clue on Table (Instant Spectator Impact) */}
          {latestQuestion && (
            <div className="hero-latest-clue-card">
              <div className="clue-card-header">
                <div className="clue-live-indicator">
                  <span className="live-dot" />
                  <span className="live-text">LATEST VERIFIED CLUE ON TABLE</span>
                </div>
                <div className="clue-asker-meta">
                  <span>Asker: <strong className="font-mono">{latestQuestion.asker}</strong></span>
                </div>
                <span className={`clue-verdict-tag verdict-${latestQuestion.answer.toLowerCase()}`}>
                  VERDICT: {latestQuestion.answer.toUpperCase()}
                </span>
              </div>

              <div className="clue-question-quote">
                "{latestQuestion.question}"
              </div>

              <div className="clue-card-footer">
                <div className="clue-impact-summary">
                  <Zap size={14} className="text-lime" />
                  <span>
                    Eliminated <strong>{latestQuestion.rule_out_candidate_ids?.length || 61} candidates</strong> on NEAR Testnet
                  </span>
                </div>
                <button
                  type="button"
                  className="clue-feed-jump-btn"
                  onClick={() => onTabChange('feed')}
                >
                  <span>Open Live Clue Stream</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sequential 4-Step Journey Stepper */}
      <section className="sequential-journey-section">
        <div className="section-header-compact">
          <span className="section-tag">DEDUCTION WORKFLOW</span>
          <h2 className="section-title-compact">Sequential Progression</h2>
        </div>

        <div className="journey-stepper-grid">
          {/* Step 1: Spectate */}
          <div className={`step-card ${currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-header">
              <span className="step-number">01</span>
              {currentStep > 1 ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : (
                <span className="step-badge active">SPECTATING</span>
              )}
            </div>
            <h3 className="step-title">Spectate & Observe</h3>
            <p className="step-desc">
              Zero wallet required. Watch live questions, observe TEE referee answers, and explore candidate attributes.
            </p>
          </div>

          {/* Step 2: Stake & Join */}
          <div className={`step-card ${currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-header">
              <span className="step-number">02</span>
              {currentStep > 2 ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : currentStep === 2 ? (
                <span className="step-badge active">READY TO STAKE</span>
              ) : (
                <Lock size={15} className="text-dim" />
              )}
            </div>
            <h3 className="step-title">Stake 0.1 NEAR</h3>
            <p className="step-desc">
              Fixed entry fee unlocks 3 guess quotas and question submission privileges. 100% feeds the jackpot.
            </p>
          </div>

          {/* Step 3: Deduce */}
          <div className={`step-card ${currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : ''}`}>
            <div className="step-header">
              <span className="step-number">03</span>
              {currentStep > 3 ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : currentStep === 3 ? (
                <span className="step-badge active">IN PLAY</span>
              ) : (
                <Lock size={15} className="text-dim" />
              )}
            </div>
            <h3 className="step-title">Ask & Eliminate</h3>
            <p className="step-desc">
              Submit binary queries to the confidential TEE referee. High-information questions slice the board in half.
            </p>
          </div>

          {/* Step 4: Solve & Claim */}
          <div className={`step-card ${currentStep === 4 ? 'current' : ''}`}>
            <div className="step-header">
              <span className="step-number">04</span>
              {isSettled ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : (
                <span className="step-badge">FINAL TARGET</span>
              )}
            </div>
            <h3 className="step-title">Deduce & Claim</h3>
            <p className="step-desc">
              Submit your secret guess. Correct guesses receive an Ed25519 TEE verdict signature and claim 96% pot!
            </p>
          </div>
        </div>
      </section>

      {/* Main Interactive Stage Card */}
      <section className="stage-workstation-section">
        {/* If not joined, show Clean Staking / Onboarding Gateway */}
        {!isJoined ? (
          <div className="framo-card entry-gateway-card">
            <div className="gateway-inner">
              <div className="gateway-badge">
                <Coins size={14} /> STEP 2: ARENA ENTRY STAKING
              </div>
              <h2 className="gateway-title">
                Enter Round #{round?.round_id || 3} as an Active Sleuth
              </h2>
              <p className="gateway-desc">
                Staking 0.1 NEAR unlocks your participant privileges, grants you 3 secret guess attempts,
                and adds 100% of your deposit directly into the accumulated jackpot.
              </p>

              <div className="gateway-perks-grid">
                <div className="perk-box">
                  <div className="perk-title">🎯 3 Guess Quotas</div>
                  <div className="perk-desc">Strict anti-brute-force quota ensures skill and logic reign over automated scripts.</div>
                </div>
                <div className="perk-box">
                  <div className="perk-title">🏆 96% Pot Payout</div>
                  <div className="perk-desc">First player or AI agent to submit the verified guess claims 96% of accumulated fees.</div>
                </div>
                <div className="perk-box">
                  <div className="perk-title">⭐ Pure Skill Rebate</div>
                  <div className="perk-desc">Solve with zero AI hints to earn a 50% rake rebate (98% pot share) and 2x points!</div>
                </div>
              </div>

              <div className="gateway-actions">
                <button
                  type="button"
                  className="button button-primary button-large"
                  onClick={onJoinRound}
                  disabled={joiningRound}
                >
                  <Coins size={16} />
                  <span>
                    {joiningRound
                      ? 'Confirming on NEAR Testnet...'
                      : accountId
                      ? 'Stake 0.1 NEAR to Join Round'
                      : 'Connect Wallet to Stake 0.1 NEAR'}
                  </span>
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => onTabChange('board')}
                >
                  <span>Explore the 64 Candidates First</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* If Joined, show The Full Deduction Station */
          <div className="framo-card deduction-station-card">
            <div className="station-header-row">
              <div className="station-title-group">
                <div className="station-tag">
                  <Target size={14} /> THE DEDUCTION STATION
                </div>
                <h2 className="station-title">Ask the TEE AI Referee</h2>
              </div>

              {/* Quota Indicators */}
              <div className="station-quotas">
                <div className="quota-pill">
                  <span className="quota-label">GUESSES LEFT:</span>
                  <strong className="quota-val text-lime">{guessesLeft} / 3</strong>
                </div>
                <div className="quota-pill">
                  <span className="quota-label">QUESTIONS LEFT:</span>
                  <strong className="quota-val">{questionsLeft} / {maxQuestions}</strong>
                </div>
              </div>
            </div>

            {/* Skill Mode Selector */}
            <div className="skill-mode-container">
              <div className="mode-toggle-group">
                <button
                  type="button"
                  className={`mode-toggle-btn ${skillMode === 'pure' ? 'active' : ''}`}
                  onClick={() => onSkillModeChange('pure')}
                >
                  <Sparkles size={14} />
                  <span>🏆 Pure Skill (98% Pot · 50% Rake Rebate)</span>
                </button>
                <button
                  type="button"
                  className={`mode-toggle-btn ${skillMode === 'assisted' ? 'active' : ''}`}
                  onClick={() => onSkillModeChange('assisted')}
                >
                  <Zap size={14} />
                  <span>💡 Assisted (96% Pot · Shannon Clues)</span>
                </button>
              </div>
              <div className="mode-explanation">
                {skillMode === 'pure' ? (
                  <span>
                    Pure Skill Mode: Solves without AI hints receive an automatic <strong>50% protocol rake rebate (98% pot share)</strong>,
                    the TEE Pure Deduction Certificate, and 2x Season points.
                  </span>
                ) : (
                  <span>
                    Assisted Mode: Uses Shannon binary entropy recommendations to help you find the optimal 50/50 bisection questions.
                  </span>
                )}
              </div>
            </div>

            {/* Shannon Clue Recommendation Box (Assisted Mode) */}
            {skillMode === 'assisted' && shannonSuggestions.length > 0 && (
              <div className="shannon-recommendation-card">
                <div className="shannon-header">
                  <div className="shannon-badge">
                    <Zap size={12} /> SHANNON INFORMATION GAIN (OPTIMAL BISECTION)
                  </div>
                  <span className="shannon-entropy-bits">
                    Entropy: {shannonSuggestions[0].entropy_bits.toFixed(3)} bits
                  </span>
                </div>
                <div className="shannon-body">
                  <div className="shannon-question-text">
                    "{shannonSuggestions[0].question}"
                  </div>
                  <div className="shannon-meta-text">
                    Splits remaining {shannonSuggestions[0].total_active} contenders into {shannonSuggestions[0].split_count} YES vs {shannonSuggestions[0].total_active - shannonSuggestions[0].split_count} NO.
                  </div>
                </div>
                <button
                  type="button"
                  className="shannon-apply-btn"
                  onClick={() => onUseClue(shannonSuggestions[0].question)}
                >
                  <span>Use This Recommended Question</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}

            {/* Quick Prompt Chips */}
            <div className="quick-chips-wrapper">
              <span className="chips-label">Quick Deduction Filters:</span>
              <div className="chips-list">
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => onUseClue('Is it from the Ancient era?')}
                >
                  Ancient Era?
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => onUseClue('Is it a mechanical rotor machine?')}
                >
                  Rotor Machine?
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => onUseClue('Is it a digital algorithm or protocol?')}
                >
                  Digital Protocol?
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => onUseClue('Did it originate in Europe or Rome?')}
                >
                  European Origin?
                </button>
              </div>
            </div>

            {/* Question Submission Input */}
            <div className="question-input-wrapper">
              <textarea
                className="framo-input question-textarea"
                rows={3}
                placeholder="Ask a sharp Yes/No deduction question (e.g. 'Is it a classical substitution cipher?')"
                value={questionText}
                onChange={(e) => onQuestionTextChange(e.target.value)}
                disabled={submittingQuestion}
                maxLength={200}
              />
              <div className="question-submit-bar">
                <div className="anti-injection-badge">
                  <ShieldCheck size={13} />
                  <span>Anti-Prompt Injection & TEE Referee Active</span>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={onAskQuestion}
                  disabled={!questionText.trim() || submittingQuestion}
                >
                  <Send size={14} />
                  <span>{submittingQuestion ? 'Evaluating with TEE...' : 'Ask TEE Referee'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Orderly Contenders Carousel / Preview */}
      <section className="contenders-preview-section">
        <div className="section-header-compact">
          <div className="header-left-col">
            <span className="section-tag">UNELIMINATED CANDIDATES</span>
            <h2 className="section-title-compact">
              Active Contenders ({remainingCandidates.length} Remaining)
            </h2>
          </div>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => onTabChange('board')}
          >
            <span>Open Full 64-Candidate Board</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Top 6 Active Contenders Preview Grid */}
        <div className="contenders-preview-grid">
          {remainingCandidates.slice(0, 6).map((cand) => (
            <div key={cand.id} className="contender-mini-card">
              <div className="mini-card-top">
                <span className="cand-id">#{cand.id}</span>
                <span className="cand-era-badge">{cand.era}</span>
              </div>
              <h4 className="cand-name">{cand.name}</h4>
              <div className="cand-origin-type">
                <span>{cand.origin}</span> · <span>{cand.category}</span>
              </div>
              <button
                type="button"
                className="cand-guess-btn"
                onClick={() => onSelectCandidateForGuess(cand)}
                disabled={!isJoined}
                title={!isJoined ? 'Stake 0.1 NEAR to unlock guesses' : `Guess #${cand.id}`}
              >
                <Target size={13} />
                <span>{isJoined ? 'Make Guess' : 'Join to Guess'}</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
