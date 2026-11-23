#!/usr/bin/env python3
"""One-time authoring helper (BeautifulSoup). Build remains pure Node.js.
Localized templates, translation files and generated HTML are committed.
The translations are indexed to the approved English text inventory.
"""
from pathlib import Path
import re
from bs4 import BeautifulSoup, NavigableString, Comment, Doctype

ROOT = Path(__file__).resolve().parents[1]
INV = ROOT / 'translations' / 'english-text-inventory.txt'
A_INV = ROOT / 'translations' / 'english-attr-inventory.txt'
CANON = 'https://calldibs-ashen.vercel.app/'
PAGES = ['index','how','catalog','safety','updates','litepaper','about','faq','privacy','terms']


def source_inventory(file, attr=False):
    d = {}
    for line in file.read_text().splitlines():
        match = re.match(r'^(\d+) (?:\S+ )?\[.*?\] (.*)$', line)
        if match:
            d[int(match[1])] = match[2]
    return d


def translations(lang, source, filename):
    result = {}
    for line in (ROOT / 'translations' / filename).read_text().splitlines():
        if not line.strip() or line.startswith('#'): continue
        code, val = line.split('::', 1)
        key = source[int(code)]
        result[key] = val
    return result


def hreflink(filename, to_lang, from_lang):
    dest = '' if filename == 'index.html' else filename
    if to_lang == 'en':
        return ('./' if from_lang == 'en' else '../') if not dest else (('' if from_lang == 'en' else '../') + dest)
    prefix = '' if from_lang == 'en' else '../'
    return prefix + to_lang + '/' + dest


def switcher(soup, lang, filename):
    menu = soup.find('ul', id='lang-menu')
    if menu:
        menu.clear()
        for l, label in [('en','English'),('fr','Français'),('es','Español')]:
            li = soup.new_tag('li')
            a = soup.new_tag('a', href=hreflink(filename, l, lang), lang=l)
            if l == lang: a['aria-current'] = 'true'
            a.string = label
            li.append(a)
            menu.append(li)
    button = soup.select_one('.lang-btn span')
    if button: button.string = lang.upper()
    footer = soup.select_one('.f-lang')
    if footer:
        svg = footer.find('svg', recursive=False)
        footer.clear()
        if svg is not None: footer.append(svg)
        for l, label in [('en','English'),('fr','Français'),('es','Español')]:
            a = soup.new_tag('a', href=hreflink(filename,l,lang), lang=l)
            if l == lang: a['aria-current'] = 'true'
            a.string = label
            footer.append(a)


def update_inline_js(soup, lang, filename):
    if lang == 'en': return
    for tag in soup.find_all('script'):
        if tag.has_attr('src') or not tag.string: continue
        js = tag.string
        js = js.replace("'/api/updates'", f"'/api/updates?lang={lang}'")
        js = js.replace('Link copied. Paste it in Nimiq Pay > Mini Apps > Custom URL.', {
            'fr':'Lien copié. Collez-le dans Nimiq Pay > Mini Apps > Custom URL.',
            'es':'Enlace copiado. Pégalo en Nimiq Pay > Mini Apps > Custom URL.'}[lang])
        js = js.replace(' live on Nimiq mainnet', {
            'fr':' en direct sur le réseau principal Nimiq',
            'es':' activo en la red principal de Nimiq'}[lang])
        if filename == 'catalog.html':
            js = js.replace("count.textContent = 'Showing ' + shown + ' of ' + items.length + ' brands';", {
                'fr':"count.textContent = shown + ' marque' + (shown > 1 ? 's' : '') + ' sur ' + items.length;",
                'es':"count.textContent = 'Mostrando ' + shown + ' de ' + items.length + ' marcas';"}[lang])
        if filename == 'faq.html':
            js = js.replace("(n === 1 ? ' answer' : ' answers')", {
                'fr':"(n === 1 ? ' réponse' : ' réponses')",
                'es':"(n === 1 ? ' respuesta' : ' respuestas')"}[lang])
        if filename == 'index.html':
            js = js.replace("paused ? 'Play' : 'Pause'", {
                'fr':"paused ? 'Lire' : 'Pause'",
                'es':"paused ? 'Reanudar' : 'Pausar'"}[lang])
        if js != tag.string: tag.string.replace_with(js)


