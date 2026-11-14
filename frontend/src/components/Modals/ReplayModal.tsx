import React, { useState } from 'react';
import { X, Sparkles, Trophy, Copy, Check, ExternalLink } from 'lucide-react';
import { contractConfig } from '../../contractClient';

interface ReplayModalProps {
  onClose: () => void;
}

export const ReplayModal: React.FC<ReplayModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyShare = () => {
    const text =
      `[CIPHER DEDUCTION VICTORY]\n` +
      `Solved Cipher Round #1 in 3 categorical questions with 100% Pure Skill!\n` +
      `Secret: Caesar Cipher (#01) | Winner Payout: 1.056 NEAR\n` +
      `Verified by AMD SEV-SNP Enclave on @NEARProtocol.\n` +
      `Play the live arena: https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="cipher-modal-overlay" onClick={onClose}>
      <div className="cipher-modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <span className="info-gain-badge">
            <Sparkles size={13} />
            <span>ROUND #1 MATHEMATICAL SOLVE WALKTHROUGH</span>
          </span>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <h2 className="modal-title">
          How Round #1 Was Solved in 3 Steps
        </h2>
        <p className="modal-desc">
          Verifiable step-by-step elimination tree: 64 candidates narrowed to 1 exact secret in 3 yes/no questions.
        </p>

        <div className="replay-steps-container">
          {/* Step 1 */}
          <div className="replay-step-card">
            <div className="replay-step-top">
              <span className="step-tag">STEP 1: ERA FILTER</span>
              <span className="step-result yes">YES (64 → 16 TILES)</span>
            </div>
            <div className="step-query">"Is it from the Ancient era?"</div>
            <div className="step-impact">
              Eliminated 48 candidates (All Modern, Medieval, and Digital items ruled out instantly).
            </div>
          </div>

          {/* Step 2 */}
          <div className="replay-step-card">
            <div className="replay-step-top">
              <span className="step-tag">STEP 2: TYPE FILTER</span>
              <span className="step-result yes">YES (16 → 4 TILES)</span>
            </div>
            <div className="step-query">"Is it a Substitution cipher?"</div>
            <div className="step-impact">
              Eliminated 12 candidates (Stelae, Transpositions, Artifacts ruled out).
            </div>
          </div>

          {/* Step 3 */}
          <div className="replay-step-card">
            <div className="replay-step-top">
              <span className="step-tag">STEP 3: ORIGIN FILTER</span>
              <span className="step-result yes">YES (4 → 1 TILE)</span>
            </div>
            <div className="step-query">"Did it originate in Rome?"</div>
            <div className="step-impact">
              Eliminated Scytale (Sparta), Phaistos (Crete), and Atbash (Hebrew). Exactly 1 contender remains!
            </div>
          </div>

          {/* Final Solve Card */}
          <div className="replay-final-card">
            <div className="final-top">
              <Trophy size={16} className="text-lime" />
              <span>FINAL CANDIDATE GUESS: SOLVED & CLAIMED</span>
            </div>
            <div className="final-name">#01 — Caesar Cipher</div>
            <div className="final-meta">
              Winner claimed <strong>1.056 NEAR (96% of pot)</strong> with verified Ed25519 TEE verdict!
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={handleCopyShare}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Share Card'}</span>
          </button>
          <a
            href="https://testnet.nearblocks.io/txns/34x7kkZFGXNsdmj61hMeDZ4vmtUn42uQtBQAMTsnU684"
            target="_blank"
            rel="noreferrer"
            className="button button-secondary"
          >
            <span>View Claim Tx</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
};
