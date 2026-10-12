from fastapi import HTTPException


def positions(ids: list[str]) -> list[dict]:
    """Ids in display order -> rows for one executemany UPDATE by primary key."""
    try:
        return [{"id": int(item_id), "order": position} for position, item_id in enumerate(ids)]
    except (TypeError, ValueError):
        raise HTTPException(400, "Ids must be numbers.")
