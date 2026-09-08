const CHECKIN_ENDPOINT = 'https://zxmdfmiueapjhktqchts.supabase.co/functions/v1/lgvtt-vote-checkin';
const ATLAS_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const stateMeta = {
  '01':['AL','Alabama','alabama'],'02':['AK','Alaska','alaska'],'04':['AZ','Arizona','arizona'],'05':['AR','Arkansas','arkansas'],'06':['CA','California','california'],'08':['CO','Colorado','colorado'],'09':['CT','Connecticut','connecticut'],'10':['DE','Delaware','delaware'],'11':['DC','District of Columbia','district-columbia'],'12':['FL','Florida','florida'],'13':['GA','Georgia','georgia'],'15':['HI','Hawaii','hawaii'],'16':['ID','Idaho','idaho'],'17':['IL','Illinois','illinois'],'18':['IN','Indiana','indiana'],'19':['IA','Iowa','iowa'],'20':['KS','Kansas','kansas'],'21':['KY','Kentucky','kentucky'],'22':['LA','Louisiana','louisiana'],'23':['ME','Maine','maine'],'24':['MD','Maryland','maryland'],'25':['MA','Massachusetts','massachusetts'],'26':['MI','Michigan','michigan'],'27':['MN','Minnesota','minnesota'],'28':['MS','Mississippi','mississippi'],'29':['MO','Missouri','missouri'],'30':['MT','Montana','montana'],'31':['NE','Nebraska','nebraska'],'32':['NV','Nevada','nevada'],'33':['NH','New Hampshire','new-hampshire'],'34':['NJ','New Jersey','new-jersey'],'35':['NM','New Mexico','new-mexico'],'36':['NY','New York','new-york'],'37':['NC','North Carolina','north-carolina'],'38':['ND','North Dakota','north-dakota'],'39':['OH','Ohio','ohio'],'40':['OK','Oklahoma','oklahoma'],'41':['OR','Oregon','oregon'],'42':['PA','Pennsylvania','pennsylvania'],'44':['RI','Rhode Island','rhode-island'],'45':['SC','South Carolina','south-carolina'],'46':['SD','South Dakota','south-dakota'],'47':['TN','Tennessee','tennessee'],'48':['TX','Texas','texas'],'49':['UT','Utah','utah'],'50':['VT','Vermont','vermont'],'51':['VA','Virginia','virginia'],'53':['WA','Washington','washington'],'54':['WV','West Virginia','west-virginia'],'55':['WI','Wisconsin','wisconsin'],'56':['WY','Wyoming','wyoming']
};

let aggregate = { national:{checkins:0,voted:0,not_yet:0}, states:[], districts:[] };
let layer = 'all';
let selectedCode = null;
let atlas = null;
let stateFeatures = [];
let projection = null;
let path = null;
let svg = null;
let viewport = null;
let zoom = null;

const $ = sel => document.querySelector(sel);
const fmt = value => Number(value || 0).toLocaleString();
const stateRow = code => aggregate.states.find(row => row.state_code === code) || {state_code:code,checkins:0,voted:0,not_yet:0};
const districtRows = code => (aggregate.districts || []).filter(row => row.state_code === code).sort((a,b) => String(a.congressional_district).localeCompare(String(b.congressional_district), undefined, {numeric:true}));
const pct = row => Number(row.checkins) ? `${((Number(row.voted)/Number(row.checkins))*100).toFixed(1)}%` : '—';
const layerCount = row => layer === 'voted' ? Number(row.voted || 0) : layer === 'not_yet' ? Number(row.not_yet || 0) : Number(row.checkins || 0);
const metaByCode = code => Object.values(stateMeta).find(meta => meta[0] === code) || null;
const validStateCode = code => Boolean(metaByCode(code));

function statePermalink(code){
  const url = new URL(window.location.href);
  url.pathname = '/voting-map';
  url.search = code ? `?state=${encodeURIComponent(code)}` : '';
  url.hash = '';
  return url.toString();
}

function syncUrl(){
  try{ window.history.replaceState({}, '', selectedCode ? `/voting-map?state=${encodeURIComponent(selectedCode)}` : '/voting-map'); }catch(_){}
}

