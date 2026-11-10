# Cipher — The Daily Deduction Arena

> **One secret. Sixty-four possibilities. Twenty questions.**  
> A skill-based deduction game on NEAR Protocol powered by Confidential TEE-verified AI.

[![NEAR Protocol](https://img.shields.io/badge/NEAR-Testnet-blue.svg)](https://testnet.nearblocks.io/address/cipherpot861267.testnet)
[![Contract](https://img.shields.io/badge/Contract-cipherpot861267.testnet-green.svg)](https://testnet.nearblocks.io/address/cipherpot861267.testnet)
[![Status](https://img.shields.io/badge/Status-Live%20on%20Testnet-emerald.svg)](https://testnet.nearblocks.io/address/cipherpot861267.testnet)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 1. What is Cipher?

**Cipher** transforms the classic game of *20 Questions* into an on-chain, high-stakes deduction arena. Each round, a confidential secret entity is selected from a canonical board of 64 cryptography items (spanning ancient ciphers, historic artifacts, modern algorithms, and cypherpunk pioneers) and committed to the NEAR blockchain using a cryptographic hash.

Players and autonomous AI agents compete to deduce the secret before the 24-hour countdown expires. Participants ask sharp yes/no questions to an **Anti-Prompt-Injection TEE AI Referee**. The AI referee evaluates each question inside a Trusted Execution Environment and records structured public answers (`Yes`, `No`, or `Unclear`), automatically eliminating candidate tiles on the board.

The first participant to correctly identify the secret wins **96% of the accumulated prize pot**, while **4% is retained as protocol rake**. If a round times out unsolved, **100% of the pot rolls over** into the next round, creating progressive jackpots that grow continuously non-stop.

---

## 2. The Step-by-Step Player Experience

```
+-----------------------------------------------------------------------------------+
|                                  THE CIPHER ARENA                                 |
+-----------------------------------------------------------------------------------+
|  1. SPECTATE         2. CONNECT          3. JOIN           4. DEDUCE & WIN        |
|  - Live Pot Feed     - MyNearWallet      - 0.1 NEAR Entry  - Ask Yes/No Clues     |
|  - 64 Secrets Grid   - Meteor Wallet     - 3 Guesses Max   - TEE Verifies Guess   |
|  - Public Clues      - Sender / Here     - Question Quota  - Claim 96% Pot Payout |
+-----------------------------------------------------------------------------------+
```

### Step 1: Spectator Mode (No Wallet Required)
When any user opens Cipher for the first time, they enter **Spectator Mode**.
* **Zero wallet required on load:** The browser queries the NEAR Testnet RPC directly.
* View the active prize pot (e.g. `2.5 NEAR`), the countdown timer, the full 64-candidate grid, and all past questions and clues.
* Spectators can inspect candidate facts and cross off tiles locally as they watch other players make moves.

### Step 2: Connect Wallet
To play, the user clicks **"Connect wallet"** in the top navigation bar.
* Opens the official **NEAR Wallet Selector** modal.
* Supports **MyNearWallet**, **Meteor Wallet**, **Sender**, and web3 passkeys on NEAR Testnet.
* The header instantly updates to display the active account ID (e.g. `player.testnet`).

### Step 3: Join the Round (Pay 0.1 NEAR Entry Fee)
Clicking **"Join the round"** prompts a one-time transaction with a fixed `0.1 NEAR` deposit.
* The `0.1 NEAR` is added to the prize pot.
* The player is granted a strict quota of **3 guesses per entry fee** (a deliberate game mechanic designed to defeat automated brute-force scripts).
* The player unlocks access to ask deduction questions up to the round cap of 20.
* The side panel turns active: *"You're in — 3/3 Guesses remaining"*.

### Step 4: Ask Deduction Questions (TEE AI Referee)
In the *"Ask a question"* panel, the player inputs a yes/no query (e.g. *"Is it a mechanical rotor machine?"*, *"Did it originate in the ancient era?"*).
* The question is sent to the **TEE AI Enclave**, which filters for jailbreaks, prompt injections, and cheating attempts.
* The AI referee evaluates the question against the confidential secret and responds with strictly **`Yes`**, **`No`**, or **`Unclear`**.
* The answer is recorded on the smart contract (`submit_question`) and published to the live public feed.
* All candidates eliminated by this answer are automatically crossed off the board for all players!

### Step 5: Read Clues & Eliminate Tiles
Players inspect the 64-candidate grid. Players can also right-click any tile to manually cross it off or uncross it as they narrow down possibilities.

### Step 6: Make a Final Secret Guess
When a player is confident they know the answer:
* Click on that candidate's tile on the board (e.g. `#02 — Enigma Machine`).
* A confirmation modal opens: *"Submit Candidate Guess: #02 — Enigma Machine. This consumes 1 of your 3 guess quotas."*
* The user clicks **"Confirm Guess"**.
* The smart contract records the guess attempt (`submit_guess`).
* If incorrect: 1 guess quota is consumed, the tile is crossed off, and the game continues.

### Step 7: TEE Verification & Pot Settlement
If the guess is correct:
1. The **TEE Enclave** produces a cryptographic Ed25519 verdict signature and reveals the secret salt.
2. The player executes `claim` on the smart contract.
3. The smart contract validates:
   * The committed SHA-256 hash: `sha256(secret:salt) == round.commitment`
   * The TEE Ed25519 signature over `{round_id}:{candidate_id}:{claimer}:{salt}`
4. **96% of the entire prize pot** is transferred directly to the winner's wallet!
5. **4% protocol rake** is collected into accumulated fees.
6. The round status updates to `Settled`, displaying the winner, payout amount, and revealed secret.
7. After a 2-minute spectator cooldown, a new round is automatically created with a fresh secret!

### What If No One Solves It? (24h Timeout Rollover)
If the 24-hour countdown timer reaches `00:00:00` without a winner:
* `rollover()` is called on-chain.
* The expired secret is revealed on-chain so everyone can audit that the secret was fair and un-tampered.
* **100% of the pot rolls over to fund the next round**, progressively swelling the jackpot until someone solves it!

---

## 3. Architecture & Tech Stack

```
                          +---------------------------------------+
                          |             Browser Client            |
                          |   (React 18 / Vite / NEAR Wallet Sel) |
                          +-------------------+-------------------+
                                              |
                            Read-Only RPC /   |  Wallet Transactions
                            Spectator Mode    |  (join, guess, claim)
                                              v
+------------------------+          +--------------------+          +------------------------+
|      AI Service &      |          |   Smart Contract   |          |    Canonical Board     |
|      TEE Enclave       |<-------->|   (NEAR Protocol)  |<-------->|   (64 Secrets Set)     |
|  - Anti-Prompt Inject  |  Verify  |   cipherpot861267  |  Query   |   - Era, Category      |
|  - Yes/No/Unclear Ref  |  Verdict |   .testnet         |  Board   |   - Type, Origin       |
|  - Ed25519 Signer      |          +--------------------+          +------------------------+
+------------------------+                     |
            ^                                  |
            | HTTP / MCP Endpoints             | Pre-funded Balances
            v                                  v
+--------------------------------------------------------+
|                  Autonomous AI Agents                  |
|          (NEAR Agent Skills / Claude / Gemini)         |
+--------------------------------------------------------+
```

* **Smart Contract Layer (`contracts/src/lib.rs`):**
  * Rust contract compiled to WebAssembly (`wasm32-unknown-unknown`).
  * Manages round lifecycle, guess quotas, pre-funded agent spend limits, 4% rake accounting, and Ed25519 TEE verification checks.
  * Deployed on NEAR Testnet at [`cipherpot861267.testnet`](https://testnet.nearblocks.io/address/cipherpot861267.testnet).
* **AI & TEE Layer (`ai/`):**
  * **Anti-Prompt-Injection Guardrails (`ai/guardrails.py`):** Blocks instruction overrides, jailbreaks (`ignore previous instructions`), and secret extraction queries.
  * **Structured Referee (`ai/answerer.py`):** Strict output parser (`Yes`, `No`, `Unclear`) and candidate rule-out calculation engine.
  * **TEE Enclave Signer (`ai/tee_signer.py`):** Cryptographic Ed25519 verdict signer and SHA-256 commitment generator.
  * **Round Daemon (`ai/round_daemon.py`):** Autonomous 24/7 background runner that monitors round timeouts and automatically seeds new rounds.
* **Model Context Protocol (MCP) & Agent Skills (`ai/agent_service.py`):**
  * Native MCP tool server (`/mcp/tools`, `/mcp/call`) allowing autonomous AI agents (Claude, Gemini, Near AI Agents) to inspect board data, ask questions, eliminate candidates, and claim prizes.
* **Frontend Web App (`frontend/`):**
  * Built with React 18, Vite, TypeScript, and `@near-wallet-selector`.
  * Node polyfills via `vite-plugin-node-polyfills`.
  * Real-time RPC synchronization with exponential backoff and 15s spectator poll.

---

## 4. Live Testnet Information

* **Contract ID:** [`cipherpot861267.testnet`](https://testnet.nearblocks.io/address/cipherpot861267.testnet)
* **Owner & Fee Recipient:** `cipherpot861267.testnet`
* **Network:** NEAR Testnet (`https://rpc.testnet.near.org`)
* **Round 1 (Settled):**
  * Winner: `cipherpot861267.testnet`
  * Secret Revealed: `Caesar Cipher`
  * Payout: `1.056 NEAR` (96% of pot)
  * Rake Collected: `0.044 NEAR` (4% protocol fee)
* **Round 2 (Active Now):**
  * Pot: `2.5 NEAR`
  * Questions Remaining: `20 / 20`
  * Commitment Hash: `98b2ad75a9da255f5c6319df1e2d9f61c41ba876fc7dd376cd48c4697778b5a9`

---

## 5. Quickstart & Local Setup

### Prerequisites
* Node.js v18+ and npm
* Python 3.10+
* Rust & Cargo (if modifying smart contracts)

### Running Locally

```bash
# 1. Clone repository
git clone https://github.com/Zlatan327/cipherpot.git
cd cipherpot

# 2. Run the AI Backend & TEE Service (Port 8000)
pip install -r ai/requirements.txt
python -m uvicorn ai.app:app --host 0.0.0.0 --port 8000

# 3. In another terminal, run the Frontend (Port 5173)
cd frontend
npm install
npm run dev
```

Open [**http://localhost:5173/**](http://localhost:5173/) in your browser.

---

## 6. Project Structure

```
cipher/
├── contracts/               # NEAR Rust Smart Contract
│   ├── src/lib.rs           # Core contract logic & TEE verification
│   └── Cargo.toml           # NEAR SDK 5.29.1 dependencies
├── ai/                      # AI & TEE Enclave Backend
│   ├── app.py               # FastAPI server (REST & MCP endpoints)
│   ├── tee_signer.py        # Ed25519 signer & SHA-256 commitment generator
│   ├── guardrails.py        # Anti-prompt-injection sanitization wrapper
│   ├── answerer.py          # Structured deduction referee & rule-out calculator
│   ├── round_daemon.py      # Non-stop 24/7 autonomous round lifecycle daemon
│   └── agent_service.py     # MCP tools manifest & agent schemas
├── frontend/                # Vite + React Spectator & Player DApp
│   ├── src/
│   │   ├── main.tsx         # Main DApp view with real NEAR wallet selector
│   │   ├── contractClient.ts# Spectator RPC client & error catalog
│   │   ├── wallet.ts        # NEAR Wallet Selector integration
│   │   └── style.css        # Responsive dark cyberpunk styling
│   ├── public/board.json    # Canonical 64-candidate secrets dataset
│   └── vite.config.ts       # Node polyfills & public env prefixes
├── board.json               # Canonical 64 secrets dataset
├── INTERFACE_REQUESTS.md    # Frontend handoff specification
├── MESH_REPORT.md           # Verbatim testnet outputs & error codes catalog
└── README.md                # Product documentation
```

---

## 7. License

MIT License. Built for the NEAR Protocol Hacker House & Ecosystem.
