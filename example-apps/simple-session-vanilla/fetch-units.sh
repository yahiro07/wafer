#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p units

curl -L "https://github.com/yahiro07/wafer-units/archive/refs/tags/r16.zip" -o /tmp/wafer-units-r16.zip
unzip -q /tmp/wafer-units-r16.zip -d /tmp
cp -R /tmp/wafer-units-r16/{graphite-drum-machine,sunset-delay,tonerio-sequencer} units/

curl -L "https://github.com/yahiro07/wafer-custom-units/archive/refs/tags/r16.zip" -o /tmp/wafer-custom-units-r16.zip
unzip -q /tmp/wafer-custom-units-r16.zip -d /tmp
cp -R /tmp/wafer-custom-units-r16/webaudio-tinysynth-mini units/
