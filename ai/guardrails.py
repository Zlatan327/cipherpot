"""
Anti-Prompt-Injection Sanitization Wrapper & Guardrails for CipherPot.

Runs inside the TEE enclave before question text is passed to the AI answerer.
Blocks prompt injection, jailbreaking, context escape, and instruction overrides.
"""

import re
from typing import Tuple

# Common prompt injection, jailbreak, and extraction patterns
INJECTION_PATTERNS = [
    # Instruction bypass / role alteration
    r"(?i)\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
    r"(?i)\bdisregard\s+(all\s+)?(previous|prior|above)",
    r"(?i)\byou\s+are\s+now\s+(in\s+)?(developer|jailbreak|dan|unrestricted|god)\s+mode",
    r"(?i)\bact\s+as\s+(an\s+)?unrestricted",
    r"(?i)\bpretend\s+(you\s+are|there\s+are\s+no\s+rules)",
    r"(?i)\bnew\s+rule\s*:",
    r"(?i)\boverride\s+(system|safety|security)",

    # Direct secret extraction attempts
    r"(?i)\b(what|tell|reveal|print|output|display|show|leak|whisper|give)\s+(me\s+)?(the\s+)?(secret|word|candidate|answer|target|solution|hash|salt|key)",
    r"(?i)\bsecret\s+(is|name|word|value)\s*\?",
    r"(?i)\bwhat\s+is\s+it\s*\?",
    r"(?i)\bis\s+the\s+secret\s+word\b",
    r"(?i)\bis\s+the\s+exact\s+answer\b",

    # System prompt extraction
    r"(?i)\brepeat\s+(the\s+)?(system|initial|above|first)\s+(prompt|instruction|message)",
    r"(?i)\bwhat\s+(are\s+your|was\s+your)\s+(instructions|system\s+prompt)",

    # Delimiter / enclosure attacks
    r"(?i)<\s*(system|instruction|admin|override)\s*>",
    r"(?i)\[\s*(system|instruction|admin)\s*\]",
    r"(?i)```(system|json|instruction)?",
    r"(?i)\bbase64\s*(decode|encoded)?",
    r"(?i)\brot13\b",
]

COMPILED_INJECTIONS = [re.compile(p) for p in INJECTION_PATTERNS]


class GuardrailCheckResult:
    def __init__(self, is_valid: bool, reason: str, sanitized: str):
        self.is_valid = is_valid
        self.reason = reason
        self.sanitized = sanitized

    def to_dict(self):
        return {
            "is_valid": self.is_valid,
            "reason": self.reason,
            "sanitized": self.sanitized,
        }


def sanitize_and_validate_question(raw_question: str) -> GuardrailCheckResult:
    """
    Sanitize and inspect deduction question for prompt injections,
    delimiter hijacking, and non-yes/no formats.
    """
    if not raw_question or not raw_question.strip():
        return GuardrailCheckResult(False, "Question cannot be empty", "")

    cleaned = raw_question.strip()

    # Length guardrails (max 280 characters to prevent buffer stuffing)
    if len(cleaned) < 4:
        return GuardrailCheckResult(False, "Question too short (minimum 4 characters)", cleaned)
    if len(cleaned) > 280:
        return GuardrailCheckResult(False, "Question too long (maximum 280 characters)", cleaned[:280])

    # Strip control characters except newline and space
    sanitized = "".join(ch for ch in cleaned if ch.isprintable() or ch in ("\n", " "))

    # Check against known prompt injection and jailbreak regexes
    for pattern in COMPILED_INJECTIONS:
        if pattern.search(sanitized):
            return GuardrailCheckResult(
                False,
                "Prompt injection or system override pattern detected. Questions must be standard deduction yes/no queries.",
                sanitized
            )

    # Check for suspicious code execution or script tags
    if re.search(r"(?i)(<script|eval\(|exec\(|subprocess|os\.system|__proto__|process\.env)", sanitized):
        return GuardrailCheckResult(False, "Suspicious code or scripting tokens detected", sanitized)

    return GuardrailCheckResult(True, "OK", sanitized)
