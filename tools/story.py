# -*- coding: utf-8 -*-
"""대본(story/*.txt)을 검사하고 게임이 읽는 js/story.js 로 바꾼다.

    python tools/story.py

쓰는 법은 story/README.md. 오류가 하나라도 있으면 js/story.js 를 건드리지 않고 멈춘다.
"""
import io, os, re, sys, json, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STAT = {'정신력':'sanity', '체력':'health', '주시':'watch', '최대정신력':'sanityMax', '탄약':'ammo'}
CMP_VAR = {'날':'day', '주시':'watch', '탄약':'ammo'}
TAGS = {'핵심':'core', '사람':'person', '기록':'lore', '위험':'danger'}
VARS = {'부름', '재회', '비밀단서', '꿈', '굴림'}
NUM_VARS = {'치료'}

KEYS_HEAD   = {'조건','반복','조용','힌트','기한','제목','그림','장소표시','형식','보정','문서','효과','기록'}
KEYS_CHOICE = {'메모','조건','무게','효과','기록','문서','다음','결과','분기'}
KEYS_OUT    = {'효과','기록','문서','다음','결과','분기'}
KEYS_ESCAPE = KEYS_OUT | {'조건'}
KEYS_BRANCH = {'효과','기록','문서','다음','결과'}
ALL_KEYS = KEYS_HEAD | KEYS_CHOICE | KEYS_ESCAPE


class Problems(object):
    def __init__(self):
        self.errors, self.warnings = [], []
    def err(self, where, msg):  self.errors.append('%s: %s' % (where, msg))
    def warn(self, where, msg): self.warnings.append('%s: %s' % (where, msg))


# ---------------------------------------------------------------- 게임 쪽 이름들

def js_block_keys(src, name):
    m = re.search(r'^var %s = \{(.*?)^\};' % name, src, re.S | re.M)
    if not m:
        raise SystemExit('js/data.js 에서 %s 를 찾지 못했습니다' % name)
    return re.findall(r'^  (\w+)\s*:', m.group(1), re.M)

def load_world():
    data = io.open(os.path.join(ROOT, 'js', 'data.js'), encoding='utf-8').read()
    w = {
        'loc':    js_block_keys(data, 'LOC'),
        'clue':   set(js_block_keys(data, 'CLUES')),
        'item':   set(js_block_keys(data, 'ITEM_META')),
        'foe':    set(js_block_keys(data, 'PURSUERS')),
        'char':   set(js_block_keys(data, 'CHARACTERS')),
    }
    # 대본 밖(js)에서 세우는 플래그와 읽는 플래그
    js_set, js_read = set(), set()
    for f in glob.glob(os.path.join(ROOT, 'js', '*.js')):
        if os.path.basename(f) == 'story.js':
            continue
        s = io.open(f, encoding='utf-8').read()
        js_set |= set(re.findall(r"flags\.(\w+)\s*=(?!=)", s))
        js_set |= set(re.findall(r"flag\s*:\s*'(\w+)'", s))
        js_read |= set(re.findall(r"flags\.(\w+)", s))
    w['js_flag_set'], w['js_flag_read'] = js_set, js_read
    w['art'] = set(os.path.splitext(os.path.basename(p))[0]
                   for ext in ('jpg', 'png', 'webp') for p in glob.glob(os.path.join(ROOT, 'art', '*.' + ext)))
    return w


# ---------------------------------------------------------------- 한 파일 읽기

class Part(object):
    def __init__(self, kind, label=None, line=0):
        self.kind, self.label, self.line = kind, label, line
        self.fields = []            # (key, value, line)
        self.doc_title, self.doc_lines = None, []
        self.body = []
        self.branches = []          # Part('branch', label=조건)
        self.mode = 'fields'

    def keys_allowed(self):
        return {'head':KEYS_HEAD, 'choice':KEYS_CHOICE, 'ok':KEYS_OUT, 'ng':KEYS_OUT,
                'esc':KEYS_ESCAPE, 'branch':KEYS_BRANCH}[self.kind]

    def get(self, key):
        v = [f for f in self.fields if f[0] == key]
        return v[-1] if v else None

    def all(self, key):
        return [f for f in self.fields if f[0] == key]


