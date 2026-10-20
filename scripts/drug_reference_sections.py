"""Conservative monograph section boundaries; never rewrite numeric values."""
headings=[('فارماکودینامیک','فارماکودینامیک و فارماکوکینتیک'),('اشکال دارویی','اشکال دارویی موجود'),('اندیکاسیون','اندیکاسیون، راه مصرف و دوز'),('کنترا اندیکاسیون','کنترا اندیکاسیون'),('موارد احتیاط','موارد احتیاط'),('عارضه جانبی','عوارض جانبی'),('عوارض جانبی','عوارض جانبی'),('تداخلات دارویی','تداخلات دارویی'),('مسمومیت','مسمومیت و درمان'),('مراقبت های پرستاری','مراقبت‌های پرستاری'),('مصرف در شیر','شیردهی و کودکان'),('آموزش به بیمار','آموزش بیمار و خانواده'),('شرایط نگهداری','شرایط نگهداری')]

def split_sections(text):
    sections=[]; title='شناسه و رده‌بندی'; buf=[]
    for line in text.splitlines():
        trimmed=line.lstrip(' ?4Xs\x7f}⊖⊡Ⓢ△⋆•♦◊□')
        label=next((label for key,label in headings if trimmed.startswith(key)),None)
        # Poppler sometimes puts a pure heading's colon first and its words in
        # visual order. Recognize that label without interpreting any dose text.
        if not label and trimmed.startswith(':') and len(trimmed)<110 and 'اندیکاسیون' in trimmed and 'دوز' in trimmed:
            label='اندیکاسیون، راه مصرف و دوز'
        if label:
            if any(buf): sections.append(dict(title=title,text='\n'.join(buf).strip()))
            title=label;buf=[]
        buf.append(line)
    if any(buf):sections.append(dict(title=title,text='\n'.join(buf).strip()))
    return sections
