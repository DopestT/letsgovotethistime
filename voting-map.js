const CHECKIN_ENDPOINT = 'https://zxmdfmiueapjhktqchts.supabase.co/functions/v1/lgvtt-vote-checkin';
const ATLAS_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const stateMeta = {
  '01':['AL','Alabama','alabama'],'02':['AK','Alaska','alaska'],'04':['AZ','Arizona','arizona'],'05':['AR','Arkansas','arkansas'],'06':['CA','California','california'],'08':['CO','Colorado','colorado'],'09':['CT','Connecticut','connecticut'],'10':['DE','Delaware','delaware'],'11':['DC','District of Columbia','district-columbia'],'12':['FL','Florida','florida'],'13':['GA','Georgia','georgia'],'15':['HI','Hawaii','hawaii'],'16':['ID','Idaho','idaho'],'17':['IL','Illinois','illinois'],'18':['IN','Indiana','indiana'],'19':['IA','Iowa','iowa'],'20':['KS','Kansas','kansas'],'21':['KY','Kentucky','kentucky'],'22':['LA','Louisiana','louisiana'],'23':['ME','Maine','maine'],'24':['MD','Maryland','maryland'],'25':['MA','Massachusetts','massachusetts'],'26':['MI','Michigan','michigan'],'27':['MN','Minnesota','minnesota'],'28':['MS','Mississippi','mississippi'],'29':['MO','Missouri','missouri'],'30':['MT','Montana','montana'],'31':['NE','Nebraska','nebraska'],'32':['NV','Nevada','nevada'],'33':['NH','New Hampshire','new-hampshire'],'34':['NJ','New Jersey','new-jersey'],'35':['NM','New Mexico','new-mexico'],'36':['NY','New York','new-york'],'37':['NC','North Carolina','north-carolina'],'38':['ND','North Dakota','north-dakota'],'39':['OH','Ohio','ohio'],'40':['OK','Oklahoma','oklahoma'],'41':['OR','Oregon','oregon'],'42':['PA','Pennsylvania','pennsylvania'],'44':['RI','Rhode Island','rhode-island'],'45':['SC','South Carolina','south-carolina'],'46':['SD','South Dakota','south-dakota'],'47':['TN','Tennessee','tennessee'],'48':['TX','Texas','texas'],'49':['UT','Utah','utah'],'50':['VT','Vermont','vermont'],'51':['VA','Virginia','virginia'],'53':['WA','Washington','washington'],'54':['WV','West Virginia','west-virginia'],'55':['WI','Wisconsin','wisconsin'],'56':['WY','Wyoming','wyoming']
};

let aggregate = { national:{checkins:0,voted:0,not_yet:0}, states:[], districts:[] };
let layer = 'all';
let selectedCode = null;
let stateFeatures = [];

function fmt(value){ return Number(value || 0).toLocaleString(); }
function stateRow(code){ return aggregate.states.find(row => row.state_code === code) || {state_code:code,checkins:0,voted:0,not_yet:0}; }
function districtRows(code){
  return (aggregate.districts || [])
    .filter(row => row.state_code === code)
    .sort((a,b) => {
      if(a.congressional_district === 'AL') return -1;
      if(b.congressional_district === 'AL') return 1;
      return Number(a.congressional_district) - Number(b.congressional_district);
    });
}
function pct(row){ return Number(row.checkins) ? `${((Number(row.voted)/Number(row.checkins))*100).toFixed(1)}%` : '—'; }
function layerCount(row){
  if(layer === 'voted') return Number(row.voted || 0);
  if(layer === 'not_yet') return Number(row.not_yet || 0);
  return Number(row.checkins || 0);
}
function metaByCode(code){ return Object.values(stateMeta).find(meta => meta[0] === code) || null; }
function validStateCode(code){ return Boolean(metaByCode(code)); }
function statePermalink(code){
  const url = new URL(window.location.href);
  url.pathname = '/voting-map';
  url.search = code ? `?state=${encodeURIComponent(code)}` : '';
  url.hash = '';
  return url.toString();
}
function syncUrl(){
  try{
    const next = selectedCode ? `/voting-map?state=${encodeURIComponent(selectedCode)}` : '/voting-map';
    window.history.replaceState({}, '', next);
  }catch(_){}
}

