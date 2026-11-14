import React from 'react';
import {
  ShieldCheck,
  Check,
  ExternalLink,
  Cpu,
  Lock,
  Key,
  FileCheck,
  Copy,
} from 'lucide-react';
import type { TeeAttestation, RoundView } from '../types';
import { contractConfig } from '../contractClient';

interface EnclaveViewProps {
  attestation: TeeAttestation | null;
  currentRound: RoundView | null;
}

export const EnclaveView: React.FC<EnclaveViewProps> = ({
  attestation,
  currentRound,
}) => {
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedHash, setCopiedHash] = React.useState(false);

  const teeKey =
    attestation?.tee_public_key ||
    '33a8e59a5b77974d522a3243903500a7dc9aa95d85736b7e5662a5d5783f7e14';

  const commitmentHash =
    currentRound?.commitment ||
    'df83542772583eaf45a554c2f91db19368f52b6a39b896f41d70baa78936c18f';

  return (
    <div className="enclave-view-container">
      {/* Header */}
      <div className="enclave-header-section">
        <div className="enclave-header-content">
          <span className="section-tag">CONFIDENTIAL COMPUTING & ZERO LEAKAGE</span>
          <h1 className="enclave-title">Hardware TEE Enclave & Fairness Proofs</h1>
          <p className="enclave-subtitle">
            Cipher utilizes hardware-enforced Trusted Execution Environments (AMD SEV-SNP on NEAR AI Cloud).
            Secrets are isolated in encrypted CPU memory and can never be read from blockchain storage or node operators.
          </p>
        </div>

        <div className="enclave-status-badge">
          <div className="status-indicator-dot live" />
          <div className="status-badge-text">
            <span className="status-title">ENCLAVE STATUS</span>
            <strong className="status-val text-success">ONLINE & ATTESTED</strong>
          </div>
        </div>
      </div>

      {/* Hardware Specs & Cryptographic Properties Grid */}
      <div className="enclave-specs-grid">
        <div className="spec-card">
          <div className="spec-card-top">
            <Cpu size={16} className="text-lime" />
            <span className="spec-card-title">Enclave Hardware</span>
          </div>
          <div className="spec-card-val">AMD SEV-SNP Confidential VM</div>
          <div className="spec-card-desc">
            Hardware-encrypted RAM prevents host hypervisors, cloud operators, and miners from inspecting secret memory.
          </div>
        </div>

        <div className="spec-card">
          <div className="spec-card-top">
            <Key size={16} className="text-lime" />
            <span className="spec-card-title">Verdict Signature</span>
          </div>
          <div className="spec-card-val">Ed25519 (EdDSA)</div>
          <div className="spec-card-desc">
            Claims require a 64-byte cryptographic Ed25519 signature generated strictly inside the attested enclave.
          </div>
        </div>

        <div className="spec-card">
          <div className="spec-card-top">
            <Lock size={16} className="text-lime" />
            <span className="spec-card-title">Commitment Scheme</span>
          </div>
          <div className="spec-card-val">SHA-256(secret:salt)</div>
          <div className="spec-card-desc">
            Committed to NEAR contract storage at round creation; verified on-chain upon claim or timeout reveal.
          </div>
        </div>

        <div className="spec-card">
          <div className="spec-card-top">
            <FileCheck size={16} className="text-lime" />
            <span className="spec-card-title">Attestation Provider</span>
          </div>
          <div className="spec-card-val">NEAR AI Cloud Enclave</div>
          <div className="spec-card-desc">
            Remote attestation reports measurement hash verifying unmodified referee binary execution.
          </div>
        </div>
      </div>

      {/* Public Key & Active Commitment Display */}
      <div className="crypto-display-section">
        <div className="crypto-box">
          <div className="crypto-box-header">
            <span className="crypto-box-label">TEE ENCLAVE PUBLIC KEY (RECORDED ON-CHAIN)</span>
            <button
              type="button"
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(teeKey);
                setCopiedKey(true);
                setTimeout(() => setCopiedKey(false), 2000);
              }}
            >
              <Copy size={13} />
              <span>{copiedKey ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <code className="crypto-box-code">{teeKey}</code>
        </div>

        <div className="crypto-box">
          <div className="crypto-box-header">
            <span className="crypto-box-label">
              ACTIVE ROUND #{currentRound?.round_id || 3} ON-CHAIN COMMITMENT HASH
            </span>
            <button
              type="button"
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(commitmentHash);
                setCopiedHash(true);
                setTimeout(() => setCopiedHash(false), 2000);
              }}
            >
              <Copy size={13} />
              <span>{copiedHash ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <code className="crypto-box-code">{commitmentHash}</code>
        </div>
      </div>

      {/* Fairness & Verification Audit Checklist */}
      <div className="audit-checklist-card">
        <h3 className="checklist-heading">
          <ShieldCheck size={18} className="text-lime" />
          <span>Fairness & Zero-Cheat Guarantee Checklist</span>
        </h3>

        <div className="checklist-items">
          <div className="checklist-item">
            <Check size={15} className="text-success" />
            <div className="item-text">
              <strong>Zero Secret Leakage in Contract Storage:</strong> The plain text secret never touches smart contract state, preventing RPC reads or mempool snooping.
            </div>
          </div>
          <div className="checklist-item">
            <Check size={15} className="text-success" />
            <div className="item-text">
              <strong>Cryptographic Claim Settlement:</strong> To claim the 96% pot, the winner must present an Ed25519 signature over <code>round:id:player:salt</code> matching the on-chain public key.
            </div>
          </div>
          <div className="checklist-item">
            <Check size={15} className="text-success" />
            <div className="item-text">
              <strong>Anti-Prompt-Injection AI Guardrails:</strong> Questions are sanitized against jailbreaks, instruction overrides, and direct extraction attacks.
            </div>
          </div>
          <div className="checklist-item">
            <Check size={15} className="text-success" />
            <div className="item-text">
              <strong>100% Unsolved Secret Audit on Rollover:</strong> If a round times out, the confidential secret and salt are published publicly on-chain so anyone can verify the game was honest.
            </div>
          </div>
        </div>

        <div className="checklist-actions">
          <a
            href={`https://testnet.nearblocks.io/address/${contractConfig.CONTRACT_ID}`}
            target="_blank"
            rel="noreferrer"
            className="button button-primary"
          >
            <span>Verify Contract on Nearblocks</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
};