function ensureDistrictPanel(){
  let panel = $('#districtBreakdown');
  if(panel) return panel;
  panel = document.createElement('section');
  panel.id = 'districtBreakdown';
  panel.style.cssText = 'margin-top:18px;border-top:1px solid #345044;padding-top:16px';
  const official = $('#statePanel .official-box');
  official?.parentNode?.insertBefore(panel, official);
  return panel;
}

function updateDistrictPanel(code){
  const panel = ensureDistrictPanel();
  if(!panel) return;
  if(!code){ panel.hidden = true; panel.innerHTML = ''; return; }
  panel.hidden = false;
  const rows = districtRows(code);
  panel.innerHTML = '<div class="smallcaps" style="color:#50ef9b">CONGRESSIONAL DISTRICTS</div><p style="font-size:12px;line-height:1.45;color:#aebdb5;margin:7px 0 12px">Only districts with at least 5 anonymous check-ins are shown. These are self-reports, not official turnout.</p>';
  if(!rows.length){
    panel.insertAdjacentHTML('beforeend','<div style="border:1px solid #345044;padding:12px;font-size:12px;color:#c8d2cc">No district has reached the public-display threshold yet.</div>');
    return;
  }
  rows.forEach(row => {
    const item = document.createElement('div');
    item.style.cssText = 'border:1px solid #345044;background:#0a1611;padding:11px 12px;margin-top:8px';
    const name = row.congressional_district === 'AL' ? 'AT-LARGE DISTRICT' : `DISTRICT ${row.congressional_district}`;
    item.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px"><strong>${name}</strong><strong style="color:#50ef9b">${fmt(row.checkins)}</strong></div><div style="font-size:10px;color:#c8d2cc;margin-top:6px">${fmt(row.voted)} voted · ${fmt(row.not_yet)} not yet · ${pct(row)} voted share</div>`;
    panel.append(item);
  });
}

function updateNational(){
  $('#mapTotal').textContent = fmt(aggregate.national.checkins);
  $('#mapVoted').textContent = fmt(aggregate.national.voted);
  $('#mapNotYet').textContent = fmt(aggregate.national.not_yet);
}

function updatePanel(code){
  const entry = code ? metaByCode(code) : null;
  const row = entry ? stateRow(code) : aggregate.national;
  $('#panelTitle').textContent = entry ? entry[1].toUpperCase() : 'UNITED STATES';
  $('#stateOfficial').href = entry ? `https://www.eac.gov/${entry[2]}-voter-info` : 'https://www.eac.gov/vote';
  $('#rideTool').href = entry ? `/rides-to-polls?state=${encodeURIComponent(code)}` : '/rides-to-polls';
  $('#helpTool').href = entry ? `/voter-help?state=${encodeURIComponent(code)}` : '/voter-help';
  $('#panelTotal').textContent = fmt(row.checkins);
  $('#panelVoted').textContent = fmt(row.voted);
  $('#panelNotYet').textContent = fmt(row.not_yet);
  $('#panelPct').textContent = pct(row);
  updateDistrictPanel(code);
}

function syncStateSelect(){
  const select = $('#mobileStateSelect');
  if(!select) return;
  if(!select.options.length){
    const all = new Option('United States','');
    select.add(all);
    Object.values(stateMeta).sort((a,b)=>a[1].localeCompare(b[1])).forEach(meta => select.add(new Option(`${meta[1]} — ${fmt(stateRow(meta[0]).checkins)}`, meta[0])));
  }else{
    Array.from(select.options).forEach(option => {
      if(!option.value) return;
      const meta = metaByCode(option.value);
      if(meta) option.textContent = `${meta[1]} — ${fmt(stateRow(meta[0]).checkins)}`;
    });
  }
  select.value = selectedCode || '';
}

