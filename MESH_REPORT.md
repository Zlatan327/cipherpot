# CipherPot Mesh Integration Report (`MESH_REPORT.md`)

This report provides the verified integration contract between the CipherPot Backend and the Frontend / Agent clients. All outputs in this report are copied directly from live transactions and view calls on NEAR Testnet.

---

## 1. Network & Contract Identity

- **Deployed Contract ID:** `cipherpot861267.testnet`
- **Network ID:** `testnet`
- **Public RPC URL:** `https://rpc.testnet.near.org`
- **Deployment Transaction:** `z3paUhEsJojDaoyqLkL23HWQVgQJfn6RKpfES3rNwXo`
- **Canonical Board URL:** `http://localhost:8000/board.json` (File: `board.json`)
- **AI / TEE Service URL:** `http://localhost:8000`

---

## 2. Complete Method Signatures

### 2.1 Write Methods (State Transactions)

```rust
// 1. Initialize Contract
pub fn init(
    owner_id: AccountId,
    protocol_fee_recipient: Option<AccountId>,
    tee_public_key: Option<String>,
) -> Self;

// 2. Join Round (Payable: 0.1 NEAR entry fee)
#[payable]
pub fn join(round_id: u64) -> PlayerInfoView;

// 3. Agent Join using Prefunded Contract Balance
pub fn agent_join(round_id: u64) -> PlayerInfoView;

// 4. Prefund Agent Balance (Payable)
#[payable]
pub fn deposit_agent_funds() -> U128;

// 5. Withdraw Unspent Agent Balance
pub fn withdraw_agent_funds(amount: Option<U128>) -> Promise;

// 6. Submit Deduction Question & Structured AI Record
pub fn submit_question(
    round_id: u64,
    question: String,
    answer: String,
    rule_out_candidate_ids: Option<Vec<u32>>,
) -> QuestionView;

// 7. Submit Candidate Secret Guess (Consumes 1 of 3 guess quotas)
pub fn submit_guess(
    round_id: u64,
    candidate_id: u32,
    candidate_name: String,
) -> GuessResultView;

// 8. Claim Pot with TEE Verification & Commitment Reveal
pub fn claim(
    round_id: u64,
    candidate_id: u32,
    candidate_name: String,
    salt: String,
    signature_hex: Option<String>,
) -> Promise;

// 9. Rollover Unsolved Pot upon Timeout
pub fn rollover(
    round_id: u64,
    salt: Option<String>,
    secret: Option<String>,
) -> RoundView;

// Admin Methods
pub fn create_round(
    commitment: String,
    initial_pot: Option<U128>,
    duration_nanos: Option<u64>,
    entry_fee: Option<U128>,
) -> RoundView;

pub fn set_paused(paused: bool);
pub fn set_tee_public_key(public_key_hex: Option<String>);
pub fn set_protocol_fee_recipient(recipient_id: AccountId);
pub fn withdraw_fees(amount: Option<U128>) -> Promise;
```

---

### 2.2 View Methods (Read-Only Spectator Calls)

```rust
pub fn get_current_round(&self) -> Option<RoundView>;
pub fn get_round(&self, round_id: u64) -> Option<RoundView>;
pub fn get_question_feed(&self, round_id: u64) -> Vec<QuestionView>;
pub fn get_player_info(&self, round_id: u64, account_id: AccountId) -> PlayerInfoView;
pub fn get_active_agents(&self) -> Vec<AgentView>;
pub fn get_board(&self) -> Vec<CandidateView>;
pub fn is_paused(&self) -> bool;
pub fn get_protocol_fee_recipient(&self) -> AccountId;
pub fn get_accumulated_fees(&self) -> U128;
pub fn get_agent_balance(&self, account_id: AccountId) -> U128;
pub fn get_tee_public_key(&self) -> Option<String>;
pub fn get_contract_config(&self) -> ConfigView;
```

---

## 3. Real Testnet Sample Outputs (Copied Verbatim)

### 3.1 `get_contract_config`
```json
{
  "owner_id": "cipherpot861267.testnet",
  "protocol_fee_recipient": "cipherpot861267.testnet",
  "accumulated_fees": "44000000000000000000000",
  "tee_public_key": null,
  "paused": false,
  "current_round_id": 2,
  "default_entry_fee": "100000000000000000000000",
  "total_candidates": 64,
  "max_questions_per_round": 20,
  "guesses_per_entry": 3
}
```

