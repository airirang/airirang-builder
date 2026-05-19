"""Probe how trimesh exposes .mtl material info for a multi-material OBJ."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import trimesh

OBJ = Path(__file__).parent.parent / "asset" / "Medieval Village Pack - Dec 2020" / "Buildings" / "OBJ" / "House_3.obj"


def main() -> None:
    print(f"loading {OBJ.name}")
    # First try without force='mesh' so we get the Scene with separate materials.
    scene = trimesh.load(str(OBJ), process=False)
    print(f"type(load result) = {type(scene).__name__}")

    if isinstance(scene, trimesh.Scene):
        print(f"geometries: {list(scene.geometry.keys())[:10]}")
        for name, geom in list(scene.geometry.items())[:3]:
            print(f"  - {name}: faces={len(geom.faces)} "
                  f"visual={type(geom.visual).__name__}")
            v = geom.visual
            if hasattr(v, 'material'):
                m = v.material
                print(f"    material name={getattr(m, 'name', '?')} "
                      f"diffuse={getattr(m, 'diffuse', '?')}")
            if hasattr(v, 'face_colors') and v.face_colors is not None:
                fc = v.face_colors
                print(f"    face_colors shape={fc.shape} sample={fc[0]}")

    # Force-mesh: see if face_colors come through.
    print("\n--- force=mesh ---")
    mesh = trimesh.load(str(OBJ), force="mesh", process=False)
    print(f"type = {type(mesh).__name__}")
    print(f"visual type = {type(mesh.visual).__name__}")
    print(f"faces = {len(mesh.faces)}")
    if hasattr(mesh.visual, 'face_colors'):
        fc = mesh.visual.face_colors
        print(f"face_colors: shape={fc.shape if fc is not None else None}")
        if fc is not None:
            unique = np.unique(fc.reshape(-1, fc.shape[-1]), axis=0)
            print(f"distinct colors = {len(unique)}")
            for c in unique[:10]:
                print(f"  {c}")


if __name__ == "__main__":
    main()
