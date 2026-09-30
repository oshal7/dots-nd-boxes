#!/usr/bin/env bash
# Pull frames at given times into a tiled sheet. Usage: tools/stills.sh film.mp4 out.png "t1 t2 t3 ..." [cols=4] [width=640]
set -euo pipefail
f="$1"; o="$2"; ts="$3"; cols="${4:-4}"; w="${5:-640}"; tmp=$(mktemp -d); i=0
for t in $ts; do ffmpeg -v error -y -ss "$t" -i "$f" -frames:v 1 -vf "scale=$w:-1,drawtext=text='$t':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6" "$tmp/$(printf %03d $i).png"; i=$((i+1)); done
n=$i; rows=$(( (n + cols - 1) / cols ))
ffmpeg -v error -y -framerate 1 -i "$tmp/%03d.png" -vf "tile=${cols}x${rows}:padding=4:color=white" -frames:v 1 "$o"; rm -rf "$tmp"; echo "$o"
