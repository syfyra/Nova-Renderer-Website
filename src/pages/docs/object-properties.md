---
layout: ../../layouts/Docs.astro
title: Object properties
description: Nova’s per-object properties, authored as constant primvars on a prim and inherited by its descendants.
lede: Per-object properties are constant primvars. They override the render settings' defaults on a prim and its descendants.
sourceAnchor: use-in-houdini
---

The Render Geometry Settings LOP has a **Nova** tab that authors them. Where a Nova property is unset, the matching
Karma property (`karma:object:*`) applies, as noted in the table.

## Properties

| Primvar | Default | Description |
|---|---|---|
| `float primvars:nova:object:diffuseLimit` | `1` | Diffuse bounces (fractions dither between the neighbouring integers). Past the limit, rays only collect light. |
| `float primvars:nova:object:reflectLimit` | `4` | Glossy and mirror reflection bounces. |
| `float primvars:nova:object:refractLimit` | `4` | Refraction bounces. |
| `float primvars:nova:object:sssLimit` | `1` | Subsurface and translucency bounces. |
| `float primvars:nova:object:volumeLimit` | `0` | Volume scattering events. |
| `bool primvars:nova:object:thinWallAtRefractLimit` | `1` | Past the refraction limit (up to twice it), refractions continue straight on instead of stopping. |
| `bool primvars:nova:object:fakeCaustics` | `0` | Shadows and diffuse rays pass through this object's transmission (transparent shadows) instead of needing caustic paths. |
| `int primvars:nova:object:lightSource` | `0` | Efficient Emission Sampling: an emissive mesh or volume as a light source (0 no, 1 yes, 2 auto). Unset: Karma's `karma:object:treat_as_lightsource` (with `lightsource_diffusescale`, `_specularscale`, `_samplingquality`). M8's `nova:object:volumeLight` still works for volumes. |
| `int primvars:nova:object:curveStyle` | `1` | Curves: 0 ribbons facing the ray, 1 round tubes, 2 ribbons facing their normals, 3 ribbons where normals exist. Unset: Karma's `karma:object:curve_style`. |
| `float primvars:nova:object:widthScale` | `1` | Multiplies curve and point widths. Unset: Karma's `karma:object:width_scale`. |
| `int primvars:nova:object:pointStyle` | `1` | Points: 0 discs facing the ray, 1 spheres, 2 discs facing their normals. Unset: Karma's `karma:object:point_style`. |
| `int primvars:nova:object:velocityBlur` | `0` | Meshes, curves, points: 0 no velocity blur (time samples), 1 velocity blur, 2 acceleration blur. Unset: Karma's `karma:object:vblur` (also from the render settings). |
| `int primvars:nova:object:instanceVelocityBlur` | `0` | The same for a point instancer's instances (velocities, accelerations, angular velocities). Unset: Karma's `karma:object:instance_vblur`. |
| `int primvars:nova:object:accelerationSamples` | `2` | Shutter samples of acceleration blur (at most `nova:maxMotionSteps`). Unset: Karma's `karma:object:geosamples`, on point instancers `instance_samples`. |
| `int primvars:nova:subdivLevel` | `-1` | Uniform subdivision level of subdivision surfaces (-1: from the display complexity). |
| `float primvars:nova:dicingQuality` | `0.5` | Displacement micropolygons per pixel edge (0.5: 2-pixel micropolygons, Karma's default). |
| `int primvars:nova:dicingDepth` | `-1` | A fixed 2^depth segments per edge instead of the camera's rate (-1: off). |
| `bool primvars:nova:displacement` | `1` | Applies the material's displacement. |

## Ray limits

The limits are per ray type and per object, and they can be fractional: a fraction dithers between the neighbouring
integers. Karma's defaults apply (diffuse 1, reflection 4, refraction 4, subsurface 1, volume 0).

- Past a limit, rays only collect light.
- Past the refraction limit, and up to twice it, refractions continue straight on instead of stopping
  (`thinWallAtRefractLimit`).
- `fakeCaustics` lets shadows and diffuse rays pass through an object's transmission, instead of needing caustic paths.