### 3.2 `get_current_round` (Active Round 2)
```json
{
  "round_id": 2,
  "status": "Active",
  "pot": "2500000000000000000000000",
  "entry_fee": "100000000000000000000000",
  "start_time": "1794345771256551365",
  "end_time": "1794432171256551365",
  "time_remaining": "85870968202457",
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

### 3.3 `get_round` (Settled Round 1)
```json
{
  "round_id": 1,
  "status": "Settled",
  "pot": "1100000000000000000000000",
  "entry_fee": "100000000000000000000000",
  "start_time": "1794345129294180697",
  "end_time": "1794348729294180697",
  "time_remaining": "0",
  "questions_asked": 1,
  "max_questions": 20,
  "questions_remaining": 19,
  "total_players": 1,
  "commitment": "3cc07f7cee9c4b29e9154010b48cddb9b5d688badf0e231a9db7f21d5ea09df3",
  "secret_revealed": "Caesar Cipher",
  "salt_revealed": "cipherpot_salt_round_1_seed_9831",
  "winner": "cipherpot861267.testnet",
  "payout": "1056000000000000000000000",
  "rake_amount": "44000000000000000000000"
}
```

### 3.4 `get_question_feed(1)`
```json
[
  {
    "question_id": 1,
    "round_id": 1,
    "asker": "cipherpot861267.testnet",
    "question": "Is it an ancient substitution cipher?",
    "answer": "Yes",
    "timestamp": "1794345292497672224",
    "rule_out_candidate_ids": [
      2,
      6
    ]
  }
]
```

### 3.5 `get_player_info(1, "cipherpot861267.testnet")`
```json
{
  "round_id": 1,
  "account_id": "cipherpot861267.testnet",
  "is_joined": true,
  "guesses_used": 1,
  "guesses_remaining": 2,
  "questions_asked": 1,
  "entry_fee_paid": "100000000000000000000000"
}
```

### 3.6 `get_board` (First 5 of 64 Canonical Secrets)
```json
[
  {
    "id": 1,
    "name": "Caesar Cipher",
    "category": "Classical Cryptography",
    "era": "Ancient",
    "origin": "Rome",
    "type": "Substitution"
  },
  {
    "id": 2,
    "name": "Enigma Machine",
    "category": "Mechanical Cryptography",
    "era": "Modern",
    "origin": "Germany",
    "type": "Rotor Machine"
  },
  {
    "id": 3,
    "name": "Rosetta Stone",
    "category": "Ancient Artifacts",
    "era": "Ancient",
    "origin": "Egypt",
    "type": "Stele"
  },
  {
    "id": 4,
    "name": "Antikythera Mechanism",
    "category": "Ancient Technology",
    "era": "Ancient",
    "origin": "Greece",
    "type": "Analog Computer"
  },
  {
    "id": 5,
    "name": "Voynich Manuscript",
    "category": "Mysterious Codices",
    "era": "Medieval",
    "origin": "Europe",
    "type": "Illustrated Manuscript"
  }
]
```

### 3.7 `is_paused`
```json
false
```

### 3.8 `get_protocol_fee_recipient`
```json
"cipherpot861267.testnet"
```

### 3.9 `get_accumulated_fees`
```json
"44000000000000000000000"
```

### 3.10 `get_agent_balance("cipherpot861267.testnet")`
```json
"0"
```

### 3.11 `get_active_agents`
```json
[]
```

---

## 4. Complete Error Code Catalog

All contract errors are deterministic panic strings:

| Code | Panic Message | Trigger Condition |
|---|---|---|
| `ERR_CONTRACT_PAUSED` | `ERR_CONTRACT_PAUSED: Contract is paused` | Action attempted while admin pause is active |
| `ERR_UNAUTHORIZED` | `ERR_UNAUTHORIZED: Caller is not authorized` | Non-owner calls admin-only method |
| `ERR_ROUND_NOT_FOUND` | `ERR_ROUND_NOT_FOUND: Round does not exist` | Query or action on non-existent round_id |
| `ERR_ROUND_NOT_ACTIVE` | `ERR_ROUND_NOT_ACTIVE: Round is not active` | Interaction on Settled or RolledOver round |
| `ERR_ROUND_EXPIRED` | `ERR_ROUND_EXPIRED: Round time has expired` | Joining or asking questions after `end_time` |
| `ERR_ROUND_NOT_EXPIRED` | `ERR_ROUND_NOT_EXPIRED: Round has not reached timeout for rollover` | `rollover()` called before `end_time` |
| `ERR_ALREADY_JOINED` | `ERR_ALREADY_JOINED: Account has already joined this round` | Account calls `join()` more than once for same round |
| `ERR_NOT_JOINED` | `ERR_NOT_JOINED: Account has not joined this round` | `submit_question` or `submit_guess` before `join()` |
| `ERR_INSUFFICIENT_ENTRY_FEE` | `ERR_INSUFFICIENT_ENTRY_FEE: Attached deposit is less than required entry fee` | `join()` called with `< 0.1 NEAR` |
| `ERR_INSUFFICIENT_AGENT_BALANCE` | `ERR_INSUFFICIENT_AGENT_BALANCE: Pre-funded agent balance is insufficient` | `agent_join()` called with insufficient prefunded balance |
| `ERR_QUESTION_LIMIT_REACHED` | `ERR_QUESTION_LIMIT_REACHED: Maximum 20 questions reached for this round` | Question submitted when `questions_asked >= 20` |
| `ERR_GUESS_LIMIT_EXCEEDED` | `ERR_GUESS_LIMIT_EXCEEDED: Exceeded guess quota (3) for this entry` | Player attempts 4th guess in a round |
| `ERR_INVALID_CANDIDATE_ID` | `ERR_INVALID_CANDIDATE_ID: Candidate ID must be between 1 and 64` | `candidate_id` is 0 or > 64 |
| `ERR_INVALID_TEE_SIGNATURE` | `ERR_INVALID_TEE_SIGNATURE: TEE verification signature is invalid` | Ed25519 signature check fails on `claim()` |
| `ERR_INVALID_COMMITMENT` | `ERR_INVALID_COMMITMENT: Secret reveal does not match committed hash` | `sha256(name:salt)` does not match `round.commitment` |
| `ERR_TRANSFER_FAILED` | `ERR_TRANSFER_FAILED: Transfer operation failed` | Promise transfer failure |
