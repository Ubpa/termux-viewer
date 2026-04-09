#!/usr/bin/env python3
"""
codocs setup-hooks script

Installs git hooks from .codocs/hooks/ into .git/hooks/.
Run this after cloning a repo that uses codocs.

Usage:
    python .codocs/setup-hooks.py [project_root]

If project_root is omitted, walks up from cwd to find .codocs/hooks/.
"""

import os
import shutil
import stat
import sys
from pathlib import Path


def find_project_root(start: Path) -> Path:
    current = start.resolve()
    while True:
        if (current / ".codocs" / "hooks").is_dir():
            return current
        parent = current.parent
        if parent == current:
            raise FileNotFoundError(
                ".codocs/hooks/ not found in any parent directory. "
                "Run from inside a repo initialized with codocs."
            )
        current = parent


def setup_hooks(project_root: Path):
    hooks_src_dir = project_root / ".codocs" / "hooks"
    git_dir = project_root / ".git"

    if not git_dir.is_dir():
        print("[codocs setup-hooks] ERROR: not a git repo", file=sys.stderr)
        sys.exit(1)

    hooks_target = git_dir / "hooks"
    hooks_target.mkdir(exist_ok=True)

    installed, skipped = [], []
    for hook_src in sorted(hooks_src_dir.iterdir()):
        if not hook_src.is_file():
            continue
        hook_dst = hooks_target / hook_src.name
        if hook_dst.exists():
            skipped.append(hook_src.name)
            continue
        shutil.copy2(hook_src, hook_dst)
        hook_dst.chmod(hook_dst.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        installed.append(hook_src.name)

    if installed:
        print(f"[codocs setup-hooks] installed: {', '.join(installed)}", file=sys.stderr)
    if skipped:
        print(
            f"[codocs setup-hooks] WARNING: skipped (already exist): {', '.join(skipped)}\n"
            f"                     codocs hooks are NOT active for these. "
            f"Integrate them into your existing hook setup manually.",
            file=sys.stderr,
        )
    if not installed and not skipped:
        print("[codocs setup-hooks] no hook files found in .codocs/hooks/", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        root = Path(sys.argv[1]).resolve()
        if not root.is_dir():
            print(f"Error: '{sys.argv[1]}' is not a directory", file=sys.stderr)
            sys.exit(1)
    else:
        try:
            root = find_project_root(Path.cwd())
        except FileNotFoundError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)

    print(f"[codocs setup-hooks] project root: {root}", file=sys.stderr)
    setup_hooks(root)
