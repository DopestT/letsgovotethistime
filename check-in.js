const CHECKIN_ENDPOINT = 'https://zxmdfmiueapjhktqchts.supabase.co/functions/v1/lgvtt-vote-checkin';
const CHECKIN_TOKEN_KEY = 'lgvtt.voteCheckin.device';
const CHECKIN_STATUS_KEY = 'lgvtt.voteCheckin.status';
const interactionStartedAt = Date.now();

const states = [
  ['Alabama','AL'],['Alaska','AK'],['Arizona','AZ'],['Arkansas','AR'],['California','CA'],['Colorado','CO'],['Connecticut','CT'],['Delaware','DE'],['District of Columbia','DC'],['Florida','FL'],['Georgia','GA'],['Hawaii','HI'],['Idaho','ID'],['Illinois','IL'],['Indiana','IN'],['Iowa','IA'],['Kansas','KS'],['Kentucky','KY'],['Louisiana','LA'],['Maine','ME'],['Maryland','MD'],['Massachusetts','MA'],['Michigan','MI'],['Minnesota','MN'],['Mississippi','MS'],['Missouri','MO'],['Montana','MT'],['Nebraska','NE'],['Nevada','NV'],['New Hampshire','NH'],['New Jersey','NJ'],['New Mexico','NM'],['New York','NY'],['North Carolina','NC'],['North Dakota','ND'],['Ohio','OH'],['Oklahoma','OK'],['Oregon','OR'],['Pennsylvania','PA'],['Rhode Island','RI'],['South Carolina','SC'],['South Dakota','SD'],['Tennessee','TN'],['Texas','TX'],['Utah','UT'],['Vermont','VT'],['Virginia','VA'],['Washington','WA'],['West Virginia','WV'],['Wisconsin','WI'],['Wyoming','WY']
];

const districtCounts = {
  AL:7,AK:1,AZ:9,AR:4,CA:52,CO:8,CT:5,DE:1,DC:1,FL:28,GA:14,HI:2,ID:2,IL:17,IN:9,IA:4,KS:4,KY:6,LA:6,ME:2,MD:8,MA:9,MI:13,MN:8,MS:4,MO:8,MT:2,NE:3,NV:4,NH:2,NJ:12,NM:3,NY:26,NC:14,ND:1,OH:15,OK:5,OR:6,PA:17,RI:2,SC:7,SD:1,TN:9,TX:38,UT:4,VT:1,VA:11,WA:10,WV:2,WI:8,WY:1
};

function deviceToken(){
  let token = localStorage.getItem(CHECKIN_TOKEN_KEY);
  if(!token){
    token = crypto.randomUUID();
    localStorage.setItem(CHECKIN_TOKEN_KEY, token);
  }
  return token;
}

const stateSelect = document.querySelector('#checkinState');
const districtSelect = document.querySelector('#checkinDistrict');
states.forEach(([name,code]) => {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = name;
  stateSelect.append(option);
});

function populateDistricts(state, selected = ''){
  districtSelect.innerHTML = '';
  if(!state || !districtCounts[state]){
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Choose state first';
    districtSelect.append(option);
    districtSelect.disabled = true;
    return;
  }

  districtSelect.disabled = false;
  const skip = document.createElement('option');
  skip.value = '';
  skip.textContent = 'Not sure / skip';
  districtSelect.append(skip);

  const count = districtCounts[state];
  if(count === 1){
    const option = document.createElement('option');
    option.value = 'AL';
    option.textContent = 'At-large';
    districtSelect.append(option);
  }else{
    for(let i = 1; i <= count; i += 1){
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `District ${i}`;
      districtSelect.append(option);
    }
  }

  if(selected && Array.from(districtSelect.options).some(option => option.value === selected)){
    districtSelect.value = selected;
  }
}

stateSelect.addEventListener('change', () => populateDistricts(stateSelect.value));

const statusInput = document.querySelector('#checkinStatus');
const message = document.querySelector('#checkinMessage');
const submitButton = document.querySelector('#checkinSubmit');
const lockedNote = document.querySelector('#lockedNote');
const shareWrap = document.querySelector('#shareWrap');

document.querySelectorAll('[data-status]').forEach(button => {
  button.addEventListener('click', () => {
    const current = localStorage.getItem(CHECKIN_STATUS_KEY);
    if(current === 'voted') return;
    document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('selected'));
    button.classList.add('selected');
    statusInput.value = button.dataset.status;
  });
});

function setUiFromStatus(status){
  document.querySelectorAll('[data-status]').forEach(button => {
    button.classList.toggle('selected', button.dataset.status === status);
    button.disabled = status === 'voted';
  });
  if(status){
    statusInput.value = status;
    localStorage.setItem(CHECKIN_STATUS_KEY, status);
  }
  if(status === 'voted'){
    submitButton.disabled = true;
    submitButton.textContent = 'CHECKED IN — VOTED';
    lockedNote.hidden = false;
    shareWrap.classList.add('show');
  }
}

