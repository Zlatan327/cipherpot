import React from 'react';
import {
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Bot,
  User,
  Sparkles,
} from 'lucide-react';
import type { QuestionView } from '../types';
import { contractConfig } from '../contractClient';

interface LiveFeedViewProps {
  feed: QuestionView[];
  roundId: number;
}

export const LiveFeedView: React.FC<LiveFeedViewProps> = ({ feed, roundId }) => {
  return (
    <div className="feed-view-container">
      {/* Feed Header */}
      <div className="feed-header-section">
        <div className="feed-header-content">
          <span className="section-tag">PUBLIC DEDUCTION INTELLIGENCE</span>
          <h1 className="feed-title">The Shared Clue Stream</h1>
          <p className="feed-subtitle">
            Every question asked by any participant or autonomous AI agent is evaluated inside the AMD SEV-SNP
            enclave and recorded publicly on NEAR Testnet. Spectators can eliminate candidate tiles for free!
          </p>
        </div>

        <div className="feed-telemetry-badge">
          <div className="telemetry-item">
            <span className="telemetry-label">QUESTIONS IN ROUND #{roundId}</span>
            <strong className="telemetry-val text-lime">{feed.length} / 20</strong>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">REFEREE VERDICTS</span>
            <strong className="telemetry-val text-success">100% Cryptographically Verified</strong>
          </div>
        </div>
      </div>

      {/* Feed Stream */}
      <div className="feed-stream-wrapper">
        {feed.map((item, index) => {
          const isYes = item.answer?.toLowerCase() === 'yes';
          const isNo = item.answer?.toLowerCase() === 'no';
          const isAgent = item.asker?.includes('agent') || item.asker === 'cipherpot861267.testnet';
          const ruleOuts = item.rule_out_candidate_ids || [];

          return (
            <div key={item.question_id || index} className="feed-entry-card">
              <div className="entry-header">
                <div className="entry-asker-group">
                  <div className={`asker-avatar ${isAgent ? 'agent' : 'human'}`}>
                    {isAgent ? <Bot size={14} /> : <User size={14} />}
                  </div>
                  <div className="asker-meta">
                    <span className="asker-name">{item.asker}</span>
                    <span className="asker-role">{isAgent ? 'Autonomous MCP Agent' : 'Human Sleuth'}</span>
                  </div>
                </div>

                <div className="entry-tag-group">
                  <span className="question-index-pill">
                    Question #{item.question_id || (feed.length - index)}
                  </span>
                  <div className={`verdict-pill ${isYes ? 'yes' : isNo ? 'no' : 'unclear'}`}>
                    {isYes && <CheckCircle2 size={13} />}
                    {isNo && <XCircle size={13} />}
                    {!isYes && !isNo && <HelpCircle size={13} />}
                    <span>VERDICT: {item.answer?.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="entry-question-body">
                "{item.question}"
              </div>

              <div className="entry-footer">
                <div className="footer-left">
                  <div className="rule-outs-pill">
                    <Sparkles size={12} className="text-lime" />
                    <span>
                      Ruled out <strong>{ruleOuts.length}</strong> candidate{ruleOuts.length !== 1 ? 's' : ''} on-chain
                    </span>
                  </div>
                  {ruleOuts.length > 0 && (
                    <span className="candidate-ids-tag">
                      IDs: [{ruleOuts.slice(0, 8).join(', ')}{ruleOuts.length > 8 ? '…' : ''}]
                    </span>
                  )}
                </div>

                <a
                  href={`https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`}
                  target="_blank"
                  rel="noreferrer"
                  className="entry-explorer-link"
                  title="Verify submit_question on Nearblocks"
                >
                  <ShieldCheck size={12} />
                  <span>Verified On-Chain</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          );
        })}

        {feed.length === 0 && (
          <div className="feed-empty-state">
            <MessageSquare size={36} className="text-dim" />
            <h3>No questions asked yet in Round #{roundId}</h3>
            <p>Be the first sleuth to ask a yes/no question to the TEE AI Referee!</p>
          </div>
        )}
      </div>
    </div>
  );
};
