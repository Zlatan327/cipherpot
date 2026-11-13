# CipherPot

CipherPot is a multiplayer game of 20 Questions on NEAR Testnet. Each round hides one item from a board of 64. Players share up to 20 yes-or-no questions and use the answers to cross off items. Each player gets three guesses. The first player to submit a successful claim receives 96% of the pot in test NEAR.

[Open CipherPot](https://cipherpot.vercel.app) · [View the testnet contract](https://testnet.nearblocks.io/address/cipherpot861267.testnet)

## How to play

1. Open the board and read the questions other players have asked. You can browse without a wallet.
2. Connect a NEAR Testnet wallet and pay the round's entry fee to join.
3. Ask a yes-or-no question or choose a remaining item to guess. If you guess correctly, approve the claim in your wallet.

Try a question that divides the board, such as “Was it invented before 1900?” A question that rules out many items can help everyone in the round.

## Run locally

From the repository root, start the Python API:

```sh
python -m venv .venv
. .venv/bin/activate
python -m pip install -r ai/requirements.txt
python -m uvicorn ai.app:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). The frontend reads NEAR Testnet by default. A locally generated signing key will differ from the key configured on the deployed contract. End-to-end claim testing requires a test deployment with a matching signer and round commitment.

For a hosted frontend build, set `API_URL` to the HTTPS URL of the deployed Python API. Vercel's static frontend build does not start the Python service.

## Project structure

| Directory | Responsibility |
| --- | --- |
| `frontend/` | React board, wallet integration and testnet reads |
| `ai/` | FastAPI referee, question suggestions and guess signing |
| `contracts/` | Rust contract for entries, guesses, round state and payouts |
