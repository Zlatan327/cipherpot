"""
Shannon Information Gain & Mathematical Bisection Engine for CipherPot.

Computes optimal partition entropy across the canonical 64-candidate board,
identifying the exact yes/no questions that maximize information gain (bits)
and minimize the expected remaining search space.
"""

import math
from typing import Dict, List, Any, Optional


def calculate_entropy(p: float) -> float:
    """Calculate binary Shannon entropy in bits for probability p: H(p) = -p*log2(p) - (1-p)*log2(1-p)."""
    if p <= 0.0 or p >= 1.0:
        return 0.0
    return -(p * math.log2(p) + (1.0 - p) * math.log2(1.0 - p))


class ShannonEngine:
    def __init__(self, candidates: List[Dict[str, Any]]):
        self.candidates = candidates
        self.candidates_by_id = {c["id"]: c for c in candidates}

    def compute_suggestions(
        self,
        remaining_ids: Optional[List[int]] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Evaluate candidate partitions across era, origin, type, and category attributes.
        Returns top questions ranked by Shannon Information Gain (closest to 50/50 bisection).
        """
        if remaining_ids is not None:
            active_pool = [self.candidates_by_id[cid] for cid in remaining_ids if cid in self.candidates_by_id]
        else:
            active_pool = self.candidates

        total_active = len(active_pool)
        if total_active <= 1:
            return []

        suggestions: List[Dict[str, Any]] = []

        # 1. Attribute categories to partition
        attribute_extractors = [
            ("era", "Era", "Is the secret from the {val} era?"),
            ("origin", "Origin", "Did it originate in {val}?"),
            ("type", "Type", "Is it classified as a {val}?"),
            ("category", "Category", "Does it belong to the {val} category?"),
        ]

        # Count frequencies for each attribute value
        for attr_key, attr_label, question_template in attribute_extractors:
            val_counts: Dict[str, int] = {}
            for c in active_pool:
                val = c.get(attr_key)
                if val:
                    val_clean = str(val).strip()
                    val_counts[val_clean] = val_counts.get(val_clean, 0) + 1

            for val, count in val_counts.items():
                if count == 0 or count == total_active:
                    continue  # 0 information gain (all or nothing)

                p = count / total_active
                entropy_gain = calculate_entropy(p)

                # Ruled out count if Answer is "Yes" vs "No"
                elim_if_yes = total_active - count
                elim_if_no = count
                expected_elim = int(round(p * elim_if_yes + (1 - p) * elim_if_no))

                suggestions.append({
                    "attribute": attr_label,
                    "value": val,
                    "question": question_template.format(val=val),
                    "split_count": count,
                    "total_active": total_active,
                    "split_ratio": round(p, 3),
                    "entropy_bits": round(entropy_gain, 3),
                    "expected_eliminations": expected_elim,
                    # Score prioritizes closest to 50% bisection (p=0.5)
                    "bisection_quality": round(1.0 - abs(p - 0.5) * 2, 3),
                })

        # Sort by entropy_bits descending, then bisection_quality descending
        suggestions.sort(key=lambda s: (s["entropy_bits"], s["bisection_quality"]), reverse=True)

        # Deduplicate very similar questions and take top limit
        seen_q = set()
        deduped = []
        for s in suggestions:
            q_norm = s["question"].lower()
            if q_norm not in seen_q:
                seen_q.add(q_norm)
                deduped.append(s)
            if len(deduped) >= limit:
                break

        return deduped
