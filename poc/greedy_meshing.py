"""
Greedy meshing: voxel grid → axis-aligned cuboids of identical block id.

Iterates voxels in (x outer, y mid, z inner) order. For each unprocessed voxel
of block b, grows a cuboid +z first (longest 1D run), then +y (whole z-row must
match), then +x (whole y,z-plane must match). Marks the cuboid processed and
moves on.

Result: list of (min_xyz, max_xyz, block_id) cuboids that perfectly tile the
original voxel set. Suitable for emitting Minecraft /fill commands.
"""
from __future__ import annotations

import numpy as np

# /fill in vanilla 1.21 caps at 32,768 blocks per command.
MAX_FILL_BLOCKS = 32768

Cuboid = tuple[tuple[int, int, int], tuple[int, int, int], str]


def greedy_meshing(indices: np.ndarray, block_ids: list[str]) -> list[Cuboid]:
    """Pack sparse voxels into cuboids of identical block.

    Args:
        indices:   (N, 3) int array of voxel coords (any origin).
        block_ids: length-N list of block id strings, parallel to indices.

    Returns:
        List of ((x1,y1,z1), (x2,y2,z2), block_id) with coords relative to
        indices.min(axis=0). Every original voxel is covered by exactly one
        cuboid; no two cuboids overlap.
    """
    if len(indices) == 0:
        return []
    if len(indices) != len(block_ids):
        raise ValueError(f"len mismatch: {len(indices)} vs {len(block_ids)}")

    rel = indices - indices.min(axis=0)
    sx, sy, sz = (rel.max(axis=0) + 1).tolist()

    # Encode blocks as int ids in a dense grid; 0 = empty.
    unique_blocks: list[str] = []
    block_to_idx: dict[str, int] = {}
    grid = np.zeros((sx, sy, sz), dtype=np.int32)
    for (x, y, z), b in zip(rel, block_ids):
        bi = block_to_idx.get(b)
        if bi is None:
            bi = len(unique_blocks) + 1
            block_to_idx[b] = bi
            unique_blocks.append(b)
        grid[x, y, z] = bi

    processed = np.zeros((sx, sy, sz), dtype=bool)
    cuboids: list[Cuboid] = []

    for x in range(sx):
        for y in range(sy):
            for z in range(sz):
                if processed[x, y, z] or grid[x, y, z] == 0:
                    continue
                bi = int(grid[x, y, z])

                # Grow +z (innermost, cheapest).
                z2 = z
                while (
                    z2 + 1 < sz
                    and not processed[x, y, z2 + 1]
                    and grid[x, y, z2 + 1] == bi
                ):
                    z2 += 1

                # Grow +y: whole z-row must match and be unprocessed.
                y2 = y
                zs = slice(z, z2 + 1)
                while y2 + 1 < sy:
                    row_grid = grid[x, y2 + 1, zs]
                    row_proc = processed[x, y2 + 1, zs]
                    if np.all(row_grid == bi) and not row_proc.any():
                        y2 += 1
                    else:
                        break

                # Grow +x: whole y,z-plane must match and be unprocessed.
                x2 = x
                ys = slice(y, y2 + 1)
                while x2 + 1 < sx:
                    plane_grid = grid[x2 + 1, ys, zs]
                    plane_proc = processed[x2 + 1, ys, zs]
                    if np.all(plane_grid == bi) and not plane_proc.any():
                        x2 += 1
                    else:
                        break

                processed[x : x2 + 1, y : y2 + 1, z : z2 + 1] = True
                cuboids.append(((x, y, z), (x2, y2, z2), unique_blocks[bi - 1]))

    return cuboids


def split_for_fill_limit(cuboids: list[Cuboid]) -> list[Cuboid]:
    """Split any cuboid larger than MAX_FILL_BLOCKS along its longest axis."""
    out: list[Cuboid] = []
    stack = list(cuboids)
    while stack:
        (x1, y1, z1), (x2, y2, z2), b = stack.pop()
        dx, dy, dz = x2 - x1 + 1, y2 - y1 + 1, z2 - z1 + 1
        if dx * dy * dz <= MAX_FILL_BLOCKS:
            out.append(((x1, y1, z1), (x2, y2, z2), b))
            continue
        if dx >= dy and dx >= dz:
            mid = x1 + dx // 2 - 1
            stack.append(((x1, y1, z1), (mid, y2, z2), b))
            stack.append(((mid + 1, y1, z1), (x2, y2, z2), b))
        elif dy >= dz:
            mid = y1 + dy // 2 - 1
            stack.append(((x1, y1, z1), (x2, mid, z2), b))
            stack.append(((x1, mid + 1, z1), (x2, y2, z2), b))
        else:
            mid = z1 + dz // 2 - 1
            stack.append(((x1, y1, z1), (x2, y2, mid), b))
            stack.append(((x1, y1, mid + 1), (x2, y2, z2), b))
    return out


def emit_fill_commands(cuboids: list[Cuboid]) -> list[str]:
    """Convert cuboids to Minecraft commands. 1x1x1 → setblock, else fill."""
    lines: list[str] = []
    for (x1, y1, z1), (x2, y2, z2), b in cuboids:
        if x1 == x2 and y1 == y2 and z1 == z2:
            lines.append(f"setblock ~{x1} ~{y1} ~{z1} {b}")
        else:
            lines.append(f"fill ~{x1} ~{y1} ~{z1} ~{x2} ~{y2} ~{z2} {b}")
    return lines