function ensureDistrictPanel(){
  let panel = document.querySelector('#districtBreakdown');
  if(panel) return panel;
  panel = document.createElement('section');
  panel.id = 'districtBreakdown';
  panel.style.marginTop = '18px';
  panel.style.borderTop = '1px solid #345044';
  panel.style.paddingTop = '16px';
  const official = document.querySelector('#statePanel .official-box');
  official?.parentNode?.insertBefore(panel, official);
  return panel;
}

function updateDistrictPanel(code){
  const panel = ensureDistrictPanel();
  if(!panel) return;
  if(!code){
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }

  panel.hidden = false;
  const rows = districtRows(code);
  const heading = document.createElement('div');
  heading.className = 'smallcaps';
  heading.style.color = '#50ef9b';
  heading.textContent = 'CONGRESSIONAL DISTRICTS';

  const note = document.createElement('p');
  note.style.fontSize = '12px';
  note.style.lineHeight = '1.45';
  note.style.color = '#aebdb5';
  note.style.margin = '7px 0 12px';
  note.textContent = 'Only districts with at least 5 anonymous check-ins are shown. These are self-reports, not official turnout.';

  panel.replaceChildren(heading, note);

  if(!rows.length){
    const empty = document.createElement('div');
    empty.style.border = '1px solid #345044';
    empty.style.padding = '12px';
    empty.style.fontSize = '12px';
    empty.style.color = '#c8d2cc';
    empty.textContent = 'No district has reached the public-display threshold yet.';
    panel.append(empty);
    return;
  }

  const list = document.createElement('div');
  list.style.display = 'grid';
  list.style.gap = '8px';
  rows.forEach(row => {
    const item = document.createElement('div');
    item.style.border = '1px solid #345044';
    item.style.background = '#0a1611';
    item.style.padding = '11px 12px';

    const top = document.createElement('div');
    top.style.display = 'flex';
    top.style.justifyContent = 'space-between';
    top.style.gap = '12px';
    top.style.alignItems = 'baseline';

    const label = document.createElement('strong');
    label.style.fontFamily = "'Space Grotesk',sans-serif";
    label.style.fontSize = '14px';
    label.textContent = row.congressional_district === 'AL' ? 'AT-LARGE DISTRICT' : `DISTRICT ${row.congressional_district}`;

    const total = document.createElement('strong');
    total.style.color = '#50ef9b';
    total.textContent = `${fmt(row.checkins)} check-ins`;
    top.append(label, total);

    const detail = document.createElement('div');
    detail.style.display = 'grid';
    detail.style.gridTemplateColumns = 'repeat(3,1fr)';
    detail.style.gap = '8px';
    detail.style.marginTop = '8px';
    detail.style.fontSize = '10px';
    detail.style.color = '#c8d2cc';
    detail.innerHTML = `<span><b style="color:#fff">${fmt(row.voted)}</b><br>VOTED</span><span><b style="color:#fff">${fmt(row.not_yet)}</b><br>NOT YET</span><span><b style="color:#fff">${pct(row)}</b><br>VOTED SHARE</span>`;

    item.append(top, detail);
    list.append(item);
  });
  panel.append(list);
}

function updateNational(){
  document.querySelector('#mapTotal').textContent = fmt(aggregate.national.checkins);
  document.querySelector('#mapVoted').textContent = fmt(aggregate.national.voted);
  document.querySelector('#mapNotYet').textContent = fmt(aggregate.national.not_yet);
}

