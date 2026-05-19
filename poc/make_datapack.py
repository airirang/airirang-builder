"""
Build a Minecraft datapack from .mcfunction files.

Usage:
    py make_datapack.py house_hollow_optimized.mcfunction \
        --name airirang_builder \
        --namespace airirang \
        --function house \
        --mc-version 1.21

Output layout (Java Edition 1.20.5+):
    output/datapacks/<name>/
        pack.mcmeta
        data/<namespace>/function/<function>.mcfunction

Drop the <name>/ folder into <world>/datapacks/, then in-game:
    /reload
    /function <namespace>:<function>
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

# pack_format for Java Edition vanilla.
# Source: https://minecraft.wiki/w/Pack_format
PACK_FORMATS = {
    "1.20.5": 41, "1.20.6": 41,
    "1.21":   48, "1.21.0": 48, "1.21.1": 48,
    "1.21.2": 57, "1.21.3": 57,
    "1.21.4": 61,
    "1.21.5": 71, "1.21.6": 71, "1.21.7": 71, "1.21.8": 71,
    "1.21.9": 81, "1.21.10": 81, "1.21.11": 81,
}

# Folder rename: 1.20.5+ uses "function" (singular). Earlier used "functions".
FUNCTION_FOLDER = "function"  # 1.20.5+


def build_datapack(
    mcfunction_path: Path,
    name: str,
    namespace: str,
    function_id: str,
    mc_version: str,
    output_root: Path,
) -> Path:
    if mc_version not in PACK_FORMATS:
        known = ", ".join(sorted(PACK_FORMATS.keys()))
        raise SystemExit(f"unknown mc-version {mc_version!r}. known: {known}")
    pack_format = PACK_FORMATS[mc_version]

    dp_root = output_root / name
    if dp_root.exists():
        shutil.rmtree(dp_root)
    func_dir = dp_root / "data" / namespace / FUNCTION_FOLDER
    func_dir.mkdir(parents=True)

    pack_mcmeta = {
        "pack": {
            "pack_format": pack_format,
            "description": f"AIrirang Builder — {name} (mc {mc_version})",
        }
    }
    (dp_root / "pack.mcmeta").write_text(
        json.dumps(pack_mcmeta, indent=2), encoding="utf-8"
    )

    target_func = func_dir / f"{function_id}.mcfunction"
    shutil.copy2(mcfunction_path, target_func)

    n_lines = len(target_func.read_text(encoding="utf-8").splitlines())
    print(f"[ok] datapack built: {dp_root}")
    print(f"     pack_format={pack_format} (mc {mc_version})")
    print(f"     function: {namespace}:{function_id} ({n_lines} lines)")
    print()
    print("Install:")
    print(f"  1. Copy folder {dp_root.name}/ to <your_world>/datapacks/")
    print(f"  2. In game: /reload")
    print(f"  3. Stand where you want the build to appear (commands use ~ relative coords)")
    print(f"  4. /function {namespace}:{function_id}")
    return dp_root


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("mcfunction", type=Path)
    p.add_argument("--name", default="airirang_builder",
                   help="datapack folder name")
    p.add_argument("--namespace", default="airirang",
                   help="function namespace (used as <ns>:<id>)")
    p.add_argument("--function", default="build", dest="function_id",
                   help="function id (used as <ns>:<id>)")
    p.add_argument("--mc-version", default="1.21",
                   help=f"target MC version. Known: {sorted(PACK_FORMATS.keys())}")
    p.add_argument("--output", type=Path,
                   default=Path(__file__).parent / "output" / "datapacks")
    args = p.parse_args()

    if not args.mcfunction.exists():
        print(f"file not found: {args.mcfunction}", file=sys.stderr)
        return 1

    args.output.mkdir(parents=True, exist_ok=True)
    build_datapack(
        args.mcfunction,
        args.name,
        args.namespace,
        args.function_id,
        args.mc_version,
        args.output,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
