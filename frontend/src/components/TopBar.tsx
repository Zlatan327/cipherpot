import React, { useState } from 'react';
import {
  Wallet,
  Copy,
  ExternalLink,
  LogOut,
  ChevronDown,
  HelpCircle,
  Activity,
  Check,
  Terminal,
  LayoutGrid,
  Radio,
  Archive,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import type { TabType } from '../types';
import { formatNear } from '../contractClient';

interface TopBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  accountId: string | null;
  accountBalance: string | null;
  potDisplay: string;
  onConnectWallet: () => void;
  onSignOut: () => void;
  onOpenHowToPlay: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onTabChange,
  accountId,
  accountBalance,
  potDisplay,
  onConnectWallet,
  onSignOut,
  onOpenHowToPlay,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAccount = () => {
    if (accountId) {
      navigator.clipboard.writeText(accountId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="framo-topbar">
      <div className="topbar-inner">
        {/* Brand */}
        <div className="topbar-brand-group">
          <a
            href="#arena"
            className="framo-brand"
            onClick={(e) => {
              e.preventDefault();
              onTabChange('arena');
            }}
          >
            <span className="brand-dot" />
            <span className="brand-title">CIPHER</span>
            <span className="brand-sub">TESTNET</span>
          </a>
        </div>

        {/* Nostalgia-Computer Dock Navigation */}
        <nav className="framo-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'arena'}
            className={`nav-item ${activeTab === 'arena' ? 'active' : ''}`}
            onClick={() => onTabChange('arena')}
            title="The Arena (Active Round #3)"
          >
            <span className="nav-icon-box">
              <Terminal size={13} />
            </span>
            <span className="nav-text">The Arena</span>
            <span className="nav-badge-pot">{potDisplay} Ⓝ</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'board'}
            className={`nav-item ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => onTabChange('board')}
            title="The Board (64 Canonical Candidates)"
          >
            <span className="nav-icon-box">
              <LayoutGrid size={13} />
            </span>
            <span className="nav-text">The Board</span>
            <span className="nav-badge-count">64</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'feed'}
            className={`nav-item ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => onTabChange('feed')}
            title="Live Shared Clue Stream"
          >
            <span className="nav-icon-box">
              <Radio size={13} />
            </span>
            <span className="nav-text">Live Feed</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'archives'}
            className={`nav-item ${activeTab === 'archives' ? 'active' : ''}`}
            onClick={() => onTabChange('archives')}
            title="Archives & Settlement Ledger"
          >
            <span className="nav-icon-box">
              <Archive size={13} />
            </span>
            <span className="nav-text">Archives</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'enclave'}
            className={`nav-item ${activeTab === 'enclave' ? 'active' : ''}`}
            onClick={() => onTabChange('enclave')}
            title="Confidential TEE Enclave Proofs"
          >
            <span className="nav-icon-box">
              <ShieldCheck size={13} />
            </span>
            <span className="nav-text">TEE Enclave</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'standings'}
            className={`nav-item ${activeTab === 'standings' ? 'active' : ''}`}
            onClick={() => onTabChange('standings')}
            title="Season 1 Standings & Leaderboard"
          >
            <span className="nav-icon-box">
              <Trophy size={13} />
            </span>
            <span className="nav-text">Standings</span>
          </button>
        </nav>

        {/* Action Controls & Wallet */}
        <div className="topbar-actions">
          {/* Quick How To Play Trigger */}
          <button
            type="button"
            className="framo-help-btn"
            onClick={onOpenHowToPlay}
            title="How Deduction Works (Interactive Demo)"
          >
            <HelpCircle size={15} />
            <span className="help-label">Demo</span>
          </button>

          {/* Testnet RPC Status Badge */}
          <div className="rpc-status-pill" title="Connected to FastNear RPC on NEAR Testnet">
            <span className="pulse-dot" />
            <span className="rpc-name">FastNear</span>
          </div>

          {/* Wallet Button / Account Pill */}
          {!accountId ? (
            <button
              type="button"
              className="button button-connect"
              onClick={onConnectWallet}
            >
              <Wallet size={15} />
              <span>Connect Wallet</span>
            </button>
          ) : (
            <div className="account-menu-wrapper">
              <button
                type="button"
                className="account-pill-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
              >
                <div className="account-pill-avatar" />
                <div className="account-pill-text">
                  <span className="account-id">{accountId}</span>
                  {accountBalance && (
                    <span className="account-balance">{formatNear(accountBalance)} Ⓝ</span>
                  )}
                </div>
                <ChevronDown size={14} className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="menu-backdrop"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="account-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-label">CONNECTED TESTNET ACCOUNT</div>
                      <div className="dropdown-account-full">{accountId}</div>
                      {accountBalance && (
                        <div className="dropdown-balance-val">
                          Balance: <strong>{formatNear(accountBalance)} NEAR</strong>
                        </div>
                      )}
                    </div>
                    <div className="dropdown-items">
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={handleCopyAccount}
                      >
                        {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        <span>{copied ? 'Copied to Clipboard!' : 'Copy Account ID'}</span>
                      </button>
                      <a
                        href={`https://testnet.nearblocks.io/address/${accountId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="dropdown-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <ExternalLink size={14} />
                        <span>View on Nearblocks Explorer</span>
                      </a>
                      <a
                        href="https://testnet.mynearwallet.com"
                        target="_blank"
                        rel="noreferrer"
                        className="dropdown-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Activity size={14} />
                        <span>Testnet Faucet / Wallet</span>
                      </a>
                      <div className="dropdown-divider" />
                      <button
                        type="button"
                        className="dropdown-item text-danger"
                        onClick={() => {
                          setDropdownOpen(false);
                          onSignOut();
                        }}
                      >
                        <LogOut size={14} />
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