async function refreshTotals(){
  try{
    const response = await fetch(CHECKIN_ENDPOINT, { credentials:'omit' });
    const data = await response.json();
    if(!data.ok) return;
    document.querySelector('#totalCheckins').textContent = Number(data.national.checkins || 0).toLocaleString();
    document.querySelector('#totalVoted').textContent = Number(data.national.voted || 0).toLocaleString();
    document.querySelector('#totalNotYet').textContent = Number(data.national.not_yet || 0).toLocaleString();
  }catch(_){ }
}

async function restoreStatus(){
  const token = deviceToken();
  try{
    const response = await fetch(`${CHECKIN_ENDPOINT}?device_token=${encodeURIComponent(token)}`, { credentials:'omit' });
    const data = await response.json();
    if(data.ok && data.checkin){
      setUiFromStatus(data.checkin.status);
      stateSelect.value = data.checkin.state_code || '';
      populateDistricts(stateSelect.value, data.checkin.congressional_district || '');
    }else{
      populateDistricts(stateSelect.value);
      setUiFromStatus(localStorage.getItem(CHECKIN_STATUS_KEY));
    }
  }catch(_){
    populateDistricts(stateSelect.value);
    setUiFromStatus(localStorage.getItem(CHECKIN_STATUS_KEY));
  }
}

function attribution(){
  const params = new URLSearchParams(location.search);
  return {
    partner: params.get('partner'),
    source: params.get('utm_source') || 'direct',
    medium: params.get('utm_medium') || 'website',
    campaign: params.get('utm_campaign') || '2026-vote-checkin'
  };
}

document.querySelector('#checkinForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'status-box';
  message.textContent = '';

  const current = localStorage.getItem(CHECKIN_STATUS_KEY);
  if(current === 'voted') return;

  const status = statusInput.value;
  const state = stateSelect.value;
  const district = districtSelect.value;
  const zip = document.querySelector('#checkinZip').value.trim();
  const website = document.querySelector('#checkinWebsite').value;

  if(!status){
    message.classList.add('error');
    message.textContent = 'Choose I Voted or Not Yet.';
    return;
  }
  if(!state){
    stateSelect.reportValidity();
    return;
  }
  if(zip && !/^\d{5}$/.test(zip)){
    message.classList.add('error');
    message.textContent = 'Enter a 5-digit ZIP code or leave it blank.';
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'ADDING CHECK-IN…';

  try{
    const response = await fetch(CHECKIN_ENDPOINT, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'omit',
      body:JSON.stringify({
        device_token: deviceToken(),
        status,
        state_code: state,
        congressional_district: district || null,
        zip_code: zip || null,
        website,
        interaction_ms: Date.now() - interactionStartedAt,
        ...attribution()
      })
    });
    const data = await response.json().catch(() => ({}));
    if(!response.ok || !data.ok){
      if(data.error === 'rate_limited') throw new Error('rate_limited');
      if(data.error === 'too_fast') throw new Error('too_fast');
      if(data.error === 'invalid_district') throw new Error('invalid_district');
      throw new Error('checkin_failed');
    }

    setUiFromStatus(data.status);
    message.classList.add('ok');
    message.textContent = data.status === 'voted'
      ? 'You’re checked in as Voted. Your anonymous point is ready for the map.'
      : 'You’re checked in as Not Yet. Come back after you vote and update this same point.';

    if(window.lgvttTrack) window.lgvttTrack('vote_checkin', { content:data.status });
    await refreshTotals();
  }catch(error){
    submitButton.disabled = false;
    submitButton.innerHTML = 'ADD MY CHECK-IN <span>→</span>';
    message.classList.add('error');
    message.textContent = error.message === 'rate_limited'
      ? 'This network has submitted too many new check-ins recently. Try again later.'
      : error.message === 'too_fast'
        ? 'Please wait a moment and try again.'
        : error.message === 'invalid_district'
          ? 'That congressional district does not match the selected state.'
          : 'We could not add the check-in right now. Please try again.';
  }
});

document.querySelector('#shareCheckin').addEventListener('click', async () => {
  const share = {
    title:'Did you vote? Light up the map.',
    text:'I checked in. Did you vote yet? Add your anonymous check-in to the 2026 map.',
    url:'https://letsgovotethistime.com/check-in?utm_source=share&utm_medium=referral&utm_campaign=2026-vote-checkin'
  };
  try{
    if(navigator.share) await navigator.share(share);
    else await navigator.clipboard.writeText(`${share.text} ${share.url}`);
    if(window.lgvttTrack) window.lgvttTrack('share_plan', { content:'vote-checkin' });
  }catch(_){ }
});

populateDistricts('');
restoreStatus();
refreshTotals();