function updatePanel(code){
  const panelTitle = document.querySelector('#panelTitle');
  const stateOfficial = document.querySelector('#stateOfficial');
  const rideTool = document.querySelector('#rideTool');
  const helpTool = document.querySelector('#helpTool');
  let row = aggregate.national;
  const entry = code ? metaByCode(code) : null;

  if(code && entry){
    row = stateRow(code);
    panelTitle.textContent = entry[1].toUpperCase();
    stateOfficial.href = `https://www.eac.gov/${entry[2]}-voter-info`;
    rideTool.href = `/rides-to-polls?state=${encodeURIComponent(code)}`;
    helpTool.href = `/voter-help?state=${encodeURIComponent(code)}`;
  }else{
    panelTitle.textContent = 'UNITED STATES';
    stateOfficial.href = 'https://www.eac.gov/vote';
    rideTool.href = '/rides-to-polls';
    helpTool.href = '/voter-help';
  }

  document.querySelector('#panelTotal').textContent = fmt(row.checkins);
  document.querySelector('#panelVoted').textContent = fmt(row.voted);
  document.querySelector('#panelNotYet').textContent = fmt(row.not_yet);
  document.querySelector('#panelPct').textContent = pct(row);
  updateDistrictPanel(code);
}

function selectState(code, { scroll = false, updateUrl = true } = {}){
  selectedCode = validStateCode(code) ? code : null;
  updatePanel(selectedCode);
  syncMobileStateSelect();
  renderMap();
  if(updateUrl) syncUrl();
  if(scroll && selectedCode) document.querySelector('#statePanel')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

function syncMobileStateSelect(){
  const select = document.querySelector('#mobileStateSelect');
  if(!select) return;
  if(!select.options.length){
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'United States';
    select.append(all);
    Object.values(stateMeta).sort((a,b) => a[1].localeCompare(b[1])).forEach(meta => {
      const option = document.createElement('option');
      option.value = meta[0];
      option.textContent = `${meta[1]} — ${fmt(stateRow(meta[0]).checkins)}`;
      select.append(option);
    });
  }else{
    Array.from(select.options).forEach(option => {
      if(!option.value) return;
      const meta = metaByCode(option.value);
      if(meta) option.textContent = `${meta[1]} — ${fmt(stateRow(meta[0]).checkins)}`;
    });
  }
  select.value = selectedCode || '';
}

function renderMap(){
  if(!stateFeatures.length) return;
  const svg = d3.select('#usMap');
  svg.selectAll('*').remove();

  const path = d3.geoPath();
  const maxCount = d3.max(aggregate.states, layerCount) || 1;
  const opacity = d3.scaleSqrt().domain([0,maxCount]).range([0.2,0.9]);
  const radius = d3.scaleSqrt().domain([0,maxCount]).range([0,30]);

  svg.append('g').selectAll('path')
    .data(stateFeatures)
    .join('path')
    .attr('class', d => {
      const meta = stateMeta[String(d.id).padStart(2,'0')];
      return `state-path${meta && meta[0] === selectedCode ? ' selected' : ''}`;
    })
    .attr('d', path)
    .attr('fill-opacity', d => {
      const meta = stateMeta[String(d.id).padStart(2,'0')];
      if(!meta) return .18;
      return opacity(layerCount(stateRow(meta[0])));
    })
    .on('click', (_, d) => {
      const meta = stateMeta[String(d.id).padStart(2,'0')];
      if(meta) selectState(meta[0]);
    })
    .append('title')
    .text(d => {
      const meta = stateMeta[String(d.id).padStart(2,'0')];
      if(!meta) return '';
      const row = stateRow(meta[0]);
      return `${meta[1]} — ${fmt(row.checkins)} check-ins, ${fmt(row.voted)} voted, ${fmt(row.not_yet)} not yet`;
    });

  const bubbleGroup = svg.append('g');
  const labelGroup = svg.append('g');

  stateFeatures.forEach(feature => {
    const meta = stateMeta[String(feature.id).padStart(2,'0')];
    if(!meta) return;
    const row = stateRow(meta[0]);
    const [x,y] = path.centroid(feature);
    if(!Number.isFinite(x) || !Number.isFinite(y)) return;

    if(layer === 'all' || layer === 'voted'){
      const scaled = radius(Number(row.voted));
      const r = Number(row.voted) > 0 ? Math.max(4.5, scaled) : 0;
      if(r > 0) bubbleGroup.append('circle').attr('class','state-bubble').attr('cx',x-(layer==='all'?Math.min(r*.38,8):0)).attr('cy',y).attr('r',r);
    }
    if(layer === 'all' || layer === 'not_yet'){
      const scaled = radius(Number(row.not_yet));
      const r = Number(row.not_yet) > 0 ? Math.max(4.5, scaled) : 0;
      if(r > 0) bubbleGroup.append('circle').attr('class','state-bubble notyet').attr('cx',x+(layer==='all'?Math.min(r*.38,8):0)).attr('cy',y).attr('r',r);
    }

    const count = layerCount(row);
    if(count > 0){
      const text = labelGroup.append('text')
        .attr('class','state-total-label')
        .attr('x',x)
        .attr('y',y + 3)
        .attr('text-anchor','middle');
      text.append('tspan').attr('class','state-total-code').text(meta[0]);
      text.append('tspan').attr('class','state-total-count').attr('x',x).attr('dy',11).text(fmt(count));
    }
  });

  const mesh = topojson.mesh(window.__usaAtlas, window.__usaAtlas.objects.states, (a,b) => a !== b);
  svg.append('path').datum(mesh).attr('fill','none').attr('stroke','#8aa095').attr('stroke-width','.5').attr('d',path).attr('pointer-events','none');
}

async function shareSelectedState(){
  const entry = selectedCode ? metaByCode(selectedCode) : null;
  const title = entry ? `${entry[1]} — 2026 Voting Map` : 'The 2026 Voting Map';
  const text = entry
    ? `See anonymous self-reported check-ins and official voting resources for ${entry[1]}.`
    : 'See anonymous self-reported check-ins and official voting resources by state.';
  const url = statePermalink(selectedCode);
  try{
    if(navigator.share){
      await navigator.share({ title, text, url });
    }else{
      await navigator.clipboard.writeText(url);
      const button = document.querySelector('#shareState');
      if(button){
        const original = button.textContent;
        button.textContent = 'STATE LINK COPIED ✓';
        setTimeout(() => { button.textContent = original; }, 1800);
      }
    }
  }catch(_){}
}

async function loadMap(){
  try{
    const initialState = new URLSearchParams(window.location.search).get('state')?.toUpperCase() || null;
    if(validStateCode(initialState)) selectedCode = initialState;

    const [atlas, response] = await Promise.all([
      d3.json(ATLAS_URL),
      fetch(CHECKIN_ENDPOINT, { credentials:'omit' })
    ]);
    const data = await response.json();
    if(!data.ok) throw new Error('aggregate_failed');
    window.__usaAtlas = atlas;
    stateFeatures = topojson.feature(atlas, atlas.objects.states).features;
    aggregate = data;
    updateNational();
    updatePanel(selectedCode);
    syncMobileStateSelect();
    renderMap();
  }catch(error){
    document.querySelector('#mapStage').innerHTML = '<div class="map-error"><strong>Map data could not load.</strong><br>The official voting-resource links still work. Please refresh to try the live check-in layer again.</div>';
  }
}

document.querySelectorAll('[data-layer]').forEach(button => {
  button.addEventListener('click', () => {
    layer = button.dataset.layer;
    document.querySelectorAll('[data-layer]').forEach(b => b.classList.toggle('active', b === button));
    renderMap();
  });
});

document.querySelector('#mobileStateSelect')?.addEventListener('change', event => {
  selectState(event.target.value || null, { scroll:true });
});

document.querySelector('#shareState')?.addEventListener('click', shareSelectedState);

loadMap();
