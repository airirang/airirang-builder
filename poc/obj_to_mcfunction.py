"""
POC: .obj → voxel grid → Minecraft .mcfunction

Two modes:
  - single block:   --block minecraft:stone   (every voxel = same block)
  - color match:    --texture path/to/atlas.png
        Samples texture at the UV centroid of the face closest to each voxel,
        then maps RGB → Lab → nearest Minecraft palette block (Delta E76).

Usage:
    python obj_to_mcfunction.py <input.obj> [--pitch FLOAT] [--block STR | --texture PATH]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image

from greedy_meshing import emit_fill_commands, greedy_meshing, split_for_fill_limit
from mc_palette import BlockMatcher


def load_mesh(obj_path: Path) -> trimesh.Trimesh:
    mesh = trimesh.load(obj_path, force="mesh", process=False)
    if mesh.is_empty:
        raise SystemExit(f"empty mesh: {obj_path}")
    print(f"[mesh] verts={len(mesh.vertices)} faces={len(mesh.faces)} "
          f"extents={[round(e, 3) for e in mesh.extents.tolist()]}")
    return mesh


def voxelize(mesh: trimesh.Trimesh, pitch: float):
    vox = mesh.voxelized(pitch=pitch).fill()
    indices = np.asarray(vox.sparse_indices)
    # voxel center coords in mesh space
    origin = vox.transform[:3, 3]
    centers = origin + (indices + 0.5) * pitch
    print(f"[voxel] pitch={pitch} count={len(indices)} shape={vox.shape}")
    return indices, centers


def sample_face_colors(mesh: trimesh.Trimesh, texture_path: Path) -> np.ndarray:
    """Return (n_faces, 3) RGB by sampling texture at each face's UV centroid."""
    if not hasattr(mesh.visual, "uv") or mesh.visual.uv is None:
        raise SystemExit("mesh has no UV — cannot sample texture")

    uv = np.asarray(mesh.visual.uv, dtype=np.float64)
    faces = mesh.faces
    # Centroid UV of each face (avg of its 3 vertex UVs)
    face_uv = uv[faces].mean(axis=1)

    img = np.asarray(Image.open(texture_path).convert("RGB"))
    h, w = img.shape[:2]
    # UV origin is bottom-left in OBJ convention; image origin is top-left.
    u = np.clip(face_uv[:, 0], 0, 1) * (w - 1)
    v = (1.0 - np.clip(face_uv[:, 1], 0, 1)) * (h - 1)
    px = np.clip(u.astype(int), 0, w - 1)
    py = np.clip(v.astype(int), 0, h - 1)
    colors = img[py, px]
    print(f"[texture] {texture_path.name} {w}x{h} faces_sampled={len(colors)}")
    return colors


def voxel_to_face(mesh: trimesh.Trimesh, centers: np.ndarray) -> np.ndarray:
    """For each voxel center, return the index of the closest mesh face."""
    _, _, face_ids = trimesh.proximity.closest_point(mesh, centers)
    return face_ids


def emit_mcfunction(
    indices: np.ndarray,
    block_ids: list[str],
    out: Path,
    optimize: bool = True,
) -> None:
    if optimize:
        cuboids = greedy_meshing(indices, block_ids)
        cuboids = split_for_fill_limit(cuboids)
        lines = emit_fill_commands(cuboids)
        reduction = (1 - len(lines) / len(indices)) * 100 if len(indices) else 0
        opt_info = (f" optimized (greedy meshing): "
                    f"{len(indices)} voxels → {len(lines)} commands "
                    f"({reduction:.1f}% reduction)")
    else:
        mins = indices.min(axis=0)
        rel = indices - mins
        lines = [f"setblock ~{x} ~{y} ~{z} {b}"
                 for (x, y, z), b in zip(rel, block_ids)]
        opt_info = ""

    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    bbox = (indices.max(axis=0) - indices.min(axis=0) + 1).tolist()
    print(f"[out] {out} lines={len(lines)} bbox={bbox}{opt_info}")


def report_block_histogram(block_ids: list[str]) -> None:
    from collections import Counter
    counts = Counter(block_ids)
    print(f"[blocks] {len(counts)} distinct blocks used:")
    for block, n in counts.most_common(10):
        print(f"  {n:>5}  {block}")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("obj", type=Path)
    p.add_argument("--pitch", type=float, default=0.1)
    p.add_argument("--block", default=None,
                   help="single block id; if set, --texture is ignored")
    p.add_argument("--texture", type=Path, default=None,
                   help="texture image to sample colors from (atlas)")
    p.add_argument("--out", type=Path, default=None)
    p.add_argument("--no-optimize", dest="optimize", action="store_false",
                   help="emit one setblock per voxel (skip /fill greedy meshing)")
    p.set_defaults(optimize=True)
    args = p.parse_args()

    if not args.obj.exists():
        print(f"file not found: {args.obj}", file=sys.stderr)
        return 1
    if not args.block and not args.texture:
        args.block = "minecraft:stone"  # fallback

    mesh = load_mesh(args.obj)
    indices, centers = voxelize(mesh, args.pitch)

    if args.block:
        block_ids = [args.block] * len(indices)
    else:
        if not args.texture.exists():
            print(f"texture not found: {args.texture}", file=sys.stderr)
            return 1
        face_rgb = sample_face_colors(mesh, args.texture)
        face_ids = voxel_to_face(mesh, centers)
        voxel_rgb = face_rgb[face_ids]
        matcher = BlockMatcher()
        palette_idx = matcher.match(voxel_rgb)
        block_ids = [matcher.block_at(i) for i in palette_idx]
        report_block_histogram(block_ids)

    out_dir = Path(__file__).parent / "output"
    out_dir.mkdir(exist_ok=True)
    suffix = f"_{args.texture.stem}" if args.texture else ""
    out = args.out or out_dir / f"{args.obj.stem}{suffix}.mcfunction"
    emit_mcfunction(indices, block_ids, out, optimize=args.optimize)
    return 0


if __name__ == "__main__":
    sys.exit(main())
