const states = [
  ["Alabama","alabama"],["Alaska","alaska"],["Arizona","arizona"],["Arkansas","arkansas"],["California","california"],["Colorado","colorado"],["Connecticut","connecticut"],["Delaware","delaware"],["District of Columbia","district-columbia"],["Florida","florida"],["Georgia","georgia"],["Hawaii","hawaii"],["Idaho","idaho"],["Illinois","illinois"],["Indiana","indiana"],["Iowa","iowa"],["Kansas","kansas"],["Kentucky","kentucky"],["Louisiana","louisiana"],["Maine","maine"],["Maryland","maryland"],["Massachusetts","massachusetts"],["Michigan","michigan"],["Minnesota","minnesota"],["Mississippi","mississippi"],["Missouri","missouri"],["Montana","montana"],["Nebraska","nebraska"],["Nevada","nevada"],["New Hampshire","new-hampshire"],["New Jersey","new-jersey"],["New Mexico","new-mexico"],["New York","new-york"],["North Carolina","north-carolina"],["North Dakota","north-dakota"],["Ohio","ohio"],["Oklahoma","oklahoma"],["Oregon","oregon"],["Pennsylvania","pennsylvania"],["Rhode Island","rhode-island"],["South Carolina","south-carolina"],["South Dakota","south-dakota"],["Tennessee","tennessee"],["Texas","texas"],["Utah","utah"],["Vermont","vermont"],["Virginia","virginia"],["Washington","washington"],["West Virginia","west-virginia"],["Wisconsin","wisconsin"],["Wyoming","wyoming"]
];

const stateSelect = document.querySelector('#state');
states.forEach(([name, slug]) => {
  const option = document.createElement('option');
  option.value = slug;
  option.textContent = name;
  stateSelect.append(option);
});

document.querySelector('#lookupButton').addEventListener('click', () => {
  const slug = stateSelect.value;
  const url = slug ? `https://www.eac.gov/${slug}-voter-info` : 'https://www.eac.gov/vote';
  window.open(url, '_blank', 'noopener');
  if (slug) localStorage.setItem('votePlan.location', 'true');
  syncChecklist();
});

const electionDay = new Date('2026-11-03T20:00:00-05:00');
function updateCountdown(){
  const diff = Math.max(0, electionDay - new Date());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  document.querySelector('#days').textContent = String(days);
  document.querySelector('#hours').textContent = String(hours).padStart(2,'0');
  document.querySelector('#minutes').textContent = String(minutes).padStart(2,'0');
  document.querySelector('#seconds').textContent = String(seconds).padStart(2,'0');
}
updateCountdown();
setInterval(updateCountdown,1000);

function openDirections(mode){
  const destination = document.querySelector('#pollAddress').value.trim();
  if(!destination){
    document.querySelector('#pollAddress').focus();
    document.querySelector('#pollAddress').setAttribute('placeholder','Enter your polling-place address first');
    return;
  }
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api','1');
  url.searchParams.set('destination',destination);
  url.searchParams.set('travelmode',mode);
  window.open(url.toString(),'_blank','noopener');
  localStorage.setItem('votePlan.route','true');
  syncChecklist();
}

document.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => openDirections(btn.dataset.mode)));

const checklist = document.querySelectorAll('#checklist input[type="checkbox"]');
function syncChecklist(){
  checklist.forEach(box => box.checked = localStorage.getItem(`votePlan.${box.dataset.key}`) === 'true');
}
checklist.forEach(box => box.addEventListener('change', () => localStorage.setItem(`votePlan.${box.dataset.key}`, String(box.checked))));
syncChecklist();

document.querySelector('#shareButton').addEventListener('click', async () => {
  const data = {
    title:"Let's Go Vote This Time",
    text:"Find your official voting location now, make a transportation plan, and help someone else get there on November 3, 2026.",
    url:window.location.href
  };
  try{
    if(navigator.share) await navigator.share(data);
    else await navigator.clipboard.writeText(`${data.text} ${data.url}`);
    localStorage.setItem('votePlan.share','true');
    syncChecklist();
  }catch(e){/* user cancelled */}
});

// FAAAAAA sound button — intentionally silly, intentionally memorable.
const heroActions = document.querySelector('.hero-actions');
const faaaaButton = document.createElement('button');
faaaaButton.type = 'button';
faaaaButton.className = 'button faaaa-button';
faaaaButton.setAttribute('aria-label', 'Play the FAAAAAA sound');
faaaaButton.innerHTML = '<span class="speaker" aria-hidden="true">🔊</span> FAAAAAAA!';
heroActions.append(faaaaButton);

function playFaaaaFallback(){
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if(!AudioContext) return;
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.24, now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
  master.connect(ctx.destination);

  [220, 330, 440].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = index === 0 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.68, now + 1.2);
    gain.gain.value = 0.20 / (index + 1);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now + index * 0.012);
    osc.stop(now + 1.28);
  });
}

function playFaaaa(){
  faaaaButton.classList.remove('is-playing');
  void faaaaButton.offsetWidth;
  faaaaButton.classList.add('is-playing');
  setTimeout(() => faaaaButton.classList.remove('is-playing'), 1050);

  if('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window){
    window.speechSynthesis.cancel();
    const yell = new SpeechSynthesisUtterance('Faaaaaaaaaaaa!');
    yell.rate = 0.62;
    yell.pitch = 0.72;
    yell.volume = 1;
    window.speechSynthesis.speak(yell);
  }else{
    playFaaaaFallback();
  }
}

faaaaButton.addEventListener('click', playFaaaa);

const faaaaStyles = document.createElement('style');
faaaaStyles.textContent = `
  .faaaa-button{
    position:relative;
    overflow:hidden;
    background:#ff4b38;
    border-color:#0b0d12;
    color:#0b0d12;
    box-shadow:4px 4px 0 #0b0d12;
    font-size:13px;
  }
  .faaaa-button:hover,.faaaa-button:focus-visible{
    background:#50ef9b;
    transform:translate(-1px,-1px);
    box-shadow:6px 6px 0 #0b0d12;
    outline:none;
  }
  .faaaa-button .speaker{font-size:17px}
  .faaaa-button.is-playing{animation:faaaaShake .13s linear 7}
  .faaaa-button.is-playing:after{
    content:'FAAAAAAAAA!';
    position:absolute;
    inset:0;
    display:grid;
    place-items:center;
    background:#ff4b38;
    font-size:14px;
    font-weight:900;
    letter-spacing:.1em;
  }
  @keyframes faaaaShake{
    0%,100%{transform:translate(0,0) rotate(0)}
    25%{transform:translate(-2px,1px) rotate(-1deg)}
    50%{transform:translate(2px,-1px) rotate(1deg)}
    75%{transform:translate(-1px,-1px) rotate(.5deg)}
  }
  @media(max-width:780px){
    .faaaa-button{width:100%}
  }
  @media(prefers-reduced-motion:reduce){
    .faaaa-button.is-playing{animation:none}
  }
`;
document.head.append(faaaaStyles);
