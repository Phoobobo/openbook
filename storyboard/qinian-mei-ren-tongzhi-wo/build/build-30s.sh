#!/bin/bash
# 30s 预告片 v2: SVG字卡 PNG + screen blend (无 drawtext 依赖)
set -euo pipefail
CLIPS="/Users/phoobobo/Workspace/openbook/storyboard/qinian-mei-ren-tongzhi-wo/clips"
W="$(cd "$(dirname "$0")" && pwd)"; cd "$W"
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 24 -an"
mkdir -p png seg

# ---------- 1. 字卡 SVG → PNG(1280 方) → 裁 720x1280 ----------
node cards.mjs
for n in c1 c2 c3 c4 c5 c6 c7a c7b c8 c9; do
  qlmanage -t -s 1280 -o png "cards/$n.svg" >/dev/null 2>&1
  sips -c 1280 720 "png/$n.svg.png" --out "png/$n.png" >/dev/null 2>&1
done
sips -g pixelWidth -g pixelHeight png/c1.png | grep pixel

# 叠字工具: 素材 + 文字PNG(黑底) screen 混合, 文字带进出渐变
# overlay_seg <footage> <dur> <extra_pre_filters> <png:T0:T1> [png2:T0:T1] <out>
seg_footage() {
  local src="$1" dur="$2" pre="$3" out="$4"; shift 4
  local inputs=(-i "$src") fc="[0:v]fps=24,scale=720:1280,setsar=1,${pre}format=gbrp[b0];" idx=1 cur="b0"
  for spec in "$@"; do
    IFS=: read -r png t0 t1 <<< "$spec"
    inputs+=(-loop 1 -t "$dur" -i "png/$png.png")
    fc+="[$idx:v]scale=720:1280,setsar=1,format=gbrp,fade=t=in:st=$t0:d=0.3,fade=t=out:st=$(echo "$t1-0.3"|bc):d=0.3[t$idx];"
    fc+="[$cur][t$idx]blend=all_mode=screen[b$idx];"
    cur="b$idx"; idx=$((idx+1))
  done
  fc+="[$cur]format=yuv420p[v]"
  ffmpeg -y -v error "${inputs[@]}" -filter_complex "$fc" -map "[v]" -t "$dur" $ENC "seg/$out"
}

# 黑场字卡段: png dur T0 T1 [tail_filter] out
seg_black() {
  local png="$1" dur="$2" t0="$3" t1="$4" tail="$5" out="$6"
  ffmpeg -y -v error -loop 1 -t "$dur" -i "png/$png.png" -vf "scale=720:1280,setsar=1,fade=t=in:st=$t0:d=0.3,fade=t=out:st=$(echo "$t1-0.3"|bc):d=0.3${tail}" -t "$dur" $ENC "seg/$out"
}

seg_footage "$CLIPS/s1-rain-opens.mp4"   4.0 "fade=t=in:st=0:d=0.5," 01.mp4 "c1:1.0:3.7"
seg_black c2 3.0 0.3 2.7 "" 02.mp4
seg_black c3 2.5 0.3 2.2 "" 03.mp4
seg_black c4 1.5 0.15 1.35 "" 04.mp4
seg_footage "$CLIPS/s6-not-hurting.mp4"  5.0 "" 05.mp4 "c5:2.0:4.8"
seg_black c6 2.5 0.3 2.2 "" 06.mp4
seg_footage "$CLIPS/s7-turn-and-run.mp4" 5.0 "" 07.mp4 "c7a:1.0:4.8" "c7b:3.5:4.9"
seg_black c8 2.5 0.3 2.2 "" 08.mp4
seg_black c9 4.0 0.3 3.6 ",fade=t=out:st=3:d=1" 09.mp4

# ---------- 拼接 ----------
: > concat.txt
for i in 01 02 03 04 05 06 07 08 09; do echo "file 'seg/$i.mp4'" >> concat.txt; done
ffmpeg -y -v error -f concat -safe 0 -i concat.txt -c copy video30.mp4

# ---------- 雨声 bed ----------
ffmpeg -y -v error -i "$CLIPS/s6-not-hurting.mp4" -vn -ac 2 -ar 44100 a6.wav
ffmpeg -y -v error -i "$CLIPS/s7-turn-and-run.mp4" -vn -ac 2 -ar 44100 a7.wav
ffmpeg -y -v error -i a7.wav -i a6.wav -i a7.wav -i a6.wav -i a7.wav -i a6.wav -i a7.wav -i a6.wav \
 -filter_complex "[0][1]acrossfade=d=1[c1];[c1][2]acrossfade=d=1[c2];[c2][3]acrossfade=d=1[c3];[c3][4]acrossfade=d=1[c4];[c4][5]acrossfade=d=1[c5];[c5][6]acrossfade=d=1[c6];[c6][7]acrossfade=d=1[c7];[c7]atrim=0:30,afade=t=in:st=0:d=1,afade=t=out:st=28.5:d=1.5[out]" \
 -map "[out]" bed.wav

# ---------- 合成 ----------
ffmpeg -y -v error -i video30.mp4 -i bed.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k -shortest cut-30s-v1.mp4
echo "duration: $(ffprobe -v error -show_entries format=duration -of csv=p=0 cut-30s-v1.mp4)"
echo "BUILD OK: $W/cut-30s-v1.mp4"
