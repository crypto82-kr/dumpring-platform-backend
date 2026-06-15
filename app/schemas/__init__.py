from pydantic import PlainSerializer
from typing import Annotated
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))

def serialize_kst(dt: datetime) -> str:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(KST).isoformat()

KstDateTime = Annotated[datetime, PlainSerializer(serialize_kst, return_type=str)]
