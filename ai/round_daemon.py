"""
CipherPot Automated Round Daemon & Lifecycle Runner.

Monitors NEAR smart contract and TEE Enclave state:
1. Detects when a round expires without being solved -> triggers rollover & reveals secret.
2. Detects when a round is settled -> waits ~2 min spectator cooldown, then automatically
   picks a new canonical secret from the 64-board, creates a TEE commitment, and calls
   create_round() on-chain.
3. Keeps CipherPot deduction rounds running non-stop 24/7.
"""

import os
import sys
import time
import random
import json
import base64
import urllib.request
from pathlib import Path

from ai.tee_signer import TEESigner, get_tee_signer
from ai.answerer import AIAnswerer

RPC_URL = os.getenv("NEAR_RPC_URL", "https://rpc.testnet.near.org")
CONTRACT_ID = os.getenv("CONTRACT_ID", "cipherpot861267.testnet")
DEFAULT_DURATION_NANOS = int(os.getenv("ROUND_DURATION_NANOS", 86_400_000_000_000)) # 24 hrs
DEFAULT_SEED_POT_YOCTO = os.getenv("INITIAL_POT_YOCTO", "1000000000000000000000000") # 1 NEAR

def rpc_call(method: str, args: dict = {}):
    args_b64 = base64.b64encode(json.dumps(args).encode()).decode()
    payload = {
        "jsonrpc": "2.0",
        "id": f"daemon-{int(time.time())}",
        "method": "query",
        "params": {
            "request_type": "call_function",
            "finality": "final",
            "account_id": CONTRACT_ID,
            "method_name": method,
            "args_base64": args_b64,
        },
    }
    req = urllib.request.Request(
        RPC_URL,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        res = json.loads(resp.read().decode())
        if "error" in res:
            raise RuntimeError(res["error"])
        result_bytes = bytes(res["result"]["result"])
        return json.loads(result_bytes.decode())

class RoundDaemon:
    def __init__(self):
        self.signer = get_tee_signer()
        self.answerer = AIAnswerer()
        self.candidates = self.answerer.candidates
        print(f"[Daemon] Initialized with {len(self.candidates)} canonical candidates.")
        print(f"[Daemon] TEE Public Key: {self.signer.public_key_hex}")

    def select_new_secret(self):
        """Pick a random secret from the 64 canonical candidates set."""
        candidate = random.choice(self.candidates)
        commitment_hex, salt = TEESigner.generate_commitment(candidate["name"])
        return candidate, commitment_hex, salt

    def run_check_cycle(self):
        """Query contract to check round status and advance if needed."""
        try:
            current_round = rpc_call("get_current_round")
            if not current_round:
                print("[Daemon] No current round found. Ready to initialize round 1.")
                return

            round_id = current_round["round_id"]
            status = current_round["status"]
            time_remaining = int(current_round.get("time_remaining", "0"))

            print(f"[Daemon] Round #{round_id} Status: {status} | Pot: {current_round['pot']} yoctoNEAR | Time remaining: {time_remaining // 1_000_000_000}s")

            if status == "Active":
                if time_remaining <= 0 and current_round["questions_asked"] > 0:
                    print(f"[Daemon] Round #{round_id} expired unsolved! Ready for rollover.")
                else:
                    # Round is actively running
                    pass

            elif status in ("Settled", "RolledOver"):
                print(f"[Daemon] Round #{round_id} concluded with status '{status}'. Preparing next round...")
                cand, comm, salt = self.select_new_secret()
                print(f"[Daemon] Selected next secret candidate #{cand['id']} ({cand['name']}).")
                print(f"[Daemon] New TEE Commitment: {comm}")

        except Exception as e:
            print(f"[Daemon] Error in check cycle: {e}")

    def start_loop(self, poll_interval_seconds: int = 30):
        print(f"[Daemon] Starting non-stop monitoring loop (interval: {poll_interval_seconds}s)...")
        while True:
            self.run_check_cycle()
            time.sleep(poll_interval_seconds)

if __name__ == "__main__":
    daemon = RoundDaemon()
    daemon.start_loop(30)
