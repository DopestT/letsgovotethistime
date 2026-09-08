const CHECKIN_ENDPOINT = 'https://zxmdfmiueapjhktqchts.supabase.co/functions/v1/lgvtt-vote-checkin';
const ATLAS_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const stateMeta = {
  '01':['AL','Alabama','alabama'],'02':['AK','Alaska','alaska'],'04':['AZ','Arizona','arizona'],'05':['AR','Arkansas','arkansas'],'06':['CA','California','california'],'08':['CO','Colorado','colorado'],'09':['CT','Connecticut','connecticut'],'10':['DE','Delaware','delaware'],'11':['DC','District of Columbia','district-columbia'],'12':['FL','Florida','florida'],'13':['GA','Georgia','georgia'],'15':['HI','Hawaii','hawaii'],'16':['ID','Idaho','idaho'],'17':['IL','Illinois','illinois'],'18':['IN','Indiana','indiana'],'19':['IA','Iowa','iowa'],'20':['KS','Kansas','kansas'],'21':['KY','Kentucky','kentucky'],'22':['LA','Louisiana','louisiana'],'23':['ME','Maine','maine'],'24':['MD','Maryland','maryland'],'25':['MA','Massachusetts','massachusetts'],'26':['MI','Michigan','michigan'],'27':['MN','Minnesota','minnesota'],'28':['MS','Mississippi','mississippi'],'29':['MO','Missouri','missouri'],'30':['MT','Montana','montana'],'31':['NE','Nebraska','nebraska'],'32':['NV','Nevada','nevada'],'33':['NH','New Hampshire','new-hampshire'],'34':['NJ','New Jersey','new-jersey'],'35':['NM','New Mexico','new-mexico'],'36':['NY','New York','new-york'],'37':['NC','North Carolina','north-carolina'],'38':['ND','North Dakota','north-dakota'],'39':['OH','Ohio','ohio'],'40':['OK','Oklahoma','oklahoma'],'41':['OR','Oregon','oregon'],'42':['PA','Pennsylvania','pennsylvania'],'44':['RI','Rhode Island','rhode-island'],'45':['SC','South Carolina','south-carolina'],'46':['SD','South Dakota','south-dakota'],'47':['TN','Tennessee','tennessee'],'48':['TX','Texas','texas'],'49':['UT','Utah','utah'],'50':['VT','Vermont','vermont'],'51':['VA','Virginia','virginia'],'53':['WA','Washington','washington'],'54':['WV','West Virginia','west-virginia'],'55':['WI','Wisconsin','wisconsin'],'56':['WY','Wyoming','wyoming']
};

let aggregate = { national:{checkins:0,voted:0,not_yet:0}, states:[] };
let layer = 'all';
let selectedCode = null;
let stateFeatures = [];

function fmt(value){ return Number(value || 0).toLocaleString(); }
function stateRow(code){ return aggregate.states.find(row => row.state_code === code) || {state_code:code,checkins:0,voted:0,not_yet:0}; }
function pct(row){ return Number(row.checkins) ? `${((Number(row.voted)/Number(row.checkins))*100).toFixed(1)}%` : '—'; }

function updateNational(){
  document.querySelector('#mapTotal').textContent = fmt(aggregate.national.checkins);
  document.querySelector('#mapVoted').textContent = fmt(aggregate.national.voted);
  document.querySelector('#mapNotYet').textContent = fmt(aggregate.national.not_yet);
}

function updatePanel(code){
  const panelTitle = document.querySelector('#panelTitle');
  const stateOfficial = document.querySelector('#stateOfficial');
  let row = aggregate.national;
  if(code){
    row = stateRow(code);
    const entry = Object.values(stateMeta).find(meta => meta[0] === code);
    panelTitle.textContent = entry ? entry[1].toUpperCase() : code;
    stateOfficial.href = entry ? `https://www.eac.gov/${entry[2]}-voter-info` : 'https://www.eac.gov/vote';
  }else{
    panelTitle.textContent = 'UNITED STATES';
    stateOfficial.href = 'https://www.eac.gov/vote';
  }
  document.querySelector('#panelTotal').textContent = fmt(row.checkins);
  document.querySelector('#panelVoted').textContent = fmt(row.voted);
  document.querySelector('#panelNotYet').textContent = fmt(row.not_yet);
  document.querySelector('#panelPct').textContent = pct(row);
}

function renderMap(){
  if(!stateFeatures.length) return;
  const svg = d3.select('#usMap');
  svg.selectAll('*').remove();

  const path = d3.geoPath();
  const maxCount = d3.max(aggregate.states, d => {
    if(layer === 'voted') return Number(d.voted);
    if(layer === 'not_yet') return Number(d.not_yet);
    return Number(d.checkins);
  }) || 1;
  const opacity = d3.scaleSqrt().domain([0,maxCount]).range([0.18,0.86]);
  const radius = d3.scaleSqrt().domain([0,maxCount]).range([0,18]);

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
      const row = stateRow(meta[0]);
      const count = layer === 'voted' ? Number(row.voted) : layer === 'not_yet' ? Number(row.not_yet) : Number(row.checkins);
      return opacity(count);
    })
    .on('click', (_, d) => {
      const meta = stateMeta[String(d.id).padStart(2,'0')];
      if(!meta) return;
      selectedCode = meta[0];
      updatePanel(selectedCode);
      renderMap();
    })
    .append('title')
    .text(d => {
      const meta = stateMeta[String(d.id).padStart(2,'0')];
      if(!meta) return '';
      const row = stateRow(meta[0]);
      return `${meta[1]} — ${fmt(row.checkins)} check-ins, ${fmt(row.voted)} voted, ${fmt(row.not_yet)} not yet`;
    });

  const bubbleGroup = svg.append('g');
  stateFeatures.forEach(feature => {
    const meta = stateMeta[String(feature.id).padStart(2,'0')];
    if(!meta) return;
    const row = stateRow(meta[0]);
    const [x,y] = path.centroid(feature);
    if(!Number.isFinite(x) || !Number.isFinite(y)) return;

    if(layer === 'all' || layer === 'voted'){
      const r = radius(Number(row.voted));
      if(r > 0) bubbleGroup.append('circle').attr('class','state-bubble').attr('cx',x-(layer==='all'?r*.42:0)).attr('cy',y).attr('r',r);
    }
    if(layer === 'all' || layer === 'not_yet'){
      const r = radius(Number(row.not_yet));
      if(r > 0) bubbleGroup.append('circle').attr('class','state-bubble notyet').attr('cx',x+(layer==='all'?r*.42:0)).attr('cy',y).attr('r',r);
    }
  });

  const mesh = topojson.mesh(window.__usaAtlas, window.__usaAtlas.objects.states, (a,b) => a !== b);
  svg.append('path').datum(mesh).attr('fill','none').attr('stroke','#8aa095').attr('stroke-width','.5').attr('d',path).attr('pointer-events','none');
}

async function loadMap(){
  try{
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
    updatePanel(null);
    renderMap();
  }catch(error){
    document.querySelector('#mapStage').innerHTML = '<div class="map-error"><strong>Map data could not load.</strong><br>The voting-location links still work. Please refresh to try the live check-in layer again.</div>';
  }
}

document.querySelectorAll('[data-layer]').forEach(button => {
  button.addEventListener('click', () => {
    layer = button.dataset.layer;
    document.querySelectorAll('[data-layer]').forEach(b => b.classList.toggle('active', b === button));
    renderMap();
  });
});

loadMap();
