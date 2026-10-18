"""Collect translatable strings from the English pages into tool/i18n/strings.json."""
import json, re, sys, os
from bs4 import BeautifulSoup, NavigableString, Comment

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAGES = ['vision.html', 'index.html', 'food-truck.html', 'plates.html', 'a-paw.html',
         'a-paw-spot.html', 'costings.html', 'shared-paws.html', '404.html']
UNIT = {'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'figcaption', 'a', 'button', 'td', 'th',
        'label', 'small', 'dt', 'dd', 'span', 'b', 'strong', 'em', 'i', 'div', 'summary',
        'blockquote', 'caption', 'option', 'title', 'legend', 'cite', 'q'}
BLOCK = {'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'div', 'section', 'figure',
         'figcaption', 'table', 'tr', 'td', 'th', 'img', 'svg', 'canvas', 'picture', 'video',
         'form', 'input', 'textarea', 'select', 'nav', 'header', 'footer', 'article', 'blockquote',
         'dl', 'dt', 'dd', 'details', 'summary', 'button', 'label', 'iframe', 'script', 'style'}
ATTRS = ['alt', 'aria-label', 'title', 'placeholder', 'data-name', 'data-blurb']
META = {'description', 'og:title', 'og:description', 'twitter:title', 'twitter:description'}

def has_text(s):
    t = BeautifulSoup(s, 'html.parser').get_text()
    return re.search(r'[A-Za-z]', t) is not None

def units(soup):
    out = []
    for el in soup.find_all(True):
        if el.name in ('script', 'style') or el.find_parent(['script', 'style']) or \
           'lang-switch' in (el.get('class') or []) or el.find_parent(class_='lang-switch'):
            continue
        if el.name in UNIT and not any(d.name in BLOCK for d in el.find_all(True)):
            # skip if an ancestor is already a unit (only outermost unit counts)
            anc = el.parent; inside = False
            while anc is not None and anc.name:
                if anc.name in UNIT and not any(d.name in BLOCK for d in anc.find_all(True)):
                    inside = True; break
                anc = anc.parent
            if inside:
                continue
            s = el.decode_contents().strip()
            if s and has_text(s):
                out.append(('html', el, s))
        else:
            # stray text directly inside a block container
            for c in el.children:
                if isinstance(c, NavigableString) and not isinstance(c, Comment) and \
                   el.name not in ('script', 'style', 'html', 'head') and re.search(r'[A-Za-z]', c):
                    if el.name in UNIT and not any(d.name in BLOCK for d in el.find_all(True)):
                        continue
                    out.append(('text', c, str(c).strip()))
        for a in ATTRS:
            v = el.get(a)
            if v and re.search(r'[A-Za-z]', v):
                out.append(('attr:' + a, el, v))
        if el.name == 'meta' and (el.get('name') in META or el.get('property') in META):
            out.append(('attr:content', el, el.get('content', '')))
    return out

def load(p):
    return BeautifulSoup(open(os.path.join(ROOT, p), encoding='utf-8').read(), 'html.parser')

if __name__ == '__main__':
    path = os.path.join(ROOT, 'tool/i18n/strings.json')
    old = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    data = {}
    for p in PAGES:
        for kind, el, s in units(load(p)):
            if s not in data:
                data[s] = {'ar': old.get(s, {}).get('ar', ''), 'pages': []}
            if p not in data[s]['pages']:
                data[s]['pages'].append(p)
    json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    missing = sum(1 for v in data.values() if not v['ar'])
    print(len(data), 'strings,', missing, 'untranslated')
