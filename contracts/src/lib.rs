use near_sdk::collections::{LookupMap, UnorderedSet};
use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, require, AccountId, PanicOnDefault, Promise};

pub type Balance = u128;

/// 64 Canonical candidates board count
pub const TOTAL_CANDIDATES: u32 = 64;
/// Maximum questions across all participants per round
pub const MAX_QUESTIONS_PER_ROUND: u32 = 20;
/// Guesses granted per entry fee to defeat brute-force bots
pub const GUESSES_PER_ENTRY: u32 = 3;
/// Protocol rake: 4% of pot on settled claims (4 / 100)
pub const PROTOCOL_RAKE_BPS: u128 = 400; // 4.00%
pub const BPS_DENOMINATOR: u128 = 10_000;
/// Default round duration: 1 hour in nanoseconds (3,600,000,000,000 ns)
pub const DEFAULT_ROUND_DURATION_NANOS: u64 = 3_600_000_000_000;
/// Default entry fee: 0.1 NEAR (100,000,000,000,000,000,000,000 yoctoNEAR)
pub const DEFAULT_ENTRY_FEE: Balance = 100_000_000_000_000_000_000_000;

// Standard Error Catalog Codes
pub const ERR_CONTRACT_PAUSED: &str = "ERR_CONTRACT_PAUSED: Contract is paused";
pub const ERR_UNAUTHORIZED: &str = "ERR_UNAUTHORIZED: Caller is not authorized";
pub const ERR_ROUND_NOT_FOUND: &str = "ERR_ROUND_NOT_FOUND: Round does not exist";
pub const ERR_ROUND_NOT_ACTIVE: &str = "ERR_ROUND_NOT_ACTIVE: Round is not active";
pub const ERR_ROUND_EXPIRED: &str = "ERR_ROUND_EXPIRED: Round time has expired";
pub const ERR_ROUND_NOT_EXPIRED: &str = "ERR_ROUND_NOT_EXPIRED: Round has not reached timeout for rollover";
pub const ERR_ALREADY_JOINED: &str = "ERR_ALREADY_JOINED: Account has already joined this round";
pub const ERR_NOT_JOINED: &str = "ERR_NOT_JOINED: Account has not joined this round";
pub const ERR_INSUFFICIENT_ENTRY_FEE: &str = "ERR_INSUFFICIENT_ENTRY_FEE: Attached deposit is less than required entry fee";
pub const ERR_INSUFFICIENT_AGENT_BALANCE: &str = "ERR_INSUFFICIENT_AGENT_BALANCE: Pre-funded agent balance is insufficient";
pub const ERR_QUESTION_LIMIT_REACHED: &str = "ERR_QUESTION_LIMIT_REACHED: Maximum 20 questions reached for this round";
pub const ERR_GUESS_LIMIT_EXCEEDED: &str = "ERR_GUESS_LIMIT_EXCEEDED: Exceeded guess quota (3) for this entry";
pub const ERR_INVALID_CANDIDATE_ID: &str = "ERR_INVALID_CANDIDATE_ID: Candidate ID must be between 1 and 64";
pub const ERR_INVALID_TEE_SIGNATURE: &str = "ERR_INVALID_TEE_SIGNATURE: TEE verification signature is invalid";
pub const ERR_INVALID_COMMITMENT: &str = "ERR_INVALID_COMMITMENT: Secret reveal does not match committed hash";
pub const ERR_TRANSFER_FAILED: &str = "ERR_TRANSFER_FAILED: Transfer operation failed";

#[near(serializers = [json, borsh])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum RoundStatus {
    Active,
    Settled,
    RolledOver,
    Paused,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Round {
    pub round_id: u64,
    pub status: RoundStatus,
    pub pot: Balance,
    pub entry_fee: Balance,
    pub start_time: u64,
    pub end_time: u64,
    pub questions_asked: u32,
    pub max_questions: u32,
    pub commitment: String,
    pub secret_revealed: Option<String>,
    pub salt_revealed: Option<String>,
    pub winner: Option<AccountId>,
    pub payout: Option<Balance>,
    pub rake_amount: Option<Balance>,
    pub total_players: u32,
}

