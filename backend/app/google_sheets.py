import os
from typing import Any

import httpx


async def forward_to_google_apps_script(payload: dict[str, Any]) -> None:
    url = os.getenv("GOOGLE_APPS_SCRIPT_URL")
    if not url:
        return

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
