# CipherPot Interface & Frontend Coverage Specification (`INTERFACE_REQUESTS.md`)

This document satisfies the binding interface handoff between the backend (`contracts/` and `ai/`) and the frontend team (`frontend/`). It addresses every item from the frontend's interface requests, reviews the Frontend Coverage Checklist, and documents Spectator Mode data flows.

All monetary amounts are represented as base units: **yoctoNEAR strings** (`1 NEAR = 10^24 yoctoNEAR`).  
All timestamps and durations are represented as **nanosecond strings** (`1 second = 1,000,000,000 ns`).

---

## 1. Interface Implementation Matrix

| Needed Item | Frontend Requirement | Implemented Backend Solution | Spectator Compatible? |
|---|---|---|---|
| **1. Read-Only Round Data** | Load pot, round status, countdown timer, max/remaining questions. | Contract view `get_current_round()` or `get_round(round_id)`. Returns `RoundView` with yoctoNEAR pot and nanosecond timestamps. | **Yes** (0 account / 0 wallet) |
| **2. Player Participation Data** | Determine if connected wallet is joined; show guess/question counters. | Contract view `get_player_info(round_id, account_id)`. Returns `is_joined`, `guesses_used`, `guesses_remaining`, `questions_asked`. | **Yes** (Safe read for any account) |
| **3. Write Methods & Signatures** | `join()`, `submit_question()`, `submit_guess()`, `claim()`. | Exact methods implemented in Rust contract with fixed entry fee (`0.1 NEAR`) and quota tracking. | Requires connected wallet |
| **4. Question Feed Schema** | Render public question history, AI answers, and eliminated candidates. | Contract view `get_question_feed(round_id)`. Returns list of `QuestionView` with `answer` ("Yes"/"No"/"Unclear") and `rule_out_candidate_ids`. | **Yes** (Public feed) |
| **5. Verification & Claim Payload** | TEE guess verification and on-chain claim settlement. | `ai/` endpoint `POST /tee/verify-guess` issues Ed25519 signature + salt. Passed to contract method `claim(round_id, candidate_id, candidate_name, salt, signature_hex)`. | Requires player wallet |
| **6. Round-Ended Statuses** | Won, Lost, RolledOver / Refunding. | Status enum: `"Active"`, `"Settled"`, `"RolledOver"`, `"Paused"`. On settlement, displays `winner`, `payout` (96%), and `secret_revealed`. | **Yes** |
| **7. Complete Error Catalog** | Standardized error codes for friendly client messages. | All errors prefixed with `ERR_*` (e.g., `ERR_INSUFFICIENT_ENTRY_FEE`, `ERR_GUESS_LIMIT_EXCEEDED`). | Fully documented below |
| **8. 64 Canonical Candidates** | Populate interactive board, facts, categories, and rule-outs. | `board.json` at repo root and served statically via API `GET /board.json`. | **Yes** |
| **9. Active Agents Panel** | Render active participating agents and spend balances. | Contract view `get_active_agents()`. Returns list of `AgentView` (`account_id`, `balance`, `questions_asked`, `guesses_made`). | **Yes** |
| **10. `BOARD_URL` and `API_URL`** | Endpoints to load board and query AI deduction engine. | Documented below. Fully compatible with environment variables `BOARD_URL` and `API_URL`. | **Yes** |
| **11. Wallet Integration & Units** | NEAR Wallet Selector integration. | Standard `@near-wallet-selector/core` calling testnet RPC. Base units parsed with `BigInt(raw)`. | **Yes** |

---

## 2. Spectator Mode Specifications

Spectator Mode is active whenever no wallet is connected or when an unauthenticated observer loads the app.
- **Zero-Wallet Reads:** Spectators query the standard NEAR Testnet RPC (`https://rpc.testnet.near.org`) or `API_URL` directly without sending signatures, transactions, or account IDs.
- **Always-Visible Features:**
  - Pot size & countdown timer: `get_current_round()`
  - 64-Candidate grid: `board.json` (or contract view `get_board()`)
  - Live question feed & rule-outs: `get_question_feed(round_id)`
  - Active agents panel: `get_active_agents()`
  - Fairness verification: links to on-chain commitment hash on NEAR Explorer
- **Locked Actions:**
  - "Join the round", "Submit question", "Submit guess" display interactive UI disabled/locked until wallet connection.

---

## 3. Detailed Data Schemas

### 3.1 `RoundView` (Contract View `get_current_round` / `get_round`)
```json
{
  "round_id": 2,
  "status": "Active",
  "pot": "2500000000000000000000000",
  "entry_fee": "100000000000000000000000",
  "start_time": "1731273760000000000",
  "end_time": "1731360160000000000",
  "time_remaining": "86390000000000",
  "questions_asked": 0,
  "max_questions": 20,
  "questions_remaining": 20,
  "total_players": 0,
  "commitment": "98b2ad75a9da255f5c6319df1e2d9f61c41ba876fc7dd376cd48c4697778b5a9",
  "secret_revealed": null,
  "salt_revealed": null,
  "winner": null,
  "payout": null,
  "rake_amount": null
}
```

### 3.2 `PlayerInfoView` (Contract View `get_player_info`)
```json
{
  "round_id": 2,
  "account_id": "player.testnet",
  "is_joined": true,
  "guesses_used": 1,
  "guesses_remaining": 2,
  "questions_asked": 1,
  "entry_fee_paid": "100000000000000000000000"
}
```

