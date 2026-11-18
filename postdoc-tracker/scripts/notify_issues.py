#!/usr/bin/env python3
"""Optional subject-specific GitHub issue notifications.

People opt in by opening a *public* issue with an explicit ScholarPathWatch marker.
A daily comment is posted only for unseen postings matching that issue's subject.
Issue subscription / email delivery depends on the user's GitHub notification settings.
No applicant CVs or private workspace data are sent to GitHub.
"""
import json
import os
import re
from pathlib import Path
from urllib.parse import quote

import requests

HERE=Path(__file__).resolve().parents[1]
API='https://api.github.com'
REPO=os.getenv('GITHUB_REPOSITORY','pritam-roy-99/pritam-roy-99.github.io')
TOKEN=os.getenv('GITHUB_TOKEN','')
MARK='<!-- ScholarPathWatch:v1 -->'
STATE_MARK='<!-- ScholarPathSent:v1 '
ROLE=re.compile(r'(post.?doc|research (fellow|associate|scientist)|fellowship|researcher)',re.I)


def terms(s):return [t.strip().lower() for t in str(s or '').split(',') if t.strip()][:20]
def words(s):return [w for w in re.sub(r'[^\w ]',' ',s.lower()).split() if len(w)>=3]
def eligible(job,profile):
    if job.get('status')!='candidate' or not ROLE.search(job.get('title','')):return 0
    text=' '.join(str(job.get(x) or '') for x in ['title','summary','topics','institute','department','city']).lower()
    if any(t in text for t in terms(profile.get('exclude'))):return 0
    subjects=terms(profile.get('field'))+terms(profile.get('topics'))
    if not subjects:return 0
    score=4
    for t in terms(profile.get('field')):
        if t in text:score+=23
        elif any(x in text for x in words(t)):score+=8
    for t in terms(profile.get('topics')):
        if t in text:score+=27
        elif any(x in text for x in words(t)):score+=10
    if any(c in str(job.get('country','')).lower() for c in terms(profile.get('countries'))):score+=8
    try:threshold=max(10,min(70,int(profile.get('threshold',15))))
    except (TypeError,ValueError):threshold=15
    return score if score>=threshold else 0

def clean_markdown(s):
    return re.sub(r'[\[\]<>|*_`\\]',' ',str(s or '')).strip()[:180]

def get(session,path,**params):
    resp=session.get(API+path,params=params,timeout=16)
    resp.raise_for_status();return resp.json()

def post(session,path,data):
    r=session.post(API+path,json=data,timeout=16);r.raise_for_status();return r.json()

def parse_profile(body):
    if MARK not in body:return None
    m=re.search(r'```json\s*(\{[\s\S]*?\})\s*```',body,re.I)
    if not m or len(m.group(1))>4000:return None
    try: data=json.loads(m.group(1))
    except ValueError:return None
    if not isinstance(data,dict) or not (data.get('field') or data.get('topics')):return None
    return data

def past_sent(comments):
    for c in reversed(comments):
        body=c.get('body') or ''
        m=re.search(r'<!-- ScholarPathSent:v1 ([A-Za-z0-9_=.:,\-]+) -->',body)
        if m:
            result={}
            for item in m.group(1).split(','):
                if ':' in item:
                    k,v=item.split(':',1);result[k]=v
            return result
    return {}

def main():
    if not TOKEN:raise SystemExit('No GitHub Actions token; run only in workflow')
    data=json.loads((HERE/'data/latest.json').read_text())
    jobs=data.get('items',[])
    session=requests.Session()
    session.headers.update({'Authorization':'Bearer '+TOKEN,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'ScholarPath-v1'})
    issued=0;notifications=0
    # Cap public subscriptions and rate-limit digests. The issue creator can close the issue to unsubscribe.
    for page in range(1,4):
        issues=get(session,f'/repos/{REPO}/issues',state='open',per_page=100,page=page)
        if not issues:break
        for issue in issues:
            if 'pull_request' in issue or not str(issue.get('title','')).startswith('[ScholarPath Alert]'):continue
            pref=parse_profile(issue.get('body') or '')
            if not pref:continue
            issued+=1
            number=issue['number']
            try:
                comments=get(session,f'/repos/{REPO}/issues/{number}/comments',per_page=100)
                sent=past_sent(comments)
                matches=sorted(((eligible(j,pref),j) for j in jobs),key=lambda t:t[0],reverse=True)
                changes=[]
                for score,j in matches:
                    if score==0:break
                    # Do not repeat a listing merely because it was rediscovered on another date.
                    if sent.get(j['id'])==j.get('revision','0'):continue
                    changes.append((score,j))
                    if len(changes)==6:break
                if not changes:continue
                newstate=dict(sent)
                for _,j in changes:newstate[j['id']]=j.get('revision','0')
                newstate=dict(list(newstate.items())[-300:])
                body='### ScholarPath: '+str(len(changes))+' new or updated research matches\n\n'
                for score,j in changes:
                    title=clean_markdown(j['title']); inst=clean_markdown(j.get('institute'))
                    due='; deadline '+j['deadline'] if j.get('deadline') else '; deadline unconfirmed'
                    body+=f'- **{title}** ({inst}) · match {min(99,score)} · {clean_markdown(j.get("country"))}{due}\n  - [Original recruitment listing]({j["url"]})\n'
                body+='\n**Check the original page:** dates, eligibility and funding have not been independently verified by ScholarPath. Close this issue to stop digests.\n'
                body+=STATE_MARK+','.join(k+':'+v for k,v in newstate.items())+' -->'
                post(session,f'/repos/{REPO}/issues/{number}/comments',{'body':body})
                notifications+=1
            except (requests.RequestException,ValueError) as e:print('Issue',number,'notification error:',str(e)[:180])
    print(f'ScholarPath issue alert run: {issued} subscriptions, {notifications} changed-match digests')

if __name__=='__main__':main()
