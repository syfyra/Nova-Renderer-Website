---
layout: ../../layouts/Docs.astro
title: Render settings
description: Every Nova render setting with its default. The settings are attributes on a RenderSettings prim.
lede: Nova’s settings are attributes on a RenderSettings prim. The Nova Render Settings LOP authors them, and the Render Settings LOP has a Nova tab.
sourceAnchor: use-in-houdini
---

Where Nova's own setting is not authored, the matching **Karma** render setting is read as a fallback, so a Karma
setup renders without changes. See [Karma compatibility](../karma/).

A hip file saved before Nova was installed needs *Initialize Parameters > Rebuild Renderer-Specific Parameters* once.

## Settings

| Setting | Default | Description |
|---|---|---|
| `int nova:samples` | `64` | Samples per pixel. |
| `token nova:pixelFilter` | `gauss` | The pixel reconstruction filter. (`gauss`, `box`, `triangle`, `blackman`, `blackmanharris`, `point`) |
| `float nova:pixelFilterScale` | `1` | Multiplies the filter's width (0: point sampling). |
| `int nova:seed` | `0` | Varies the sample pattern between renders of the same frame. |
| `float nova:clampIndirect` | `10` | Clamps indirect light per sample against fireflies (0: off). |
| `int nova:maxDepth` | `64` | A safety cap on the scattering events of a path; the per-type limits decide the look. |
| `float nova:object:diffuseLimit` | `1` | Diffuse bounces (fractions dither between the neighbouring integers). Past the limit, rays only collect light. |
| `float nova:object:reflectLimit` | `4` | Glossy and mirror reflection bounces. |
| `float nova:object:refractLimit` | `4` | Refraction bounces. |
| `float nova:object:sssLimit` | `1` | Subsurface and translucency bounces. |
| `float nova:object:volumeLimit` | `0` | Volume scattering events. |
| `bool nova:object:thinWallAtRefractLimit` | `1` | Past the refraction limit (up to twice it), refractions continue straight on instead of stopping. |
| `bool nova:object:fakeCaustics` | `0` | Shadows and diffuse rays pass through this object's transmission (transparent shadows) instead of needing caustic paths. |
| `int nova:maxMotionSteps` | `8` | The most shutter samples of moving geometry, transforms and cameras. |
| `int nova:subdivLevel` | `-1` | Uniform subdivision level of subdivision surfaces (-1: from the display complexity). |
| `int nova:subdivMaxTriangles` | `8000000` | Triangle budget of a subdivided or displaced mesh; above it, coarser tessellation and a warning. |
| `float nova:dicingQualityScale` | `1` | Multiplies every object's displacement dicing quality. |
| `float nova:offscreenQuality` | `0.1` | Dicing quality of displaced objects outside the camera's view. |
| `bool nova:textureAutoTx` | `1` | Converts images to tiled, MIP-mapped, linear .tx files in the texture cache directory. |
| `string nova:textureCacheDir` | `""` | Where converted textures go (empty: $HOUDINI_TEMP_DIR/nova_tx). |
| `float nova:textureBlur` | `0` | Extra blur of every texture lookup. |
| `float nova:textureFilterWidth` | `0.25` | Texture footprint relative to the pixel's ray cone (0.25 as Karma; 0: the finest MIP level). |
| `bool nova:abortOnMissingTexture` | `0` | Stops the render when a texture file cannot be read. |
| `int nova:textureStats` | `0` | OpenImageIO texture statistics level printed at the end of a render. |
| `token nova:lightSamplingMode` | `lighttree` | How a light sample picks its light: the light tree, or `uniform` (by power alone). While at the default, Karma's `karma:global:light_sampling_mode` applies. |
| `token nova:lightStrategy` | `mis` | Debugging aid: which estimators sample direct light. (`mis`, `light`, `bsdf`) |
| `token nova:pixelOracle` | `uniform` | `variance`: adaptive sampling; Samples is then the maximum. |
| `int nova:oracleMinSamples` | `-1` | Samples before a pixel may stop (-1: max(16, square root of Samples)). |
| `float nova:oracleThreshold` | `0.01` | The variance oracle's noise level. |
| `bool nova:denoise` | `0` | Denoises the final frame (OptiX). |
| `string nova:denoiseAovs` | `C` | The AOVs it denoises, by name. |
| `bool nova:viewportDenoise` | `0` | Denoises the viewport (a toggle on the viewport toolbar). |
| `int nova:denoiseStartPasses` | `4` | Passes the viewport shows noisy before denoising. |
| `int nova:iprProxyDepth` | `2` | Viewport proxy passes after an edit (0: none). |
| `token nova:device` | (the renderer's) | `cpu` or `xpu`: where Nova renders. Unset, Nova renders on the CPU and Nova XPU on the GPU. Not authored by the Nova LOPs. |
| `int nova:gpuTextureBudget` | `0` | Nova XPU's texture memory in MB (0: half the GPU memory free at the first texture upload); past it finer MIP levels are left out. |

The `nova:object:*` settings are the defaults of the [per-object properties](../object-properties/).

## Camera

Motion blur and depth of field follow the render camera: its `shutter:open` and `shutter:close`, `fStop`,
`focusDistance` and `focalLength`. The UsdRender settings `disableMotionBlur` and `disableDepthOfField` switch them
off.

- Depth of field is a thin lens with a planar focus plane. The aperture radius is `focalLength / (2 fStop)`, as in Karma.
- husk crop windows and overscan (`dataWindowNDC`, also beyond 0 to 1), `pixelAspectRatio` and
  `aspectRatioConformPolicy` are supported. A crop reproduces the matching pixels of the full-frame render exactly.

## Lights

Light properties use Karma's names on UsdLux lights. Nova's own `inputs:nova:light:*` win where both are authored.

- `inputs:karma:light:samplingquality` multiplies the light's share of light samples.
- `inputs:karma:light:equiangular` adds equiangular sampling along rays in volumes for point, spot, sphere and area lights.
- Light linking and shadow linking use UsdLux's `collection:lightLink` and `collection:shadowLink`, which the Light
  Linker LOP authors.
