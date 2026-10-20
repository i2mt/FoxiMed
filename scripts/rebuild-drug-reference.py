#!/usr/bin/env python3
"""Re-extract PDF heading-bounded monographs. Requires PyMuPDF and pdftotext.
Usage: python3 scripts/rebuild-drug-reference.py /path/to/source.pdf
No dose, fraction, unit, or clinical recommendation is autocorrected.
"""
import collections, csv, difflib, hashlib, json, math, re, subprocess, sys, tempfile, unicodedata
from pathlib import Path
import fitz
ROOT = Path(__file__).resolve().parent.parent
(ROOT/'reports').mkdir(exist_ok=True)
PDF = Path(sys.argv[1]).resolve()
original = json.loads((ROOT/'scripts/drug-reference-original-ids.json').read_text())
overrides = json.loads((ROOT/'scripts/drug-reference-overrides.json').read_text())
editorial = json.loads((ROOT/'scripts/drug-reference-editorial.json').read_text())
ligature_repairs = 0
doc = fitz.open(PDF)
# Decode compound lam-alef glyphs as one presentation character before bidi
# reordering. Poppler otherwise reverses the two scalars inside this glyph.
# This temporary extraction copy is never rendered, published or substituted
# for the original PDF. No clinical text or numeric glyphs are rewritten.
repairs={'afii57444_afii57415.fina':'uniFEFC','afii57444_afii57415.isol':'uniFEFB',
         'afii57444_afii57410.fina':'uniFEF6','afii57444_afii57410.isol':'uniFEF5',
         'afii57444_afii57411.fina':'uniFEF8','afii57444_afii57411.isol':'uniFEF7',
         'afii57444_afii57413.fina':'uniFEFA','afii57444_afii57413.isol':'uniFEF9'}
font_dictionary_repairs=0
for xref in range(1,doc.xref_length()):
    obj=doc.xref_object(xref)
    if '/afii57444_afii574' not in obj: continue
    for before,after in repairs.items(): obj=obj.replace('/'+before,'/'+after)
    doc.update_object(xref,obj);font_dictionary_repairs+=1
scratch=tempfile.TemporaryDirectory(prefix='foximed-drug-extraction-')
extraction_pdf=Path(scratch.name)/'decoding-only.pdf'
doc.save(extraction_pdf)
def norm(s):
    return unicodedata.normalize('NFKC',s).replace('ي','ی').replace('ك','ک')
def tokens(s):
    return sorted(set(t for t in re.findall('[a-z0-9]+',norm(s).lower()) if t!='r'))
def score(a,b):
    return difflib.SequenceMatcher(None,' '.join(tokens(a)),' '.join(tokens(b))).ratio()
def clean(s):
    global ligature_repairs
    ligature_repairs += sum('\ufef5'<=c<='\ufefc' for c in s)
    # Remove extraction control glyphs, not letters, digits, fractions or units.
    s = re.sub('[\u202a-\u202e\u200e\u200f\x00-\x08\x0b-\x1f\x7f]', '', s)
    s = ''.join(unicodedata.normalize('NFKC',c) if '\ufef5'<=c<='\ufefc' else c for c in s)
    return '\n'.join(re.sub('[ \t]+',' ',line).strip() for line in s.splitlines()).strip()
