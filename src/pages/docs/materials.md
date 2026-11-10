---
layout: ../../layouts/Docs.astro
title: Materials
description: MaterialX, the Karma Material Builder, Houdini’s Principled Shader, VEX materials, displacement and textures in Nova.
lede: Nova reads materials in Karma’s render-context order. MaterialX and Karma’s own nodes run in Nova’s shading VM, and VEX runs through a CVEX bridge.
sourceAnchor: features-by-milestone
---

## MaterialX

- **Standard Surface** 1.0.1 and 1.0.0, **OpenPBR** 1.1, `surface_unlit` and **UsdPreviewSurface**.
- **Any pbrlib BSDF graph:** layer, mix, add and multiply over every 1.39 leaf, including Burley and the generalized
  Schlick with F82. Also glTF PBR, Disney principled, Lama, and mixes of surface shaders.
- **740 of the 746** MaterialX 1.39 node definitions with a numeric output run through Nova's shading compiler and
  VM, with Karma's semantics. Noise is bit-exact to Karma.
- Layering is exact per MaterialX and OpenPBR, with energy compensation.

Render contexts are read in Karma's order: `kma`, `mtlx`, `vex`, then universal.

## Karma Material Builder

Materials of the Karma Material Builder (`kma` context) render as in Karma.

- 35 of Karma's 55 `kma_*` shading nodes: ray switch and ray imports, ramps, hex tiling, Voronoi, curvature, ambient
  occlusion, distance, rounded edges, melanin and others.
- `kma_ao`, `kma_distance`, `kma_curvature` and `kma_roundededge` trace rays from the shading point, with Karma's
  estimators. On the GPU these ray queries return their default values.
- Karma Hair, Karma Fur and the Karma Pyro Material are supported.
- Not yet: room maps.

## Principled Shader

Houdini's Principled Shader (`principledshader::2.0`) is rendered natively. Its parameters, textures, bump and normal
maps, emission, opacity and displacement map onto Nova's Standard Surface with the Principled Shader's own rules.

Not supported, with a warning: packed colour, noise displacement, dispersion, rounded edges, `opdef:` textures.

## VEX materials

VEX Material Builders and other VEX surface code run through the CVEX bridge, `nova_cvex.dll`. The surface function
is rewritten into a CVEX function, compiled once per code, and run in batches of 256 shading points. Its BSDF stays in
VEX and is evaluated and sampled there.

- Parameters come from the material's values, from primvars of the parameters' names, or from a connected
  UsdPrimvarReader.
- `Of` (opacity), `Ce` (emission) and `displace` code are supported.
- Value edits rebind without compiling. Code edits compile the new code.
- Code that calls `trace`, `gather`, `illuminance` or other ray-tracing functions renders the material's preview,
  with one warning.
- A shading point of a stock builder costs about three to four native ones.
- **On Nova XPU, VEX materials render as grey stand-ins**, with one warning.

Not yet: VEX AOV exports (`export_*` parameters), fake caustics through VEX materials, and light, fog or volume VEX
shaders.

## Displacement

Float, vector (Karma's tangent frame) and UsdPreviewSurface displacement in object space.

- Meshes and spheres are diced from the camera at Karma's dicing quality. `primvars:nova:dicingQuality` of 0.5 means
  2-pixel micropolygons, Karma's default.
- Subdivision surfaces are diced on their limit surface, polygon meshes bilinearly.
- The dicing is watertight and motion-blurred like Karma's.

## Textures

Textures are read through OpenImageIO: EXR, HDR, PNG, JPEG, TIFF and others, and Houdini's `.rat` files through
`imaketx`.

- UDIMs, address modes, ray-cone footprints with Karma's MIP choice, and stochastic filtering.
- Images are converted automatically to linear, tiled, MIP-mapped files in the texture cache (`nova:textureAutoTx`).
- Colour spaces are decided as Karma decides them: by channel count, the OCIO config's file rules, the file's
  metadata, then the extension.
- Normal maps and bump use Karma's tangent frame from `st`.
- On Nova XPU, `nova:gpuTextureBudget` limits texture memory. Past it, finer MIP levels are left out.

## Volumes, hair and subsurface

- **Volumes:** `kma_volume`, MaterialX `volume` with `anisotropic_vdf`, `absorption_vdf` and `uniform_edf`, and the
  Karma Pyro Material. Volumes without a material use Karma's default.
- **Hair:** Karma Hair (`kma_hair`), Karma Fur without the medulla, and MaterialX `chiang_hair_bsdf`, on the Chiang
  fibre model.
- **Subsurface:** random walks for Standard Surface, OpenPBR, the Principled Shader and `subsurface_bsdf`, with Karma's
  parameterization.
