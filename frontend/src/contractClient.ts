/**
 * All future contract/network access belongs in this file.
 *
 * The supplied specification did not include the promised contract handoff,
 * so no method names, arguments, response fields, or endpoint paths can be
 * implemented safely yet. This module intentionally performs zero calls.
 * Replace only this module and environment variables when the handoff arrives.
 */
export const contractConfig = {
  CONTRACT_ID: import.meta.env.CONTRACT_ID ?? '',
  RPC_URL: import.meta.env.RPC_URL ?? '',
  BOARD_URL: import.meta.env.BOARD_URL ?? '',
  API_URL: import.meta.env.API_URL ?? '',
} as const;

export type FriendlyError = {
  message: string;
  known: boolean;
};

// Exact contract error codes are absent from the supplied handoff. Keep this
// map empty rather than inventing codes or implying that a failure is mapped.
const ERROR_MESSAGES: Readonly<Record<string, string>> = {};

export function friendlyError(code: string): FriendlyError {
  const message = ERROR_MESSAGES[code];
  return message
    ? { message, known: true }
    : { message: 'The backend error catalog is not configured yet.', known: false };
}

// Contract amount values must be parsed as BigInt once the documented amount
// field and base unit are provided. Never convert contract amounts to Number.
export function parseContractAmount(raw: string): bigint {
  return BigInt(raw);
}

export const contractClient = {
  mode: 'mock-placeholder' as const,
  callsImplemented: 0,
  ready: false,
};
