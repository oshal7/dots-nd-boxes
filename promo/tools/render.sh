#!/usr/bin/env bash
# Render a HyperFrames project dir to MP4 (silent picture). Usage: tools/render.sh <dir> <out.mp4> [fps=60] [quality=high]
set -euo pipefail
cd "$(dirname "$0")/.."
d="$1"; o="$2"; fps="${3:-60}"; q="${4:-high}"
npx hyperframes render "$d" --fps "$fps" -q "$q" -o "$(realpath -m "$o")" 2>&1 | grep -vE "GL Driver Message|Render:trace|Streaming frame|^\s*$" | tail -n 8
ffprobe -v error -show_entries stream=width,height,r_frame_rate,nb_frames:format=duration -of compact "$o"
