import React from 'react';
import {
  Trophy,
  RotateCcw,
  ExternalLink,
  ArrowRight,
  Eye,
} from 'lucide-react';
import type { RoundView } from '../types';
import { formatNear } from '../contractClient';

interface ArchivesViewProps {
  currentRound: RoundView | null;
  onOpenReplay: () => void;
  onSelectRoundToView: (roundId: number) => void;
}

export const ArchivesView: React.FC<ArchivesViewProps> = ({
  currentRound,
  onOpenReplay,
  onSelectRoundToView,
}) => {
  return (
    <div className="archives-view-container">
      {/* Header */}
      <div className="archives-header-section">
        <div className="archives-header-content">
          <span className="section-tag">HISTORICAL PROOFS & LEDGER</span>
          <h1 className="archives-title">Round History & Audit Archive</h1>
          <p className="archives-subtitle">
            Every round lifecycle is permanently verifiable on NEAR Testnet.
            When rounds settle or roll over, the confidential secret and salt are published on-chain for full cryptographic audit.
          </p>
        </div>
      </div>

      {/* Rounds Grid */}
      <div className="archives-grid">
        {/* Round 3: Active Now */}
        <div className="archive-round-card active-round">
          <div className="archive-card-top">
            <div className="round-id-pill">ROUND #3</div>
            <div className="round-status-badge active">
              <span className="pulse-dot" />
              <span>ACTIVE NOW</span>
            </div>
          </div>

          <h3 className="archive-round-title">Jackpot Arena · Round #3</h3>
          <p className="archive-round-desc">
            Active deduction round currently running on NEAR Testnet. Staked jackpot funded by Round 2 rollover and entry deposits.
          </p>

          <div className="archive-specs-list">
            <div className="spec-item">
              <span className="spec-name">Prize Pot:</span>
              <strong className="spec-val text-lime">
                {currentRound?.pot ? formatNear(currentRound.pot) : '2.60'} NEAR
              </strong>
            </div>
            <div className="spec-item">
              <span className="spec-name">Questions Left:</span>
              <span className="spec-val">
                {currentRound?.questions_remaining ?? 19} / 20
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-name">Commitment:</span>
              <code className="spec-hash">
                {currentRound?.commitment ? `${currentRound.commitment.slice(0, 16)}…` : 'df835427…'}
              </code>
            </div>
          </div>

          <div className="archive-card-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => onSelectRoundToView(3)}
            >
              <span>Play or Spectate Round #3</span>
              <ArrowRight size={13} />
            </button>
            <a
              href="https://testnet.nearblocks.io/txns/7dGwWmgJUGpGdJsBoQAjesymnEdWU1F3Sm5Dd6pz6CjR"
              target="_blank"
              rel="noreferrer"
              className="archive-link"
            >
              Creation Tx <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Round 2: Rolled Over */}
        <div className="archive-round-card rollover-round">
          <div className="archive-card-top">
            <div className="round-id-pill">ROUND #2</div>
            <div className="round-status-badge rollover">
              <RotateCcw size={13} />
              <span>ROLLED OVER</span>
            </div>
          </div>

          <h3 className="archive-round-title">24h Timeout Rollover · Round #2</h3>
          <p className="archive-round-desc">
            The 24-hour countdown expired without a winning guess. 100% of the 2.50 NEAR pot was rolled over to fund Round 3!
          </p>

          <div className="archive-specs-list">
            <div className="spec-item">
              <span className="spec-name">Rollover Amount:</span>
              <strong className="spec-val text-warning">2.50 NEAR (100% to R#3)</strong>
            </div>
            <div className="spec-item">
              <span className="spec-name">Revealed Secret:</span>
              <strong className="spec-val text-primary">#02 — Enigma Machine</strong>
            </div>
            <div className="spec-item">
              <span className="spec-name">Revealed Salt:</span>
              <code className="spec-hash">cipherpot_salt_round_2_active_4821</code>
            </div>
            <div className="spec-item">
              <span className="spec-name">Verified Hash:</span>
              <code className="spec-hash">98b2ad75a9da255f5c6319df1e2d9f61c41ba876fc7dd376cd48c4697778b5a9</code>
            </div>
          </div>

          <div className="archive-card-actions">
            <a
              href="https://testnet.nearblocks.io/txns/FyJfoDTRZik2c6LWEnEsdUsakpNP2UH1FxmenycU1CMv"
              target="_blank"
              rel="noreferrer"
              className="button button-secondary"
            >
              <span>Inspect Rollover Tx on Explorer</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Round 1: Settled & Claimed */}
        <div className="archive-round-card settled-round">
          <div className="archive-card-top">
            <div className="round-id-pill">ROUND #1</div>
            <div className="round-status-badge settled">
              <Trophy size={13} />
              <span>SETTLED & WON</span>
            </div>
          </div>

          <h3 className="archive-round-title">Championship Victory · Round #1</h3>
          <p className="archive-round-desc">
            Solved in 3 categorical questions. Winner claimed 96% pot payout with an Ed25519 TEE verdict signature.
          </p>

          <div className="archive-specs-list">
            <div className="spec-item">
              <span className="spec-name">Winner:</span>
              <strong className="spec-val text-lime">cipherpot861267.testnet</strong>
            </div>
            <div className="spec-item">
              <span className="spec-name">Secret Identified:</span>
              <strong className="spec-val text-primary">#01 — Caesar Cipher</strong>
            </div>
            <div className="spec-item">
              <span className="spec-name">Winner Payout:</span>
              <strong className="spec-val text-lime">1.056 NEAR (96% of pot)</strong>
            </div>
            <div className="spec-item">
              <span className="spec-name">Protocol Fee (4%):</span>
              <span className="spec-val">0.044 NEAR</span>
            </div>
            <div className="spec-item">
              <span className="spec-name">Revealed Salt:</span>
              <code className="spec-hash">cipherpot_salt_round_1_seed_9831</code>
            </div>
          </div>

          <div className="archive-card-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onOpenReplay}
            >
              <Eye size={13} />
              <span>View 3-Step Solve Tree</span>
            </button>
            <a
              href="https://testnet.nearblocks.io/txns/34x7kkZFGXNsdmj61hMeDZ4vmtUn42uQtBQAMTsnU684"
              target="_blank"
              rel="noreferrer"
              className="archive-link"
            >
              Claim Tx <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