def parse_file(path, P):
    name = os.path.relpath(path, ROOT).replace('\\', '/')
    scenes, scene, part = [], None, None
    lines = io.open(path, encoding='utf-8-sig').read().split('\n')
    for ln, raw in enumerate(lines, 1):
        where = '%s:%d' % (name, ln)
        line = raw.rstrip()
        if line.startswith('#'):
            continue
        m = re.match(r'^===\s*(장면|하위장면)\s+(\S+)\s*$', line)
        if m:
            scene = {'id':m.group(2), 'sub':m.group(1) == '하위장면', 'where':where,
                     'head':Part('head', line=ln), 'choices':[], 'ok':None, 'ng':None, 'esc':None}
            if not re.match(r'^[A-Za-z][A-Za-z0-9_]*$', scene['id']):
                P.err(where, "장면 이름 '%s' 은 영문·숫자·_ 로만 씁니다" % scene['id'])
            scenes.append(scene)
            part = scene['head']
            continue
        if line.startswith('==='):
            P.err(where, "'=== 장면 이름' 형태가 아닙니다")
            continue
        m = re.match(r'^---\s*선택\s*:\s*(.+)$', line)
        if m and scene:
            part = Part('choice', label=m.group(1).strip(), line=ln)
            scene['choices'].append(part)
            continue
        m = re.match(r'^---\s*(성공|실패|탈출)\s*$', line)
        if m and scene:
            key = {'성공':'ok', '실패':'ng', '탈출':'esc'}[m.group(1)]
            if scene[key]:
                P.err(where, "'--- %s' 이 두 번 있습니다" % m.group(1))
            part = scene[key] = Part(key, line=ln)
            continue
        if line.startswith('---'):
            P.err(where, "'--- 선택: 글씨', '--- 성공', '--- 실패', '--- 탈출' 중 하나여야 합니다")
            continue
        if scene is None:
            if line.strip():
                P.err(where, '장면 밖에 글이 있습니다 (=== 장면 이름 으로 시작하세요)')
            continue
        feed(part, line, where, ln, P)
    return scenes


def feed(part, line, where, ln, P):
    target = part.branches[-1] if part.branches else part
    km = re.match(r'^([가-힣]+)\s*:\s?(.*)$', line)
    key = km.group(1) if km else None

    if key == '분기' and '분기' in part.keys_allowed():
        if not part.branches and part.body:
            P.err(where, '결과 글 다음에 분기를 둘 수 없습니다. 공통 결과가 없으면 결과: 를 빼세요')
        b = Part('branch', label=km.group(2).strip(), line=ln)
        part.branches.append(b)
        return

    if target.mode in ('fields', 'doc'):
        if line.startswith('>'):
            if target.mode != 'doc':
                P.err(where, "'>' 줄은 '문서:' 바로 아래에만 씁니다")
                return
            target.doc_lines.append(line[2:] if line.startswith('> ') else line[1:])
            return
        if key and key in target.keys_allowed():
            val = km.group(2)
            if key == '결과':
                target.mode = 'body'
                if val.strip():
                    target.body.append(val)
                return
            if key == '문서':
                if target.doc_title is not None:
                    P.err(where, '문서가 두 번 있습니다')
                target.doc_title, target.mode = val.strip(), 'doc'
                return
            target.fields.append((key, val.strip(), ln))
            target.mode = 'fields'
            return
        if key and key in ALL_KEYS:
            P.err(where, "'%s:' 는 여기서 쓸 수 없습니다" % key)
            return
        if not line.strip():
            return
        target.mode = 'body'
        target.body.append(line)
        return

    if key and key in ALL_KEYS and key != '분기':
        P.warn(where, "글 중간에 '%s:' 로 시작하는 줄이 있습니다. 칸이라면 결과 글보다 위에 두세요" % key)
    target.body.append(line)


# ---------------------------------------------------------------- 해석

class Ctx(object):
    def __init__(self, W, P):
        self.W, self.P = W, P
        self.flag_read, self.flag_set = {}, {}
        self.scene_refs = []
        self.ids = {}