function installMapControls(){
  const stage = $('#mapStage');
  if(!stage || $('#mapEngineControls')) return;
  const controls = document.createElement('div');
  controls.id = 'mapEngineControls';
  controls.style.cssText = 'position:absolute;right:14px;top:14px;z-index:8;display:flex;gap:7px;align-items:center;background:rgba(7,17,13,.9);border:1px solid #345044;padding:7px';
  controls.innerHTML = '<button type="button" data-map-action="in" aria-label="Zoom in">＋</button><button type="button" data-map-action="out" aria-label="Zoom out">−</button><button type="button" data-map-action="reset">RESET</button>';
  controls.querySelectorAll('button').forEach(btn => btn.style.cssText = 'min-width:44px;height:44px;border:1px solid #557063;background:#0d1b15;color:#fff;font-weight:900;cursor:pointer;padding:0 10px');
  controls.addEventListener('click', event => {
    const button = event.target.closest('button');
    if(!button || !zoom || !svg) return;
    const action = button.dataset.mapAction;
    if(action === 'in') svg.transition().duration(180).call(zoom.scaleBy, 1.45);
    if(action === 'out') svg.transition().duration(180).call(zoom.scaleBy, 1/1.45);
    if(action === 'reset') selectState(null, { updateUrl:true, zoomTo:true });
  });
  stage.append(controls);
}

function zoomToSelection(code){
  if(!zoom || !svg || !path) return;
  if(!code){ svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity); return; }
  const feature = stateFeatures.find(feature => {
    const meta = stateMeta[String(feature.id).padStart(2,'0')];
    return meta && meta[0] === code;
  });
  if(!feature) return;
  const [[x0,y0],[x1,y1]] = path.bounds(feature);
  const dx = x1-x0, dy = y1-y0, x = (x0+x1)/2, y = (y0+y1)/2;
  const k = Math.min(7, 0.78 / Math.max(dx/975, dy/610));
  const t = d3.zoomIdentity.translate(975/2,610/2).scale(k).translate(-x,-y);
  svg.transition().duration(450).call(zoom.transform,t);
}

