import { setupWalletSelector } from '@near-wallet-selector/core';
import type { WalletSelector } from '@near-wallet-selector/core';
import { setupModal } from '@near-wallet-selector/modal-ui';
import type { WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { contractConfig } from './contractClient';
import '@near-wallet-selector/modal-ui/styles.css';

let selector: WalletSelector | null = null;
let modal: WalletSelectorModal | null = null;

export type WalletState = {
  accountId: string | null;
  isConnected: boolean;
};

export async function initWalletSelector(
  onAccountChange: (accountId: string | null) => void
): Promise<{ selector: WalletSelector; modal: WalletSelectorModal }> {
  if (selector && modal) {
    const state = selector.store.getState();
    const accountId = state.accounts[0]?.accountId || null;
    onAccountChange(accountId);
    return { selector, modal };
  }

  selector = await setupWalletSelector({
    network: {
      networkId: 'testnet',
      nodeUrl: 'https://test.rpc.fastnear.com',
      helperUrl: 'https://helper.testnet.near.org',
      explorerUrl: 'https://testnet.nearblocks.io',
      indexerUrl: 'https://testnet-api.kitwallet.app',
    },
    modules: [setupMyNearWallet(), setupMeteorWallet()],
  });

  modal = setupModal(selector, {
    contractId: contractConfig.CONTRACT_ID,
    description: 'Connect your NEAR wallet to participate in CipherPot deduction rounds.',
  });

  // Track account state
  const state = selector.store.getState();
  const initialAccount = state.accounts[0]?.accountId || null;
  onAccountChange(initialAccount);

  selector.store.observable.subscribe((nextState) => {
    const acc = nextState.accounts[0]?.accountId || null;
    onAccountChange(acc);
  });

  return { selector, modal };
}

export function openWalletModal() {
  if (modal) {
    modal.show();
  }
}

export async function signOutWallet() {
  if (selector) {
    const wallet = await selector.wallet();
    await wallet.signOut();
  }
}

export async function joinRound(roundId: number, depositYocto: string = '100000000000000000000000') {
  if (!selector) throw new Error('Wallet not initialized');
  const wallet = await selector.wallet();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (wallet as any).signAndSendTransaction({
    receiverId: contractConfig.CONTRACT_ID,
    actions: [
      {
        type: 'FunctionCall',
        params: {
          methodName: 'join',
          args: { round_id: roundId },
          gas: '30000000000000', // 30 Tgas
          deposit: depositYocto,
        },
      },
    ],
  });
}

export async function submitQuestionOnChain(
  roundId: number,
  question: string,
  answer: string,
  ruleOutCandidateIds: number[],
  signature: string
) {
  if (!selector) throw new Error('Wallet not initialized');
  const wallet = await selector.wallet();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (wallet as any).signAndSendTransaction({
    receiverId: contractConfig.CONTRACT_ID,
    actions: [
      {
        type: 'FunctionCall',
        params: {
          methodName: 'submit_question',
          args: {
            round_id: roundId,
            question,
            answer,
            rule_out_candidate_ids: ruleOutCandidateIds,
            signature_hex: signature,
          },
          gas: '30000000000000',
          deposit: '0',
        },
      },
    ],
  });
}

export async function submitGuessOnChain(roundId: number, candidateId: number, candidateName: string) {
  if (!selector) throw new Error('Wallet not initialized');
  const wallet = await selector.wallet();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (wallet as any).signAndSendTransaction({
    receiverId: contractConfig.CONTRACT_ID,
    actions: [
      {
        type: 'FunctionCall',
        params: {
          methodName: 'submit_guess',
          args: {
            round_id: roundId,
            candidate_id: candidateId,
            candidate_name: candidateName,
          },
          gas: '30000000000000',
          deposit: '0',
        },
      },
    ],
  });
}

export async function claimPotOnChain(
  roundId: number,
  candidateId: number,
  candidateName: string,
  salt: string,
  signatureHex?: string | null
) {
  if (!selector) throw new Error('Wallet not initialized');
  const wallet = await selector.wallet();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (wallet as any).signAndSendTransaction({
    receiverId: contractConfig.CONTRACT_ID,
    actions: [
      {
        type: 'FunctionCall',
        params: {
          methodName: 'claim',
          args: {
            round_id: roundId,
            candidate_id: candidateId,
            candidate_name: candidateName,
            salt,
            signature_hex: signatureHex || null,
          },
          gas: '50000000000000', // 50 Tgas
          deposit: '0',
        },
      },
    ],
  });
}
