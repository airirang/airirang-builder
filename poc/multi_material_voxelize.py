"""
Multi-material voxelizer: load an OBJ as a trimesh.Scene, voxelize each
material's sub-mesh separately, and tag every voxel with a Minecraft block
chosen from that material's diffuse color (gamma-corrected linear→sRGB
→ CIE-Lab → nearest palette block).

The result is one flat (indices, block_ids) pair in a common voxel grid
ready to feed into greedy_meshing + emit_fill_commands.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import trimesh

from mc_palette import BlockMatcher, linear_to_srgb_u8


def _material_diffuse(geom: trimesh.Trimesh) -> np.ndarray | None:
    """Return geom material's diffuse color as linear-RGB uint8 (R,G,B), or None."""
    visual = geom.visual
    if not hasattr(visual, "material") or visual.material is None:
        return None
    mat = visual.material
    diff = getattr(mat, "diffuse", None)
    if diff is None:
        return None
    diff = np.asarray(diff)
    if diff.size < 3:
        return None
    return diff[:3].astype(np.uint8)


def voxelize_scene(
    scene: trimesh.Scene,
    pitch: float,
    fill_interior: bool = True,
    matcher: BlockMatcher | None = None,
    block_overrides: dict[str, str] | None = None,
) -> tuple[np.ndarray, list[str], dict[str, str]]:
    """Voxelize every geometry in `scene` and tag with a block per material.

    Args:
        scene: trimesh Scene loaded from a multi-material OBJ.
        pitch: world units per voxel (smaller = more detail).
        fill_interior: if True, fill each sub-mesh interior; else surface only.
        matcher: BlockMatcher palette; defaults to standard PALETTE.
        block_overrides: optional {material_name: minecraft_block_id} to bypass
            automatic color matching for specific materials.

    Returns:
        indices:    (N, 3) int absolute voxel coords (origin = scene bbox min).
        block_ids:  len-N list, parallel to indices.
        mat_to_block: {material_name: chosen_block_id} for inspection.
    """
    if matcher is None:
        matcher = BlockMatcher()
    block_overrides = block_overrides or {}

    # Common origin so all sub-meshes share a voxel grid.
    bbox_min = scene.bounds[0]

    # First pass: pick a block per material.
    mat_to_block: dict[str, str] = {}
    for name, geom in scene.geometry.items():
        if name in block_overrides:
            mat_to_block[name] = block_overrides[name]
            continue
        diffuse = _material_diffuse(geom)
        if diffuse is None:
            mat_to_block[name] = "minecraft:stone"
            continue
        srgb = linear_to_srgb_u8(diffuse[None, :])  # (1, 3)
        pal_idx = matcher.match(srgb)[0]
        mat_to_block[name] = matcher.block_at(int(pal_idx))

    # Second pass: voxelize each sub-mesh and accumulate.
    # If two sub-meshes claim the same voxel, the latter wins. Iteration order
    # = dict insertion order — feasible to override via dict reordering later.
    voxel_to_block: dict[tuple[int, int, int], str] = {}
    for name, geom in scene.geometry.items():
        if geom.is_empty or len(geom.faces) == 0:
            continue
        vox = geom.voxelized(pitch=pitch)
        if fill_interior:
            vox = vox.fill()
        sparse = np.asarray(vox.sparse_indices)
        if len(sparse) == 0:
            continue
        # vox.transform[:3, 3] = grid origin in world coords for THIS geom.
        origin = vox.transform[:3, 3]
        world_centers = origin + (sparse + 0.5) * pitch
        # Re-bin against common bbox origin.
        rel = world_centers - bbox_min
        abs_idx = np.floor(rel / pitch).astype(int)
        block = mat_to_block[name]
        for x, y, z in abs_idx:
            voxel_to_block[(int(x), int(y), int(z))] = block

    if not voxel_to_block:
        return np.zeros((0, 3), dtype=int), [], mat_to_block

    indices = np.array(list(voxel_to_block.keys()), dtype=int)
    block_ids = list(voxel_to_block.values())
    return indices, block_ids, mat_to_block


def load_scene(obj_path: Path) -> trimesh.Scene:
    scene = trimesh.load(str(obj_path), process=False)
    if isinstance(scene, trimesh.Trimesh):
        # Single-material OBJ — wrap as a Scene of one geometry.
        scene = trimesh.Scene(geometry={"default": scene})
    elif not isinstance(scene, trimesh.Scene):
        raise SystemExit(f"unexpected load type: {type(scene).__name__}")
    return scene
