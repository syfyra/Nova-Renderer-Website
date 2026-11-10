---
layout: ../../layouts/Docs.astro
title: Get started
description: Install Nova, choose it in Solaris and render a first frame from the viewport, with husk or with nova_cli.
lede: Install Nova, choose it in the Solaris viewport and render. Scenes set up for Karma render as they are.
source: README.md
sourceAnchor: quick-start
---

## Requirements

- **Windows 10 or 11, x64**, and a CPU with AVX2.
- **Houdini 22.0.** `hdNova` is built against the USD of Houdini 22.0.466.
- **For Nova XPU:** an NVIDIA GPU of the RTX 50 series with a current driver. The GPU kernels are built for that
  architecture. Other GPUs, and machines without one, render on the CPU.

## Install

1. Close Houdini. A loaded `hdNova.dll` cannot be replaced.
2. [Download](../download/) and run `NovaSetup-0.1.0.exe`.

The installer works per user, without administrator rights. It registers Nova with Houdini 22.0 and adds an
uninstaller to Apps & features. To install by hand, or for a studio setup, see
[Build from source](./build/#install-the-package-by-hand).

## Render in Solaris

1. In the viewport's renderer menu, choose **Nova CPU** or **Nova XPU**.
2. For a render setup, press TAB and choose Rendering > **Nova (Setup)**. It builds a Nova Render Settings LOP, a
   Render Pass and a USD Render ROP, just as Karma (Setup) does.
3. Or use the all-in-one **Nova** LOP, which works like the Karma LOP.

Existing Karma setups need no changes. Nova reads Karma's render settings, lights, materials and AOVs. More in
[Use in Solaris](./solaris/) and [Karma compatibility](./karma/).

## Render with husk

```bat
husk --renderer Nova scene.usda -o out.exr
husk --renderer "Nova XPU" scene.usda -o out.exr
```

## Render without Houdini's UI or a license

`nova_cli` reads the render settings, products and render vars as husk does, and writes the same EXR layout:

```bat
nova_cli scene.usda -o out.exr
```

It is part of a source build. See [husk and nova_cli](./husk/).

## Where next

- [Render settings](./render-settings/): every setting and its default.
- [Materials](./materials/): MaterialX, the Karma Material Builder, the Principled Shader and VEX.
- [Limitations](./limitations/): what Nova 0.1.0 does not do.
