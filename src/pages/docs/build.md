---
layout: ../../layouts/Docs.astro
title: Build from source
description: Build Nova with Visual Studio 2022, CMake and vcpkg against Houdini 22.0, run the tests and pack the installer.
lede: Nova builds on Windows with Visual Studio 2022 Build Tools against a Houdini 22.0 installation.
source: README.md
sourceAnchor: build-from-source
---

## Requirements

- **Houdini 22.0.** USD and Hydra, TBB, OpenImageIO, OpenSubdiv, MaterialX and Python come from `$HFS`.
- **Visual Studio 2022 Build Tools** (MSVC v143, "Desktop development with C++"), which include CMake 3.26 or later
  and Ninja.
- **vcpkg** in `%USERPROFILE%\vcpkg` or at `%VCPKG_ROOT%`. It provides only Embree 4 and Catch2.
- **Optional, for Nova XPU and the OptiX denoiser:** CUDA 12.8 or later. The OptiX headers come from an installed
  OptiX SDK or are downloaded from [NVIDIA/optix-dev](https://github.com/NVIDIA/optix-dev).
  `-DNOVA_FETCH_OPTIX=OFF` skips the download.

The CUDA driver and OptiX are loaded at run time, so a build also runs on machines without an NVIDIA GPU.

## Build

```bat
cmake --preset vs2022
cmake --build --preset release
ctest --preset release
cmake --install build/vs2022 --config Release
```

- **First configure:** it builds Embree through vcpkg, which takes about 20 minutes. Later configures restore it from
  vcpkg's binary cache.
- **Configurations:** only Release and RelWithDebInfo exist, because Houdini ships release libraries only.
- **Install step:** it writes the Houdini package to `dist/` (`dist/nova.json` and `dist/nova/`).

## Install the package by hand

1. Close Houdini, because a loaded `hdNova.dll` cannot be overwritten.
2. Make the package visible to Houdini. Either copy `dist/nova.json` to
   `%USERPROFILE%\Documents\houdini22.0\packages\`, or set `HOUDINI_PACKAGE_DIR` to the `dist` directory.

## Pack the installer

```bat
cmake --install build/vs2022 --config Release
powershell -ExecutionPolicy Bypass -File tools\installer\build.ps1
```

`build.ps1` packs `dist/nova` into `dist/NovaSetup-<version>.exe`. It needs the Rust MSVC toolchain and WebView2,
which is part of Windows 11.

The installer also runs unattended:

```bat
NovaSetup-0.1.0.exe --silent [--dir <folder>] [--packages-root <folder>] [--no-register]
"Uninstall Nova.exe" --uninstall [--silent]
```

`--packages-root` replaces `Documents` as the parent of `houdini22.0\packages`, for tests and studio setups.
`--no-register` leaves Apps & features alone.

## Tests

`ctest --preset release` runs about 690 tests.

| Label | Contents |
|---|---|
| (none) | Catch2 unit tests of `nova_core`: math, sampling, lights, acceleration, analytic render checks, determinism, and a statistical BSDF harness |
| `hydra` | The render pass and delegate driven like an interactive viewport |
| `husk` | husk renders of the test scenes against analytic values |
| `cli` | The same scenes rendered with `nova_cli`, without husk or a license |
| `reference` | One test per reference scene: Nova renders it twice and `nova_imgcmp` compares it statistically with a Karma CPU reference or an analytic value |
| `cvex` | The CVEX bridge for VEX materials |
| `houdini` | hython in an isolated environment: the Solaris UI, the Nova Material Builder, a stock VEX Material Builder |

The husk, reference and Houdini tests run Houdini with an isolated, empty preference directory, so installed packages
never interfere and a running Houdini session is never touched. Regenerating the Karma reference images needs a Karma
license.

## Repository layout

| Directory | Contents |
|---|---|
| `core/` | `nova_core`, the renderer, with no HDK or USD dependency |
| `core/gpu/` | Nova XPU: CUDA wavefront kernels, OptiX acceleration structures and programs |
| `hydra/` | `hdNova.dll`, the Hydra render delegate; MaterialX translation; the texture system |
| `houdini/` | The Houdini package, the CVEX bridge and the volume bridge |
| `tools/` | `nova_cli`, `nova_imgcmp` and the installer |
| `tests/` | Unit tests, husk and CLI scenes, the Karma reference scenes and images, Houdini UI tests |
| `docs/` | The plan, design notes per milestone, research notes, benchmarks, the bug audit, the reference |
