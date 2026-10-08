import asyncio
import json
from typing import Set
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/events", tags=["events"])


class EventBroadcaster:
    def __init__(self):
        self._listeners: Set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        self._listeners.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._listeners.discard(q)

    async def broadcast(self, event_type: str, data: dict | None = None):
        """Broadcast an event to all connected admin and user browsers."""
        payload = json.dumps({"type": event_type, "data": data or {}})
        for q in list(self._listeners):
            try:
                if q.full():
                    try:
                        q.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                await q.put(payload)
            except Exception:
                pass


broadcaster = EventBroadcaster()


async def broadcast_event(event_type: str, data: dict | None = None):
    await broadcaster.broadcast(event_type, data)


@router.get("")
async def sse_events(request: Request):
    """Real-time Server-Sent Events stream for instant updates across Admin and User apps."""
    q = broadcaster.subscribe()

    async def stream():
        try:
            # Welcome handshake event
            yield f"data: {json.dumps({'type': 'connected'})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"data: {message}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat comment to keep HTTP connection alive through reverse proxies
                    yield ": ping\n\n"
        finally:
            broadcaster.unsubscribe(q)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disables proxy buffering in Nginx
        },
    )