def generate(src, filename, lang, strings, attrs):
    soup = BeautifulSoup(src, 'html.parser')
    soup.html['lang'] = lang
    for text in soup.find_all(string=True):
        if isinstance(text, (Comment, Doctype)) or text.parent.name in ('svg','style','script'): continue
        old = str(text); val = old.strip()
        if val not in strings: continue
        leading = old[:len(old)-len(old.lstrip())]
        trailing = old[len(old.rstrip()):]
        text.replace_with(NavigableString(leading + strings[val] + trailing))
    for tag in soup.find_all(True):
        for a in ('alt','aria-label','placeholder','title'):
            if tag.has_attr(a) and tag[a] in attrs: tag[a] = attrs[tag[a]]
        if tag.name == 'meta' and (tag.get('name') == 'description' or tag.get('property') in ('og:title', 'og:description')) and tag.get('content') in attrs:
            tag['content'] = attrs[tag['content']]
        if tag.name == 'meta' and tag.get('property') == 'og:url':
            tag['content'] = CANON + ('fr/' if lang == 'fr' else 'es/' if lang == 'es' else '') + ('' if filename == 'index.html' else filename)
        # App link and external services are never rewritten.
        if lang != 'en':
            for a in ('src','href'):
                if tag.get(a) and (tag[a].startswith('assets/') or tag[a] in ('styles.css','litepaper.css')):
                    tag[a] = '../' + tag[a]
            if tag.get('srcset'):
                tag['srcset'] = re.sub(r'(?<![\w./])assets/', '../assets/', tag['srcset'])
    # Language-specific grammar for the Catalog's numeric heading.
    # The category filter uses 'Toutes'/'Todas', but the headline needs an article.
    if filename == 'catalog.html' and lang in ('fr', 'es'):
        headline = soup.find('h1', class_='cat-h1')
        first = headline.contents[0] if headline and headline.contents else None
        if isinstance(first, NavigableString):
            head_text = str(first)
            new_text = 'Les ' if lang == 'fr' else 'Las '
            if head_text.strip() in ('Toutes', 'Todos'):
                first.replace_with(NavigableString(new_text))
    switcher(soup, lang, filename)
    update_inline_js(soup, lang, filename)
    head = soup.head
    for old_link in list(head.find_all('link', rel='alternate')):
        old_link.decompose()
    for l in ('en','fr','es'):
        new = soup.new_tag('link', rel='alternate', hreflang=l,
            href=CANON + ('' if l=='en' else l+'/') + ('' if filename=='index.html' else filename))
        head.append(new)
    head.append(soup.new_tag('link', rel='alternate', hreflang='x-default',
        href=CANON + ('' if filename=='index.html' else filename)))
    return str(soup) + '\n'


def main():
    strings_src=source_inventory(INV)
    attrs_src=source_inventory(A_INV, True)
    for lang in ('en','fr','es'):
        strings = translations(lang, strings_src, f'{lang}.tsv') if lang!='en' else {}
        attrs = translations(lang, attrs_src, f'attrs-{lang}.tsv') if lang!='en' else {}
        dest = ROOT / 'templates' / lang
        dest.mkdir(exist_ok=True)
        for page in PAGES:
            file = f'{page}.html'
            src=(ROOT / 'templates' / 'en' / file).read_text()
            result=generate(src,file,lang,strings,attrs)
            # Preserve original English HTML beyond navigation and SEO corrections.
            (dest / file).write_text(result)
        print(f'Updated {len(PAGES)} {lang} templates from approved English source')

if __name__ == '__main__': main()
