"""Read-only monitoring for the NEAR round lifecycle."""

import os
import time
import json
import base64
import urllib.request


RPC_URL = os.getenv("NEAR_RPC_URL", "https://rpc.testnet.near.org")
CONTRACT_ID = os.getenv("CONTRACT_ID", "cipherpot861267.testnet")

def rpc_call(method: str, args: dict | None = None):
    args_b64 = base64.b64encode(json.dumps(args or {}).encode()).decode()
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
    def run_check_cycle(self):
        """Query contract to check round status and report the next operator action."""
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
                if time_remaining <= 0:
                    print(f"[Daemon] Round #{round_id} expired unsolved! Ready for rollover.")
                else:
                    # Round is actively running
                    pass

            elif status in ("Settled", "RolledOver"):
                print(f"[Daemon] Round #{round_id} concluded with status '{status}'. Ready for the operator to open the next round.")

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
