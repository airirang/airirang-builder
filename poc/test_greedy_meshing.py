"""
Synthetic correctness + compression benchmarks for greedy_meshing.

Run: py test_greedy_meshing.py
"""
from __future__ import annotations

import numpy as np

from greedy_meshing import (
    MAX_FILL_BLOCKS,
    emit_fill_commands,
    greedy_meshing,
    split_for_fill_limit,
)


def _assert_covers(
    indices: np.ndarray,
    block_ids: list[str],
    cuboids: list,
) -> None:
    """Every (voxel, block) is covered by exactly one cuboid."""
    rel = indices - indices.min(axis=0)
    sx, sy, sz = (rel.max(axis=0) + 1).tolist()

    expected = {}
    for (x, y, z), b in zip(rel, block_ids):
        expected[(int(x), int(y), int(z))] = b

    covered: dict[tuple[int, int, int], str] = {}
    for (x1, y1, z1), (x2, y2, z2), b in cuboids:
        for xi in range(x1, x2 + 1):
            for yi in range(y1, y2 + 1):
                for zi in range(z1, z2 + 1):
                    key = (xi, yi, zi)
                    if key in covered:
                        raise AssertionError(f"overlap at {key}: "
                                             f"{covered[key]} vs {b}")
                    covered[key] = b

    assert covered == expected, (
        f"coverage mismatch: missing {set(expected) - set(covered)}, "
        f"extra {set(covered) - set(expected)}"
    )


def test_empty():
    out = greedy_meshing(np.zeros((0, 3), dtype=int), [])
    assert out == []
    print("[pass] empty")


def test_single_voxel():
    idx = np.array([[5, 5, 5]])
    out = greedy_meshing(idx, ["minecraft:stone"])
    assert len(out) == 1
    assert out[0] == ((0, 0, 0), (0, 0, 0), "minecraft:stone")
    _assert_covers(idx, ["minecraft:stone"], out)
    print("[pass] single voxel → 1 cuboid")


def test_solid_cube():
    """10x10x10 solid cube → exactly 1 fill (1000 ≤ MAX_FILL_BLOCKS)."""
    coords = np.array([(x, y, z) for x in range(10) for y in range(10)
                       for z in range(10)])
    blocks = ["minecraft:stone"] * len(coords)
    out = greedy_meshing(coords, blocks)
    _assert_covers(coords, blocks, out)
    assert len(out) == 1, f"expected 1 cuboid, got {len(out)}"
    assert out[0][0] == (0, 0, 0) and out[0][1] == (9, 9, 9)
    print(f"[pass] solid 10^3 cube → 1 cuboid (1000 voxels)")


def test_hollow_shell():
    """10x10x10 hollow shell: outer surface only."""
    coords = []
    for x in range(10):
        for y in range(10):
            for z in range(10):
                on_shell = (x in (0, 9) or y in (0, 9) or z in (0, 9))
                if on_shell:
                    coords.append((x, y, z))
    coords = np.array(coords)
    blocks = ["minecraft:stone"] * len(coords)
    out = greedy_meshing(coords, blocks)
    _assert_covers(coords, blocks, out)
    print(f"[pass] hollow 10^3 shell → {len(out)} cuboids "
          f"(was {len(coords)} setblock = "
          f"{(1 - len(out) / len(coords)) * 100:.1f}% compression)")


def test_mixed_blocks():
    """Two adjacent stone+gold blocks must NOT merge."""
    coords = np.array([(0, 0, 0), (1, 0, 0)])
    blocks = ["minecraft:stone", "minecraft:gold_block"]
    out = greedy_meshing(coords, blocks)
    _assert_covers(coords, blocks, out)
    assert len(out) == 2
    print("[pass] mixed blocks not merged")


