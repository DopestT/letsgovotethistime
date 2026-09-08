import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE_HOST = 'letsgovotethistime.com';
const TEXT_EXTS = new Set(['.html','.js','.xml','.md','.txt']);
const SKIP_DIRS = new Set(['.git','node_modules']);
const NON_NAV_URLS = new Set([
  'https://fonts.googleapis.com',
  'https://fonts.googleapis.com/',
  'https://fonts.gstatic.com',
  'https://fonts.gstatic.com/'
]);

function walk(dir){
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(SKIP_DIRS.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...walk(p));
    else if(TEXT_EXTS.has(path.extname(ent.name).toLowerCase())) out.push(p);
  }
  return out;
}
function rel(p){ return path.relative(ROOT,p).replaceAll('\\','/'); }
function stripFragmentQuery(s){ return s.split('#')[0].split('?')[0]; }
function routeCandidates(urlPath){
  let p=decodeURIComponent(urlPath || '/');
  if(!p.startsWith('/')) p='/'+p;
  if(p==='/') return ['index.html'];
  p=p.replace(/^\/+|\/+$/g,'');
  return [p, `${p}.html`, `${p}/index.html`];
}
function fileExistsRoute(urlPath){ return routeCandidates(urlPath).some(c=>fs.existsSync(path.join(ROOT,c))); }
function localAssetExists(sourceFile, href){
  const clean=stripFragmentQuery(href);
  if(!clean) return true;
  if(clean.startsWith('/')) return fileExistsRoute(clean) || fs.existsSync(path.join(ROOT,clean.slice(1)));
  return fs.existsSync(path.resolve(path.dirname(sourceFile),clean));
}
function extractRefs(text){
  const refs=[];
  const attr=/(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while((m=attr.exec(text))) refs.push(m[1].trim());
  const url=/https?:\/\/[^\s"'<>`)]+/gi;
  while((m=url.exec(text))) {
    const candidate=m[0].replace(/[.,;]+$/,'');
    if(!candidate.includes('.example')) refs.push(candidate);
  }
  return refs;
}

const files=walk(ROOT);
const raw=[];
for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  for(const href of extractRefs(text)) raw.push({source:rel(file),sourceFile:file,href});
}
const dedup=new Map();
for(const r of raw){ const key=`${r.source}|${r.href}`; if(!dedup.has(key)) dedup.set(key,r); }
const refs=[...dedup.values()];

const results=[];
const external=new Map();
for(const r of refs){
  const h=r.href;
  if(!h || h.startsWith('data:') || h.startsWith('javascript:') || h.includes('${') || NON_NAV_URLS.has(h) || h.includes('.example')) continue;
  if(h.startsWith('#')){
    if(r.source.endsWith('.js')){ results.push({...r,type:'dynamic-anchor',status:'PASS',detail:'created dynamically'}); continue; }
    const id=h.slice(1);
    const html=fs.readFileSync(r.sourceFile,'utf8');
    const ok=!id || new RegExp(`(?:id|name)=["']${id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`).test(html);
    results.push({...r,type:'internal-anchor',status:ok?'PASS':'BROKEN',detail:ok?'anchor exists':'anchor missing'});
    continue;
  }
  if(h.startsWith('mailto:') || h.startsWith('tel:')){
    results.push({...r,type:'action',status:'REVIEW',detail:h.startsWith('mailto:')?'email action':'telephone action'});
    continue;
  }
  let u;
  try{ u=new URL(h,`https://${SITE_HOST}${r.source==='index.html'?'/':`/${r.source}`}`); }
  catch{ results.push({...r,type:'invalid',status:'BROKEN',detail:'invalid URL'}); continue; }
  if(u.protocol==='http:' || u.protocol==='https:'){
    if(u.hostname===SITE_HOST || u.hostname===`www.${SITE_HOST}`){
      const ok=fileExistsRoute(u.pathname) || fs.existsSync(path.join(ROOT,u.pathname.replace(/^\//,'')));
      results.push({...r,type:'internal',status:ok?'PASS':'BROKEN',detail:ok?'target exists':'target missing'});
    }else{
      const prev=external.get(u.href);
      external.set(u.href,{url:u.href,origins:[...new Set([...(prev?.origins||[]),r.source])]});
    }
  }else if(h.startsWith('/') || !/^[a-z]+:/i.test(h)){
    const ok=localAssetExists(r.sourceFile,h);
    results.push({...r,type:'internal',status:ok?'PASS':'BROKEN',detail:ok?'target exists':'target missing'});
  }
}

async function testExternal(item){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    let res=await fetch(item.url,{method:'HEAD',redirect:'follow',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 link-audit/1.2'}});
    if([400,403,405,406].includes(res.status)) res=await fetch(item.url,{method:'GET',redirect:'follow',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 link-audit/1.2'}});
    const s=res.status;
    let status='PASS';
    if(s===401 || s===403) status='RESTRICTED';
    else if(s===429) status='RATE-LIMITED';
    else if(s===404 || s===410) status='BROKEN';
    else if(s>=500) status='ERROR';
    else if(s>=400) status='REVIEW';
    return {...item,status,http:s,finalUrl:res.url};
  }catch(e){
    return {...item,status:'ERROR',http:null,finalUrl:null,error:e.name==='AbortError'?'timeout':String(e.message||e)};
  }finally{ clearTimeout(timer); }
}

const extResults=[];
const extItems=[...external.values()];
for(let i=0;i<extItems.length;i+=6) extResults.push(...await Promise.all(extItems.slice(i,i+6).map(testExternal)));
const all=[...results,...extResults];
const counts={}; for(const r of all) counts[r.status]=(counts[r.status]||0)+1;

console.log('\n# LINK REPORT CARD');
console.log(`Files scanned: ${files.length}`);
console.log(`Unique references checked: ${all.length}`);
console.log(Object.entries(counts).sort().map(([k,v])=>`${k}: ${v}`).join(' | '));
console.log('\n## INTERNAL / ACTION RESULTS');
for(const r of results.sort((a,b)=>a.status.localeCompare(b.status)||a.source.localeCompare(b.source))) if(r.status!=='PASS') console.log(`${r.status}\t${r.source}\t${r.href}\t${r.detail}`);
console.log('\n## EXTERNAL RESULTS');
for(const r of extResults.sort((a,b)=>a.status.localeCompare(b.status)||a.url.localeCompare(b.url))) console.log(`${r.status}\t${r.http ?? '-'}\t${r.url}\tORIGINS=${r.origins.join(',')}\t${r.finalUrl || r.error || ''}`);

const brokenInternal=results.filter(r=>r.status==='BROKEN');
const forbidden=new RegExp('route'+'ly','i');
const forbiddenHits=[];
for(const f of files){ if(forbidden.test(fs.readFileSync(f,'utf8'))) forbiddenHits.push(rel(f)); }
if(forbiddenHits.length) console.log(`\nFORBIDDEN BRAND REFERENCES: ${forbiddenHits.join(', ')}`);
if(brokenInternal.length || forbiddenHits.length) process.exitCode=1;
