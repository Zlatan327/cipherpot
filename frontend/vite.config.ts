import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// These four frontend configuration values are public endpoint/contract
// identifiers, not secrets. No other unprefixed environment variables are
// exposed to browser code.
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'CONTRACT_ID', 'RPC_URL', 'BOARD_URL', 'API_URL'],
});
