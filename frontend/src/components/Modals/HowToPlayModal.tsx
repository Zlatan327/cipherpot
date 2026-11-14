import React, { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  const [sandboxTested, setSandboxTested] = useState(false);

  const demoCandidates = [
    { id: 1, name: 'Caesar Cipher', era: 'Ancient', category: 'Classical' },
    { id: 2, name: 'Scytale', era: 'Ancient', category: 'Transposition' },
    { id: 3, name: 'Enigma Machine', era: 'Modern', category: 'Rotor Machine' },
    { id: 4, name: 'RSA Algorithm', era: 'Digital', category: 'Asymmetric' },
    { id: 5, name: 'SHA-256', era: 'Digital', category: 'Cryptographic Hash' },
    { id: 6, name: 'Diffie-Hellman', era: 'Digital', category: 'Key Exchange' },
  ];

  return (
    <div className="cipher-modal-overlay" onClick={onClose}>
      <div className="cipher-modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <span className="info-gain-badge">
            <HelpCircle size={13} />
            <span>HOW DEDUCTION WORKS IN CIPHER</span>
          </span>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <h2 className="modal-title">
          Deduction, Not Blind Guessing
        </h2>
        <p className="modal-desc">
          Cipher is mathematically identical to <em>20 Questions</em>. The secret is always one of the 64 visible tiles.
          Ask broad questions that eliminate large portions of the board at once.
        </p>

        {/* 3 Step Concept Cards */}
        <div className="onboarding-steps-list">
          <div className="onboarding-step-box">
            <div className="step-box-num">1</div>
            <div className="step-box-text">
              <strong>Closed Universe of 64 Secrets:</strong> Every candidate belongs to a defined Era, Origin, Category, and Type.
            </div>
          </div>
          <div className="onboarding-step-box">
            <div className="step-box-num">2</div>
            <div className="step-box-text">
              <strong>Anti-Injection TEE AI Referee:</strong> Evaluates your question in an AMD SEV-SNP enclave and answers Strictly YES, NO, or UNCLEAR.
            </div>
          </div>
          <div className="onboarding-step-box">
            <div className="step-box-num">3</div>
            <div className="step-box-text">
              <strong>Anti-Brute-Force Economics:</strong> 0.1 NEAR entry fee gives 3 guesses. A random guess has only 4.6% odds—logic wins over bots!
            </div>
          </div>
        </div>

        {/* Interactive 6-Card Mini-Elimination Sandbox Demo */}
        <div className="interactive-sandbox-card">
          <div className="sandbox-header">
            <span className="sandbox-tag">TRY THE INTERACTIVE DEMO</span>
            <span className="sandbox-hint">See how a single question eliminates tiles:</span>
          </div>

          <div className="sandbox-tiles-row">
            {demoCandidates.map((cand) => {
              const isEliminated = sandboxTested && cand.era === 'Ancient';
              return (
                <div
                  key={cand.id}
                  className={`mini-demo-tile ${isEliminated ? 'eliminated' : ''}`}
                >
                  <span className="mini-demo-id">#{cand.id}</span>
                  <div className="mini-demo-name">{cand.name}</div>
                  <span className="mini-demo-era">{cand.era}</span>
                </div>
              );
            })}
          </div>

          <div className="sandbox-controls">
            <button
              type="button"
              className="mini-sandbox-btn"
              onClick={() => setSandboxTested(!sandboxTested)}
            >
              {sandboxTested ? '↺ Reset Demo' : '▶ Test Question: "Is it Modern or Digital?"'}
            </button>
            <div className="mini-sandbox-result">
              {sandboxTested
                ? 'AI Referee: "YES!" → Caesar & Scytale ruled out instantly. 4 contenders remain.'
                : 'Click above to see how a single yes/no question eliminates candidate tiles in real time!'}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="button button-primary button-large"
            style={{ width: '100%' }}
            onClick={onClose}
          >
            Got It — Let’s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