def parse_cond(s, where, C, allow_chance=False, allow_else=False):
    terms = []
    for raw in s.split(','):
        p = raw.strip()
        if not p:
            C.P.err(where, '조건에 빈 칸이 있습니다: %r' % s)
            continue
        neg = False
        if p.startswith('아님 '):
            neg, p = True, p[3:].strip()
        t = None
        m = re.match(r'^(날|주시|탄약)\s*(>=|<=|>|<|=)\s*(\d+|그믐)$', p)
        if m:
            n = m.group(3)
            t = {'k':'cmp', 'v':CMP_VAR[m.group(1)], 'op':m.group(2), 'n':('LAST' if n == '그믐' else int(n))}
        else:
            kw, _, arg = p.partition(' ')
            arg = arg.strip()
            if kw == '단서':
                if arg not in C.W['clue']: C.P.err(where, "없는 단서 '%s'" % arg)
                t = {'k':'clue', 'a':arg}
            elif kw == '소지품':
                if arg not in C.W['item']: C.P.err(where, "없는 물건 '%s'" % arg)
                t = {'k':'item', 'a':arg}
            elif kw == '플래그':
                if not re.match(r'^\w+$', arg): C.P.err(where, "플래그 이름이 이상합니다: '%s'" % arg)
                C.flag_read.setdefault(arg, where)
                t = {'k':'flag', 'a':arg}
            elif kw == '본':
                C.scene_refs.append((arg, where))
                t = {'k':'seen', 'a':arg}
            elif kw == '인물':
                if arg not in C.W['char']: C.P.err(where, "없는 탐사자 '%s'" % arg)
                t = {'k':'char', 'a':arg}
            elif kw == '확률' and re.match(r'^\d+$', arg):
                if not allow_chance: C.P.err(where, "'확률' 은 분기에서만 씁니다")
                t = {'k':'chance', 'n':int(arg)}
            elif p == '밤':        t = {'k':'night'}
            elif p == '낮':        t = {'k':'day'}
            elif p == '의식준비':   t = {'k':'ritual'}
            elif p == '준비된사람': t = {'k':'ready'}
            elif p == '그 외':
                if not allow_else: C.P.err(where, "'그 외' 는 분기에서만 씁니다")
                t = {'k':'else'}
            else:
                C.P.err(where, "모르는 조건 '%s'" % p)
                continue
        if neg: t['not'] = 1
        terms.append(t)
    return terms

def parse_value(s, where, C):
    m = re.match(r'^([+-])\s*(.+)$', s)
    if not m:
        C.P.err(where, "수치는 +3 이나 -2 처럼 부호를 붙여 씁니다: '%s'" % s)
        return None
    terms = []
    for t in m.group(2).split('+'):
        t = t.strip()
        if re.match(r'^\d+$', t):            terms.append(int(t))
        elif re.match(r'^주사위\d+$', t):     terms.append('d' + t[3:])
        elif t == '치료':                    terms.append('heal')
        else:
            C.P.err(where, "모르는 수치 '%s'" % t)
    return {'s':(1 if m.group(1) == '+' else -1), 't':terms}

def parse_effects(fields, C):
    out = []
    for key, val, ln, where in fields:
        c = None
        m = re.match(r'^\[([^\]]*)\]\s*(.*)$', val)
        if m:
            c, val = parse_cond(m.group(1), where, C), m.group(2)
        items = []
        for raw in val.split(','):
            p = raw.strip()
            if not p:
                C.P.err(where, '효과에 빈 칸이 있습니다')
                continue
            kw, _, arg = p.partition(' ')
            arg = arg.strip()
            if kw == '단서':
                if arg != '@비밀' and arg not in C.W['clue']: C.P.err(where, "없는 단서 '%s'" % arg)
                items.append({'k':'clue', 'a':arg})
            elif kw in ('소지품', '버림'):
                if arg not in C.W['item']: C.P.err(where, "없는 물건 '%s'" % arg)
                items.append({'k':('item' if kw == '소지품' else 'drop'), 'a':arg})
            elif kw == '플래그':
                if not re.match(r'^\w+$', arg): C.P.err(where, "플래그 이름이 이상합니다: '%s'" % arg)
                C.flag_set.setdefault(arg, where)
                items.append({'k':'flag', 'a':arg})
            elif kw in STAT:
                v = parse_value(arg, where, C)
                if v: items.append({'k':STAT[kw], 'v':v})
            else:
                C.P.err(where, "모르는 효과 '%s'" % p)
        out.append({'c':c, 'e':items} if c else {'e':items})
    return out

