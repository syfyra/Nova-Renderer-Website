---
layout: ../../layouts/Docs.astro
title: Use in Solaris
description: Nova’s Solaris nodes, the viewport, render products and how they mirror Karma’s.
lede: Nova’s nodes follow Karma’s. If you know the Karma LOPs, you know these.
sourceAnchor: use-in-houdini
---

## The renderer menu

Houdini sees Nova as two renderers. In the viewport's renderer menu:

- **Nova CPU** renders on the CPU.
- **Nova XPU** renders on an NVIDIA GPU with OptiX. Without a usable GPU it renders on the CPU and says so.

The viewport's display options (Render tab) carry the interactive subset of the settings, and the viewport toolbar
has a **Denoise** toggle.

## Nova's nodes

In the TAB menu under Rendering > Nova:

- **Nova (Setup)** builds what Karma (Setup) builds: a Nova Render Settings LOP, a Render Pass that uses it and a
  USD Render ROP set to Nova.
- **Nova** is the all-in-one node, like the Karma LOP: Render to Disk, Render to MPlay, Render to Disk in Background,
  the frame range, and all the settings of Nova Render Settings.
- **Nova Render Settings** authors a complete setup, laid out like the Karma Render Settings LOP:
  - on top, the render settings prim, output picture, camera, resolution, the Rendering Engine (CPU or XPU) and samples;
  - **Rendering**: Sampling, Limits, Camera Effects (motion blur, depth of field), Geometry and Shading;
  - **Image Output**: AOVs in the groups of Karma's Standard Render Vars, Utility, Cryptomatte;
  - **Advanced**: Textures, Debug.
- The **Nova Material Builder** is in the TAB menu of material networks.

Houdini's own nodes gain Nova tabs:

- The **Render Settings** LOP has a **Nova** tab. It is sparse: only values set to "Set or Create" are authored.
- The **Render Geometry Settings** LOP has a **Nova** tab for [per-object properties](../object-properties/).

> A hip file saved before Nova was installed needs *Initialize Parameters > Rebuild Renderer-Specific Parameters* once.

## The Rendering Engine

The Rendering Engine menu of the Nova LOPs chooses CPU or XPU. It is authored as `husk:default_delegate`, as Karma's
engine menu does, so husk and the render buttons use it.

## Render products and AOVs

Nova renders the render vars Karma's LOPs author, and Hydra's own AOV names. husk and `nova_cli` write them as
multi-part EXRs. The Solaris viewport shows any of them through the viewer's output menu.

## Interactive rendering

- After an edit the viewport renders one pixel per 4×4 block, then per 2×2 block, then every pixel
  (`nova:iprProxyDepth`). Those samples count towards the image.
- A value edit of a material never recompiles it. A structural edit recompiles one material.
- An edit of a displacement re-dices only the meshes bound to it. Editing an instancer moves the instances without
  rebuilding the prototype geometry.
- The viewport denoiser starts after `nova:denoiseStartPasses` passes.

## VEX materials inside Houdini

In husk, hython and `nova_cli`, the BSDFs of VEX materials are sampled exactly. Inside Houdini's own process,
Houdini's native GGX lobe faults in `sample_bsdf`. Nova catches the fault, warns once, and samples VEX materials from a
fixed mixture for the rest of the session. That is unbiased, but glossy lobes are noisier, and perfect mirrors and
refraction are not sampled. `NOVA_CVEX_SAFE_SAMPLING=1` forces this mode.
