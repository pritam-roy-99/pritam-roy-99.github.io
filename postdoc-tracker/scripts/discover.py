#!/usr/bin/env python3
"""ScholarPath daily discovery collector.

This creates *candidate leads*, not independent validation of advertised terms.
No user profile, applicant data, cookies, or subscriptions are downloaded.
Only public institution recruitment APIs and public recruitment portals are used.
On fetch failure old entries are retained; disappearance never means 'closed'.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError as exc:
    raise SystemExit('Install requirements: pip install requests beautifulsoup4') from exc

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'latest.json'
UA = 'ScholarPathOpenSourceMonitor/1.1 (+https://github.com/pritam-roy-99/pritam-roy-99.github.io)'
HEADERS = {'User-Agent': UA, 'Accept': 'text/html, application/json'}
ROLE = re.compile(r'\b(post.?doc(?:toral)?|research fellow(?:ship)?|research associate|research scientist|researcher\b|post.?doctorate|junior research fellow)\b', re.I)
IGNORE = re.compile(r'\b(assistant professor|associate professor|full professor|tenure.track|lecturer|undergraduate|phd studentship|doctoral student|internship|research assistant professor)\b', re.I)
CATEGORIES = [
 'https://academicjobsonline.org/ajo/physics',
 'https://academicjobsonline.org/ajo/mathematics',
 'https://academicjobsonline.org/ajo/computerscience',
 'https://academicjobsonline.org/ajo/biology',
 'https://academicjobsonline.org/ajo/chemistry',
 'https://academicjobsonline.org/ajo/economics',
 'https://academicjobsonline.org/ajo/humanities',
 'https://academicjobsonline.org/ajo/QC',
 'https://academicjobsonline.org/ajo/',
]

def now(): return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
def clean(s, cap=500): return re.sub(r'\s+', ' ', str(s or '')).strip()[:cap]
def key(url): return hashlib.sha256(url.encode()).hexdigest()[:18]
def ymd(s):
    m=re.search(r'(20\d{2})[-/](\d\d)[-/](\d\d)', str(s or ''))
    return '-'.join(m.groups()) if m else None

def get(session, url, json_mode=False):
    r = session.get(url, timeout=18, headers=HEADERS)
    r.raise_for_status()
    if json_mode: return r.json()
    return BeautifulSoup(r.text,'html.parser')

def raw_record(title, institute, url, source_name, source_kind, **kwargs):
    if not url.startswith('https://') or not clean(title) or not ROLE.search(title):return None
    if IGNORE.search(title) and not re.search('postdoc',title,re.I):return None
    return {'id':key(url),'title':clean(title,200),'institute':clean(institute,160), 'url':url,
        'source_name':source_name,'source_kind':source_kind,
        'country':clean(kwargs.get('country'),90),'city':clean(kwargs.get('city'),90),
        'department':clean(kwargs.get('department'),140),'topics':clean(kwargs.get('topics'),320),
        'summary':clean(kwargs.get('summary'),380),'deadline':ymd(kwargs.get('deadline')),
        'start':ymd(kwargs.get('start')),'status':'candidate',}

def smartrecruiters(session):
    name='CERN official recruitment API'; jobs=[]
    data=get(session,'https://api.smartrecruiters.com/v1/companies/CERN/postings?limit=100',True)
    for x in data.get('content',[]):
        title=clean(x.get('name'))
        if not ROLE.search(title) or IGNORE.search(title): continue
        sid=x.get('id'); url='https://jobs.smartrecruiters.com/CERN/'+str(sid)
        loc=x.get('location') or {}; dep=x.get('department') or {}
        row=raw_record(title, 'CERN', url, name, 'official',
            city=loc.get('city'),country=loc.get('country'),department=dep.get('label') or dep.get('name'),
            summary=x.get('jobAd') or x.get('refNumber') or '')
        if row:jobs.append(row)
    return jobs

def first_after(lines, heading, limit=6):
    for i,v in enumerate(lines):
        if v.lower().strip().rstrip(':')==heading.lower().rstrip(':'):
            for w in lines[i+1:i+1+limit]:
                if w.strip() and w.strip() not in (':','–'):
                    return clean(w,300)
    return ''

def ajo_detail(session,url):
    page=get(session,url)
    lines=[clean(s) for s in page.stripped_strings]
    title=first_after(lines,'Position Title') or ''
    if not title:
        h=page.find('h1');title=clean(h.get_text(' ',strip=True) if h else '',170)
    ptype=first_after(lines,'Position Type')
    if ptype and not ROLE.search(ptype):return None
    subject=first_after(lines,'Subject Areas') or first_after(lines,'Subject Area')
    loc=first_after(lines,'Position Location')
    country=loc.split(',')[-1].strip() if loc else ''
    if len(country)>60:country=''
    deadline=first_after(lines,'Appl Deadline')
    start=first_after(lines,'Starting Date')
    position=first_after(lines,'Position Description')
    inst=clean(page.title.get_text(' ',strip=True).split('|')[0] if page.title else '',150)
    if not inst or inst.lower() in ('academicjobsonline','job listings'):
        for h in page.select('h1, h2, h3'):
            htxt=clean(h.get_text(' ',strip=True),150)
            if htxt and htxt!=title:inst=htxt;break
    return raw_record(title,inst,url,'AcademicJobsOnline institutional postings','recruitment_board',country=country,city=loc,topics=subject,summary=position,deadline=deadline,start=start)

def academicjobsonline(session, detail_cap=105):
    links=set();success=0;errors=[]
    for u in CATEGORIES:
        try:
            soup=get(session,u);success+=1
            for a in soup.select('a[href]'):
                href=urljoin(u,a.get('href',''))
                m=re.search(r'https://academicjobsonline\.org/ajo/jobs/(\d+)(?:\b|[/?#])',href)
                if m:links.add('https://academicjobsonline.org/ajo/jobs/'+m.group(1))
        except Exception as e:errors.append(clean(str(e),110))
    if success==0:raise RuntimeError('All category pages failed: '+','.join(errors[:2]))
    out=[];detail_errors=0
    for u in sorted(links,reverse=True)[:detail_cap]:
        try:
            j=ajo_detail(session,u)
            if j:out.append(j)
        except Exception:detail_errors+=1
    return out,{'name':'AcademicJobsOnline','ok':True,'detail':f'{success}/{len(CATEGORIES)} category pages; {len(links)} links; {len(out)} postdoctoral leads; {detail_errors} detail errors'}

def findapostdoc(session, limit=45):
    index='https://www.findapostdoc.com/Search/Jobs.aspx'
    soup=get(session,index)
    urls=[]
    for a in soup.select('a[href]'):
        u=urljoin(index,a['href'])
        if re.search(r'job-details\.aspx\?jobcode=\d+',u,re.I) and u not in urls:urls.append(u)
    rows=[];err=0
    for u in urls[:limit]:
        try:
            page=get(session,u)
            h=page.select_one('h1') or page.select_one('h2')
            title=clean(h.get_text(' ',strip=True) if h else '',190)
            if not title:continue
            blocks=[clean(x.get_text(' ',strip=True),180) for x in page.select('h3,.organization,.organisation')]
            inst=next((x for x in blocks if x.lower() not in ('job details','about the job')), '')
            text=clean(page.get_text(' ',strip=True),2200)
            d=re.search(r'(?:Application Deadline|Closing Date)\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+20\d\d)',text,re.I)
            parsed=None
            if d:
                try:parsed=dt.datetime.strptime(d.group(1),'%d %B %Y').strftime('%Y-%m-%d')
                except ValueError:pass
            row=raw_record(title,inst,u,'FindAPostDoc vacancy board','recruitment_board',summary=text[:250],deadline=parsed)
            if row:rows.append(row)
        except Exception:err+=1
    return rows,{'name':'FindAPostDoc','ok':True,'detail':f'{len(urls)} available links; {len(rows)} role matches; {err} detail errors'}

def merge(previous, found, generated):
    old={x.get('id'):x for x in previous if isinstance(x,dict) and x.get('id')}
    today=generated[:10];new=[]
    for row in found:
        prev=old.get(row['id'])
        sig_fields=('title','institute','url','country','city','department','topics','summary','deadline','start','status')
        signature=json.dumps({x:row.get(x) for x in sig_fields},sort_keys=True,ensure_ascii=False)
        revision=hashlib.sha1(signature.encode()).hexdigest()[:12]
        row['revision']=revision
        row['first_seen']=prev.get('first_seen',today) if prev else today
        row['last_changed']=today if not prev or prev.get('revision')!=revision else prev.get('last_changed',today)
        row['last_seen']=today
        new.append(row)
    # Preserve missing jobs as not confirmed, *never* call them closed because a portal may omit older pages.
    present={x['id'] for x in new}
    for id,x in old.items():
        if id not in present:
            saved=dict(x)
            saved['status']='not_seen_this_scan'
            # Keep only 90 days old unrefreshed leads to bound the public dataset.
            try: age=(dt.date.fromisoformat(today)-dt.date.fromisoformat(x.get('last_seen',today))).days
            except ValueError:age=0
            if age<=90:new.append(saved)
    return sorted(new,key=lambda j:(j.get('last_seen',''),j.get('first_seen','')),reverse=True)[:700]

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path,default=OUT);ap.add_argument('--fixture',type=Path);args=ap.parse_args()
    prev={}
    if args.output.exists():
        try:prev=json.loads(args.output.read_text(encoding='utf-8'))
        except Exception:prev={}
    stamp=now();health=[];all_rows=[];successful=0
    if args.fixture:
        incoming=json.loads(args.fixture.read_text())
        all_rows=incoming['items']; health=[{'name':'Local fixture','ok':True,'detail':str(len(all_rows))+' records'}];successful=1
    else:
        with requests.Session() as session:
            for name,func in [('CERN (official)',smartrecruiters),('AcademicJobsOnline',academicjobsonline),('FindAPostDoc',findapostdoc)]:
                try:
                    result=func(session);rows,h=(result if isinstance(result,tuple) else (result,{'name':name,'ok':True,'detail':str(len(result))+' leads'}))
                    all_rows.extend(rows);health.append(h);successful+=1
                except Exception as e:health.append({'name':name,'ok':False,'detail':clean(e,160)})
    if not successful:
        print('Every source failed; retaining previous dataset without updating generated_at')
        raise SystemExit(2)
    unique={x['id']:x for x in all_rows if isinstance(x,dict) and x.get('id') and x.get('url') and x.get('title')}
    items=merge(prev.get('items',[]),list(unique.values()),stamp)
    data={'schema_version':1,'generated_at':stamp,'status':'partial' if successful<3 and not args.fixture else 'ok',
          'source_health':health,'items':items,'candidate_count':len(items),'notes':'Discovery only. Follow each original posting to confirm dates, terms, eligibility and status.'}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Saved '+str(args.output)+'; sources '+str(successful)+'; entries '+str(len(items)))

if __name__=='__main__':main()
