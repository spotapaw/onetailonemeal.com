"""Build the Arabic pages (<page>-ar.html) from the English pages and tool/i18n/strings.json,
and add the English/Arabic switch to both. Re-run after any English edit:
  python3 tool/i18n/extract.py   # lists new strings with empty "ar"
  (fill the "ar" values)
  python3 tool/i18n/build.py
"""
import json, os, re, sys
from bs4 import BeautifulSoup, NavigableString
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import ROOT, PAGES, units, load

SWITCH_CLASS = 'lang-switch'
AR_FONT = ('<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800'
           '&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">')

def ar_name(p):
    return p[:-5] + '-ar.html'

def switch_html(page, lang):
    en, ar = page, ar_name(page)
    on_en = ' class="on" aria-current="true"' if lang == 'en' else ''
    on_ar = ' class="on" aria-current="true"' if lang == 'ar' else ''
    return (f'<span class="{SWITCH_CLASS}" role="group" aria-label="Language">'
            f'<a{on_en} href="{en}" hreflang="en" lang="en">EN</a>'
            f'<a{on_ar} href="{ar}" hreflang="ar" lang="ar">عربي</a></span>')

def alternates(page):
    base = 'https://onetailonemeal.com/'
    en = base + ('' if page == 'index.html' else page)
    return (f'<link rel="alternate" hreflang="en" href="{en}">\n'
            f'<link rel="alternate" hreflang="ar" href="{base + ar_name(page)}">\n')

def add_to_english(page):
    path = os.path.join(ROOT, page)
    s = open(path, encoding='utf-8').read()
    s = re.sub(r'\n    <span class="lang-switch".*?</a></span>', '', s, flags=re.S)
    s = re.sub(r'<link rel="alternate" hreflang="(en|ar)"[^>]*>\n', '', s)
    s = s.replace('</nav>\n  </div>\n</header>', '</nav>\n    ' + switch_html(page, 'en') + '\n  </div>\n</header>', 1)
    s = s.replace('</head>', alternates(page) + '</head>', 1)
    open(path, 'w', encoding='utf-8').write(s)

LINK_RE = re.compile(r'^(%s)([?#].*)?$' % '|'.join(re.escape(p) for p in PAGES))

def build_arabic(page, tr):
    soup = load(page)
    missing = []
    for kind, el, s in units(soup):
        ar = tr.get(s, {}).get('ar')
        if not ar:
            missing.append(s); continue
        if kind == 'html':
            el.clear()
            for c in list(BeautifulSoup(ar, 'html.parser').contents):
                el.append(c)
        elif kind == 'text':
            lead = re.match(r'\s*', str(el)).group(); trail = re.search(r'\s*$', str(el)).group()
            el.replace_with(NavigableString(lead + ar + trail))
        else:
            el[kind.split(':', 1)[1]] = ar
    html = soup.find('html'); html['lang'] = 'ar'; html['dir'] = 'rtl'
    for a in soup.find_all('a', href=True):
        m = LINK_RE.match(a['href'])
        if m and not a.find_parent('span', class_=SWITCH_CLASS):
            a['href'] = ar_name(m.group(1)) + (m.group(2) or '')
    for sw in soup.find_all('span', class_=SWITCH_CLASS):
        sw.replace_with(BeautifulSoup(switch_html(page, 'ar'), 'html.parser'))
    # use an Arabic screenshot (<name>-ar.<ext>) wherever one exists
    for img in soup.find_all('img', src=True):
        path, _, q = img['src'].partition('?')
        base, dot, ext = path.rpartition('.')
        if dot and not base.endswith('-ar') and os.path.exists(os.path.join(ROOT, f'{base}-ar.{ext}')):
            img['src'] = f'{base}-ar.{ext}' + (f'?{q}' if q else '')
    # the truck drive scene always runs left to right
    for el in soup.select('.road, [data-ltr]'):
        el['dir'] = 'ltr'
    out = str(soup)
    out = out.replace('</head>', AR_FONT + '\n</head>', 1)
    open(os.path.join(ROOT, ar_name(page)), 'w', encoding='utf-8').write(out)
    return missing

if __name__ == '__main__':
    tr = json.load(open(os.path.join(ROOT, 'tool/i18n/strings.json'), encoding='utf-8'))
    for p in PAGES:
        add_to_english(p)
    tr = json.load(open(os.path.join(ROOT, 'tool/i18n/strings.json'), encoding='utf-8'))
    total = 0
    for p in PAGES:
        miss = build_arabic(p, tr)
        total += len(miss)
        for m in miss:
            print('untranslated', p, repr(m[:80]))
    print('built', len(PAGES), 'Arabic pages,', total, 'untranslated strings')
