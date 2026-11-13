import type {
  RoundView,
  Candidate,
  QuestionView,
  PlayerInfoView,
  AgentView,
  TeeAttestation,
  ArenaStats,
  ShannonSuggestion,
} from './contractClient';

export type {
  RoundView,
  Candidate,
  QuestionView,
  PlayerInfoView,
  AgentView,
  TeeAttestation,
  ArenaStats,
  ShannonSuggestion,
};

export type TabType = 'arena' | 'board' | 'feed' | 'archives' | 'enclave' | 'standings';

export type SkillMode = 'pure' | 'assisted';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  txHash?: string;
  duration?: number;
}
