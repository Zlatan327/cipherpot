# CipherPot AI Backend & TEE Service

CipherPot's AI service executes in a Trusted Execution Environment (TEE) / Confidential VM to provide cryptographically provable deduction gameplay on NEAR Protocol.

## Architecture

1. **Anti-Prompt-Injection Guardrails (`ai/guardrails.py`)**
   - Intercepts and sanitizes user/agent questions before reaching deduction referee.
   - Detects jailbreaks (`ignore previous instructions`, `developer mode`), secret leakage queries, script tags, delimiter attacks, and length stuffing.
   - Rejects non-deductive attempts with structured error messages.

2. **Impartial Structured Answerer (`ai/answerer.py`)**
   - Evaluates deduction questions against the confidential round secret.
   - Constrained strictly to three outputs: `Yes`, `No`, or `Unclear`.
   - Computes deterministic candidate rule-out sets (`rule_out_candidate_ids`) across the 64 canonical candidates to update the public board.
   - Dual-engine: Deterministic cryptographic attribute evaluator with optional Google Gemini (`gemini-2.5-flash`) integration.

3. **TEE Enclave Cryptographic Signer (`ai/tee_signer.py`)**
   - **Secret Commitment:** Generates `sha256(f"{candidate_name}:{salt}")` committed to the NEAR smart contract at round start.
   - **Verdict Signing:** When a user or agent submits a correct guess, the enclave signs an Ed25519 verdict signature over `f"{round_id}:{candidate_id}:{claimer}:{salt}"`.
   - **On-chain Verification:** The smart contract verifies the Ed25519 signature against `tee_public_key` and verifies the SHA-256 commitment hash before releasing 96% of the pot to the winner.

4. **Autonomous Agent & MCP Endpoints (`ai/agent_service.py`)**
   - Standard REST endpoints (`/agent/status`, `/agent/board`, `/agent/ask`, `/agent/guess`).
   - Native Model Context Protocol (MCP) tool server (`/mcp/tools`, `/mcp/call`) allowing autonomous AI agents (Claude, Gemini, Near AI Agents) to inspect board data, ask questions, eliminate candidates, and submit guesses with cryptographic claim signatures.

---

## API Endpoints

| Method | Endpoint | Description | Public / Spectator |
|---|---|---|---|
| `GET` | `/health` | Enclave status, public key, candidate count | Yes |
| `GET` | `/board.json` | 64 canonical candidate secrets dataset | Yes |
| `GET` | `/candidates/{id}` | Single candidate metadata | Yes |
| `POST` | `/ask` | Ask a deduction question; returns Yes/No/Unclear + rule-outs | No (Requires round participant) |
| `POST` | `/tee/commit` | Generate secret commitment hash for new round | Operator / Enclave |
| `POST` | `/tee/verify-guess` | Verify secret guess; signs claim verdict if correct | Joined Player / Agent |
| `POST` | `/tee/reveal/{id}` | Reveal secret and salt for auditability | Public |
| `GET` | `/agent/status` | Agent round state and pot size | Yes |
| `GET` | `/agent/board` | Query candidate board with filters | Yes |
| `POST` | `/agent/ask` | Autonomous agent question submission | Agents |
| `POST` | `/agent/guess` | Autonomous agent guess & verdict generation | Agents |
| `GET` | `/mcp/tools` | Model Context Protocol tools manifest | Yes |
| `POST` | `/mcp/call` | Model Context Protocol tool execution | Agents |

---

## Running the Service

```bash
# 1. Install dependencies
pip install -r ai/requirements.txt

# 2. Run the server
python -m uvicorn ai.app:app --host 0.0.0.0 --port 8000
```
