/**
 * Minimal ambient typings for the `obj-file-parser` package (no upstream @types).
 * Covers only the surface we touch in obj-loader.ts.
 */
declare module 'obj-file-parser' {
  export interface OBJVertex {
    x: number;
    y: number;
    z: number;
  }

  export interface OBJFaceVertex {
    /** 1-based vertex index into the parent model's `vertices`. */
    vertexIndex: number;
    textureCoordsIndex?: number;
    vertexNormalIndex?: number;
  }

  export interface OBJFace {
    material: string;
    group: string;
    smoothingGroup: number;
    vertices: OBJFaceVertex[];
  }

  export interface OBJModel {
    name: string;
    vertices: OBJVertex[];
    textureCoords: { u: number; v: number; w: number }[];
    vertexNormals: OBJVertex[];
    faces: OBJFace[];
  }

  export interface OBJParseResult {
    models: OBJModel[];
    materialLibraries: string[];
  }

  export default class OBJFile {
    constructor(fileContents: string, defaultModelName?: string);
    parse(): OBJParseResult;
  }
}
