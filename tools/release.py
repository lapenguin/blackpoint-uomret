# -*- coding: utf-8 -*-
"""고친 뒤, 올리기 전에 한 번 실행한다.

    python tools/release.py

- sw.js 의 VERSION 을 지금 시각으로 바꾼다 → 폰이 다음에 열 때 새 버전을 받아 간다
- 오프라인 저장 목록을 저장소의 실제 파일로 다시 만든다 (새 그림·새 스크립트도 자동 포함)
"""
import io, os, re, json, glob, datetime, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def listed(pattern):
    return ['./' + p.replace('\\', '/') for p in sorted(glob.glob(pattern))]

files  = ['./', './index.html', './manifest.webmanifest']
files += listed('css/*.css') + listed('js/*.js') + listed('icons/*.png')
files += listed('art/*.jpg') + listed('art/*.png') + listed('art/*.webp')

# 변환하지 않은 큰 그림이 섞여 있으면 폰 저장이 무거워진다
heavy = [f for f in files if f.startswith('./art/') and os.path.getsize(f[2:]) > 1024 * 1024]
if heavy:
    print('경고: 1MB 가 넘는 그림이 있습니다. 먼저  python tools/convert_art.py  를 실행하세요.')
    for f in heavy:
        print('   ', f, '%.1f MB' % (os.path.getsize(f[2:]) / 1048576))
    sys.exit(1)

sw = io.open('sw.js', encoding='utf-8').read()
version = datetime.datetime.now().strftime('%Y-%m-%d.%H%M%S')
sw = re.sub(r"var VERSION  = '[^']*';", "var VERSION  = '%s';" % version, sw)
sw = re.sub(r"var CORE     = \[.*?\];",
            lambda _: "var CORE     = " + json.dumps(files, ensure_ascii=False, indent=2) + ";",
            sw, flags=re.S)
io.open('sw.js', 'w', encoding='utf-8', newline='\n').write(sw)

total = sum(os.path.getsize(f[2:]) for f in files if f != './')
print('VERSION', version, '| 저장 목록 %d개 | %.1f MB (글꼴 제외)' % (len(files), total / 1048576))
