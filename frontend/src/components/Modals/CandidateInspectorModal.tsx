import React from 'react';
import { X, Target, Bookmark, AlertTriangle, FileText, Globe, Calendar, Layers } from 'lucide-react';
import type { Candidate } from '../../types';

interface CandidateInspectorModalProps {
  candidate: Candidate;
  isGloballyRuledOut: boolean;
  isLocallyCrossed: boolean;
  isJoined: boolean;
  onToggleLocalCross: (candidateId: number) => void;
  onSelectCandidateForGuess: (candidate: Candidate) => void;
  onClose: () => void;
}

export const CandidateInspectorModal: React.FC<CandidateInspectorModalProps> = ({
  candidate,
  isGloballyRuledOut,
  isLocallyCrossed,
  isJoined,
  onToggleLocalCross,
  onSelectCandidateForGuess,
  onClose,
}) => {
  return (
    <div className="cipher-modal-overlay" onClick={onClose}>
      <div className="cipher-modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <span className="info-gain-badge">
            <FileText size={13} />
            <span>INTELLIGENCE DOSSIER #{candidate.id}</span>
          </span>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <h2 className="modal-title candidate-inspect-title">
          {candidate.name}
        </h2>

        {/* 4 Metadata Quadrants */}
        <div className="modal-grid-2">
          <div className="modal-grid-item">
            <div className="grid-item-label">
              <Calendar size={13} className="text-lime" />
              <span>Historical Era</span>
            </div>
            <strong>{candidate.era || 'Unknown'}</strong>
          </div>
          <div className="modal-grid-item">
            <div className="grid-item-label">
              <Globe size={13} className="text-lime" />
              <span>Geographic Origin</span>
            </div>
            <strong>{candidate.origin || 'Unknown'}</strong>
          </div>
          <div className="modal-grid-item">
            <div className="grid-item-label">
              <Layers size={13} className="text-lime" />
              <span>Cryptographic Category</span>
            </div>
            <strong>{candidate.category || 'Standard'}</strong>
          </div>
          <div className="modal-grid-item">
            <div className="grid-item-label">
              <FileText size={13} className="text-lime" />
              <span>Cryptographic Type</span>
            </div>
            <strong>{candidate.type || 'Cipher'}</strong>
          </div>
        </div>

        {isGloballyRuledOut && (
          <div className="modal-alert-danger">
            <AlertTriangle size={15} />
            <span>
              This candidate was eliminated on-chain by the TEE AI Referee in the public question feed.
            </span>
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              onToggleLocalCross(candidate.id);
              onClose();
            }}
          >
            <Bookmark size={14} />
            <span>{isLocallyCrossed ? 'Remove Private Note' : 'Mark as Private Note'}</span>
          </button>

          <button
            type="button"
            className="button button-primary"
            disabled={!isJoined || isGloballyRuledOut}
            onClick={() => {
              onClose();
              onSelectCandidateForGuess(candidate);
            }}
          >
            <Target size={14} />
            <span>{isJoined ? 'Make This Secret Guess' : 'Stake 0.1 NEAR to Guess'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
