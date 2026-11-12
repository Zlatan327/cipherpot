"""
Structured AI Deduction Answerer for CipherPot.

Runs inside NEAR AI Cloud TEE with anti-prompt-injection guardrails.
Evaluates yes/no questions against the canonical 64-candidate secret set,
outputs structured records (Yes / No / Unclear), and determines candidate rule-outs.
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any


class AIAnswerer:
    def __init__(self, board_path: Optional[str] = None):
        if not board_path:
            # Look in current dir, parent dir, or ai dir
            candidates_paths = [
                Path(__file__).parent.parent / "board.json",
                Path(__file__).parent / "board.json",
                Path("board.json"),
            ]
            for p in candidates_paths:
                if p.exists():
                    board_path = str(p)
                    break

        self.candidates: List[Dict[str, Any]] = []
        self._eval_cache: Dict[str, Dict[str, Any]] = {}
        if board_path and os.path.exists(board_path):
            with open(board_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.candidates = data.get("candidates", [])
        else:
            print(f"Warning: board.json not found at {board_path}")

    def get_candidate_by_id(self, candidate_id: int) -> Optional[Dict[str, Any]]:
        for c in self.candidates:
            if c["id"] == candidate_id:
                return c
        return None

    def get_candidate_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        name_lower = name.strip().lower()
        for c in self.candidates:
            if c["name"].lower() == name_lower:
                return c
        return None

    def evaluate_question(
        self,
        secret_candidate: Dict[str, Any],
        sanitized_question: str
    ) -> Dict[str, Any]:
        """
        Evaluate a sanitized deduction question against the active round's secret candidate.
        Cost-controlled architecture:
        1. In-memory exact cache check
        2. Deterministic attribute & keyword evaluator (0 token cost, instant)
        3. LLM fallback (Gemini Flash) only for complex edge cases
        """
        norm_q = sanitized_question.strip().lower()
        secret_id = secret_candidate.get("id", 0)
        cache_key = f"{secret_id}::{norm_q}"

        # 1. Fast Cache Hit
        if cache_key in self._eval_cache:
            hit = dict(self._eval_cache[cache_key])
            hit["cached"] = True
            return hit

        # 2. Deterministic Primary Evaluation (0 token cost)
        det_res = self._evaluate_deterministically(secret_candidate, sanitized_question)
        if det_res.get("answer") in ("Yes", "No"):
            det_res["cached"] = False
            self._eval_cache[cache_key] = det_res
            return det_res

        # 3. LLM Edge-Case Fallback (Gemini Flash)
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            try:
                llm_res = self._evaluate_with_gemini(secret_candidate, sanitized_question, gemini_api_key)
                if llm_res and llm_res.get("answer") in ("Yes", "No", "Unclear"):
                    llm_res["cached"] = False
                    self._eval_cache[cache_key] = llm_res
                    return llm_res
            except Exception as e:
                print(f"LLM evaluation fallback triggered: {e}")

        # Default fallback
        det_res["cached"] = False
        self._eval_cache[cache_key] = det_res
        return det_res

    def _evaluate_with_gemini(
        self,
        secret: Dict[str, Any],
        question: str,
        api_key: str
    ) -> Optional[Dict[str, Any]]:
        from google import genai
        client = genai.Client(api_key=api_key)

        prompt = (
            f"You are the impartial TEE referee in a 20 Questions game over a board of 64 cryptography items.\n"
            f"The secret entity is: '{secret['name']}'\n"
            f"Attributes:\n"
            f"- Category: {secret.get('category')}\n"
            f"- Era: {secret.get('era')}\n"
            f"- Origin: {secret.get('origin')}\n"
            f"- Type: {secret.get('type')}\n\n"
            f"User Question: '{question}'\n\n"
            f"Rules:\n"
            f"1. You must respond with EXACTLY ONE word: 'Yes', 'No', or 'Unclear'.\n"
            f"2. Never reveal the secret entity name or attributes.\n"
            f"3. If the question cannot be answered with Yes or No or is ambiguous, reply 'Unclear'."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        raw = response.text.strip().title()
        if "Yes" in raw:
            answer = "Yes"
        elif "No" in raw:
            answer = "No"
        else:
            answer = "Unclear"

        rule_outs = self._calculate_rule_outs(secret, question, answer)
        return {
            "answer": answer,
            "rule_out_candidate_ids": rule_outs,
            "confidence": 0.95,
            "method": "llm"
        }

    def _evaluate_deterministically(
        self,
        secret: Dict[str, Any],
        question: str
    ) -> Dict[str, Any]:
        """
        Evaluate question against known metadata fields of the secret candidate.
        """
        q = question.lower()

        # Attribute extraction keywords
        target_attrs = {
            "era": ["ancient", "medieval", "early modern", "modern", "digital"],
            "origin": [
                "rome", "greece", "sparta", "crete", "egypt", "france", "germany",
                "england", "united kingdom", "united states", "scotland", "poland",
                "belgium", "netherlands", "japan", "israel", "cyberspace", "global"
            ],
            "category_keywords": {
                "classical": "Classical Cryptography",
                "ancient cryptography": "Ancient Cryptography",
                "modern": "Modern Cryptography",
                "cypherpunk": "Cypherpunks",
                "block cipher": "Block Ciphers",
                "stream cipher": "Stream Ciphers",
                "hardware": "Hardware Security",
                "smart contract": "Smart Contracts",
                "anonymity": "Anonymity Networks",
                "zk": "Succinct Arguments",
                "zero knowledge": "Succinct Arguments",
                "sharding": "Consensus & Sharding",
                "consensus": "Consensus & Sharding",
                "data structure": "Data Structures",
            },
            "type_keywords": {
                "substitution": "Substitution",
                "transposition": "Transposition",
                "rotor": "Rotor Machine",
                "enigma": "Rotor Machine",
                "hash": "Hash Function",
                "asymmetric": "Public Key",
                "public key": "Public Key",
                "symmetric": "Symmetric",
                "human": "Cryptographer",
                "person": "Cryptographer",
                "mathematician": "Mathematician",
                "book": "Book Cipher",
            }
        }

        secret_era = str(secret.get("era", "")).lower()
        secret_origin = str(secret.get("origin", "")).lower()
        secret_category = str(secret.get("category", "")).lower()
        secret_type = str(secret.get("type", "")).lower()
        secret_name = str(secret.get("name", "")).lower()

        detected_attr = None
        detected_val = None
        is_negated = "not" in q or "isn't" in q or "doesn't" in q

        # Check Era
        for era in target_attrs["era"]:
            if era in q:
                detected_attr = "era"
                detected_val = era
                match = (era == secret_era)
                answer = "No" if (match if is_negated else not match) else "Yes"
                rule_outs = self._calculate_rule_outs_for_attr("era", era, answer == "Yes")
                return {
                    "answer": answer,
                    "rule_out_candidate_ids": rule_outs,
                    "confidence": 0.9,
                    "method": "deterministic"
                }

        # Check Origin
        for origin in target_attrs["origin"]:
            if origin in q:
                detected_attr = "origin"
                detected_val = origin
                match = (origin in secret_origin)
                answer = "No" if (match if is_negated else not match) else "Yes"
                rule_outs = self._calculate_rule_outs_for_attr("origin", origin, answer == "Yes")
                return {
                    "answer": answer,
                    "rule_out_candidate_ids": rule_outs,
                    "confidence": 0.9,
                    "method": "deterministic"
                }

        # Check Type keywords
        for kw, t_val in target_attrs["type_keywords"].items():
            if kw in q:
                match = (kw in secret_type or kw in secret_category)
                answer = "No" if (match if is_negated else not match) else "Yes"
                rule_outs = self._calculate_rule_outs_for_attr("type", kw, answer == "Yes")
                return {
                    "answer": answer,
                    "rule_out_candidate_ids": rule_outs,
                    "confidence": 0.85,
                    "method": "deterministic"
                }

        # Check Category keywords
        for kw, c_val in target_attrs["category_keywords"].items():
            if kw in q:
                match = (kw in secret_category)
                answer = "No" if (match if is_negated else not match) else "Yes"
                rule_outs = self._calculate_rule_outs_for_attr("category", kw, answer == "Yes")
                return {
                    "answer": answer,
                    "rule_out_candidate_ids": rule_outs,
                    "confidence": 0.85,
                    "method": "deterministic"
                }

        # Check direct mention of name words (e.g. "caesar", "vigenere", "diffie")
        name_words = [w for w in secret_name.split() if len(w) > 3]
        for w in name_words:
            if w in q:
                answer = "Yes" if not is_negated else "No"
                return {
                    "answer": answer,
                    "rule_out_candidate_ids": [],
                    "confidence": 0.9,
                    "method": "deterministic"
                }

        # Default fallback for unrecognized yes/no questions
        return {
            "answer": "Unclear",
            "rule_out_candidate_ids": [],
            "confidence": 0.5,
            "method": "deterministic"
        }

    def _calculate_rule_outs_for_attr(self, attr_name: str, value: str, answer_is_yes: bool) -> List[int]:
        """
        Calculate which candidate IDs are ruled out:
        - If answer is Yes: rule out all candidates where attribute does NOT match.
        - If answer is No: rule out all candidates where attribute DOES match.
        """
        ruled_out = []
        val_lower = value.lower()

        for c in self.candidates:
            c_val = str(c.get(attr_name, "")).lower()
            matches = (val_lower in c_val)

            if answer_is_yes and not matches:
                ruled_out.append(c["id"])
            elif not answer_is_yes and matches:
                ruled_out.append(c["id"])

        return ruled_out

    def _calculate_rule_outs(self, secret: Dict[str, Any], question: str, answer: str) -> List[int]:
        if answer == "Unclear":
            return []
        q = question.lower()
        # Find any matching attributes
        for era in ["ancient", "medieval", "early modern", "modern", "digital"]:
            if era in q:
                return self._calculate_rule_outs_for_attr("era", era, answer == "Yes")
        for origin in ["rome", "greece", "france", "germany", "england", "united states", "japan"]:
            if origin in q:
                return self._calculate_rule_outs_for_attr("origin", origin, answer == "Yes")
        return []