def parse_segments(s, where, C):
    segs, pos = [], 0
    for m in re.finditer(r'\{([^{}]*)\}', s):
        if m.start() > pos: segs.append(s[pos:m.start()])
        body = m.group(1)
        if body.startswith('만약 '):
            cond, colon, text = body[3:].partition(':')
            if not colon: C.P.err(where, "{만약 조건:글} 에 콜론(:)이 없습니다")
            segs.append({'c':parse_cond(cond, where, C), 't':text})
        elif re.match(r'^아니면\s*:', body):
            text = body.split(':', 1)[1]
            if not segs or not isinstance(segs[-1], dict) or 'c' not in segs[-1] or 'e' in segs[-1]:
                C.P.err(where, '{아니면:…} 바로 앞에 {만약 …} 이 없습니다')
            else:
                segs[-1]['e'] = text
        elif body in VARS:
            segs.append({'v':body})
        elif re.match(r'^(\d+|치료)(\+(\d+|치료))*$', body):
            segs.append({'x':parse_value('+' + body, where, C)})
        else:
            C.P.err(where, "모르는 {%s}" % body)
        pos = m.end()
    if pos < len(s): segs.append(s[pos:])
    for x in segs:
        if isinstance(x, str) and ('{' in x or '}' in x):
            C.P.err(where, '짝이 맞지 않는 { } 가 있습니다')
    return segs

def parse_text(part, C, fname):
    paras, cur = [], []
    for line in part.body + ['']:
        if line.strip():
            cur.append(line.strip())
        elif cur:
            paras.append(' '.join(cur)); cur = []
    out = []
    where = '%s:%d' % (fname, part.line)
    for p in paras:
        c = None
        m = re.match(r'^\[([^\]]*)\]\s*(.*)$', p)
        if m:
            c, p = parse_cond(m.group(1), where, C), m.group(2)
        para = {'s':parse_segments(p, where, C)}
        if c: para['c'] = c
        out.append(para)
    return out

def fields_with_where(part, fname, keys):
    return [(k, v, ln, '%s:%d' % (fname, ln)) for (k, v, ln) in part.fields if k in keys]

def parse_next(part, fname, C):
    f = part.get('다음')
    if not f: return None
    where = '%s:%d' % (fname, f[2])
    words = f[1].split()
    if len(words) >= 2 and words[0] == '추격':
        if words[1] not in C.W['foe']: C.P.err(where, "없는 추격자 '%s' (%s)" % (words[1], ', '.join(sorted(C.W['foe']))))
        n = {'t':'chase', 'foe':words[1]}
        if len(words) > 2: n['title'] = ' '.join(words[2:])
        return n
    if len(words) == 2 and words[0] == '장면':
        C.scene_refs.append((words[1], where))
        return {'t':'scene', 'id':words[1]}
    C.P.err(where, "'다음:' 은 '추격 누구 [제목]' 또는 '장면 이름' 입니다")
    return None

def build_out(part, fname, C, what):
    o = {}
    fx = parse_effects(fields_with_where(part, fname, {'효과'}), C)
    if fx: o['fx'] = fx
    logs = [v for (k, v, ln) in part.fields if k == '기록']
    if logs: o['log'] = logs
    if part.doc_title is not None:
        o['doc'] = [part.doc_title, '\n'.join(part.doc_lines).rstrip('\n')]
    nx = parse_next(part, fname, C)
    if nx: o['next'] = nx
    text = parse_text(part, C, fname)
    if text: o['text'] = text
    if part.branches:
        brs = []
        for i, b in enumerate(part.branches):
            bw = '%s:%d' % (fname, b.line)
            cond = parse_cond(b.label, bw, C, allow_chance=True, allow_else=True)
            if any(t['k'] == 'else' for t in cond) and i != len(part.branches) - 1:
                C.P.err(bw, "'분기: 그 외' 는 맨 마지막에 둡니다")
            bo = build_out(b, fname, C, what + ' 분기')
            brs.append({'c':cond, 'o':bo})
        if not any(t['k'] == 'else' for t in brs[-1]['c']):
            C.P.err('%s:%d' % (fname, part.branches[-1].line), "분기의 마지막은 '분기: 그 외' 여야 합니다 (아무것도 안 맞을 때)")
        o['br'] = brs
    elif what != '탈출' and 'text' not in o and not (nx and nx['t'] == 'scene'):
        C.P.err('%s:%d' % (fname, part.line), '%s 에 결과 글도, 다음 장면도 없습니다' % what)
    return o

