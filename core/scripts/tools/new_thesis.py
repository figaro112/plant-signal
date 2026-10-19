#!/usr/bin/env python3
"""
new_thesis.py

Stub pre budúci generátor záverečných prác.
CLI + routing už funguje, ale obsah sa zatiaľ len oznámi.
"""

from typing import Any, Dict

from base_fm import debug_print


def generate(ctx: Dict[str, Any]) -> None:
    debug: bool = ctx.get("debug", False)
    instance_name = ctx.get("instance_name", "THESIS_INSTANCE")
    cli_title = ctx.get("cli_title", instance_name)

    debug_print(
        debug,
        f"[THESIS] Stub – zatiaľ nevytváram súbory (instance={instance_name}, title={cli_title})",
    )

    print(
        "[THESIS] Generátor záverečných prác ešte nie je implementovaný.\n"
        f" → Kontext je pripravený (instance='{instance_name}', title='{cli_title}').\n"
        " → Keď budeš mať jasnú štruktúru (kapitoly, priečinky), doplníme generátor.\n"
    )