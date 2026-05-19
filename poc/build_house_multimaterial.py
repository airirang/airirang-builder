"""
Voxelize Quaternius House_3.obj using .mtl material colors → Minecraft blocks
→ /fill greedy meshing → .mcfunction → datapack.

Run:
    py build_house_multimaterial.py [--pitch 0.1] [--no-fill]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from greedy_meshing import emit_fill_commands, greedy_meshing, split_for_fill_limit
from multi_material_voxelize import load_scene, voxelize_scene

DEFAULT_OBJ = Path(__file__).parent.parent / "asset" / "Medieval Village Pack - Dec 2020" / "Buildings" / "OBJ" / "House_3.obj"

# Manual overrides where automatic color match goes off (e.g., very dark linear
# RGB falls on netherrack/obsidian, but the building "should" be brick).
DEFAULT_OVERRIDES: dict[str, str] = {
    # Empty for now — auto-match first, override after seeing the result.
}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("obj", type=Path, nargs="?", default=DEFAULT_OBJ)
    p.add_argument("--pitch", type=float, default=0.1)
    p.add_argument("--no-fill", dest="fill", action="store_false",
                   help="surface-only voxelize (no interior fill)")
    p.add_argument("--out-name", default="house_3_mm",
                   help="output basename + datapack function id")
    p.set_defaults(fill=True)
    args = p.parse_args()

    if not args.obj.exists():
        print(f"file not found: {args.obj}", file=sys.stderr)
        return 1

    print(f"[load] {args.obj.name}")
    scene = load_scene(args.obj)
    print(f"[scene] geometries: {list(scene.geometry.keys())}")

    indices, block_ids, mat_to_block = voxelize_scene(
        scene, pitch=args.pitch, fill_interior=args.fill,
        block_overrides=DEFAULT_OVERRIDES,
    )
    print(f"[match] material → block:")
    for mat, block in mat_to_block.items():
        print(f"  {mat:<16} → {block}")

    print(f"[voxel] count={len(indices)} pitch={args.pitch} "
          f"fill={'interior' if args.fill else 'surface-only'}")

    cuboids = greedy_meshing(indices, block_ids)
    cuboids = split_for_fill_limit(cuboids)
    lines = emit_fill_commands(cuboids)

    bbox = (indices.max(axis=0) - indices.min(axis=0) + 1).tolist()
    reduction = (1 - len(lines) / len(indices)) * 100 if len(indices) else 0
    print(f"[optimize] {len(indices)} voxels → {len(lines)} commands "
          f"({reduction:.1f}% reduction) bbox={bbox}")

    # Histogram
    from collections import Counter
    cnt = Counter(block_ids)
    print(f"[blocks] {len(cnt)} distinct blocks:")
    for b, n in cnt.most_common():
        print(f"  {n:>5}  {b}")

    out_dir = Path(__file__).parent / "output"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / f"{args.out_name}.mcfunction"
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"[out] {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
