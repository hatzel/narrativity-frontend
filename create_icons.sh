#!/usr/bin/env sh
inkscape -w 180 -h 180 img/logo.svg -o img/apple-touch-icon.png
inkscape -w 32 -h 32 img/logo.svg -o img/favicon.png
inkscape -w 32 -h 32 img/logo.svg -o img/16.png
inkscape -w 32 -h 32 img/logo.svg -o img/32.png
inkscape -w 32 -h 32 img/logo.svg -o img/48.png
convert img/16.png img/32.png img/48.png img/favicon.ico
inkscape -w 192 -h 192 img/logo.svg -o img/192.png
inkscape -w 512 -h 512 img/logo.svg -o img/512.png
