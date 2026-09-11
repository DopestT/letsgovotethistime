const guideStates = [
  ['AL','Alabama','alabama'],['AK','Alaska','alaska'],['AZ','Arizona','arizona'],['AR','Arkansas','arkansas'],['CA','California','california'],['CO','Colorado','colorado'],['CT','Connecticut','connecticut'],['DE','Delaware','delaware'],['DC','District of Columbia','district-columbia'],['FL','Florida','florida'],['GA','Georgia','georgia'],['HI','Hawaii','hawaii'],['ID','Idaho','idaho'],['IL','Illinois','illinois'],['IN','Indiana','indiana'],['IA','Iowa','iowa'],['KS','Kansas','kansas'],['KY','Kentucky','kentucky'],['LA','Louisiana','louisiana'],['ME','Maine','maine'],['MD','Maryland','maryland'],['MA','Massachusetts','massachusetts'],['MI','Michigan','michigan'],['MN','Minnesota','minnesota'],['MS','Mississippi','mississippi'],['MO','Missouri','missouri'],['MT','Montana','montana'],['NE','Nebraska','nebraska'],['NV','Nevada','nevada'],['NH','New Hampshire','new-hampshire'],['NJ','New Jersey','new-jersey'],['NM','New Mexico','new-mexico'],['NY','New York','new-york'],['NC','North Carolina','north-carolina'],['ND','North Dakota','north-dakota'],['OH','Ohio','ohio'],['OK','Oklahoma','oklahoma'],['OR','Oregon','oregon'],['PA','Pennsylvania','pennsylvania'],['RI','Rhode Island','rhode-island'],['SC','South Carolina','south-carolina'],['SD','South Dakota','south-dakota'],['TN','Tennessee','tennessee'],['TX','Texas','texas'],['UT','Utah','utah'],['VT','Vermont','vermont'],['VA','Virginia','virginia'],['WA','Washington','washington'],['WV','West Virginia','west-virginia'],['WI','Wisconsin','wisconsin'],['WY','Wyoming','wyoming']
];

const stateSelect = document.getElementById('guideState');
const placeholder = document.getElementById('guidePlaceholder');
const content = document.getElementById('guideContent');
const stateTitle = document.getElementById('guideStateTitle');

function byCode(code){ return guideStates.find(([c]) => c === code) || null; }

function setHref(id, href){ const el = document.getElementById(id); if(el) el.href = href; }

function showState(code, updateUrl = true){
  const meta = byCode(code);
  if(!meta){
    placeholder.hidden = false;
    content.hidden = true;
    if(updateUrl) history.replaceState({}, '', '/voter-guide');
    return;
  }

  const [stateCode, name, slug] = meta;
  const eac = `https://www.eac.gov/${slug}-voter-info`;
  placeholder.hidden = true;
  content.hidden = false;
  stateTitle.textContent = `${name.toUpperCase()} VOTER GUIDE`;

  setHref('registerGuide', `/register?state=${encodeURIComponent(stateCode)}`);
  setHref('stateVotingGuide', eac);
  setHref('localOffice', eac);
  setHref('idGuide', eac);
  setHref('trackGuide', eac);
  setHref('rideGuide', `/rides-to-polls?state=${encodeURIComponent(stateCode)}`);
  setHref('helpGuide', `/voter-help?state=${encodeURIComponent(stateCode)}`);
  setHref('stateMapGuide', `/voting-map?state=${encodeURIComponent(stateCode)}`);
  setHref('stateResourceGuide', `/voting-map/${slug}`);

  document.title = `${name} Voter Guide 2026 | Registration, Polling Place & Voting Info`;
  const desc = document.querySelector('meta[name="description"]');
  if(desc) desc.content = `2026 ${name} voter guide with official registration, polling-place, early and mail voting, ballot, local election office, transportation, and voter-help resources.`;

  stateSelect.value = stateCode;
  if(updateUrl) history.replaceState({}, '', `/voter-guide?state=${encodeURIComponent(stateCode)}`);

  window.lgvttTrack?.('voter_guide_state_select', { path:'/voter-guide', state:stateCode });
}

guideStates.slice().sort((a,b)=>a[1].localeCompare(b[1])).forEach(([code,name]) => stateSelect.add(new Option(name, code)));

stateSelect.addEventListener('change', event => showState(event.target.value || null));

const initial = new URLSearchParams(location.search).get('state')?.toUpperCase();
if(byCode(initial)) showState(initial, false);
