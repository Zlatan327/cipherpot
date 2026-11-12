import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    react(),
  ],
  server: {
    proxy: {
      '/near-rpc': {
        target: 'https://rpc.testnet.near.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/near-rpc/, ''),
      },
    },
  },
  envPrefix: ['VITE_', 'CONTRACT_ID', 'RPC_URL', 'BOARD_URL', 'API_URL'],
});
