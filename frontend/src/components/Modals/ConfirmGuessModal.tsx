import React from 'react';
import { X, Target, AlertTriangle, Send } from 'lucide-react';
import type { Candidate } from '../../types';

interface ConfirmGuessModalProps {
  candidate: Candidate;
  submittingGuess: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmGuessModal: React.FC<ConfirmGuessModalProps> = ({
  candidate,
  submittingGuess,
  onConfirm,
  onClose,
}) => {
  return (
    <div className="cipher-modal-overlay" onClick={onClose}>
      <div className="cipher-modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <span className="info-gain-badge">
            <Target size={13} />
            <span>CONFIRM CANDIDATE GUESS</span>
          </span>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <h3 className="modal-title">
          Submit Candidate Guess
        </h3>
        <p className="modal-desc">
          You are submitting a secret deduction guess for candidate #{candidate.id}:
        </p>

        <div className="guess-target-card">
          <div className="target-id-badge">#{candidate.id}</div>
          <div className="target-details">
            <div className="target-name">{candidate.name}</div>
            <div className="target-meta">
              <span>{candidate.era}</span> · <span>{candidate.origin}</span> · <span>{candidate.category}</span> · <span>{candidate.type}</span>
            </div>
          </div>
        </div>

        <div className="modal-alert-warning">
          <AlertTriangle size={15} />
          <span>
            This consumes <strong>1 of your 3 guess quotas</strong>. If correct, the TEE Enclave will generate a verdict signature to claim 96% of the prize pot!
          </span>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
            disabled={submittingGuess}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={onConfirm}
            disabled={submittingGuess}
          >
            <Send size={14} />
            <span>{submittingGuess ? 'Verifying with TEE Enclave...' : 'Confirm Secret Guess'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
