#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p units .tmp

rm -rf .tmp/wafer-units .tmp/wafer-custom-units
git -c advice.detachedHead=false clone --depth 1 --branch r33 https://github.com/yahiro07/wafer-units.git .tmp/wafer-units
git -c advice.detachedHead=false clone --depth 1 --branch r24 https://github.com/yahiro07/wafer-custom-units.git .tmp/wafer-custom-units

cp -R .tmp/wafer-units/{sunset-delay,tonerio-sequencer} units/
cp -R .tmp/wafer-custom-units/{shiny-drum-machine,webaudio-tinysynth-mini} units/
