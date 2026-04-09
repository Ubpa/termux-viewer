#!/usr/bin/env python3
"""
codocs setup-hooks script

Writes shim scripts into .git/hooks/ that delegate to .codocs/hooks/.
Run this after cloning a repo that uses codocs.

Usage:
    python .codocs/setup-hooks.py [project_root]

If project_root is omitted, walks up from cwd to find .codocs/hooks/.
"""

import os
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

    installed, updated = [], []
    for hook_src in sorted(hooks_src_dir.iterdir()):
        if not hook_src.is_file():
            continue
        hook_dst = hooks_target / hook_src.name
        existed = hook_dst.exists()

        # Write a shim that delegates to the versioned hook in .codocs/hooks/
        # Use explicit \n to avoid CRLF on Windows corrupting the shebang line
        rel = hook_src.relative_to(project_root).as_posix()
        shim = '#!/usr/bin/env bash\nexec "$(git rev-parse --show-toplevel)/{}" "$@"\n'.format(rel)
        hook_dst.write_text(shim, encoding="utf-8", newline="\n")
        hook_dst.chmod(hook_dst.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        (updated if existed else installed).append(hook_src.name)

    if installed:
        print(f"[codocs setup-hooks] installed: {', '.join(installed)}", file=sys.stderr)
    if updated:
        print(f"[codocs setup-hooks] updated: {', '.join(updated)}", file=sys.stderr)
    if not installed and not updated:
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
