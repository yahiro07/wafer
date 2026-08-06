#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p units
# npx --yes degit "yahiro07/wafer-units/techno-beat-machine#r16" units/techno-beat-machine
# npx --yes degit "yahiro07/wafer-units/lofi2#r16" units/lofi2
# npx --yes degit "yahiro07/wafer-units/bseq2#r16" units/bseq2
# npx --yes degit "yahiro07/wafer-custom-units/webaudio-tinysynth-mini#r16" units/webaudio-tinysynth-mini

curl -L "https://github.com/yahiro07/wafer-units/archive/refs/tags/r16.zip" -o /tmp/wafer-units-r16.zip
unzip -q /tmp/wafer-units-r16.zip -d /tmp
cp -R /tmp/wafer-units-r16/{techno-beat-machine,lofi2,bseq2} units/

curl -L "https://github.com/yahiro07/wafer-custom-units/archive/refs/tags/r16.zip" -o /tmp/wafer-custom-units-r16.zip
unzip -q /tmp/wafer-custom-units-r16.zip -d /tmp
cp -R /tmp/wafer-custom-units-r16/webaudio-tinysynth-mini units/
