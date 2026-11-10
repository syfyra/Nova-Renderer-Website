---
layout: ../../layouts/Docs.astro
title: husk and nova_cli
description: Render Nova from the command line with husk, or without Houdini’s UI or a license with nova_cli.
lede: Two ways to render from the command line. Both read the same USD render settings and write the same EXR layout.
sourceAnchor: tools
---

## husk

```bat
husk --renderer Nova scene.usda -o out.exr
husk --renderer "Nova XPU" scene.usda -o out.exr
```

The plugin ids `HdNovaRendererPlugin` and `HdNovaXpuRendererPlugin` also work as renderer names.

- Warnings such as unreadable textures or unknown settings also go to stderr, because husk does not print Hydra's
  diagnostics.
- husk crop windows, overscan, `pixelAspectRatio` and `aspectRatioConformPolicy` are supported.
- Checkpoints with resume and deep EXR output work through Karma's Render Products.

## nova_cli

`nova_cli` renders a scene without husk, the HDK or a Houdini license. It needs `$HFS/bin` on `PATH`, and it is part of
a [source build](../build/).

```bat
nova_cli scene.usda [--settings /Render/rs] [-o out.exr] [--camera /cam]
         [--frame F] [--res WxH] [--spp N] [--threads N] [--timeout S]
         [--purposes ...] [-q] [--profile report.txt]
```

- It reads the RenderSettings, products and render vars like husk, and writes the same multi-part EXR layout,
  Cryptomattes and sidecar manifests included.
- `--device cpu` or `--device xpu` chooses where it renders.
- `--profile` writes a sampling profile of the render. Build the RelWithDebInfo configuration for symbol names.

## Choosing the device

| How | Value |
|---|---|
| Viewport renderer menu | Nova CPU, Nova XPU |
| husk | `--renderer Nova`, `--renderer "Nova XPU"` |
| Nova LOPs | The Rendering Engine menu (CPU, XPU) |
| Render setting | `nova:device` = `cpu` or `xpu` |

Without a usable NVIDIA GPU, or after a device error, Nova XPU renders on the CPU and says so once.
`NOVA_XPU_DISABLE=1` forces the CPU.

## Denoising a final frame

Set `nova:denoise`, with `nova:denoiseAovs` naming the AOVs (default `C`), or use the Denoiser menu of the Karma Render
Settings LOP. The beauty and the listed AOVs denoise together, with the first-hit albedo and normal as guides. Alpha
stays exact. Without an NVIDIA driver Nova renders as before and warns once.

## nova_imgcmp

`nova_imgcmp` compares noisy renders against a reference: z-tests on 8×8 blocks with a Šidák-corrected error rate, a
global mean test, and HDR-FLIP and relMSE as diagnostics. `--make-ref` turns two independent reference renders into a
mean and a standard-error image. Nova's reference tests are built on it.
