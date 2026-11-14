import React, { useState, useMemo } from 'react';
import {
  Search,
  XCircle,
  Eye,
  Target,
  Bookmark,
  AlertTriangle,
} from 'lucide-react';
import type { Candidate } from '../types';

interface BoardViewProps {
  candidates: Candidate[];
  globallyRuledOut: number[];
  locallyCrossed: number[];
  isJoined: boolean;
  onInspectCandidate: (candidate: Candidate) => void;
  onSelectCandidateForGuess: (candidate: Candidate) => void;
  onToggleLocalCross: (candidateId: number) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  candidates,
  globallyRuledOut,
  locallyCrossed,
  isJoined,
  onInspectCandidate,
  onSelectCandidateForGuess,
  onToggleLocalCross,
}) => {
  const [eraFilter, setEraFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewFilter, setViewFilter] = useState<'all' | 'contenders'>('contenders');

  const filteredCandidates = useMemo(() => {
    return candidates.filter((cand) => {
      // Era filter
      if (eraFilter !== 'All' && cand.era?.toLowerCase() !== eraFilter.toLowerCase()) {
        return false;
      }

      const isEliminated = globallyRuledOut.includes(cand.id);
      const isLocallyMarked = locallyCrossed.includes(cand.id);

      // View mode filter
      if (viewFilter === 'contenders' && (isEliminated || isLocallyMarked)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = cand.name?.toLowerCase().includes(query);
        const matchesCategory = cand.category?.toLowerCase().includes(query);
        const matchesOrigin = cand.origin?.toLowerCase().includes(query);
        const matchesType = cand.type?.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesOrigin && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [candidates, eraFilter, globallyRuledOut, locallyCrossed, viewFilter, searchQuery]);

  const remainingCount = candidates.filter(
    (c) => !globallyRuledOut.includes(c.id) && !locallyCrossed.includes(c.id)
  ).length;

  return (
    <div className="board-view-container">
      {/* Board Header & Mission Statement */}
      <div className="board-header-section">
        <div className="board-header-content">
          <span className="section-tag">CANONICAL CANDIDATES DIRECTORY</span>
          <h1 className="board-title">The 64 Cryptographic Secrets</h1>
          <p className="board-subtitle">
            The round secret is guaranteed to be one of the 64 canonical tiles below.
            Use questions to rule out entire eras, origins, and cryptographic types.
          </p>
        </div>

        {/* Board Telemetry Counter */}
        <div className="board-telemetry-badge">
          <div className="telemetry-item">
            <span className="telemetry-label">REMAINING CONTENDERS</span>
            <strong className="telemetry-val text-lime">{remainingCount} / 64</strong>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">RULED OUT ON-CHAIN</span>
            <strong className="telemetry-val text-danger">{globallyRuledOut.length}</strong>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">PRIVATE NOTES</span>
            <strong className="telemetry-val text-warning">{locallyCrossed.length}</strong>
          </div>
        </div>
      </div>

      {/* Clean Filtering Bar */}
      <div className="board-filter-bar">
        {/* Era Filter Pills */}
        <div className="era-filter-group">
          {['All', 'Ancient', 'Medieval', 'Modern', 'Digital'].map((era) => (
            <button
              key={era}
              type="button"
              className={`era-btn ${eraFilter === era ? 'active' : ''}`}
              onClick={() => setEraFilter(era)}
            >
              <span>{era}</span>
              {era === 'All' ? (
                <span className="era-count">64</span>
              ) : (
                <span className="era-count">
                  {candidates.filter((c) => c.era?.toLowerCase() === era.toLowerCase()).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* View Mode & Search Bar */}
        <div className="filter-controls-right">
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewFilter === 'contenders' ? 'active' : ''}`}
              onClick={() => setViewFilter('contenders')}
            >
              Contenders Only
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewFilter === 'all' ? 'active' : ''}`}
              onClick={() => setViewFilter('all')}
            >
              All 64 Tiles
            </button>
          </div>

          <div className="search-input-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, era, country, or cipher type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* The 64 Tiles Responsive Grid */}
      <div className="board-tiles-grid">
        {filteredCandidates.map((cand) => {
          const isGloballyRuledOut = globallyRuledOut.includes(cand.id);
          const isLocallyCrossed = locallyCrossed.includes(cand.id);
          const isContender = !isGloballyRuledOut && !isLocallyCrossed;

          return (
            <div
              key={cand.id}
              className={`candidate-tile ${isGloballyRuledOut ? 'ruled-out' : ''} ${
                isLocallyCrossed ? 'locally-crossed' : ''
              } ${isContender ? 'is-contender' : ''}`}
              onClick={() => onInspectCandidate(cand)}
            >
              <div className="tile-top-row">
                <span className="tile-id">#{cand.id}</span>
                <span className="tile-era">{cand.era}</span>
              </div>

              <h3 className="tile-name">{cand.name}</h3>

              <div className="tile-metadata">
                <div className="meta-line">
                  <span className="meta-label">Origin:</span> <strong>{cand.origin}</strong>
                </div>
                <div className="meta-line">
                  <span className="meta-label">Category:</span> <span>{cand.category}</span>
                </div>
                <div className="meta-line">
                  <span className="meta-label">Type:</span> <span>{cand.type}</span>
                </div>
              </div>

              {/* Status Badges */}
              {isGloballyRuledOut && (
                <div className="status-overlay-badge eliminated">
                  <XCircle size={12} />
                  <span>Ruled out by TEE referee</span>
                </div>
              )}
              {isLocallyCrossed && !isGloballyRuledOut && (
                <div className="status-overlay-badge marked">
                  <span>Marked as private note</span>
                </div>
              )}

              {/* Quick Action Footer */}
              <div className="tile-footer-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="tile-action-btn"
                  onClick={() => onInspectCandidate(cand)}
                  title="Inspect Intelligence Dossier"
                >
                  <Eye size={13} />
                  <span>Dossier</span>
                </button>
                <button
                  type="button"
                  className={`tile-action-btn ${isLocallyCrossed ? 'marked' : ''}`}
                  onClick={() => onToggleLocalCross(cand.id)}
                  title={isLocallyCrossed ? 'Remove Note' : 'Add Note'}
                >
                  <Bookmark size={13} />
                  <span>{isLocallyCrossed ? 'Unnote' : 'Note'}</span>
                </button>
                <button
                  type="button"
                  className={`tile-action-btn ${isContender ? 'primary' : ''}`}
                  onClick={() => onSelectCandidateForGuess(cand)}
                  disabled={!isJoined || isGloballyRuledOut}
                  title={!isJoined ? 'Stake 0.1 NEAR to unlock guesses' : `Submit guess for #${cand.id}`}
                >
                  <Target size={13} />
                  <span>Guess</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCandidates.length === 0 && (
        <div className="board-empty-state">
          <AlertTriangle size={32} className="text-warning" />
          <h3>No candidates match the selected filters</h3>
          <p>Try switching to "All 64 Tiles" or clearing your search term.</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setEraFilter('All');
              setViewFilter('all');
              setSearchQuery('');
            }}
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
