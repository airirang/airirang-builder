/** AIrirang Builder — Apache-2.0. NOT AN OFFICIAL MINECRAFT PRODUCT. */

/**
 * Minecraft solid-block 컬러 팔레트 (sRGB 평균값, 48종).
 * Minecraft solid-block color palette (top-face sRGB averages, 48 blocks).
 *
 * 솔리드·불투명·중력 안정 블록만 포함. 출처: 커뮤니티 팔레트 (마인크래프트 위키,
 * ObjToSchematic) 참조. 블록 추가·제거는 매칭 granularity만 영향.
 *
 * Python POC 1:1 포팅 — poc/mc_palette.py (PALETTE 배열 전체 보존)
 */

import type { BlockId } from '../types.js';

/** 팔레트 엔트리 — `(blockId, R, G, B)` sRGB 0–255. */
export interface PaletteEntry {
  blockId: BlockId;
  r: number;
  g: number;
  b: number;
}

/**
 * 48-block solid palette. Order preserved from `poc/mc_palette.py`.
 * Delta E76 매칭의 후보 집합 — 인덱스 변경 시 회귀 가능성 있으니 추가는 끝에.
 */
export const PALETTE: readonly PaletteEntry[] = [
  { blockId: 'minecraft:white_concrete', r: 207, g: 213, b: 214 },
  { blockId: 'minecraft:light_gray_concrete', r: 125, g: 125, b: 115 },
  { blockId: 'minecraft:gray_concrete', r: 54, g: 57, b: 61 },
  { blockId: 'minecraft:black_concrete', r: 8, g: 10, b: 15 },
  { blockId: 'minecraft:red_concrete', r: 142, g: 32, b: 32 },
  { blockId: 'minecraft:orange_concrete', r: 224, g: 97, b: 1 },
  { blockId: 'minecraft:yellow_concrete', r: 240, g: 175, b: 21 },
  { blockId: 'minecraft:lime_concrete', r: 94, g: 168, b: 24 },
  { blockId: 'minecraft:green_concrete', r: 73, g: 91, b: 36 },
  { blockId: 'minecraft:cyan_concrete', r: 21, g: 119, b: 136 },
  { blockId: 'minecraft:light_blue_concrete', r: 36, g: 137, b: 199 },
  { blockId: 'minecraft:blue_concrete', r: 44, g: 46, b: 143 },
  { blockId: 'minecraft:purple_concrete', r: 100, g: 31, b: 156 },
  { blockId: 'minecraft:magenta_concrete', r: 169, g: 48, b: 159 },
  { blockId: 'minecraft:pink_concrete', r: 213, g: 101, b: 142 },
  { blockId: 'minecraft:brown_concrete', r: 96, g: 59, b: 31 },
  { blockId: 'minecraft:stone', r: 125, g: 125, b: 125 },
  { blockId: 'minecraft:cobblestone', r: 122, g: 122, b: 122 },
  { blockId: 'minecraft:smooth_stone', r: 158, g: 158, b: 158 },
  { blockId: 'minecraft:deepslate', r: 78, g: 78, b: 82 },
  { blockId: 'minecraft:andesite', r: 136, g: 136, b: 136 },
  { blockId: 'minecraft:diorite', r: 188, g: 188, b: 188 },
  { blockId: 'minecraft:granite', r: 150, g: 100, b: 77 },
  { blockId: 'minecraft:sandstone', r: 217, g: 207, b: 159 },
  { blockId: 'minecraft:red_sandstone', r: 185, g: 93, b: 31 },
  { blockId: 'minecraft:oak_planks', r: 162, g: 130, b: 78 },
  { blockId: 'minecraft:spruce_planks', r: 104, g: 78, b: 47 },
  { blockId: 'minecraft:birch_planks', r: 216, g: 201, b: 158 },
  { blockId: 'minecraft:dark_oak_planks', r: 66, g: 43, b: 20 },
  { blockId: 'minecraft:iron_block', r: 220, g: 220, b: 220 },
  { blockId: 'minecraft:gold_block', r: 249, g: 236, b: 78 },
  { blockId: 'minecraft:lapis_block', r: 30, g: 67, b: 140 },
  { blockId: 'minecraft:emerald_block', r: 80, g: 217, b: 102 },
  { blockId: 'minecraft:diamond_block', r: 110, g: 219, b: 213 },
  { blockId: 'minecraft:redstone_block', r: 171, g: 21, b: 10 },
  { blockId: 'minecraft:bricks', r: 151, g: 90, b: 75 },
  { blockId: 'minecraft:nether_bricks', r: 44, g: 22, b: 26 },
  { blockId: 'minecraft:quartz_block', r: 235, g: 229, b: 222 },
  { blockId: 'minecraft:end_stone', r: 221, g: 223, b: 165 },
  { blockId: 'minecraft:obsidian', r: 15, g: 12, b: 23 },
  { blockId: 'minecraft:netherrack', r: 114, g: 58, b: 57 },
  { blockId: 'minecraft:soul_sand', r: 82, g: 62, b: 47 },
  { blockId: 'minecraft:snow_block', r: 249, g: 254, b: 254 },
  { blockId: 'minecraft:ice', r: 145, g: 183, b: 254 },
  { blockId: 'minecraft:dirt', r: 134, g: 96, b: 67 },
  { blockId: 'minecraft:grass_block', r: 87, g: 124, b: 56 },
  { blockId: 'minecraft:gravel', r: 136, g: 126, b: 126 },
  { blockId: 'minecraft:clay', r: 159, g: 166, b: 179 },
];
