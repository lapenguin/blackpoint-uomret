# -*- coding: utf-8 -*-
"""새로 뽑은 그림을 웹용으로 줄인다.

    python tools/convert_art.py

art/ 폴더의 .png / .jpeg 를 적정 크기 .jpg 로 바꾸고, 원본은 art/_원본/ 으로 옮긴다.
(_원본 폴더는 .gitignore 에 들어 있어 저장소에 올라가지 않는다)

파일 이름 규칙 — 이 이름이어야 게임이 알아서 찾아 쓴다
  loc-<장소>.   장소 12곳   harbor square wharf school inn manor well lighthouse chapel cave forest altar
  npc-<인물>.   인물 초상   martha silas gilman carter mary jabez
  pc-<탐사자>.  선택 카드   reporter doctor sailor
  end-<결말>.   결말 화면   seal_martha seal_mary seal_carter seal_self boat flee joined madness death
"""
from PIL import Image
import glob, os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'art')
KEEP = os.path.join(ART, '_원본')
SIZES = {'loc-': (1400, 700), 'end-': (1400, 700), 'npc-': (900, 900), 'pc-': (1000, 500)}

os.makedirs(KEEP, exist_ok=True)
done = 0
for pat in ('*.png', '*.PNG', '*.jpeg', '*.JPEG'):
    for src in sorted(glob.glob(os.path.join(ART, pat))):
        base = os.path.splitext(os.path.basename(src))[0]
        tw, th = next((v for k, v in SIZES.items() if base.startswith(k)), (1400, 700))

        im = Image.open(src)
        if im.mode in ('RGBA', 'LA', 'P'):
            bg = Image.new('RGB', im.size, (10, 14, 13))
            im = im.convert('RGBA')
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert('RGB')

        scale = max(tw / im.width, th / im.height)
        nw, nh = round(im.width * scale), round(im.height * scale)
        im = im.resize((nw, nh), Image.LANCZOS)
        top = 0 if base.startswith(('npc-', 'pc-')) else (nh - th) // 2   # 인물은 얼굴이 위에 있다
        left = (nw - tw) // 2
        im = im.crop((left, top, left + tw, top + th))

        out = os.path.join(ART, base + '.jpg')
        im.save(out, 'JPEG', quality=82, optimize=True, progressive=True)
        shutil.move(src, os.path.join(KEEP, os.path.basename(src)))
        print('%-26s %5d KB' % (base + '.jpg', os.path.getsize(out) // 1024))
        done += 1

print('\n%d장 변환 완료' % done if done else '\n변환할 파일이 없습니다')
