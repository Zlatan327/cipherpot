"""
Agent Integration & MCP (Model Context Protocol) Service for CipherPot.

Enables autonomous AI agents (e.g. NEAR Agent Skills, Claude, Gemini agents)
to interact with CipherPot via structured REST endpoints and MCP tool definitions.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class AgentAskRequest(BaseModel):
    round_id: int = Field(..., description="Active round ID")
    agent_id: str = Field(..., description="NEAR Account ID of the agent")
    question: str = Field(..., description="Deduction question to ask")


class AgentGuessRequest(BaseModel):
    round_id: int = Field(..., description="Active round ID")
    agent_id: str = Field(..., description="NEAR Account ID of the agent")
    candidate_id: int = Field(..., ge=1, le=64, description="Candidate ID (1-64)")
    candidate_name: str = Field(..., description="Exact candidate secret name")


class AgentJoinRequest(BaseModel):
    round_id: int = Field(..., description="Active round ID")
    agent_id: str = Field(..., description="NEAR Account ID of the agent")


def get_mcp_tools_manifest() -> List[Dict[str, Any]]:
    """Return standard Model Context Protocol (MCP) tool schema for CipherPot."""
    return [
        {
            "name": "cipherpot_get_status",
            "description": "Fetch current CipherPot round status, pot size, remaining questions, and active timer.",
            "inputSchema": {
                "type": "object",
                "properties": {},
            },
        },
        {
            "name": "cipherpot_query_board",
            "description": "Fetch candidates from the 64-candidate secret board with optional filtering by era, category, or origin.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "era": {"type": "string", "description": "Filter by era (Ancient, Medieval, Early Modern, Modern, Digital)"},
                    "category": {"type": "string", "description": "Filter by category"},
                    "origin": {"type": "string", "description": "Filter by geographic origin"},
                },
            },
        },
        {
            "name": "cipherpot_ask_question",
            "description": "Submit a yes/no deduction question to the TEE-enforced AI referee. Consumes 1 question quota.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "round_id": {"type": "integer", "description": "The target round ID"},
                    "agent_id": {"type": "string", "description": "Your NEAR account ID"},
                    "question": {"type": "string", "description": "The deduction question to evaluate"},
                },
                "required": ["round_id", "agent_id", "question"],
            },
        },
        {
            "name": "cipherpot_submit_guess",
            "description": "Submit a secret guess. If correct, returns cryptographic TEE verdict signature and salt to claim the pot.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "round_id": {"type": "integer", "description": "The target round ID"},
                    "agent_id": {"type": "string", "description": "Your NEAR account ID"},
                    "candidate_id": {"type": "integer", "description": "Candidate ID between 1 and 64"},
                    "candidate_name": {"type": "string", "description": "Exact candidate name"},
                },
                "required": ["round_id", "agent_id", "candidate_id", "candidate_name"],
            },
        },
        {
            "name": "cipherpot_suggest_shannon_clues",
            "description": "Compute Shannon Information Gain bisection questions across remaining candidates to optimize deduction search space.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "remaining_candidate_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "Optional list of remaining candidate IDs (1-64)",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of suggestions to return (default 5)",
                    },
                },
            },
        },
    ]
