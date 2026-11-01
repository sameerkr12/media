"""Run only against the local built Worker: python3 tests/tracker-integration.py."""
import os,uuid,requests
BASE=os.environ.get('TRACKER_TEST_URL','http://127.0.0.1:8787')
assert BASE.startswith(('http://127.0.0.1:','http://localhost:')), 'Local test server required'
a=requests.Session();a.headers.update({'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test','Origin':BASE})
def post(body,status=200,session=a):
 r=session.post(BASE+'/api/tracker',json=body);assert r.status_code==status,(r.status_code,r.text);return r

def state(session=a):
 r=session.get(BASE+'/api/tracker');assert r.status_code==200,r.text;return r.json()
assert requests.get(BASE+'/api/tracker').status_code==401
post({'action':'bootstrap'});assert len(state()['creators'])==5
for c in state()['creators']:
 r=requests.get(BASE+'/c/'+c['handle']);assert r.status_code==200;assert '/r/' in r.text;assert c['name'] in r.text;assert 'user_id' not in r.text
slug='qa-'+uuid.uuid4().hex[:10]
create={'action':'create','creatorId':'sameer','title':'Local QA only','brand':'Test','destination':'https://example.com/','slug':slug}
post(create)
link=next(l for l in state()['links'] if l['slug']==slug)
post(create,409)
post({**create,'slug':slug+'x','destination':'javascript:alert(1)'},400)
post({**create,'slug':slug+'y','destination':BASE+'/r/'+slug},400)
post({**create,'slug':slug+'z','expiresAt':'2020-01-01'},400)
bad=requests.Session();bad.headers.update(a.headers);bad.headers['Origin']='https://unrelated.example';post({'action':'bootstrap'},403,bad)
v=requests.Session();v.headers.update({'User-Agent':'Mozilla/5.0 iPhone Mobile','Referer':'https://www.instagram.com/test/'})
r=v.get(BASE+'/r/'+slug,allow_redirects=False);assert r.status_code==302 and r.headers['Location']=='https://example.com/'
assert r.headers.get('Cache-Control')=='no-store, private'
cookie=r.cookies.get('ex_visitor');assert cookie;v.cookies.set('ex_visitor',cookie)
assert v.get(BASE+'/r/'+slug,allow_redirects=False).status_code==302
assert v.head(BASE+'/r/'+slug,allow_redirects=False).status_code==302
requests.get(BASE+'/r/'+slug,headers={'User-Agent':'WhatsApp/2.0'},allow_redirects=False)
requests.get(BASE+'/r/'+slug,headers={'Purpose':'prefetch'},allow_redirects=False)
l=next(l for l in state()['links'] if l['id']==link['id']);assert l['clicks']==2,l;assert l['visitors']==1,l
post({'action':'update','id':link['id'],'active':False})
assert requests.get(BASE+'/r/'+slug,allow_redirects=False).status_code==410
assert slug not in requests.get(BASE+'/c/trade_x_sameer').text
assert requests.get(BASE+'/r/nonexistent-'+slug).status_code==404
# Assign a second test identity to Krishna and prove access is scoped server-side.
post({'action':'creatorEmail','id':'krishna','email':'krishna@example.test'})
c=requests.Session();c.headers.update({'oai-authenticated-user-id':'qa_creator','oai-authenticated-user-email':'krishna@example.test','Origin':BASE})
d=state(c);assert not d['user']['admin'];assert all(l['creator_id']=='krishna' for l in d['links']);assert len(d['creators'])==1
post({'action':'bootstrap'},403,c)
post({'action':'update','id':link['id'],'active':True},403,c)
post({**create,'slug':slug+'other'},403,c)
post({'action':'profile','id':'sameer','name':'No','bio':''},403,c)
post({'action':'creatorEmail','id':'sameer','email':'bad@example.test'},403,c)
post({'action':'create','creatorId':'krishna','title':'Creator-owned QA link','brand':'Test','destination':'https://example.org/','slug':slug+'own'},200,c)
assert all(l['creator_id']=='krishna' for l in state(c)['links'])
# Removing the assignment revokes access, including the previously pinned user id.
post({'action':'creatorEmail','id':'krishna','email':''})
assert state(c)['notAssigned']
post({'action':'create','creatorId':'krishna','title':'No','destination':'https://example.org/'},403,c)
print('PASS: five creator pages, tracked redirects, cookie uniqueness, bot/prefetch/HEAD exclusions, pause, expiry validation, URL validation, CSRF, scoped creator reads/writes, access revocation, and anonymous rejection.')
