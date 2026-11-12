"""
TEE Verification & Cryptographic Verdict Signer for CipherPot.

Runs inside NEAR AI Cloud TEE / Confidential VM.
Responsible for:
1. Generating secret commitment hashes: sha256(candidate_name:salt)
2. Signing guess verdicts with Ed25519 private key inside TEE enclave
3. Supplying public key for on-chain verification in NEAR smart contract
"""

import hashlib
import os
import secrets
from typing import Tuple, Optional
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization


class TEESigner:
    """TEE Enclave cryptographic signer for CipherPot."""

    def __init__(self, private_key_hex: Optional[str] = None):
        """
        Initialize the TEE signer.
        If private_key_hex is provided (64-byte or 32-byte seed hex), loads it;
        otherwise generates a fresh ephemeral Ed25519 keypair.
        """
        if private_key_hex:
            key_bytes = bytes.fromhex(private_key_hex)
            if len(key_bytes) == 32:
                self._private_key = ed25519.Ed25519PrivateKey.from_private_bytes(key_bytes)
            elif len(key_bytes) == 64:
                # 32-byte seed + 32-byte public key or raw seed
                self._private_key = ed25519.Ed25519PrivateKey.from_private_bytes(key_bytes[:32])
            else:
                raise ValueError("Invalid private key length: expected 32 or 64 hex bytes")
        else:
            self._private_key = ed25519.Ed25519PrivateKey.generate()

        self._public_key = self._private_key.public_key()

    @property
    def public_key_hex(self) -> str:
        """Return 32-byte raw public key as 64-character lowercase hex."""
        raw_pub = self._public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        return raw_pub.hex()

    @property
    def private_key_hex(self) -> str:
        """Return 32-byte raw private key seed as 64-character hex (TEE confidential)."""
        raw_priv = self._private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )
        return raw_priv.hex()

    @staticmethod
    def generate_commitment(candidate_name: str, salt: Optional[str] = None) -> Tuple[str, str]:
        """
        Generate on-chain secret commitment.
        Commitment = sha256(f"{candidate_name}:{salt}")
        Returns: (commitment_hex, salt)
        """
        if not salt:
            salt = secrets.token_hex(16)  # 32 hex chars (128 bits entropy)

        preimage = f"{candidate_name}:{salt}".encode("utf-8")
        commitment_hex = hashlib.sha256(preimage).hexdigest()
        return commitment_hex, salt

    @staticmethod
    def verify_commitment(candidate_name: str, salt: str, commitment_hex: str) -> bool:
        """Verify whether candidate_name and salt reproduce the given commitment."""
        preimage = f"{candidate_name}:{salt}".encode("utf-8")
        expected = hashlib.sha256(preimage).hexdigest()
        return expected.lower() == commitment_hex.strip().lower()

    def sign_verdict(self, round_id: int, candidate_id: int, claimer: str, salt: str) -> str:
        """
        Sign a correct guess verdict inside the TEE enclave.
        Message payload matches contract expectation: f"{round_id}:{candidate_id}:{claimer}:{salt}"
        Returns: 64-byte Ed25519 signature as 128-character lowercase hex string.
        """
        msg = f"{round_id}:{candidate_id}:{claimer}:{salt}".encode("utf-8")
        sig_bytes = self._private_key.sign(msg)
        return sig_bytes.hex()

    def verify_verdict(self, round_id: int, candidate_id: int, claimer: str, salt: str, signature_hex: str) -> bool:
        """Local verification of a signed verdict against the TEE public key."""
        try:
            msg = f"{round_id}:{candidate_id}:{claimer}:{salt}".encode("utf-8")
            sig_bytes = bytes.fromhex(signature_hex)
            self._public_key.verify(sig_bytes, msg)
            return True
        except Exception:
            return False


# Deterministic Enclave Default Seed (32 bytes)
# Ensures TEE key identity remains consistent across daemon restarts unless overridden by env
DEFAULT_ENCLAVE_SEED_HEX = "3b67466182bfb0ccfd0914550fcb402104a66cdd674df6058cf752a63e6d624a"

# Singleton default enclave signer instance
_default_signer: Optional[TEESigner] = None

def get_tee_signer() -> TEESigner:
    global _default_signer
    if _default_signer is None:
        priv_hex = os.getenv("TEE_PRIVATE_KEY_HEX", DEFAULT_ENCLAVE_SEED_HEX)
        _default_signer = TEESigner(priv_hex)
    return _default_signer