def build_scene(sc, loc, fname, C):
    W, P = C.W, C.P
    h = sc['head']
    where = sc['where']
    out = {'id':sc['id'], 'loc':loc}
    if sc['sub']: out['sub'] = 1

    def one(key):
        f = h.get(key)
        return f[1] if f else None

    title = one('제목')
    if not title: P.err(where, "'제목:' 이 없습니다")
    out['title'] = title or sc['id']

    c = h.get('조건')
    if c: out['when'] = parse_cond(c[1], '%s:%d' % (fname, c[2]), C)
    for key, name in (('반복', 'rep'), ('조용', 'quiet')):
        v = one(key)
        if v is not None:
            if v not in ('예', '아니오'): P.err(where, "'%s:' 는 예 또는 아니오" % key)
            if v == '예': out[name] = 1

    art = one('그림')
    if art:
        if art not in W['art']: P.err(where, "art/ 에 '%s' 그림이 없습니다" % art)
        out['art'] = art
    pl = one('장소표시')
    if pl: out['place'] = pl

    hint = one('힌트')
    if hint:
        tag, bar, text = hint.partition('|')
        tag = tag.strip()
        if not bar or tag not in TAGS:
            P.err(where, "'힌트: 핵심 | 글' 형태입니다. 태그는 %s" % ' '.join(TAGS))
        else:
            out['hint'] = {'tag':TAGS[tag], 'text':text.strip()}
            u = one('기한')
            if u:
                if not re.match(r'^\d+$', u): P.err(where, "'기한:' 은 날짜 숫자")
                else: out['hint']['until'] = int(u)
    elif not sc['sub'] and not out.get('quiet'):
        P.warn(where, "'힌트:' 가 없어 지도에는 장소 이름만 나옵니다")

    kind = (one('형식') or '선택').split()
    k0 = kind[0] if kind else '선택'
    if k0 == '선택' and len(kind) == 1:
        out['kind'] = 'choice'
    elif k0 == '판정' and len(kind) == 2 and kind[1].isdigit():
        out['kind'], out['target'] = 'dice', int(kind[1])
    elif k0 == '추격' and len(kind) == 2:
        if kind[1] not in W['foe']: P.err(where, "없는 추격자 '%s'" % kind[1])
        out['kind'], out['foe'] = 'chase', kind[1]
    elif k0 == '이야기' and len(kind) == 1:
        out['kind'] = 'beat'
    else:
        P.err(where, "'형식:' 은 선택 · 판정 7 · 추격 누구 · 이야기 중 하나")
        out['kind'] = 'choice'

    mods = []
    for (k, v, ln) in h.all('보정'):
        mw = '%s:%d' % (fname, ln)
        if v == '재도전':
            mods.append({'retry':1}); continue
        m = re.match(r'^(?:\[([^\]]*)\]\s*)?(.+?)\s+([+-]\d+)$', v)
        if not m:
            P.err(mw, "'보정: [조건] 이름 +1' 또는 '보정: 재도전'"); continue
        mod = {'label':m.group(2), 'v':int(m.group(3))}
        if m.group(1): mod['c'] = parse_cond(m.group(1), mw, C)
        mods.append(mod)
    if mods:
        if out['kind'] != 'dice': P.err(where, "'보정:' 은 판정 장면에만 씁니다")
        out['mods'] = mods

    if h.doc_title is not None:
        out['doc'] = [h.doc_title, '\n'.join(h.doc_lines).rstrip('\n')]
    text = parse_text(h, C, fname)
    if text: out['text'] = text

    fx = fields_with_where(h, fname, {'효과'})
    logs = [v for (k, v, ln) in h.fields if k == '기록']
    if out['kind'] == 'beat':
        if fx: out['fx'] = parse_effects(fx, C)
        if logs: out['log'] = logs
    elif fx or logs:
        P.err(where, "장면 머리의 '효과:'·'기록:' 은 이야기 장면에서만 씁니다. 선택지 아래로 옮기세요")

    if out['kind'] == 'choice':
        if not sc['choices']: P.err(where, "선택 장면인데 '--- 선택:' 이 없습니다")
        chs = []
        for ch in sc['choices']:
            cw = '%s:%d' % (fname, ch.line)
            o = {'label':ch.label, 'out':build_out(ch, fname, C, "선택 '%s'" % ch.label)}
            note = ch.get('메모')
            if note: o['note'] = parse_segments(note[1], cw, C)
            cc = ch.get('조건')
            if cc: o['when'] = parse_cond(cc[1], cw, C)
            wv = ch.get('무게')
            if wv and wv[1] == '예': o['weighty'] = 1
            chs.append(o)
        out['choices'] = chs
    elif sc['choices']:
        P.err(where, "'--- 선택:' 은 선택 장면에만 씁니다 (지금 형식: %s)" % ' '.join(kind))

    if out['kind'] == 'dice':
        for key, name in (('ok', '성공'), ('ng', '실패')):
            if not sc[key]: P.err(where, "판정 장면에 '--- %s' 이 없습니다" % name)
            else: out[key] = build_out(sc[key], fname, C, name)
    elif sc['ok'] or sc['ng']:
        P.err(where, "'--- 성공'·'--- 실패' 는 판정 장면에만 씁니다")

    if sc['esc']:
        if out['kind'] != 'chase': P.err(where, "'--- 탈출' 은 추격 장면에만 씁니다")
        e = sc['esc']
        eo = build_out(e, fname, C, '탈출')
        ec = e.get('조건')
        if ec: eo['when'] = parse_cond(ec[1], '%s:%d' % (fname, ec[2]), C)
        out['esc'] = eo
    if out['kind'] == 'beat' and not text:
        P.err(where, '이야기 장면에 글이 없습니다')
    return out


