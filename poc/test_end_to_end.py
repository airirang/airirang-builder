"""
End-to-end: synthetic .obj → voxelize → greedy meshing → .mcfunction.

Two scenarios:
  1. Filled house, single block: trivial — 1 /fill, max compression.
  2. Hollow surface + multi-block (walls/roof/floor): realistic case.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import trimesh

from greedy_meshing import emit_fill_commands, greedy_meshing, split_for_fill_limit
from obj_to_mcfunction import emit_mcfunction, voxelize


def make_house_mesh() -> trimesh.Trimesh:
    parts = [
        trimesh.creation.box(extents=[4.0, 0.1, 4.0]),
        trimesh.creation.box(extents=[4.0, 0.1, 4.0]).apply_translation([0, 3.0, 0]),
        trimesh.creation.box(extents=[4.0, 3.0, 0.1]).apply_translation([0, 1.5, 2.0]),
        trimesh.creation.box(extents=[4.0, 3.0, 0.1]).apply_translation([0, 1.5, -2.0]),
        trimesh.creation.box(extents=[0.1, 3.0, 4.0]).apply_translation([2.0, 1.5, 0]),
        trimesh.creation.box(extents=[0.1, 3.0, 4.0]).apply_translation([-2.0, 1.5, 0]),
        trimesh.creation.box(extents=[0.1, 3.0, 2.0]).apply_translation([0, 1.5, 1.0]),
    ]
    return trimesh.util.concatenate(parts)


def scenario_filled_single_block(mesh, out_dir: Path) -> None:
    print("\n=== Scenario 1: filled mesh, single block ===")
    indices, _ = voxelize(mesh, pitch=0.2)
    block_ids = ["minecraft:stone"] * len(indices)

    raw = out_dir / "house_filled_raw.mcfunction"
    opt = out_dir / "house_filled_optimized.mcfunction"
    emit_mcfunction(indices, block_ids, raw, optimize=False)
    emit_mcfunction(indices, block_ids, opt, optimize=True)


def scenario_hollow_multi_block(mesh, out_dir: Path) -> None:
    """Voxelize surface (no fill) and assign block types by y-layer to mimic
    a real building (floor=stone, walls=brick, roof=oak)."""
    print("\n=== Scenario 2: surface-only voxelize, multi-block ===")
    pitch = 0.2
    vox = mesh.voxelized(pitch=pitch)  # No .fill() — surface only
    indices = np.asarray(vox.sparse_indices)
    print(f"[voxel] surface-only pitch={pitch} count={len(indices)} "
          f"shape={vox.shape}")

    rel = indices - indices.min(axis=0)
    y_max = int(rel[:, 1].max())

    block_ids: list[str] = []
    for x, y, z in rel:
        if y == 0:
            block_ids.append("minecraft:stone")          # floor
        elif y == y_max:
            block_ids.append("minecraft:oak_planks")     # roof
        else:
            block_ids.append("minecraft:bricks")         # walls
    n_blocks = len(set(block_ids))
    print(f"[blocks] {n_blocks} distinct (stone/bricks/oak_planks)")

    # Un-optimized
    raw = out_dir / "house_hollow_raw.mcfunction"
    emit_mcfunction(indices, block_ids, raw, optimize=False)
    n_raw = len(raw.read_text(encoding="utf-8").splitlines())

    # Optimized
    opt = out_dir / "house_hollow_optimized.mcfunction"
    emit_mcfunction(indices, block_ids, opt, optimize=True)
    n_opt = len(opt.read_text(encoding="utf-8").splitlines())

    reduction = (1 - n_opt / n_raw) * 100
    print(f"\ncompression: {n_raw} → {n_opt} lines ({reduction:.1f}% reduction)")
    print("first 6 optimized lines:")
    for line in opt.read_text(encoding="utf-8").splitlines()[:6]:
        print(f"  {line}")


def main() -> None:
    out_dir = Path(__file__).parent / "output"
    out_dir.mkdir(exist_ok=True)

    mesh = make_house_mesh()
    print(f"[mesh] verts={len(mesh.vertices)} faces={len(mesh.faces)}")

    scenario_filled_single_block(mesh, out_dir)
    scenario_hollow_multi_block(mesh, out_dir)


if __name__ == "__main__":
    main()
