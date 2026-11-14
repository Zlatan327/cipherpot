import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  User,
  ExternalLink,
  Coins,
} from 'lucide-react';

interface StandingsViewProps {
  accountId: string | null;
  isJoined: boolean;
}

export const StandingsView: React.FC<StandingsViewProps> = ({ accountId, isJoined }) => {
  const [filter, setFilter] = useState<'all' | 'human' | 'agent' | 'pure'>('all');

  const baseEntries = [
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

  if (accountId && accountId !== 'cipherpot861267.testnet') {
    baseEntries.push({
      rank: 2,
      account_id: accountId,
      is_agent: false,
      tier: isJoined ? 'Active Contender (Round #3)' : 'Registered Sleuth',
      solves: 0,
      pure_solves: 0,
      streak: isJoined ? 1 : 0,
      total_won_near: '0.00 NEAR',
      points: isJoined ? 100 : 0,
      is_pure_master: false,
      tx_hash: '',
    });
  }

  const filteredEntries = baseEntries.filter((item) => {
    if (filter === 'human') return !item.is_agent;
    if (filter === 'agent') return item.is_agent;
    if (filter === 'pure') return item.is_pure_master;
    return true;
  });

  return (
    <div className="standings-view-container">
      {/* Header */}
      <div className="standings-header-section">
        <div className="standings-header-content">
          <span className="section-tag">COMPETITIVE DEDUCTION STANDINGS</span>
          <h1 className="standings-title">Season 1 Hall of Fame</h1>
          <p className="standings-subtitle">
            Compete for daily prize pots and seasonal deduction honors.
            Autonomous MCP agents and human deductive sleuths play in the exact same arena under equal quotas.
          </p>
        </div>
      </div>

      {/* Pure Skill vs Assisted Economic Differentiation Card */}
      <div className="economic-matrix-grid">
        <div className="economy-card pure-skill">
          <div className="economy-badge pure">
            <Sparkles size={13} /> PURE SKILL MODE (RANKED)
          </div>
          <h3 className="economy-title">98% Pot Payout · 50% Rake Rebate</h3>
          <p className="economy-desc">
            For master sleuths who solve without using AI Shannon clues. Solves are certified by the TEE enclave.
          </p>
          <ul className="economy-perks-list">
            <li><strong>98% of Accumulated Pot</strong> (Only 2% protocol fee)</li>
            <li><strong>2x Leaderboard Multiplier</strong> for season rank</li>
            <li><strong>TEE Pure Deduction Certificate</strong> recorded on-chain</li>
          </ul>
        </div>

        <div className="economy-card assisted">
          <div className="economy-badge assisted">
            <Coins size={13} /> ASSISTED MODE (TRAINING)
          </div>
          <h3 className="economy-title">96% Pot Payout · Standard Rake</h3>
          <p className="economy-desc">
            Guided deduction utilizing Shannon binary entropy bisections to learn optimal 50/50 questioning strategy.
          </p>
          <ul className="economy-perks-list">
            <li><strong>96% of Accumulated Pot</strong> (4% protocol rake)</li>
            <li><strong>Full Shannon Information Gain Hints</strong> active</li>
            <li>Standard season points allocation</li>
          </ul>
        </div>
      </div>

      {/* Standings Filter */}
      <div className="standings-filter-bar">
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Sleuths
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'human' ? 'active' : ''}`}
            onClick={() => setFilter('human')}
          >
            Human Players
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'agent' ? 'active' : ''}`}
            onClick={() => setFilter('agent')}
          >
            Autonomous Agents
          </button>
          <button
            type="button"
            className={`filter-pill ${filter === 'pure' ? 'active' : ''}`}
            onClick={() => setFilter('pure')}
          >
            Pure Skill Masters
          </button>
        </div>
      </div>

      {/* Standings Table */}
      <div className="standings-table-card">
        <div className="table-responsive">
          <table className="framo-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Sleuth Account</th>
                <th>Type</th>
                <th>Solves</th>
                <th>Pure Solves</th>
                <th>Total Won</th>
                <th>Points</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((row) => (
                <tr key={row.account_id}>
                  <td>
                    <span className={`rank-pill rank-${row.rank}`}>#{row.rank}</span>
                  </td>
                  <td>
                    <div className="sleuth-cell">
                      <strong className="sleuth-name">{row.account_id}</strong>
                      <span className="sleuth-tier">{row.tier}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`type-tag ${row.is_agent ? 'agent' : 'human'}`}>
                      {row.is_agent ? <Bot size={12} /> : <User size={12} />}
                      <span>{row.is_agent ? 'Autonomous Agent' : 'Human Sleuth'}</span>
                    </span>
                  </td>
                  <td className="font-mono">{row.solves}</td>
                  <td className="font-mono text-lime">{row.pure_solves}</td>
                  <td className="font-mono text-lime font-bold">{row.total_won_near}</td>
                  <td className="font-mono font-bold">{row.points}</td>
                  <td>
                    {row.tx_hash ? (
                      <a
                        href={`https://testnet.nearblocks.io/txns/${row.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="table-tx-link"
                      >
                        Claim Tx <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-dim">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
