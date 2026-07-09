import socketio
from typing import Any

# Use AsyncServer for FastAPI compatibility
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*'  # In production, specify settings.CORS_ORIGINS
)

# ASGI app wrapper
socket_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    print(f"Socket connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Socket disconnected: {sid}")

async def broadcast_preference_update(key: str, data: Any):
    """Notify all connected clients that a preference has changed."""
    await sio.emit('preference_updated', {'key': key, 'data': data})