# The bibliography and publisher advertisements are not part of the last drug.
end_page=next((i+1 for i,p in enumerate(doc) if i>22 and 'کتابنامه' in p.get_text()[:150]),len(doc)+1)
heads=[]
for i,page in enumerate(doc):
    if i<22 or i+1>=end_page: continue
    spans=[s for b in page.get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans'] if s['color']==16777215 and 5<s['size']<13]
    # Wrapped names and translations can occupy several lines in one band.
    # Cluster overlapping white title spans before identifying a monograph.
    groups=[]
    for span in sorted(spans,key=lambda x:x['bbox'][1]):
        if groups and span['bbox'][1] <= max(s['bbox'][3] for s in groups[-1])+4:
            groups[-1].append(span)
        else: groups.append([span])
    for group in groups:
        english=[s for s in group if re.search('[A-Za-z]',s['text']) and not re.search('[\u0600-\u06ff]',s['text']) and s['bbox'][0]<page.rect.width*.55]
        if not english: continue
        english.sort(key=lambda s:(round(s['bbox'][1]/5),s['bbox'][0]))
        fa_spans=[s for s in group if re.search('[\u0600-\u06ff]',s['text']) or s['bbox'][0]>=page.rect.width*.55]
        heads.append(dict(page=i+1,y=min(s['bbox'][1] for s in group),
                          fa=norm(' '.join(s['text'] for s in sorted(fa_spans,key=lambda s:(round(s['bbox'][1]/5),-s['bbox'][0])))),
                          en=norm(' '.join(s['text'] for s in english)),
                          hasFa=bool(fa_spans),
                          headingLines=max(1,math.ceil((max(s['bbox'][1] for s in group)-min(s['bbox'][1] for s in group))/10)+1)))
heads.sort(key=lambda h:(h['page'],h['y']))
# Matching is one-to-one. Existing IDs never change when display names change.
used=set(); mapping={}
for d in original:
    ranked=sorted((score(d['en'],h['en']),j) for j,h in enumerate(heads) if j not in used)
    best,j=ranked[-1]
    if best<.90: raise ValueError(f'Uncertain ID mapping: {d["id"]} -> {heads[j]} ({best})')
    used.add(j);mapping[j]=d
seen={d['id'] for d in original}; book=[]; corrections=[]; issues=[]
from drug_reference_sections import split_sections
for j,h in enumerate(heads):
    nxt=heads[j+1] if j+1<len(heads) else dict(page=end_page-1,y=doc[end_page-2].rect.height)
    chunks=[]; pages=[]
    for pno in range(h['page'],nxt['page']+1):
        top=h['y'] if pno==h['page'] else 0
        bottom=nxt['y'] if pno==nxt['page'] else doc[pno-1].rect.height
        if bottom-top<2: continue
        # Poppler handles the Persian lam-alef mappings better than MuPDF text.
        out=subprocess.check_output(['pdftotext','-f',str(pno),'-l',str(pno),'-r','144','-x','0','-y',str(math.floor(top*2)),'-W',str(math.ceil(doc[pno-1].rect.width*2)),'-H',str(math.ceil((bottom-top)*2)),'-layout',str(extraction_pdf),'-']).decode('utf-8')
        text=clean(out.replace('\f',''))
        lines=[s for s in text.splitlines() if not re.fullmatch('[۰-۹0-9]+',s.strip())]
        text='\n'.join(lines).strip()
        if text: chunks.append(text);pages.append(pno)
    text='\n\n'.join(chunks)
    # Only actual white title spans define the name. Clipped body lines can
    # overlap the title band and must never be promoted into metadata.
    fa=h['fa'].strip(' .,:')
    old=mapping.get(j)
    if old:
        id=old['id']
        if not fa: fa=old['fa']
    else:
        id=re.sub('[^a-z0-9]+','-',h['en'].lower()).strip('-') or f'pdf-entry-{j+1}'
        if id in seen: id+=f'-pdf-{h["page"]}'
        seen.add(id)
    # Only the short line explicitly labelled as a brand is used, never synonyms.
    brands=[]
    for line in text.splitlines()[:6]:
        if 'نام تجاری' in line:
            brand=re.sub(r'نام تجاری\s*[:：]?','',line).strip()
            if brand and len(brand)<200: brands=[brand]
    sections=split_sections(text)
    classFa=''
    for line in text.splitlines()[:12]:
        if 'رده بندی درمانی' in line and ':' in line: classFa=line.split(':',1)[1].strip()
    d=dict(id=id,en=h['en'],fa=fa or h['en'],brands=brands,synonyms=list(dict.fromkeys([h['en']]+brands+([old['en'],old['fa']]+old.get('synonyms',[]) if old else []))),source='داروهای ژنریک ایران',sourceYear=2008,sourceText=text,sections=sections,sourcePdfPages=pages,sourceQuality='extraction-unreviewed',classFa=classFa)
    d['sourceHeading']={'en':d['en'],'fa':d['fa']}
    for field,value in editorial.get('headings',{}).get(id,{}).items():
        d['synonyms']=list(dict.fromkeys(d['synonyms']+[d[field]]))
        d[field]=value
    for section in d['sections']:
        if d['en'] != d['sourceHeading']['en']:
            section['text']=section['text'].replace(d['sourceHeading']['en'],d['en'])
        for before,after in editorial.get('bodyReplacements',{}).items():
            section['text']=section['text'].replace(before,after)
    if id in overrides:

        rule=overrides[id]; excluded={x.lower() for x in rule['excludeAliases']}
        d['sourceBrands']=d['brands'][:]
        d['brands']=[x.strip() for x in '/'.join(d['brands']).split('/') if x.strip().lower() not in excluded]
        d['synonyms']=[x for x in d['synonyms'] if not any(part.strip().lower() in excluded for part in x.split('/'))]
        d['synonyms']=list(dict.fromkeys(d['synonyms']+d['brands']))
        d['excludedSourceAliases']=rule['excludeAliases']
    if id=='abciximab':d['reviewNotes']=['در صفحهٔ ۲۴، توصیه درباره همراهی آسپرین و هپارین و در صفحهٔ ۲۳، عدد دوز انفوزیون نیازمند بررسی تخصصی است؛ متن کتاب بدون تغییر توصیه حفظ شده است.']
    if old:
        for field in ('en','fa','brands'):
            if old.get(field)!=d[field]: corrections.append(dict(id=id,field=field,before=json.dumps(old.get(field),ensure_ascii=False),after=json.dumps(d[field],ensure_ascii=False),pdf_pages=','.join(map(str,pages)),verification='source-layout-extracted; not clinically validated'))
    else: corrections.append(dict(id=id,field='record',before='',after=h['en'],pdf_pages=','.join(map(str,pages)),verification='recovered PDF heading; not clinically validated'))
    flags=['clinical-review-required','dose-unit-fraction-layout-review-required']
    if re.search('[\u0600-\u06ff]R[\u0600-\u06ff]|̄|�',text):flags.append('suspicious-encoding')
    if not brands:flags.append('brand-unresolved-or-absent')
    if not classFa:flags.append('class-unresolved-or-absent')
    if not h['hasFa']:flags.append('persian-heading-absent')
    if len(sections)<2:flags.append('short-or-unstructured-entry')
    if id in overrides:flags.append('source-brand-association-quarantined')
    if id=='abciximab':flags.append('source-recommendation-inconsistency')
    issues.append(dict(id=id,en=d['en'],pdf_pages=','.join(map(str,pages)),flags=';'.join(flags)))
    book.append(d)
# Duplicate titles can denote distinct formulations or source inconsistencies.
# Preserve the entries and route them to review rather than guessing a merge.
name_groups=collections.defaultdict(list)
for d in book: name_groups[d['en'].lower()].append(dict(id=d['id'],fa=d['fa'],pdf_pages=d['sourcePdfPages']))
duplicates={k:v for k,v in name_groups.items() if len(v)>1}
duplicate_ids={d['id'] for group in duplicates.values() for d in group}
for row in issues:
    if row['id'] in duplicate_ids: row['flags']+=';duplicate-English-heading-review-required'
(ROOT/'reports/drug-source-duplicate-headings.json').write_text(json.dumps(duplicates,ensure_ascii=False,indent=2)+'\n')
# Keep the ten existing data filenames so user uploads require no deletions.
index=[]
for chunk in range(10):
    group=book[chunk*len(book)//10:(chunk+1)*len(book)//10]
    name=f'drug-reference-book-{chunk+1:02}.js'
    (ROOT/name).write_text('/* PDF heading-bounded extraction; clinical review is still required. */\nwindow.FoxiMedDrugBookData = (window.FoxiMedDrugBookData || []).concat('+json.dumps(group,ensure_ascii=False,separators=(',',':'))+');\n')
    for d in group:index.append({k:d[k] for k in ('id','en','fa','brands','synonyms','classFa','sourcePdfPages','sourceQuality')}|dict(chunk=name))
(ROOT/'drug-reference-index.js').write_text('/* Generated name index only; no full monographs at startup. */\nwindow.FoxiMedDrugBookIndex = '+json.dumps(index,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'reports').mkdir(exist_ok=True)
for name,rows in [('drug-data-corrections.csv',corrections),('drug-data-review.csv',issues)]:
    with (ROOT/'reports'/name).open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
summary=dict(pdf_sha256=hashlib.sha256(PDF.read_bytes()).hexdigest(),pdf_pages=len(doc),font_dictionary_repairs=font_dictionary_repairs,decoded_lam_alef_glyphs=ligature_repairs,original_records=len(original),preserved_ids=sum(d['id'] in {o['id'] for o in original} for d in book),book_records=len(book),recovered_entries=len(book)-len(original),changed_fields=len(corrections),clinically_validated_records=0,duplicate_english_heading_groups=len(duplicates),flags=dict(collections.Counter(flag for d in issues for flag in d['flags'].split(';'))))
(ROOT/'reports/drug-data-audit.json').write_text(json.dumps(summary,indent=2)+'\n')
scratch.cleanup()
print(json.dumps(summary,indent=2))
