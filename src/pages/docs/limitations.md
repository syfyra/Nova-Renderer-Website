---
layout: ../../layouts/Docs.astro
title: Limitations
description: What Nova 0.1.0 does not do, by area. Taken from the "not yet" notes of Nova’s reference.
lede: Nova is at version 0.1.0. This page lists what it does not do today.
sourceAnchor: features-by-milestone
---

## Platform

- **Windows x64 only.**
- **Houdini 22.0 only.** `hdNova` is built against the USD of Houdini 22.0.466.
- A CPU with **AVX2** is required.
- **Nova XPU runs on the NVIDIA RTX 50 series only.** The GPU kernels are built for that architecture. Other GPUs,
  and machines without one, render on the CPU.
- The installer is not code-signed.

## Nova XPU

"XPU" here means the GPU, with the CPU as a fallback. It does not mean both at once.

- CPU and GPU rendering together.
- Multiple GPUs.
- Demand-loaded textures.
- The denoiser on GPU memory.
- **VEX materials** render as grey stand-ins, with one warning.
- **Ray queries from shading** (`kma_ao`, distance, curvature, rounded edges) return their default values.
- **Texture baking** runs on the CPU.

## Lights

- IES profiles.
- Dome texture formats other than constant and latlong.
- `treatAsLine` (rendered as a cylinder).
- Ellipsoid lights: a non-uniformly scaled sphere light renders as a sphere of the mean radius, with a warning.
- Two-level light trees for heavily instanced emitters.
- Moving meshes and meshes with VEX materials stay plain emitters when treated as light sources.

## Shading

- Karma Hair coat, fur medulla and the second R lobe (they warn).
- `sss_traceset`.
- Room maps.
- 20 of Karma's 55 `kma_*` shading nodes.
- Principled Shader: packed colour, noise displacement, dispersion, rounded edges, `opdef:` textures (they warn).
- VEX AOV exports (`export_*` parameters), fake caustics through VEX materials, and light, fog or volume VEX shaders.

## Volumes

- Karma's lattice-deformation velocity blur. It renders as lookup offset.
- `volumefilter` other than a box of width 1 (warns).
- A volume that changes scale over the shutter is not made a light. Its emission is still collected.

## Output

- The `holdout;` prefix of light path expressions renders black, with a warning.
- Utility AOVs are not filtered.

## Geometry

- Long round linear curves are reprojected onto the tube and leave with an error-bounded offset.
- Arrays whose length changes within the shutter (changing topology, particles born or dying) hold their value at
  the frame without blur, as in Karma.

---

Known differences from Karma, as opposed to missing features, are on the
[Karma compatibility](../karma/#known-differences) page. The complete record is the
[bug audit](https://github.com/syfyra/Nova-Renderer/blob/v0.1.0/docs/bug-audit-2026-11.md).