# ---------------------------------------------------------------- 전체

def compile_story(write=True, quiet=False):
    W = load_world()
    P = Problems()
    C = Ctx(W, P)
    files = {os.path.splitext(os.path.basename(p))[0]: p for p in glob.glob(os.path.join(ROOT, 'story', '*.txt'))}
    for name in sorted(files):
        if name not in W['loc']:
            P.err('story/%s.txt' % name, "파일 이름이 장소가 아닙니다 (%s)" % ', '.join(W['loc']))
    scenes = []
    for loc in W['loc']:
        if loc not in files:
            P.warn('story/', "'%s.txt' 가 없습니다 — 그 장소는 늘 '주변을 살핀다' 만 나옵니다" % loc)
            continue
        fname = 'story/%s.txt' % loc
        for sc in parse_file(files[loc], P):
            if sc['id'] in C.ids:
                P.err(sc['where'], "장면 이름 '%s' 이 겹칩니다 (%s)" % (sc['id'], C.ids[sc['id']]))
            C.ids[sc['id']] = sc['where']
            scenes.append(build_scene(sc, loc, fname, C))

    by_id = {s['id']: s for s in scenes}
    for ref, where in C.scene_refs:
        if ref not in by_id:
            P.err(where, "없는 장면 '%s'" % ref)
    for s in scenes:
        for ch in s.get('choices', []):
            nx = ch['out'].get('next')
            if nx and nx['t'] == 'scene' and nx['id'] in by_id and not by_id[nx['id']].get('sub'):
                P.warn(C.ids[s['id']], "'%s' 는 하위장면이 아닌데 다음: 으로 부릅니다" % nx['id'])
    for s in scenes:
        if s.get('sub') and not any(r == s['id'] for r, _ in C.scene_refs):
            P.warn(C.ids[s['id']], "하위장면 '%s' 를 부르는 곳이 없습니다" % s['id'])

    all_set = set(C.flag_set) | W['js_flag_set']
    for f, where in sorted(C.flag_read.items()):
        if f not in all_set:
            P.err(where, "플래그 '%s' 를 읽는데, 대본에도 게임 코드에도 세우는 곳이 없습니다 (오타?)" % f)
    for f, where in sorted(C.flag_set.items()):
        if f not in C.flag_read and f not in W['js_flag_read']:
            P.warn(where, "플래그 '%s' 를 세우기만 하고 읽는 곳이 없습니다" % f)

    if not quiet or P.errors:
        for w in P.warnings: print('  경고', w)
        for e in P.errors:   print('  오류', e)
    if P.errors:
        print('대본 오류 %d건 — js/story.js 를 만들지 않았습니다.' % len(P.errors))
        return False

    if write:
        lines = ['/* 자동 생성 — 손으로 고치지 말 것.',
                 '   story/*.txt 를 고친 뒤  python tools/story.py  (또는 tools/release.py) 를 실행하면 다시 만들어진다. */',
                 '"use strict";', '', 'var STORY = [']
        lines += ['  ' + json.dumps(s, ensure_ascii=False, separators=(',', ':')) + ',' for s in scenes]
        lines[-1] = lines[-1].rstrip(',')
        lines += ['];', '']
        io.open(os.path.join(ROOT, 'js', 'story.js'), 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
    subs = sum(1 for s in scenes if s.get('sub'))
    print('대본 OK — 장면 %d개 (하위장면 %d) · 경고 %d건' % (len(scenes) - subs, subs, len(P.warnings)))
    return True


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    sys.exit(0 if compile_story() else 1)