### 3.3 `QuestionView` (Contract View `get_question_feed`)
```json
[
  {
    "question_id": 1,
    "round_id": 1,
    "asker": "player.testnet",
    "question": "Is it an ancient era cipher?",
    "answer": "Yes",
    "timestamp": "1731273292000000000",
    "rule_out_candidate_ids": [2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  }
]
```

### 3.4 `AgentView` (Contract View `get_active_agents`)
```json
[
  {
    "account_id": "cipher-agent.testnet",
    "balance": "1000000000000000000000000",
    "questions_asked": 3,
    "guesses_made": 1
  }
]
```

---

## 4. Contract Methods (Signatures & Payloads)

### 4.1 Write Methods
1. **`join(round_id: u64)`**
   - **Type:** Payable Function Call
   - **Attached Deposit:** Minimum `100_000_000_000_000_000_000_000` (0.1 NEAR)
   - **Arguments:** `{"round_id": 2}`
   - **Behavior:** Unlocks 3 guesses and allows asking questions up to the round limit.

2. **`submit_question(round_id: u64, question: String, answer: String, rule_out_candidate_ids: Option<Vec<u32>>)`**
   - **Type:** Function Call (Prepaid gas: 30 Tgas)
   - **Attached Deposit:** 0 NEAR
   - **Arguments:**
     ```json
     {
       "round_id": 2,
       "question": "Is it an ancient era cipher?",
       "answer": "Yes",
       "rule_out_candidate_ids": [2, 14, 30]
     }
     ```

3. **`submit_guess(round_id: u64, candidate_id: u32, candidate_name: String)`**
   - **Type:** Function Call (Prepaid gas: 30 Tgas)
   - **Attached Deposit:** 0 NEAR
   - **Arguments:**
     ```json
     {
       "round_id": 2,
       "candidate_id": 2,
       "candidate_name": "Enigma Machine"
     }
     ```
   - **Returns:** `{"round_id": 2, "candidate_id": 2, "candidate_name": "Enigma Machine", "guesses_remaining": 2, "is_correct": false}`

4. **`claim(round_id: u64, candidate_id: u32, candidate_name: String, salt: String, signature_hex: Option<String>)`**
   - **Type:** Function Call (Prepaid gas: 50 Tgas)
   - **Attached Deposit:** 0 NEAR
   - **Arguments:**
     ```json
     {
       "round_id": 1,
       "candidate_id": 1,
       "candidate_name": "Caesar Cipher",
       "salt": "cipherpot_salt_round_1_seed_9831",
       "signature_hex": null
     }
     ```
   - **Behavior:** Verifies `sha256(name:salt) == commitment`, verifies TEE signature if key set, transfers 96% of pot to winner, adds 4% to protocol fee, marks round `Settled`.

5. **`rollover(round_id: u64, salt: Option<String>, secret: Option<String>)`**
   - **Type:** Function Call
   - **Behavior:** Can be triggered after `end_time` if round remains unsolved. Reveals secret on-chain and carries pot forward.

---

## 5. Complete Error Code Catalog

The frontend's `contractClient.ts` `ERROR_MESSAGES` dictionary can map these exact error keys to user-friendly messages:

| Error Code | Meaning | User-Facing Recommendation |
|---|---|---|
| `ERR_CONTRACT_PAUSED` | Contract is currently paused by admin | "CipherPot is paused for maintenance. Please check back shortly." |
| `ERR_UNAUTHORIZED` | Caller is not authorized for this operation | "You are not authorized to perform this admin action." |
| `ERR_ROUND_NOT_FOUND` | Round ID does not exist | "The requested round was not found." |
| `ERR_ROUND_NOT_ACTIVE` | Target round is already settled or expired | "This round has concluded. Join the next active round." |
| `ERR_ROUND_EXPIRED` | Round deadline has passed | "Round time has expired." |
| `ERR_ROUND_NOT_EXPIRED` | Attempted rollover before timeout | "Round is still active and cannot be rolled over yet." |
| `ERR_ALREADY_JOINED` | Account has already paid entry for this round | "You have already joined this round! Start asking questions." |
| `ERR_NOT_JOINED` | Account has not joined the round | "Please pay the entry fee to join before making a move." |
| `ERR_INSUFFICIENT_ENTRY_FEE` | Attached deposit is less than 0.1 NEAR | "Insufficient deposit attached. Entry fee is 0.1 NEAR." |
| `ERR_INSUFFICIENT_AGENT_BALANCE` | Pre-funded agent balance is depleted | "Agent balance is insufficient. Deposit funds to continue." |
| `ERR_QUESTION_LIMIT_REACHED` | Maximum 20 questions reached for the round | "The 20-question limit for this round has been reached." |
| `ERR_GUESS_LIMIT_EXCEEDED` | All 3 guesses used for this entry | "You have used all 3 guesses for this entry fee." |
| `ERR_INVALID_CANDIDATE_ID` | Candidate ID is outside range 1–64 | "Invalid candidate selected. Choose a candidate from 1 to 64." |
| `ERR_INVALID_TEE_SIGNATURE` | Cryptographic TEE signature verification failed | "Invalid verification verdict signature." |
| `ERR_INVALID_COMMITMENT` | Secret reveal hash does not match committed SHA-256 | "Secret does not match committed round hash." |
| `ERR_TRANSFER_FAILED` | Payout transfer encountered an error | "Failed to process NEAR transfer." |

---

## 6. Frontend Environment Configuration

In `.env` or `vite.config.ts`:
```env
CONTRACT_ID=cipherpot861267.testnet
RPC_URL=https://rpc.testnet.near.org
BOARD_URL=http://localhost:8000/board.json
API_URL=http://localhost:8000
```
