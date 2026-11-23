from pathlib import Path
from bs4 import BeautifulSoup
import re
from urllib.parse import urlsplit,unquote
from collections import defaultdict
ROOT=Path(__file__).resolve().parents[1]
files=[*ROOT.glob('*.html'),*ROOT.glob('fr/*.html'),*ROOT.glob('es/*.html')]
errors=[];links=0;ids=0
for f in files:
 s=BeautifulSoup(f.read_text(),'html.parser')
 lang='en' if f.parent==ROOT else f.parent.name
 if s.html.get('lang')!=lang: errors.append(f'{f.relative_to(ROOT)} wrong html lang')
 if len(s.find_all('h1'))!=1:errors.append(f'{f.relative_to(ROOT)} h1 count={len(s.find_all("h1"))}')
 if len(s.head.select('link[rel="alternate"][hreflang]'))!=4:errors.append(f'{f.relative_to(ROOT)} hreflang count wrong')
 page_ids=[t['id'] for t in s.select('[id]')];ids+=len(page_ids)
 if len(page_ids)!=len(set(page_ids)): errors.append(f'{f.relative_to(ROOT)} duplicate id')
 for im in s.find_all('img'):
  if 'alt' not in im.attrs: errors.append(f'{f.relative_to(ROOT)} img missing alt: {im.get("src")}')
 for el in s.find_all(True):
  for attr in ('href','src'):
   if not el.get(attr):continue
   raw=el[attr]; parsed=urlsplit(raw)
   if parsed.scheme or raw.startswith('//') or raw.startswith('mailto:') or raw.startswith('tel:'):continue
   if raw.startswith('#'):
    if raw[1:] not in page_ids: errors.append(f'{f.relative_to(ROOT)} invalid anchor {raw}')
    links+=1;continue
   p=unquote(parsed.path)
   if p.startswith('/'):
    # /api exists as serverless endpoints, not static paths
    if p.startswith('/api/'):continue
    target=(ROOT/p.lstrip('/'))
   else:target=(f.parent/p).resolve()
   if target.is_dir():target=target/'index.html'
   if not target.is_file():errors.append(f'{f.relative_to(ROOT)} missing asset/link {raw} -> {target}')
   elif parsed.fragment:
    other=BeautifulSoup(target.read_text(),'html.parser') if target.suffix=='.html' else None
    if other and not (other.find(id=parsed.fragment) or (target.name=='catalog.html' and other.select_one('[data-cat="'+parsed.fragment+'"]'))):errors.append(f'{f.relative_to(ROOT)} broken anchor {raw}')
   links+=1
  if el.get('srcset'):
   for entry in el['srcset'].split(','):
    path=entry.strip().split(' ')[0]
    target=(f.parent/path).resolve()
    if not target.is_file():errors.append(f'{f.relative_to(ROOT)} broken srcset {path}')
 for label in ('en','fr','es'):
  if not s.head.select_one(f'link[rel="alternate"][hreflang="{label}"]'):errors.append(f'{f.relative_to(ROOT)} missing hreflang {label}')
  link=s.select_one(f'.f-lang a[lang="{label}"]')
  if not link:errors.append(f'{f.relative_to(ROOT)} no footer link {label}')
 for tag in s.select('.lang-menu li'):
  if not tag.find('a'):errors.append(f'{f.relative_to(ROOT)} inactive language menu link')
 txt=f.read_text()
 if '\u2014' in txt: errors.append(f'{f.relative_to(ROOT)} em dash')
 if re.search(r'(?:United States|\bUSA\b|\bUS\b|\bUK\b|\bCanada\b|\bFrance\b|\bSpain\b|\bTunisia\b|\bNigeria\b|États-Unis|EE\.\s?UU\.|\bChurros\b)',BeautifulSoup(txt,'html.parser').get_text(' ')):errors.append(f'{f.relative_to(ROOT)} location/person name')
 vis=BeautifulSoup(txt,'html.parser').get_text(' ')
 if '!' in vis.replace('Dibs!',''):errors.append(f'{f.relative_to(ROOT)} exclamation mark')
 if '—' in vis:errors.append(f'{f.relative_to(ROOT)} visible em dash')
 if lang!='en' and ('Soon' in vis or 'Link copied' in txt):errors.append(f'{f.relative_to(ROOT)} stale English UI')
 if not s.find(id='open'):errors.append(f'{f.relative_to(ROOT)} closing section missing')
print(f'Checked {len(files)} pages, {links} relative links/assets/anchors, {ids} ids.')
print(f'{len(errors)} issues:')
print('\n'.join('- '+e for e in errors[:150]))
if errors:raise SystemExit(1)
