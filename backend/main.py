"""Finesse Life — Python backend service (Railway)

Handles:
- Heavy media compression (ffmpeg + zstandard) offloaded from Vercel
- Intelligence signal ingestion with batch processing
- Supabase JWT verification for protected routes
- Health + readiness probes for Railway
"""
import os
import json
import time
import logging
from typing import Any

import httpx
import jwt
from fastapi import FastAPI, HTTPException, Header, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("finesse")

app = FastAPI(title="finesse-api", version="1.0.0")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "https://finesselife.vip"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase client ───────────────────────────────────────────────────────────
def get_db() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ── JWT auth ──────────────────────────────────────────────────────────────────
def require_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def root() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "finesse-api",
        "supabase": bool(SUPABASE_URL),
        "ai": bool(ANTHROPIC_API_KEY),
    }


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "healthy"}


# ── Intelligence signals — batch ingest ───────────────────────────────────────
class SignalBatch(BaseModel):
    signals: list[dict[str, Any]]


@app.post("/intelligence/signals")
async def ingest_signals(
    body: SignalBatch,
    background: BackgroundTasks,
    user: dict[str, Any] = Depends(require_user),
) -> dict[str, Any]:
    """Batch-insert behavioral signals from client. Fire-and-forget on the DB side."""
    user_id = user.get("sub", "")
    if not user_id:
        raise HTTPException(status_code=401, detail="No user ID in token")

    rows = [
        {
            "user_id": user_id,
            "kind": s.get("kind"),
            "payload": s.get("payload", {}),
            "context": s.get("context", {}),
        }
        for s in body.signals
        if s.get("kind")
    ]

    if not rows:
        return {"inserted": 0}

    background.add_task(_insert_signals, rows)
    return {"inserted": len(rows), "queued": True}


async def _insert_signals(rows: list[dict[str, Any]]) -> None:
    try:
        db = get_db()
        db.table("intelligence_signals").insert(rows).execute()
        log.info("Inserted %d signals", len(rows))
    except Exception as e:
        log.error("Signal insert failed: %s", e)


# ── Behavioral profile summary ────────────────────────────────────────────────
@app.get("/intelligence/profile")
def get_profile(
    user: dict[str, Any] = Depends(require_user),
) -> dict[str, Any]:
    """Return aggregated behavioral profile for the authenticated user."""
    user_id = user.get("sub", "")
    db = get_db()

    since = int(time.time()) - (30 * 24 * 60 * 60)  # 30 days
    resp = (
        db.table("intelligence_signals")
        .select("kind, payload, created_at")
        .eq("user_id", user_id)
        .gte("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(since)))
        .order("created_at", desc=True)
        .limit(250)
        .execute()
    )

    signals = resp.data or []
    category_counts: dict[str, int] = {}
    brand_counts: dict[str, int] = {}
    kind_counts: dict[str, int] = {}

    for s in signals:
        kind_counts[s["kind"]] = kind_counts.get(s["kind"], 0) + 1
        payload = s.get("payload", {})
        if cat := payload.get("category"):
            category_counts[cat] = category_counts.get(cat, 0) + 1
        if brand := payload.get("brand"):
            brand_counts[brand] = brand_counts.get(brand, 0) + 1

    purchase_signals = (
        kind_counts.get("checkout_complete", 0)
        + kind_counts.get("accept_offer", 0)
        + kind_counts.get("vault_fund", 0)
    )
    velocity = "high" if purchase_signals >= 5 else "medium" if purchase_signals >= 2 else "low"

    return {
        "user_id": user_id,
        "signal_count": len(signals),
        "buying_velocity": velocity,
        "top_categories": sorted(category_counts, key=category_counts.get, reverse=True)[:5],  # type: ignore[arg-type]
        "top_brands": sorted(brand_counts, key=brand_counts.get, reverse=True)[:5],  # type: ignore[arg-type]
        "kind_breakdown": kind_counts,
    }


# ── Integration health check ──────────────────────────────────────────────────
@app.get("/intelligence/health")
async def integration_health() -> dict[str, Any]:
    """Probe key external APIs and return health status."""
    db = get_db()

    rows = (
        db.table("integration_health")
        .select("name, status, last_checked, error_message, circuit_state, success_count, failure_count")
        .order("name")
        .execute()
    )

    return {"integrations": rows.data or [], "checked_at": time.time()}


# ── Nova proxy (streaming support for Railway websocket use cases) ─────────────
class NovaRequest(BaseModel):
    prompt: str
    system: str | None = None
    user_id: str | None = None


@app.post("/nova")
async def nova_proxy(body: NovaRequest) -> dict[str, Any]:
    """Proxy to Anthropic — useful for Railway-side long-running Nova tasks."""
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="Anthropic key not configured")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1024,
                "system": body.system or "You are Nova, the Finesse Life AI concierge.",
                "messages": [{"role": "user", "content": body.prompt}],
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Upstream AI error")

    data = resp.json()
    text = data.get("content", [{}])[0].get("text", "")
    return {"text": text, "model": data.get("model")}


# ── Media compression endpoint ─────────────────────────────────────────────────
class CompressRequest(BaseModel):
    url: str
    target_kb: int = 500


@app.post("/media/compress")
async def compress_media(
    body: CompressRequest,
    user: dict[str, Any] = Depends(require_user),
) -> dict[str, Any]:
    """Download media from URL, compress with ffmpeg, return base64 or R2 key."""
    import subprocess
    import tempfile

    async with httpx.AsyncClient(timeout=60) as client:
        dl = await client.get(body.url)

    if dl.status_code != 200:
        raise HTTPException(status_code=400, detail="Could not fetch media URL")

    suffix = ".mp4" if "video" in dl.headers.get("content-type", "") else ".jpg"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_in:
        tmp_in.write(dl.content)
        in_path = tmp_in.name

    out_path = in_path.replace(suffix, f"_compressed{suffix}")

    if suffix == ".mp4":
        cmd = [
            "ffmpeg", "-y", "-i", in_path,
            "-vf", "scale=720:-2",
            "-crf", "28", "-preset", "fast",
            "-movflags", "+faststart",
            out_path,
        ]
    else:
        cmd = [
            "ffmpeg", "-y", "-i", in_path,
            "-vf", "scale=1080:-2",
            "-q:v", "4",
            out_path,
        ]

    result = subprocess.run(cmd, capture_output=True, timeout=60)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail="Compression failed")

    import base64
    with open(out_path, "rb") as f:
        compressed = f.read()

    return {
        "size_kb": len(compressed) // 1024,
        "data_b64": base64.b64encode(compressed).decode(),
        "format": suffix.lstrip("."),
    }
