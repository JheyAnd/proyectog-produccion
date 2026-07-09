"""Activity log persistence — stores user edit history server-side in MySQL."""
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.models.activity_model import ActivityLogModel

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("")
async def get_activity(
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session)
) -> List[Dict[str, Any]]:
    """Get recent activity logs from the database."""
    stmt = select(ActivityLogModel).order_by(desc(ActivityLogModel.timestamp)).limit(limit)
    result = await db.execute(stmt)
    entries = result.scalars().all()
    
    return [
        {
            "id": entry.id,
            "userId": entry.user_id,
            "userName": entry.user_name,
            "userRole": entry.user_role,
            "module": entry.module,
            "page": entry.page,
            "action": entry.action,
            "before": entry.before_state,
            "after": entry.after_state,
            "link": entry.target_link,
            "timestamp": entry.timestamp.isoformat()
        }
        for entry in entries
    ]


@router.post("")
async def append_activity(
    request: Request,
    db: AsyncSession = Depends(get_db_session)
) -> Dict[str, bool]:
    """Append a new activity log entry to the database."""
    try:
        entry_data = await request.json()
    except Exception:
        return {"saved": False}

    try:
        timestamp = entry_data.get("timestamp")
        if timestamp:
            try:
                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except ValueError:
                dt = datetime.now(timezone.utc)
        else:
            dt = datetime.now(timezone.utc)

        new_log = ActivityLogModel(
            user_id=entry_data.get("userId", "system"),
            user_name=entry_data.get("userName", "System"),
            user_role=entry_data.get("userRole", "system"),
            module=entry_data.get("module"),
            page=entry_data.get("page", "Unknown"),
            action=entry_data.get("action", "Unknown action"),
            before_state=entry_data.get("before"),
            after_state=entry_data.get("after"),
            target_link=entry_data.get("link"),
            timestamp=dt
        )
        db.add(new_log)
        await db.commit()
        return {"saved": True}
    except Exception as e:
        import logging
        logging.error(f"Failed to save activity log: {e}")
        await db.rollback()
        return {"saved": False}
