FormatFactory media sources — audited 2026-10-15

@ffmpeg/core 0.12.10 (single-thread ESM), @ffmpeg/ffmpeg 0.12.15.
Core GPL-2.0-or-later; wrapper MIT. Original application MIT notices remain.
Do not describe the combined distribution as MIT-only. See GPL-2.0.txt,
WRAPPER-MIT.txt and CODEC-NOTICES.txt; archives preserve upstream notices.
Open index.html for direct downloads from this same host.

SOURCE VERIFICATION SCOPE
source-manifest.json pins 19 archives and the actual deployed JS/WASM with
SHA-256. The v12.15 release contains both matching npm package versions.
The runtime reports FFmpeg 5.1.4 and Emscripten 3.1.40 commit
5c27e79dd0a9c4e27ef2326841698cdd4f6b5784. Configuration matches the release
Makefile production single-thread flags (-O3 -msimd128) and Dockerfile.
core-version.txt records the probe; Dockerfile.upstream preserves the recipe.
All linked codec sources, FFmpeg modifications/bindings, Emscripten runtime
sources and SDL2 are included. SDL2 release-2.24.2 was additionally checked
against the SHA-512 in Emscripten tools/ports/sdl2.py.
The x264 4-cores and LAME master snapshots resolve to commits dated 2022 and
2020 respectively, preceding the 2025-01-07 core release. Their immutable
commits and dates are in the manifest. Correspondence is based on the
upstream release recipe, source history and runtime configuration. This is
not an upstream signed build attestation or a byte-for-byte local rebuild.
Test-only git submodules (GoogleTest, posixtestsuite, wasi-test-suite and
ffmpeg.wasm testdata) are not linked into the distributed core and are not
included. Core compilation does not require these test fixtures.

REBUILDING THE CORE
Requires Linux/Docker Buildx, make and the Emscripten 3.1.40 toolchain.
Extract the ffmpegwasm-ffmpeg.wasm source archive. Its Makefile, Dockerfile,
build/*.sh, src/bind and src/fftools contain build instructions and changes.
The upstream production single-thread command in that directory is:
  make prd
Equivalent build arguments: FFMPEG_ST=yes, EXTRA_CFLAGS="-O3 -msimd128";
FFMPEG_MT is unset. Output: packages/core/dist/esm/ffmpeg-core.{js,wasm}.
Before rebuilding, pin each Dockerfile git ADD to its commit from the
manifest, including x264 and LAME; pin the zimg git clone likewise. To build
from the supplied archives, unpack each into the matching builder's /src
(including zimg) instead of fetching a git branch. Preserve the
upstream build scripts and COPY steps. Set EMSCRIPTEN_PORTS to a directory
containing the unpacked sdl2/SDL-release-2.24.2 port, or allow the toolchain
to fetch the exact SHA-512-pinned port. Standard compiler/build tools are
separate prerequisites. These build steps have not been executed locally;
no bit-identical output claim is made. Do not silently substitute a new core:
rerun conversion/privacy/offline tests and update the source audit and hashes.

APPLICATION SOURCE
app-source.zip is generated on every build from an explicit source allowlist.
It includes TypeScript, CSS, scripts, package-lock.json, tests and original
MIT license. Extract it, place these media-licenses files and source archives
under public/media-licenses, then run npm ci --ignore-scripts and npm run build
with a supported Node version (see package.json). Dependencies are locked.
Only the wrapper CORE_URL fallback is changed to a local URL by
scripts/prepare-media.mjs; the core binary itself is unmodified.
Check the exact release with node scripts/check-media-release.mjs after build.
It verifies the source manifest, every archive, deployed binary hashes,
package versions and the application source against the working files.
Source archives are not precached and are not loaded during file processing.
No user media or credentials are part of any source archive.
