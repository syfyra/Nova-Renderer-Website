---
layout: ../../layouts/Docs.astro
title: Karma compatibility
description: What Nova reads from a Karma setup, node by node, and where it is known to differ from Karma.
lede: Nova renders scenes built with Karma’s Solaris nodes, on the CPU and on the GPU. Each feature was measured against Karma CPU first and is checked by a test.
sourceAnchor: features-by-milestone
---

## The principle

Nova reads Karma's settings as a **fallback**. Nova's own setting wins only if it is authored. A Karma setup
therefore renders unchanged, and a setting Nova does not support warns once per stage.

"Matches Karma" on this site always means: within measured differences, which are recorded per reference scene in
the repository's test manifest.

## Karma's Solaris nodes

All twelve visible Karma LOPs work.

| Node | What Nova does |
|---|---|
| Karma Render Settings | Every parameter with a Nova equivalent: sampling and the variance oracle, seed, pixel filter, ray limits, fake caustics with Karma's factor and controls, internal reflection, roughness constraint, colour limits, dicing, texture settings, motion blur and depth-of-field switches, curve and point styles, emission as light. Also outlines, the look-dev overrides, nested dielectric priorities, light portals and path guiding. |
| Karma Render Products | Per-var sample filters (`minmax`, `stats`, `ubox` and others), raw ray sources, checkpoints with resume, deep EXR output. |
| Karma Standard Render Vars | The render vars Karma authors, under Karma's names. |
| Karma Cryptomatte | Objects, materials and per-instance primvar Cryptomattes. Manifests match Karma's entry for entry. |
| Karma Sky Dome Light | Karma's sky model as a textured dome. |
| Karma Physical Sky | The sky and the sun. |
| Karma Sky Atmosphere | The planetary atmosphere (Rayleigh, Mie, ozone, ground) as a medium in the path tracer. |
| Karma Shadow Catcher | Holdouts with Karma's shadow alpha and holdout LPE planes. |
| Karma Background Plate | The background plate composite, `.pic` images, `transformvector` spaces. |
| Karma Blocker Light Filter | Light filters on every light sampling path. |
| Karma Fog Box | Media bounded by closed surfaces. |
| Karma Texture Baker | UV-space bakes (low, high, cage, UDIMs) of the tangent normal, displacement, occlusion, cavity, curvature, thickness, rounded normals and edges, position and shader exports. Nova XPU bakes on the CPU. |

Path guiding uses Nova's own guiding field on the CPU and on the GPU. Karma XPU ignores guiding.

## Lights

Every UsdLux light renders with the semantics measured on Karma CPU: distant, dome, sphere, rect, disk and cylinder
lights, with `intensity`, `exposure`, `color`, colour temperature, `normalize` and the ShapingAPI cone.

- Karma's light properties `renderlightgeo`, `singlesided` and `recttextureflip` apply. Lights are invisible to the
  camera by default.
- `treat_as_lightsource` turns emissive meshes and volumes into lights.
- Colour spaces of textures are decided as Karma decides them, including `.rat` files.

## AOVs

Nova speaks Karma's AOV vocabulary. The render vars of the Karma Render Settings, Karma Standard Render Vars,
Cryptomatte and LPE Tag LOPs and of `kma_aov` render under their names.

- **Light path expressions** in Karma's dialect: events `R`/`T` × `D`/`G`, light `L`, emission `O`, albedo `A`,
  background `B`, tags and labels, and the prefixes `unoccluded;` and `shadow;`. The components sum to the beauty per
  sample.
- **Tags:** `inputs:karma:light:lpetag` on lights, the constant primvar `karma:object:lpetag` on objects,
  `karma:lpetag` on a material's surface shader.
- **Utility AOVs** at the pixel centre's first hit, with Karma's conventions.

## Known differences

- **Utility AOVs** are unfiltered, where Karma filters `P` and `N`. Meshes without `st` give 0, where Karma gives
  parametric coordinates.
- **Volumes** stay transparent to the first-hit AOVs. Karma averages its sampled volume events into `P` and depth.
- **Smoke lit by a volume light** at volume limit 0 renders 4.5 % darker than in Karma.
- **Absorbing emitters:** Nova matches Karma at a fine step rate. At its default step rate Karma renders them up to
  10 % bright.
- **Textures on the GPU** use hardware trilinear filtering, where the CPU uses OpenImageIO's stochastic filtering.

More differences are documented with each feature in the
[reference](https://github.com/syfyra/Nova-Renderer/blob/v0.1.0/docs/reference.md) and the
[design notes](https://github.com/syfyra/Nova-Renderer/tree/v0.1.0/docs/design). What is missing altogether is on the
[Limitations](../limitations/) page.