function selectState(code, { scroll=false, updateUrl=true, zoomTo=true } = {}){
  selectedCode = validStateCode(code) ? code : null;
  updatePanel(selectedCode);
  syncStateSelect();
  renderMap();
  if(updateUrl) syncUrl();
  if(zoomTo) zoomToSelection(selectedCode);
  if(scroll && selectedCode) $('#statePanel')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

function renderMap(){
  if(!viewport || !path || !stateFeatures.length) return;
  viewport.selectAll('*').remove();
  const maxCount = d3.max(aggregate.states, layerCount) || 1;
  const opacity = d3.scaleSqrt().domain([0,maxCount]).range([0.42,0.92]);
  const radius = d3.scaleSqrt().domain([0,maxCount]).range([0,26]);

  viewport.append('g').selectAll('path').data(stateFeatures).join('path')
    .attr('class', d => {
      const meta = stateMeta[String(d.id).padStart(2,'0')];
      return `state-path${meta && meta[0] === selectedCode ? ' selected' : ''}`;
    })
    .attr('d',path)
    .attr('fill','#173b2a')
    .attr('fill-opacity',d => {
      const meta = stateMeta[String(d.id).padStart(2,'0')];
      return meta ? opacity(layerCount(stateRow(meta[0]))) : .42;
    })
    .attr('stroke','#a8bbb1')
    .attr('stroke-width',1)
    .attr('vector-effect','non-scaling-stroke')
    .on('click',(_,d) => {
      const meta = stateMeta[String(d.id).padStart(2,'0')];
      if(meta) selectState(meta[0], { updateUrl:true, zoomTo:true });
    })
    .append('title')
    .text(d => {
      const meta = stateMeta[String(d.id).padStart(2,'0')];
      if(!meta) return '';
      const row = stateRow(meta[0]);
      return `${meta[1]} — ${fmt(row.checkins)} check-ins, ${fmt(row.voted)} voted, ${fmt(row.not_yet)} not yet`;
    });

  const bubbles = viewport.append('g');
  const labels = viewport.append('g');
  stateFeatures.forEach(feature => {
    const meta = stateMeta[String(feature.id).padStart(2,'0')];
    if(!meta) return;
    const row = stateRow(meta[0]);
    const [x,y] = path.centroid(feature);
    if(!Number.isFinite(x) || !Number.isFinite(y)) return;

    if(layer === 'all' || layer === 'voted'){
      const r = Number(row.voted) > 0 ? Math.max(4, radius(Number(row.voted))) : 0;
      if(r) bubbles.append('circle').attr('class','state-bubble').attr('cx',x-(layer==='all'?Math.min(r*.35,7):0)).attr('cy',y).attr('r',r);
    }
    if(layer === 'all' || layer === 'not_yet'){
      const r = Number(row.not_yet) > 0 ? Math.max(4, radius(Number(row.not_yet))) : 0;
      if(r) bubbles.append('circle').attr('class','state-bubble notyet').attr('cx',x+(layer==='all'?Math.min(r*.35,7):0)).attr('cy',y).attr('r',r);
    }

    labels.append('text').attr('x',x).attr('y',y+3).attr('text-anchor','middle').attr('fill','#dce8e1').attr('font-size',10).attr('font-weight',900).attr('paint-order','stroke').attr('stroke','#07110d').attr('stroke-width',3).attr('pointer-events','none').text(meta[0]);
    const visibleCount = layerCount(row);
    if(visibleCount > 0) labels.append('text').attr('x',x).attr('y',y+15).attr('text-anchor','middle').attr('fill','#fff').attr('font-size',9).attr('font-weight',900).attr('paint-order','stroke').attr('stroke','#07110d').attr('stroke-width',3).attr('pointer-events','none').text(fmt(visibleCount));
  });

  viewport.append('path')
    .datum(topojson.mesh(atlas, atlas.objects.states, (a,b)=>a!==b))
    .attr('fill','none').attr('stroke','#c3d0c9').attr('stroke-width','.55').attr('vector-effect','non-scaling-stroke').attr('d',path).attr('pointer-events','none');
}

function initializeGeography(loadedAtlas){
  atlas = loadedAtlas;
  stateFeatures = topojson.feature(atlas, atlas.objects.states).features;
  const collection = { type:'FeatureCollection', features:stateFeatures };
  projection = d3.geoAlbersUsa().fitExtent([[28,28],[947,582]], collection);
  path = d3.geoPath(projection);
  svg = d3.select('#usMap');
  svg.attr('viewBox','0 0 975 610').attr('preserveAspectRatio','xMidYMid meet').style('cursor','grab');
  viewport = svg.append('g').attr('class','interactive-map-viewport');
  zoom = d3.zoom().scaleExtent([1,8]).translateExtent([[-200,-150],[1175,760]]).on('zoom', event => viewport.attr('transform',event.transform));
  svg.call(zoom).on('dblclick.zoom',null);
  installMapControls();
  renderMap();
}

async function shareSelectedState(){
  const entry = selectedCode ? metaByCode(selectedCode) : null;
  const title = entry ? `${entry[1]} — 2026 Voting Map` : 'The 2026 Voting Map';
  const text = entry ? `See anonymous self-reported check-ins and official voting resources for ${entry[1]}.` : 'See anonymous self-reported check-ins and official voting resources by state.';
  const url = statePermalink(selectedCode);
  try{
    if(navigator.share) await navigator.share({title,text,url});
    else if(navigator.clipboard){
      await navigator.clipboard.writeText(url);
      const button = $('#shareState');
      if(button){ const original = button.textContent; button.textContent = 'STATE LINK COPIED ✓'; setTimeout(()=>button.textContent=original,1800); }
    }
  }catch(_){}
}

async function loadMap(){
  try{
    const initialState = new URLSearchParams(window.location.search).get('state')?.toUpperCase() || null;
    if(validStateCode(initialState)) selectedCode = initialState;
    const [loadedAtlas,response] = await Promise.all([d3.json(ATLAS_URL),fetch(CHECKIN_ENDPOINT,{credentials:'omit'})]);
    const data = await response.json();
    if(!data.ok) throw new Error('aggregate_failed');
    aggregate = data;
    updateNational();
    updatePanel(selectedCode);
    syncStateSelect();
    initializeGeography(loadedAtlas);
    if(selectedCode) zoomToSelection(selectedCode);
  }catch(error){
    console.error('Voting map failed:',error);
    $('#mapStage').innerHTML = '<div class="map-error"><strong>Interactive map could not load.</strong><br>Please refresh. Official voting-resource links still work.</div>';
  }
}

document.querySelectorAll('[data-layer]').forEach(button => button.addEventListener('click',() => {
  layer = button.dataset.layer;
  document.querySelectorAll('[data-layer]').forEach(b => b.classList.toggle('active',b===button));
  renderMap();
}));
$('#mobileStateSelect')?.addEventListener('change',event => selectState(event.target.value || null,{scroll:true,updateUrl:true,zoomTo:true}));
$('#shareState')?.addEventListener('click',shareSelectedState);

loadMap();
