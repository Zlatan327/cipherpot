/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly CONTRACT_ID?: string;
  readonly RPC_URL?: string;
  readonly BOARD_URL?: string;
  readonly API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
