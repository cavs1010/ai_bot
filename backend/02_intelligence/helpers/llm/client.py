# helpers/llm/client.py — shared pydantic-ai factory for the gate LLM calls
# Phase 4 | Intelligence Layer | Shared standard for Gates 2–5
#
# Two functions set the standard every LLM gate reuses:
#   build_agent(output_type, system_prompt, model=..., temperature=..., retries=...)
#       → a configured pydantic-ai Agent. Build ONCE per gate (at module load), reuse per candidate.
#   run_agent(agent, user_prompt)
#       → validated .output (a BaseModel) | None on any failure (fetcher contract).
#
# Model is overridable per gate via build_agent(model=...). Default is cheap (Haiku) for testing.
#
# Test: python backend/02_intelligence/helpers/llm/client.py

import os
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import TypeVar

from dotenv import load_dotenv
from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.settings import ModelSettings

load_dotenv()

OutputT = TypeVar('OutputT', bound=BaseModel)  # gate output model flows through build → run

# Cheap default while testing; gates override per call via build_agent(model=...).
DEFAULT_MODEL = 'anthropic:claude-haiku-4-5-20251001'
DEFAULT_TEMPERATURE = 0.0   # deterministic — gates need stable structured answers
DEFAULT_MAX_TOKENS = 256    # gate replies are a few short fields


def build_agent(
    output_type: type[OutputT],
    system_prompt: str,
    *,
    model: str = DEFAULT_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
    retries: int = 2,
) -> Agent[None, OutputT]:
    """
    Builds a configured pydantic-ai Agent for a single gate.

    Call once at gate-module load and reuse the returned agent for every candidate —
    Agents are stateless and meant to be constructed once.

    Args:
        output_type:   Pydantic model the LLM response is validated into.
        system_prompt: The gate's fixed system instruction.
        model:         'provider:model' string, e.g. 'anthropic:claude-haiku-4-5-20251001'.
                       Override per gate to trade cost for quality. Default is the cheap Haiku.
        temperature:   Sampling temperature. Default 0.0 for deterministic structured answers.
        retries:       pydantic-ai output-validation retries. Default 2.

    Returns:
        A pydantic_ai.Agent. Construction is local — it does not call the API.
    """
    if not os.getenv('ANTHROPIC_API_KEY'):
        print('[llm] ANTHROPIC_API_KEY not set — live calls will fail until it is added to .env')
    return Agent(
        model,
        output_type=output_type,
        system_prompt=system_prompt,
        model_settings=ModelSettings(temperature=temperature, max_tokens=DEFAULT_MAX_TOKENS),
        retries=retries,
    )


def run_agent(agent: Agent[None, OutputT], user_prompt: str) -> OutputT | None:
    """
    Runs one LLM call and returns the validated response object.

    Wraps agent.run_sync() in the project's fetcher contract: any failure
    (network, auth, output validation) prints a [llm] warning and returns None.
    The caller decides what None means for its gate.

    Args:
        agent:       Agent from build_agent().
        user_prompt: The fully formatted user message for this candidate.

    Returns:
        The agent's output_type instance, or None on any failure.
    """
    max_retries = 5
    backoff = 2
    for attempt in range(max_retries):
        try:
            try:
                asyncio.get_running_loop()
                loop_exists = True
            except RuntimeError:
                # No running loop (plain script) — the simple sync path.
                loop_exists = False
            
            if not loop_exists:
                return agent.run_sync(user_prompt).output
            
            # A loop is already running (Jupyter notebook / async caller). run_sync would raise,
            # so run the async call in a worker thread that owns a fresh loop.
            with ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(lambda: asyncio.run(agent.run(user_prompt)).output).result()
        except Exception as e:
            err_msg = str(e)
            is_rate_limit = any(x in err_msg.upper() for x in ['429', 'RESOURCE_EXHAUSTED', 'QUOTA', 'RATE_LIMIT', 'RATE LIMIT'])
            if is_rate_limit and attempt < max_retries - 1:
                sleep_time = backoff * (2 ** attempt)
                print(f"[llm] Rate limited (429/RESOURCE_EXHAUSTED). Retrying in {sleep_time} seconds (attempt {attempt + 1}/{max_retries})...")
                time.sleep(sleep_time)
                continue
            print(f'[llm] call failed — {e}')
            return None


if __name__ == '__main__':
    # Exercise build_agent + run_agent with TestModel — proves wiring at zero API cost.
    from pydantic_ai.models.test import TestModel

    class _Demo(BaseModel):
        ok: bool
        note: str

    agent = build_agent(_Demo, 'You are a wiring test.')
    with agent.override(model=TestModel()):
        result = run_agent(agent, 'ping')

    assert isinstance(result, _Demo), f'expected _Demo, got {type(result)!r}'
    print(f'[llm] build_agent + run_agent OK ✅ → {result!r}')