#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub struct PlayerRecord {
    pub account_id: AccountId,
    pub is_joined: bool,
    pub guesses_used: u32,
    pub questions_asked: u32,
    pub joined_at: u64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct QuestionRecord {
    pub question_id: u64,
    pub round_id: u64,
    pub asker: AccountId,
    pub question: String,
    pub answer: String, // "Yes", "No", "Unclear"
    pub timestamp: u64,
    pub rule_out_candidate_ids: Vec<u32>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct GuessRecord {
    pub round_id: u64,
    pub player: AccountId,
    pub candidate_id: u32,
    pub candidate_name: String,
    pub timestamp: u64,
    pub is_correct: bool,
}

// ============ Frontend / Agent View Shapes (all strings for balances & times) ============

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct RoundView {
    pub round_id: u64,
    pub status: String,
    pub pot: U128,              // yoctoNEAR string
    pub entry_fee: U128,        // yoctoNEAR string
    pub start_time: U64,        // nanosecond string
    pub end_time: U64,          // nanosecond string
    pub time_remaining: U64,    // nanosecond string
    pub questions_asked: u32,
    pub max_questions: u32,
    pub questions_remaining: u32,
    pub total_players: u32,
    pub commitment: String,
    pub secret_revealed: Option<String>,
    pub salt_revealed: Option<String>,
    pub winner: Option<AccountId>,
    pub payout: Option<U128>,
    pub rake_amount: Option<U128>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct PlayerInfoView {
    pub round_id: u64,
    pub account_id: AccountId,
    pub is_joined: bool,
    pub guesses_used: u32,
    pub guesses_remaining: u32,
    pub questions_asked: u32,
    pub entry_fee_paid: U128,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct QuestionView {
    pub question_id: u64,
    pub round_id: u64,
    pub asker: AccountId,
    pub question: String,
    pub answer: String,
    pub timestamp: U64,
    pub rule_out_candidate_ids: Vec<u32>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct AgentView {
    pub account_id: AccountId,
    pub balance: U128,
    pub questions_asked: u32,
    pub guesses_made: u32,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct CandidateView {
    pub id: u32,
    pub name: String,
    pub category: String,
    pub era: String,
    pub origin: String,
    pub r#type: String,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct GuessResultView {
    pub round_id: u64,
    pub candidate_id: u32,
    pub candidate_name: String,
    pub guesses_remaining: u32,
    pub is_correct: bool,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct ClaimResultView {
    pub round_id: u64,
    pub winner: AccountId,
    pub candidate_id: u32,
    pub payout: U128,
    pub rake_amount: U128,
    pub secret_revealed: String,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct ConfigView {
    pub owner_id: AccountId,
    pub protocol_fee_recipient: AccountId,
    pub accumulated_fees: U128,
    pub tee_public_key: Option<String>,
    pub paused: bool,
    pub current_round_id: u64,
    pub default_entry_fee: U128,
    pub total_candidates: u32,
    pub max_questions_per_round: u32,
    pub guesses_per_entry: u32,
}

// ============ Main Contract State ============

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct CipherPot {
    pub owner_id: AccountId,
    pub protocol_fee_recipient: AccountId,
    pub accumulated_fees: Balance,
    pub tee_public_key: Option<String>,
    pub paused: bool,
    pub current_round_id: u64,

    // Storage maps using near-sdk collections
    pub rounds: LookupMap<u64, Round>,
    pub round_players: LookupMap<(u64, AccountId), PlayerRecord>,
    pub round_player_lists: LookupMap<u64, Vec<AccountId>>,
    pub round_questions: LookupMap<u64, Vec<QuestionRecord>>,
    pub round_guesses: LookupMap<u64, Vec<GuessRecord>>,

    pub agent_balances: LookupMap<AccountId, Balance>,
    pub known_agents: UnorderedSet<AccountId>,
}

#[near]
impl CipherPot {
    #[init]
    pub fn init(
        owner_id: AccountId,
        protocol_fee_recipient: Option<AccountId>,
        tee_public_key: Option<String>,
    ) -> Self {
        require!(!env::state_exists(), "Already initialized");
        let fee_recipient = protocol_fee_recipient.unwrap_or_else(|| owner_id.clone());

        Self {
            owner_id,
            protocol_fee_recipient: fee_recipient,
            accumulated_fees: 0,
            tee_public_key,
            paused: false,
            current_round_id: 0,
            rounds: LookupMap::new(b"r"),
            round_players: LookupMap::new(b"p"),
            round_player_lists: LookupMap::new(b"l"),
            round_questions: LookupMap::new(b"q"),
            round_guesses: LookupMap::new(b"g"),
            agent_balances: LookupMap::new(b"a"),
            known_agents: UnorderedSet::new(b"k"),
        }
    }

    // =========================================================================
    // Core Game Write Methods
    // =========================================================================

    /// Join the active round by paying the fixed NEAR entry fee.
    #[payable]
    pub fn join(&mut self, round_id: Option<u64>) -> PlayerInfoView {
        self.assert_not_paused();
        let target_round_id = round_id.unwrap_or(self.current_round_id);
        let mut round = self.get_round_internal(target_round_id);
        self.assert_round_active(&round);

        let caller = env::predecessor_account_id();
        let deposit = env::attached_deposit().as_yoctonear();

        require!(
            deposit >= round.entry_fee,
            ERR_INSUFFICIENT_ENTRY_FEE
        );

        let key = (target_round_id, caller.clone());
        require!(
            self.round_players.get(&key).is_none(),
            ERR_ALREADY_JOINED
        );

        // Record player entry
        let player = PlayerRecord {
            account_id: caller.clone(),
            is_joined: true,
            guesses_used: 0,
            questions_asked: 0,
            joined_at: env::block_timestamp(),
        };
        self.round_players.insert(&key, &player);

        let mut list = self.round_player_lists.get(&target_round_id).unwrap_or_default();
        list.push(caller.clone());
        self.round_player_lists.insert(&target_round_id, &list);

        // Update pot and player count
        round.pot = round.pot.saturating_add(deposit);
        round.total_players = round.total_players.saturating_add(1);
        self.rounds.insert(&target_round_id, &round);

        self.player_record_to_view(player, round.round_id, round.entry_fee)
    }

    /// Autonomous AI agent join deducting from pre-funded contract deposit allowance.
    pub fn agent_join(&mut self, round_id: Option<u64>) -> PlayerInfoView {
        self.assert_not_paused();
        let target_round_id = round_id.unwrap_or(self.current_round_id);
        let mut round = self.get_round_internal(target_round_id);
        self.assert_round_active(&round);

        let caller = env::predecessor_account_id();
        let agent_bal = self.agent_balances.get(&caller).unwrap_or(0);
        require!(
            agent_bal >= round.entry_fee,
            ERR_INSUFFICIENT_AGENT_BALANCE
        );

        let key = (target_round_id, caller.clone());
        require!(
            self.round_players.get(&key).is_none(),
            ERR_ALREADY_JOINED
        );

        // Deduct from agent spend allowance
        let remaining_bal = agent_bal.saturating_sub(round.entry_fee);
        self.agent_balances.insert(&caller, &remaining_bal);
        self.known_agents.insert(&caller);

        let player = PlayerRecord {
            account_id: caller.clone(),
            is_joined: true,
            guesses_used: 0,
            questions_asked: 0,
            joined_at: env::block_timestamp(),
        };
        self.round_players.insert(&key, &player);

        let mut list = self.round_player_lists.get(&target_round_id).unwrap_or_default();
        list.push(caller.clone());
        self.round_player_lists.insert(&target_round_id, &list);

        round.pot = round.pot.saturating_add(round.entry_fee);
        round.total_players = round.total_players.saturating_add(1);
        self.rounds.insert(&target_round_id, &round);

        self.player_record_to_view(player, round.round_id, round.entry_fee)
    }

    /// Pre-fund agent spending allowance.
    #[payable]
    pub fn deposit_agent_funds(&mut self) -> U128 {
        self.assert_not_paused();
        let caller = env::predecessor_account_id();
        let deposit = env::attached_deposit().as_yoctonear();
        require!(deposit > 0, "Attached deposit must be greater than zero");

        let current_bal = self.agent_balances.get(&caller).unwrap_or(0);
        let new_bal = current_bal.saturating_add(deposit);
        self.agent_balances.insert(&caller, &new_bal);
        self.known_agents.insert(&caller);

        U128(new_bal)
    }

    /// Withdraw unused agent allowance.
    pub fn withdraw_agent_funds(&mut self, amount: Option<U128>) -> Promise {
        let caller = env::predecessor_account_id();
        let current_bal = self.agent_balances.get(&caller).unwrap_or(0);
        let withdraw_amt = amount.map(|a| a.0).unwrap_or(current_bal);

        require!(withdraw_amt > 0, "Withdrawal amount must be greater than zero");
        require!(withdraw_amt <= current_bal, "Withdrawal exceeds available agent balance");

        let remaining = current_bal - withdraw_amt;
        self.agent_balances.insert(&caller, &remaining);

        Promise::new(caller).transfer(near_sdk::NearToken::from_yoctonear(withdraw_amt))
    }

    /// Submit a deduction question and record structured AI verdict.
    pub fn submit_question(
        &mut self,
        round_id: u64,
        question: String,
        answer: String,
        rule_out_candidate_ids: Option<Vec<u32>>,
    ) -> QuestionView {
        self.assert_not_paused();
        let mut round = self.get_round_internal(round_id);
        self.assert_round_active(&round);

        let caller = env::predecessor_account_id();
        let key = (round_id, caller.clone());

        // Must be a joined player or the contract owner/TEE operator
        let mut player = if caller == self.owner_id {
            self.round_players.get(&key).unwrap_or(PlayerRecord {
                account_id: caller.clone(),
                is_joined: true,
                guesses_used: 0,
                questions_asked: 0,
                joined_at: env::block_timestamp(),
            })
        } else {
            self.round_players.get(&key).expect(ERR_NOT_JOINED)
        };

        require!(
            round.questions_asked < round.max_questions,
            ERR_QUESTION_LIMIT_REACHED
        );

        round.questions_asked = round.questions_asked.saturating_add(1);
        player.questions_asked = player.questions_asked.saturating_add(1);

        self.rounds.insert(&round_id, &round);
        self.round_players.insert(&key, &player);

        let mut questions = self.round_questions.get(&round_id).unwrap_or_default();
        let q_id = questions.len() as u64 + 1;
        let record = QuestionRecord {
            question_id: q_id,
            round_id,
            asker: caller,
            question,
            answer,
            timestamp: env::block_timestamp(),
            rule_out_candidate_ids: rule_out_candidate_ids.unwrap_or_default(),
        };
        questions.push(record.clone());
        self.round_questions.insert(&round_id, &questions);

        QuestionView {
            question_id: record.question_id,
            round_id: record.round_id,
            asker: record.asker,
            question: record.question,
            answer: record.answer,
            timestamp: U64(record.timestamp),
            rule_out_candidate_ids: record.rule_out_candidate_ids,
        }
    }

    /// Submit a guess against the 64-candidate secret set using 1 of 3 guess quotas.
    pub fn submit_guess(
        &mut self,
        round_id: u64,
        candidate_id: u32,
        candidate_name: String,
    ) -> GuessResultView {
        self.assert_not_paused();
        let round = self.get_round_internal(round_id);
        self.assert_round_active(&round);

        require!(
            candidate_id >= 1 && candidate_id <= TOTAL_CANDIDATES,
            ERR_INVALID_CANDIDATE_ID
        );

        let caller = env::predecessor_account_id();
        let key = (round_id, caller.clone());
        let mut player = self.round_players.get(&key).expect(ERR_NOT_JOINED);

        require!(
            player.guesses_used < GUESSES_PER_ENTRY,
            ERR_GUESS_LIMIT_EXCEEDED
        );

        player.guesses_used = player.guesses_used.saturating_add(1);
        self.round_players.insert(&key, &player);

        let guess_rec = GuessRecord {
            round_id,
            player: caller,
            candidate_id,
            candidate_name: candidate_name.clone(),
            timestamp: env::block_timestamp(),
            is_correct: false, // Updated upon claim settlement
        };
        let mut guesses = self.round_guesses.get(&round_id).unwrap_or_default();
        guesses.push(guess_rec);
        self.round_guesses.insert(&round_id, &guesses);

        GuessResultView {
            round_id,
            candidate_id,
            candidate_name,
            guesses_remaining: GUESSES_PER_ENTRY.saturating_sub(player.guesses_used),
            is_correct: false,
        }
    }

    /// Claim the pot using a TEE-signed verification verdict and secret commitment reveal.
    pub fn claim(
        &mut self,
        round_id: u64,
        candidate_id: u32,
        candidate_name: String,
        salt: String,
        signature_hex: Option<String>,
    ) -> Promise {
        self.assert_not_paused();
        let mut round = self.get_round_internal(round_id);
        self.assert_round_active(&round);

        require!(
            candidate_id >= 1 && candidate_id <= TOTAL_CANDIDATES,
            ERR_INVALID_CANDIDATE_ID
        );

        let claimer = env::predecessor_account_id();
        let key = (round_id, claimer.clone());
        require!(self.round_players.get(&key).is_some(), ERR_NOT_JOINED);

        // Verify cryptographic commitment: sha256(format!("{}:{}", candidate_name, salt)) == round.commitment
        let commitment_preimage = format!("{}:{}", candidate_name, salt);
        let hash_bytes = env::sha256(commitment_preimage.as_bytes());
        let computed_commitment = hex_encode(&hash_bytes);

        require!(
            computed_commitment.eq_ignore_ascii_case(&round.commitment),
            ERR_INVALID_COMMITMENT
        );

        // Verify TEE Ed25519 signature if a public key is configured
        if let Some(ref pubkey_hex) = self.tee_public_key {
            if let Some(ref sig_hex) = signature_hex {
                self.verify_tee_ed25519_signature(round_id, candidate_id, &claimer, &salt, sig_hex, pubkey_hex);
            } else {
                env::panic_str(ERR_INVALID_TEE_SIGNATURE);
            }
        }

        // Calculate 4% protocol rake and 96% winner payout
        let total_pot = round.pot;
        let rake = (total_pot * PROTOCOL_RAKE_BPS) / BPS_DENOMINATOR;
        let winner_payout = total_pot.saturating_sub(rake);

        self.accumulated_fees = self.accumulated_fees.saturating_add(rake);

        // Update round state to Settled
        round.status = RoundStatus::Settled;
        round.winner = Some(claimer.clone());
        round.payout = Some(winner_payout);
        round.rake_amount = Some(rake);
        round.secret_revealed = Some(candidate_name.clone());
        round.salt_revealed = Some(salt);
        self.rounds.insert(&round_id, &round);

        // Transfer 96% payout to winner
        Promise::new(claimer).transfer(near_sdk::NearToken::from_yoctonear(winner_payout))
    }

    /// Rollover pot to the next round if timeout expires unsolved.
    pub fn rollover(
        &mut self,
        round_id: u64,
        salt: Option<String>,
        secret: Option<String>,
    ) -> RoundView {
        self.assert_not_paused();
        let mut round = self.get_round_internal(round_id);
        require!(
            round.status == RoundStatus::Active,
            ERR_ROUND_NOT_ACTIVE
        );

        let now = env::block_timestamp();
        require!(
            now >= round.end_time,
            ERR_ROUND_NOT_EXPIRED
        );

        // Mark current round as RolledOver
        round.status = RoundStatus::RolledOver;
        if let (Some(s), Some(k)) = (secret, salt) {
            round.secret_revealed = Some(s);
            round.salt_revealed = Some(k);
        }
        self.rounds.insert(&round_id, &round);

        // Rolled over pot seeds the next round if created
        self.round_to_view(&round)
    }

    // =========================================================================
    // Admin & Operational Controls
    // =========================================================================

    /// Create a new round with a cryptographic commitment (hash of secret + salt).
    pub fn create_round(
        &mut self,
        commitment: String,
        duration_nanos: Option<u64>,
        entry_fee: Option<U128>,
        initial_pot: Option<U128>,
    ) -> RoundView {
        self.assert_owner();
        let round_id = self.current_round_id + 1;
        self.current_round_id = round_id;

        let start_time = env::block_timestamp();
        let duration = duration_nanos.unwrap_or(DEFAULT_ROUND_DURATION_NANOS);
        let end_time = start_time + duration;
        let fee = entry_fee.map(|f| f.0).unwrap_or(DEFAULT_ENTRY_FEE);
        let pot = initial_pot.map(|p| p.0).unwrap_or(0);

        let round = Round {
            round_id,
            status: RoundStatus::Active,
            pot,
            entry_fee: fee,
            start_time,
            end_time,
            questions_asked: 0,
            max_questions: MAX_QUESTIONS_PER_ROUND,
            commitment,
            secret_revealed: None,
            salt_revealed: None,
            winner: None,
            payout: None,
            rake_amount: None,
            total_players: 0,
        };

        self.rounds.insert(&round_id, &round);
        self.round_to_view(&round)
    }

    /// Admin emergency pause toggle.
    pub fn set_paused(&mut self, paused: bool) {
        self.assert_owner();
        self.paused = paused;
    }

    /// Configure TEE Ed25519 public key.
    pub fn set_tee_public_key(&mut self, public_key: String) {
        self.assert_owner();
        self.tee_public_key = Some(public_key);
    }

    /// Configure protocol rake recipient.
    pub fn set_protocol_fee_recipient(&mut self, recipient: AccountId) {
        self.assert_owner();
        self.protocol_fee_recipient = recipient;
    }

    /// Withdraw accumulated protocol 4% rake fees.
    pub fn withdraw_fees(&mut self, recipient: Option<AccountId>) -> Promise {
        self.assert_owner();
        let target = recipient.unwrap_or_else(|| self.protocol_fee_recipient.clone());
        let amount = self.accumulated_fees;
        require!(amount > 0, "No accumulated fees to withdraw");

        self.accumulated_fees = 0;
        Promise::new(target).transfer(near_sdk::NearToken::from_yoctonear(amount))
    }

    // =========================================================================
    // Read-Only Views (No Account and No Wallet Required - Spectator Mode)
    // =========================================================================

    /// Get current active round view.
    pub fn get_current_round(&self) -> Option<RoundView> {
        if self.current_round_id == 0 {
            None
        } else {
            self.get_round(self.current_round_id)
        }
    }

    /// Get round by ID.
    pub fn get_round(&self, round_id: u64) -> Option<RoundView> {
        self.rounds.get(&round_id).map(|r| self.round_to_view(&r))
    }

    /// Spectator-mode question feed for a round.
    pub fn get_question_feed(&self, round_id: u64) -> Vec<QuestionView> {
        self.round_questions
            .get(&round_id)
            .unwrap_or_default()
            .into_iter()
            .map(|q| QuestionView {
                question_id: q.question_id,
                round_id: q.round_id,
                asker: q.asker,
                question: q.question,
                answer: q.answer,
                timestamp: U64(q.timestamp),
                rule_out_candidate_ids: q.rule_out_candidate_ids,
            })
            .collect()
    }

    /// Inspect a specific player's status and remaining guess quota.
    pub fn get_player_info(&self, round_id: u64, account_id: AccountId) -> PlayerInfoView {
        let key = (round_id, account_id.clone());
        let round = self.rounds.get(&round_id);
        let entry_fee = round.map(|r| r.entry_fee).unwrap_or(DEFAULT_ENTRY_FEE);

        if let Some(record) = self.round_players.get(&key) {
            self.player_record_to_view(record, round_id, entry_fee)
        } else {
            PlayerInfoView {
                round_id,
                account_id,
                is_joined: false,
                guesses_used: 0,
                guesses_remaining: GUESSES_PER_ENTRY,
                questions_asked: 0,
                entry_fee_paid: U128(0),
            }
        }
    }

    /// Active agents panel data for spectator mode.
    pub fn get_active_agents(&self, round_id: u64) -> Vec<AgentView> {
        let mut result = Vec::new();
        for agent_id in self.known_agents.iter() {
            let bal = self.agent_balances.get(&agent_id).unwrap_or(0);
            let player_rec = self.round_players.get(&(round_id, agent_id.clone()));
            let (questions, guesses) = player_rec
                .map(|p| (p.questions_asked, p.guesses_used))
                .unwrap_or((0, 0));

            result.push(AgentView {
                account_id: agent_id,
                balance: U128(bal),
                questions_asked: questions,
                guesses_made: guesses,
            });
        }
        result
    }

    /// Canonical 64 candidate secret board.
    pub fn get_board(&self) -> Vec<CandidateView> {
        get_canonical_board()
    }

    /// Check if contract is paused.
    pub fn is_paused(&self) -> bool {
        self.paused
    }

    /// Check agent prefunded balance.
    pub fn get_agent_balance(&self, account_id: AccountId) -> U128 {
        U128(self.agent_balances.get(&account_id).unwrap_or(0))
    }

    /// Get protocol fee recipient.
    pub fn get_protocol_fee_recipient(&self) -> AccountId {
        self.protocol_fee_recipient.clone()
    }

    /// Get accumulated protocol rake fees in yoctoNEAR.
    pub fn get_accumulated_fees(&self) -> U128 {
        U128(self.accumulated_fees)
    }

    /// Get TEE verification public key.
    pub fn get_tee_public_key(&self) -> Option<String> {
        self.tee_public_key.clone()
    }

    /// Overall contract configuration view.
    pub fn get_contract_config(&self) -> ConfigView {
        ConfigView {
            owner_id: self.owner_id.clone(),
            protocol_fee_recipient: self.protocol_fee_recipient.clone(),
            accumulated_fees: U128(self.accumulated_fees),
            tee_public_key: self.tee_public_key.clone(),
            paused: self.paused,
            current_round_id: self.current_round_id,
            default_entry_fee: U128(DEFAULT_ENTRY_FEE),
            total_candidates: TOTAL_CANDIDATES,
            max_questions_per_round: MAX_QUESTIONS_PER_ROUND,
            guesses_per_entry: GUESSES_PER_ENTRY,
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner_id, ERR_UNAUTHORIZED);
    }

    fn assert_not_paused(&self) {
        require!(!self.paused, ERR_CONTRACT_PAUSED);
    }

    fn assert_round_active(&self, round: &Round) {
        require!(round.status == RoundStatus::Active, ERR_ROUND_NOT_ACTIVE);
        let now = env::block_timestamp();
        require!(now < round.end_time, ERR_ROUND_EXPIRED);
    }

    fn get_round_internal(&self, round_id: u64) -> Round {
        self.rounds.get(&round_id).expect(ERR_ROUND_NOT_FOUND)
    }

    fn round_to_view(&self, round: &Round) -> RoundView {
        let now = env::block_timestamp();
        let remaining = if round.status == RoundStatus::Active && round.end_time > now {
            round.end_time - now
        } else {
            0
        };

        let status_str = match round.status {
            RoundStatus::Active => "Active",
            RoundStatus::Settled => "Settled",
            RoundStatus::RolledOver => "RolledOver",
            RoundStatus::Paused => "Paused",
        };

        RoundView {
            round_id: round.round_id,
            status: status_str.to_string(),
            pot: U128(round.pot),
            entry_fee: U128(round.entry_fee),
            start_time: U64(round.start_time),
            end_time: U64(round.end_time),
            time_remaining: U64(remaining),
            questions_asked: round.questions_asked,
            max_questions: round.max_questions,
            questions_remaining: round.max_questions.saturating_sub(round.questions_asked),
            total_players: round.total_players,
            commitment: round.commitment.clone(),
            secret_revealed: round.secret_revealed.clone(),
            salt_revealed: round.salt_revealed.clone(),
            winner: round.winner.clone(),
            payout: round.payout.map(U128),
            rake_amount: round.rake_amount.map(U128),
        }
    }

    fn player_record_to_view(&self, player: PlayerRecord, round_id: u64, entry_fee: Balance) -> PlayerInfoView {
        PlayerInfoView {
            round_id,
            account_id: player.account_id,
            is_joined: player.is_joined,
            guesses_used: player.guesses_used,
            guesses_remaining: GUESSES_PER_ENTRY.saturating_sub(player.guesses_used),
            questions_asked: player.questions_asked,
            entry_fee_paid: U128(entry_fee),
        }
    }

    fn verify_tee_ed25519_signature(
        &self,
        round_id: u64,
        candidate_id: u32,
        claimer: &AccountId,
        salt: &str,
        sig_hex: &str,
        pubkey_hex: &str,
    ) {
        let msg = format!("{}:{}:{}:{}", round_id, candidate_id, claimer, salt);
        let sig_bytes = hex_decode(sig_hex).expect(ERR_INVALID_TEE_SIGNATURE);
        let pubkey_bytes = hex_decode(pubkey_hex).expect(ERR_INVALID_TEE_SIGNATURE);

        if sig_bytes.len() != 64 || pubkey_bytes.len() != 32 {
            env::panic_str(ERR_INVALID_TEE_SIGNATURE);
        }

        let mut sig_arr = [0u8; 64];
        sig_arr.copy_from_slice(&sig_bytes);

        let mut pubkey_arr = [0u8; 32];
        pubkey_arr.copy_from_slice(&pubkey_bytes);

        let valid = env::ed25519_verify(&sig_arr, msg.as_bytes(), &pubkey_arr);
        require!(valid, ERR_INVALID_TEE_SIGNATURE);
    }
}

fn hex_encode(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push_str(&format!("{:02x}", b));
    }
    s
}

fn hex_decode(hex_str: &str) -> Option<Vec<u8>> {
    if hex_str.len() % 2 != 0 {
        return None;
    }
    (0..hex_str.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex_str[i..i + 2], 16).ok())
        .collect()
}

// Canonical 64 candidate secrets matching board.json
pub fn get_canonical_board() -> Vec<CandidateView> {
    vec![
        CandidateView { id: 1, name: "Caesar Cipher".into(), category: "Classical Cryptography".into(), era: "Ancient".into(), origin: "Rome".into(), r#type: "Substitution".into() },
        CandidateView { id: 2, name: "Enigma Machine".into(), category: "Mechanical Cryptography".into(), era: "Modern".into(), origin: "Germany".into(), r#type: "Rotor Machine".into() },
        CandidateView { id: 3, name: "Rosetta Stone".into(), category: "Ancient Artifacts".into(), era: "Ancient".into(), origin: "Egypt".into(), r#type: "Stele".into() },
        CandidateView { id: 4, name: "Antikythera Mechanism".into(), category: "Ancient Technology".into(), era: "Ancient".into(), origin: "Greece".into(), r#type: "Analog Computer".into() },
        CandidateView { id: 5, name: "Voynich Manuscript".into(), category: "Mysterious Codices".into(), era: "Medieval".into(), origin: "Europe".into(), r#type: "Illustrated Manuscript".into() },
        CandidateView { id: 6, name: "RSA Algorithm".into(), category: "Modern Cryptography".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Public Key".into() },
        CandidateView { id: 7, name: "Diffie-Hellman Key Exchange".into(), category: "Modern Cryptography".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Key Protocol".into() },
        CandidateView { id: 8, name: "SHA-256".into(), category: "Cryptographic Primitives".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Hash Function".into() },
        CandidateView { id: 9, name: "Bitcoin Whitepaper".into(), category: "Decentralized Systems".into(), era: "Digital".into(), origin: "Cyberspace".into(), r#type: "Protocol Spec".into() },
        CandidateView { id: 10, name: "Satoshi Nakamoto".into(), category: "Cypherpunks".into(), era: "Digital".into(), origin: "Unknown".into(), r#type: "Pseudonym".into() },
        CandidateView { id: 11, name: "Alan Turing".into(), category: "Pioneers".into(), era: "Modern".into(), origin: "United Kingdom".into(), r#type: "Cryptanalyst".into() },
        CandidateView { id: 12, name: "Claude Shannon".into(), category: "Information Theory".into(), era: "Modern".into(), origin: "United States".into(), r#type: "Mathematician".into() },
        CandidateView { id: 13, name: "Bletchley Park".into(), category: "Cryptanalysis Centers".into(), era: "Modern".into(), origin: "United Kingdom".into(), r#type: "Historic Estate".into() },
        CandidateView { id: 14, name: "Lorenz Cipher".into(), category: "Mechanical Cryptography".into(), era: "Modern".into(), origin: "Germany".into(), r#type: "Teleprinter Cipher".into() },
        CandidateView { id: 15, name: "One-Time Pad".into(), category: "Information-Theoretic Security".into(), era: "Modern".into(), origin: "United States".into(), r#type: "Perfect Secrecy".into() },
        CandidateView { id: 16, name: "Beale Ciphers".into(), category: "Unsolved Mysteries".into(), era: "Modern".into(), origin: "United States".into(), r#type: "Book Cipher".into() },
        CandidateView { id: 17, name: "Kryptos Sculpture".into(), category: "Art & Cryptography".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Sculpture".into() },
        CandidateView { id: 18, name: "Zodiac 340 Cipher".into(), category: "Serial Cryptography".into(), era: "Modern".into(), origin: "United States".into(), r#type: "Homophonic Cipher".into() },
        CandidateView { id: 19, name: "Phaistos Disc".into(), category: "Ancient Artifacts".into(), era: "Ancient".into(), origin: "Crete".into(), r#type: "Clay Disc".into() },
        CandidateView { id: 20, name: "Babington Plot".into(), category: "Historical Espionage".into(), era: "Early Modern".into(), origin: "England".into(), r#type: "Coded Conspiracy".into() },
        CandidateView { id: 21, name: "Mary Queen of Scots".into(), category: "Historical Figures".into(), era: "Early Modern".into(), origin: "Scotland".into(), r#type: "Monarch".into() },
        CandidateView { id: 22, name: "Vigenere Cipher".into(), category: "Classical Cryptography".into(), era: "Early Modern".into(), origin: "France".into(), r#type: "Polyalphabetic".into() },
        CandidateView { id: 23, name: "Playfair Cipher".into(), category: "Classical Cryptography".into(), era: "Modern".into(), origin: "United Kingdom".into(), r#type: "Digraphic Substitution".into() },
        CandidateView { id: 24, name: "Navajo Code Talkers".into(), category: "Military Communications".into(), era: "Modern".into(), origin: "United States".into(), r#type: "Spoken Code".into() },
        CandidateView { id: 25, name: "Linear B".into(), category: "Deciphered Scripts".into(), era: "Ancient".into(), origin: "Greece".into(), r#type: "Syllabic Script".into() },
        CandidateView { id: 26, name: "Michael Ventris".into(), category: "Decipherers".into(), era: "Modern".into(), origin: "United Kingdom".into(), r#type: "Architect / Philologist".into() },
        CandidateView { id: 27, name: "Jean-Francois Champollion".into(), category: "Decipherers".into(), era: "Modern".into(), origin: "France".into(), r#type: "Egyptologist".into() },
        CandidateView { id: 28, name: "Scytale of Sparta".into(), category: "Ancient Cryptography".into(), era: "Ancient".into(), origin: "Sparta".into(), r#type: "Transposition Tool".into() },
        CandidateView { id: 29, name: "Polybius Square".into(), category: "Ancient Cryptography".into(), era: "Ancient".into(), origin: "Greece".into(), r#type: "Fractionation Grid".into() },
        CandidateView { id: 30, name: "Al-Kindi".into(), category: "Pioneers".into(), era: "Medieval".into(), origin: "Abbasid Caliphate".into(), r#type: "Frequency Analysis".into() },
        CandidateView { id: 31, name: "Jefferson Disk".into(), category: "Mechanical Cryptography".into(), era: "Early Modern".into(), origin: "United States".into(), r#type: "Wheel Cipher".into() },
        CandidateView { id: 32, name: "ADFGVX Cipher".into(), category: "Military Field Ciphers".into(), era: "Modern".into(), origin: "Germany".into(), r#type: "Fractionation & Transposition".into() },
        CandidateView { id: 33, name: "Purple Machine".into(), category: "Diplomatic Ciphers".into(), era: "Modern".into(), origin: "Japan".into(), r#type: "Stepping-Switch Cipher".into() },
        CandidateView { id: 34, name: "Project Venona".into(), category: "Counterintelligence".into(), era: "Modern".into(), origin: "United States".into(), r#type: "Signal Decryption".into() },
        CandidateView { id: 35, name: "Zimmermann Telegram".into(), category: "Signal Intelligence".into(), era: "Modern".into(), origin: "Germany".into(), r#type: "Diplomatic Cable".into() },
        CandidateView { id: 36, name: "Colossus Computer".into(), category: "Computing History".into(), era: "Modern".into(), origin: "United Kingdom".into(), r#type: "Electronic Computer".into() },
        CandidateView { id: 37, name: "Tommy Flowers".into(), category: "Computing Pioneers".into(), era: "Modern".into(), origin: "United Kingdom".into(), r#type: "Engineer".into() },
        CandidateView { id: 38, name: "Marian Rejewski".into(), category: "Cryptanalysts".into(), era: "Modern".into(), origin: "Poland".into(), r#type: "Mathematician".into() },
        CandidateView { id: 39, name: "DES Standard".into(), category: "Block Ciphers".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Symmetric Feistel".into() },
        CandidateView { id: 40, name: "AES Rijndael".into(), category: "Block Ciphers".into(), era: "Digital".into(), origin: "Belgium".into(), r#type: "Substitution-Permutation".into() },
        CandidateView { id: 41, name: "Zero-Knowledge Proof".into(), category: "Modern Cryptography".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Cryptographic Proof".into() },
        CandidateView { id: 42, name: "Merkle Tree".into(), category: "Data Structures".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Hash Tree".into() },
        CandidateView { id: 43, name: "Ralph Merkle".into(), category: "Pioneers".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Cryptographer".into() },
        CandidateView { id: 44, name: "Elliptic Curve Cryptography".into(), category: "Modern Cryptography".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Algebraic Curve".into() },
        CandidateView { id: 45, name: "Ed25519".into(), category: "Signature Schemes".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Edwards Curve".into() },
        CandidateView { id: 46, name: "Daniel J. Bernstein".into(), category: "Cryptographers".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Mathematician".into() },
        CandidateView { id: 47, name: "PGP Pretty Good Privacy".into(), category: "Privacy Tools".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Encrypted Email".into() },
        CandidateView { id: 48, name: "Phil Zimmermann".into(), category: "Cypherpunks".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Creator".into() },
        CandidateView { id: 49, name: "Cypherpunk Manifesto".into(), category: "Movements".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Foundational Text".into() },
        CandidateView { id: 50, name: "Eric Hughes".into(), category: "Cypherpunks".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Activist".into() },
        CandidateView { id: 51, name: "Hal Finney".into(), category: "Cypherpunks".into(), era: "Digital".into(), origin: "United States".into(), r#type: "RPOW Pioneer".into() },
        CandidateView { id: 52, name: "Nick Szabo".into(), category: "Smart Contracts".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Legal Theorist".into() },
        CandidateView { id: 53, name: "Tor Onion Router".into(), category: "Anonymity Networks".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Onion Routing".into() },
        CandidateView { id: 54, name: "Signal Protocol".into(), category: "End-to-End Encryption".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Double Ratchet".into() },
        CandidateView { id: 55, name: "Moxie Marlinspike".into(), category: "Cryptographers".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Security Researcher".into() },
        CandidateView { id: 56, name: "Trusted Execution Environment".into(), category: "Hardware Security".into(), era: "Digital".into(), origin: "Global".into(), r#type: "Hardware Enclave".into() },
        CandidateView { id: 57, name: "Intel SGX".into(), category: "Hardware Security".into(), era: "Digital".into(), origin: "United States".into(), r#type: "Enclave Architecture".into() },
        CandidateView { id: 58, name: "NEAR Nightshade".into(), category: "Consensus & Sharding".into(), era: "Digital".into(), origin: "Global".into(), r#type: "Sharded Blockchain".into() },
        CandidateView { id: 59, name: "Rainbow Bridge".into(), category: "Trustless Bridges".into(), era: "Digital".into(), origin: "Global".into(), r#type: "Cross-Chain Client".into() },
        CandidateView { id: 60, name: "zk-SNARK".into(), category: "Succinct Arguments".into(), era: "Digital".into(), origin: "Global".into(), r#type: "Non-Interactive Proof".into() },
        CandidateView { id: 61, name: "Shamir Secret Sharing".into(), category: "Threshold Schemes".into(), era: "Digital".into(), origin: "Israel".into(), r#type: "Polynomial Secret Sharing".into() },
        CandidateView { id: 62, name: "Adi Shamir".into(), category: "Cryptographers".into(), era: "Digital".into(), origin: "Israel".into(), r#type: "Turing Awardee".into() },
        CandidateView { id: 63, name: "Kerckhoffs Principle".into(), category: "Cryptographic Axioms".into(), era: "Modern".into(), origin: "Netherlands".into(), r#type: "Open Design Principle".into() },
        CandidateView { id: 64, name: "Auguste Kerckhoffs".into(), category: "Linguists & Cryptographers".into(), era: "Modern".into(), origin: "Netherlands".into(), r#type: "Theorist".into() },
    ]
}
