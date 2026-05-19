"""
Minecraft solid-block color palette + RGB→Lab + Delta E76 nearest-block lookup.

Palette values are approximate sRGB averages of the top face texture, sourced from
community palette references (e.g. Minecraft Wiki, ObjToSchematic palette). Tweak
freely — adding/removing blocks affects only matching granularity.
"""
from __future__ import annotations

import numpy as np

# (block_id, R, G, B). Limited to solid, opaque, gravity-stable blocks.
PALETTE: list[tuple[str, int, int, int]] = [
    ("minecraft:white_concrete",        207, 213, 214),
    ("minecraft:light_gray_concrete",   125, 125, 115),
    ("minecraft:gray_concrete",          54,  57,  61),
    ("minecraft:black_concrete",          8,  10,  15),
    ("minecraft:red_concrete",          142,  32,  32),
    ("minecraft:orange_concrete",       224,  97,   1),
    ("minecraft:yellow_concrete",       240, 175,  21),
    ("minecraft:lime_concrete",          94, 168,  24),
    ("minecraft:green_concrete",         73,  91,  36),
    ("minecraft:cyan_concrete",          21, 119, 136),
    ("minecraft:light_blue_concrete",    36, 137, 199),
    ("minecraft:blue_concrete",          44,  46, 143),
    ("minecraft:purple_concrete",       100,  31, 156),
    ("minecraft:magenta_concrete",      169,  48, 159),
    ("minecraft:pink_concrete",         213, 101, 142),
    ("minecraft:brown_concrete",         96,  59,  31),
    ("minecraft:stone",                 125, 125, 125),
    ("minecraft:cobblestone",           122, 122, 122),
    ("minecraft:smooth_stone",          158, 158, 158),
    ("minecraft:deepslate",              78,  78,  82),
    ("minecraft:andesite",              136, 136, 136),
    ("minecraft:diorite",               188, 188, 188),
    ("minecraft:granite",               150, 100,  77),
    ("minecraft:sandstone",             217, 207, 159),
    ("minecraft:red_sandstone",         185,  93,  31),
    ("minecraft:oak_planks",            162, 130,  78),
    ("minecraft:spruce_planks",         104,  78,  47),
    ("minecraft:birch_planks",          216, 201, 158),
    ("minecraft:dark_oak_planks",        66,  43,  20),
    ("minecraft:iron_block",            220, 220, 220),
    ("minecraft:gold_block",            249, 236,  78),
    ("minecraft:lapis_block",            30,  67, 140),
    ("minecraft:emerald_block",          80, 217, 102),
    ("minecraft:diamond_block",         110, 219, 213),
    ("minecraft:redstone_block",        171,  21,  10),
    ("minecraft:bricks",                151,  90,  75),
    ("minecraft:nether_bricks",          44,  22,  26),
    ("minecraft:quartz_block",          235, 229, 222),
    ("minecraft:end_stone",             221, 223, 165),
    ("minecraft:obsidian",               15,  12,  23),
    ("minecraft:netherrack",            114,  58,  57),
    ("minecraft:soul_sand",              82,  62,  47),
    ("minecraft:snow_block",            249, 254, 254),
    ("minecraft:ice",                   145, 183, 254),
    ("minecraft:dirt",                  134,  96,  67),
    ("minecraft:grass_block",            87, 124,  56),
    ("minecraft:gravel",                136, 126, 126),
    ("minecraft:clay",                  159, 166, 179),
]


def _srgb_to_linear(c: np.ndarray) -> np.ndarray:
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb_u8(linear: np.ndarray) -> np.ndarray:
    """Linear-light RGB (0-255 as packed by trimesh from .mtl Kd) → sRGB-encoded
    0-255 uint8. Required because Blender/Wavefront .mtl Kd is *linear*, but the
    BlockMatcher palette and rgb_to_lab() below both expect sRGB input."""
    c = np.clip(linear.astype(np.float64) / 255.0, 0.0, 1.0)
    s = np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1.0 / 2.4) - 0.055)
    return np.clip(s * 255.0, 0, 255).astype(np.uint8)


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """sRGB (0-255) → CIE Lab (D65). Accepts (...,3) shaped array."""
    lin = _srgb_to_linear(rgb.astype(np.float64))
    # sRGB → XYZ (D65)
    m = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041],
    ])
    xyz = lin @ m.T
    # Normalize by D65 white point
    white = np.array([0.95047, 1.00000, 1.08883])
    f_xyz = xyz / white
    delta = 6 / 29
    f = np.where(f_xyz > delta ** 3, f_xyz ** (1 / 3),
                 f_xyz / (3 * delta ** 2) + 4 / 29)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], axis=-1)


class BlockMatcher:
    def __init__(self, palette: list[tuple[str, int, int, int]] = PALETTE):
        self.block_ids = [row[0] for row in palette]
        rgb = np.array([row[1:] for row in palette], dtype=np.float64)
        self.lab = rgb_to_lab(rgb)

    def match(self, rgb: np.ndarray) -> np.ndarray:
        """rgb shape (N,3) in 0-255 → array of palette indices."""
        lab = rgb_to_lab(rgb.astype(np.float64))
        # Delta E76 = Euclidean in Lab
        diff = lab[:, None, :] - self.lab[None, :, :]
        dist = np.sqrt((diff * diff).sum(axis=-1))
        return np.argmin(dist, axis=1)

    def block_at(self, idx: int) -> str:
        return self.block_ids[idx]
