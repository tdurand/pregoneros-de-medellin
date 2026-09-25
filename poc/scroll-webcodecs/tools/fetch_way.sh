#!/bin/sh
# Download one street's real stills into <out_dir>/{lowres,highres}/wayNNN.jpg
# usage: tools/fetch_way.sh <wayName> <out_dir>
# nbStills is read from content/ways.json.
set -e
WAY=${1:-plazabotero-start-carabobo}
OUT=${2:-street}
HERE=$(cd "$(dirname "$0")" && pwd)
N=$(node -e "const w=require('$HERE/../../../content/ways.json').find(w=>w.wayName==='$WAY'); if(!w){process.exit(1)} console.log(w.nbStills)")
BASE=https://images.pregonerosdemedellin.com/data/$WAY
mkdir -p "$OUT/lowres" "$OUT/highres"
i=0
while [ $i -lt "$N" ]; do
    f=$(printf 'way%03d.jpg' $i)
    for res in lowres highres; do
        [ -s "$OUT/$res/$f" ] || echo "$BASE/$res/$f -o $OUT/$res/$f"
    done
    i=$((i + 1))
done | xargs -P 8 -L 1 sh -c 'curl -sSf "$0" "$1" "$2"'
echo "$WAY: $N stills in $OUT"