def test_split_for_fill_limit():
    """A 50x50x50 (=125000) cuboid must split below MAX_FILL_BLOCKS."""
    big = [((0, 0, 0), (49, 49, 49), "minecraft:stone")]
    out = split_for_fill_limit(big)
    for c1, c2, _ in out:
        dx, dy, dz = c2[0] - c1[0] + 1, c2[1] - c1[1] + 1, c2[2] - c1[2] + 1
        assert dx * dy * dz <= MAX_FILL_BLOCKS, (
            f"{c1}-{c2} = {dx * dy * dz} blocks exceeds {MAX_FILL_BLOCKS}"
        )
    # Total volume preserved.
    total = sum(
        (c2[0] - c1[0] + 1) * (c2[1] - c1[1] + 1) * (c2[2] - c1[2] + 1)
        for c1, c2, _ in out
    )
    assert total == 50 ** 3
    print(f"[pass] 50^3 cuboid split into {len(out)} sub-cuboids "
          f"(all ≤ {MAX_FILL_BLOCKS} blocks)")


def benchmark_realistic_building():
    """Synthetic 'small house': hollow walls + flat roof + floor + a door gap.
    Mimics the kind of building Quaternius 1Story.obj would voxelize to."""
    W, D, H = 23, 23, 18  # similar bbox to 1Story.obj (23×18×23)
    coords = []
    blocks = []

    def add(x, y, z, b):
        coords.append((x, y, z))
        blocks.append(b)

    # Floor
    for x in range(W):
        for z in range(D):
            add(x, 0, z, "minecraft:oak_planks")
    # Roof
    for x in range(W):
        for z in range(D):
            add(x, H - 1, z, "minecraft:dark_oak_planks")
    # Walls (4 sides, hollow)
    for y in range(1, H - 1):
        for x in range(W):
            add(x, y, 0, "minecraft:bricks")
            add(x, y, D - 1, "minecraft:bricks")
        for z in range(1, D - 1):
            add(0, y, z, "minecraft:bricks")
            add(W - 1, y, z, "minecraft:bricks")
    # Door gap (remove 2 bricks)
    coords_filtered = []
    blocks_filtered = []
    door = {(W // 2, 1, 0), (W // 2, 2, 0)}
    for c, b in zip(coords, blocks):
        if tuple(c) not in door:
            coords_filtered.append(c)
            blocks_filtered.append(b)

    coords_arr = np.array(coords_filtered)
    cuboids = greedy_meshing(coords_arr, blocks_filtered)
    _assert_covers(coords_arr, blocks_filtered, cuboids)
    cuboids = split_for_fill_limit(cuboids)
    lines = emit_fill_commands(cuboids)

    n_vox = len(coords_arr)
    n_lines = len(lines)
    print(
        f"[bench] realistic building {W}×{H}×{D}: "
        f"{n_vox} voxels → {n_lines} commands "
        f"({(1 - n_lines / n_vox) * 100:.1f}% reduction)"
    )
    return n_vox, n_lines


def benchmark_eiffel_lattice():
    """Sparse lattice tower (Eiffel-like): mostly thin frame, hard to merge."""
    H = 80
    coords = []
    blocks = []
    for y in range(H):
        # taper: bigger base
        half = max(2, int(20 * (1 - y / H) ** 1.5))
        # Frame: only the 4 edges + lattice every 8 layers
        if y % 8 == 0:
            # cross-brace layer (solid ring)
            for x in range(-half, half + 1):
                for z in range(-half, half + 1):
                    if abs(x) == half or abs(z) == half:
                        coords.append((x + 25, y, z + 25))
                        blocks.append("minecraft:iron_block")
        else:
            # only 4 corner pillars
            for sx in (-half, half):
                for sz in (-half, half):
                    coords.append((sx + 25, y, sz + 25))
                    blocks.append("minecraft:iron_block")

    coords_arr = np.array(coords)
    cuboids = greedy_meshing(coords_arr, blocks)
    _assert_covers(coords_arr, blocks, cuboids)
    cuboids = split_for_fill_limit(cuboids)
    lines = emit_fill_commands(cuboids)

    n_vox = len(coords_arr)
    n_lines = len(lines)
    print(
        f"[bench] eiffel-lattice tower H={H}: "
        f"{n_vox} voxels → {n_lines} commands "
        f"({(1 - n_lines / n_vox) * 100:.1f}% reduction)"
    )


if __name__ == "__main__":
    test_empty()
    test_single_voxel()
    test_solid_cube()
    test_hollow_shell()
    test_mixed_blocks()
    test_split_for_fill_limit()
    print()
    print("--- benchmarks ---")
    benchmark_realistic_building()
    benchmark_eiffel_lattice()
