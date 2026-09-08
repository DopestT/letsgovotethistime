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

function buildShareUrl(){
  const shareUrl = new URL('https://letsgovotethistime.com/');
  shareUrl.searchParams.set('utm_source','share');
  shareUrl.searchParams.set('utm_medium','referral');
  shareUrl.searchParams.set('utm_campaign','2026-voting-plan');
  shareUrl.searchParams.set('utm_content','checklist');

  const incoming = new URLSearchParams(window.location.search);
  const partner = incoming.get('partner');
  if(partner) shareUrl.searchParams.set('partner', partner.slice(0,80));

  return shareUrl.toString();
}

document.querySelector('#shareButton').addEventListener('click', async () => {
  const data = {
    title:"Let's Go Vote This Time",
    text:"Find your official voting location now, make a transportation plan, and help someone else get there on November 3, 2026.",
    url:buildShareUrl()
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

// Explicit-consent election reminder signup. No party, candidate, ideology,
// intended-vote, voter-file, or polling-place address data is collected here.
const reminderNav = document.querySelector('.nav nav');
if(reminderNav){
  const reminderNavLink = document.createElement('a');
  reminderNavLink.href = '#reminders';
  reminderNavLink.textContent = 'Remind me';
  reminderNav.append(reminderNavLink);
}

const reminderSection = document.createElement('section');
reminderSection.id = 'reminders';
reminderSection.className = 'section reminder-section';
reminderSection.innerHTML = `
  <div class="shell reminder-grid">
    <div>
      <div class="section-number">04</div>
      <div class="eyebrow">FOUR OR FEWER · THEN WE STOP</div>
      <h2>DON'T LET<br>ELECTION DAY<br><em>SNEAK UP.</em></h2>
      <p class="reminder-copy">Get no more than four useful election reminders before November 3: registration and official-source checks, voting-location re-checks, and transportation-plan nudges.</p>
      <ul class="reminder-rules">
        <li>No party or candidate questions.</li>
        <li>No voter-file matching or political profiling.</li>
        <li>Unsubscribe in one click from every email.</li>
      </ul>
    </div>
    <div class="reminder-card">
      <div class="card-kicker">EMAIL REMINDERS</div>
      <h3>KEEP ME ON TRACK.</h3>
      <form id="reminderForm" novalidate>
        <label for="reminderEmail">Email address</label>
        <input id="reminderEmail" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required maxlength="254" />
        <div class="reminder-honeypot" aria-hidden="true">
          <label for="reminderWebsite">Website</label>
          <input id="reminderWebsite" name="website" type="text" tabindex="-1" autocomplete="off" />
        </div>
        <label class="reminder-consent">
          <input id="reminderConsent" name="consent" type="checkbox" required />
          <span>I agree to receive up to four nonpartisan 2026 election reminder emails from Let's Go Vote This Time. I can unsubscribe at any time.</span>
        </label>
        <button class="button primary full" id="reminderSubmit" type="submit">REMIND ME <span>→</span></button>
        <p class="reminder-status" id="reminderStatus" role="status" aria-live="polite"></p>
      </form>
      <p class="fine">We store only the email and basic referral attribution needed to operate the reminder list. <a href="/reminder-privacy">Reminder privacy & unsubscribe policy ↗</a></p>
    </div>
  </div>
`;

const planStrip = document.querySelector('.plan-strip');
if(planStrip) planStrip.before(reminderSection);
else document.querySelector('main')?.append(reminderSection);

const reminderStyles = document.createElement('style');
reminderStyles.textContent = `
  .reminder-section{background:#f2f4f7;border-top:2px solid #0b0d12}
  .reminder-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:start}
  .reminder-section h2{margin:.25em 0;font-size:clamp(42px,6vw,78px);line-height:.94}
  .reminder-copy{max-width:640px;font-size:19px;line-height:1.55}
  .reminder-rules{padding-left:20px;line-height:1.7;font-weight:600}
  .reminder-card{background:#fff;border:2px solid #0b0d12;box-shadow:8px 8px 0 #0b0d12;padding:28px}
  .reminder-card h3{font-size:28px;margin:8px 0 22px}
  .reminder-card form{display:grid;gap:14px}
  .reminder-card input[type="email"]{width:100%;box-sizing:border-box;border:2px solid #0b0d12;background:#fff;padding:15px;font:inherit}
  .reminder-consent{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;font-size:14px;line-height:1.45}
  .reminder-consent input{margin-top:3px;width:18px;height:18px}
  .reminder-honeypot{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}
  .reminder-status{min-height:24px;margin:0;font-weight:800;font-size:14px;line-height:1.4}
  .reminder-status.ok{color:#08783d}
  .reminder-status.error{color:#b42318}
  .reminder-card .fine a{color:inherit;font-weight:700}
  @media(max-width:780px){.reminder-grid{grid-template-columns:1fr;gap:28px}.reminder-section h2{font-size:48px}}
`;
document.head.append(reminderStyles);

const REMINDER_ENDPOINT = 'https://zxmdfmiueapjhktqchts.supabase.co/functions/v1/lgvtt-reminders';
const reminderForm = document.querySelector('#reminderForm');
if(reminderForm){
  reminderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const emailInput = document.querySelector('#reminderEmail');
    const consentInput = document.querySelector('#reminderConsent');
    const honeypot = document.querySelector('#reminderWebsite');
    const button = document.querySelector('#reminderSubmit');
    const status = document.querySelector('#reminderStatus');

    status.className = 'reminder-status';
    status.textContent = '';

    if(!emailInput.checkValidity()){
      emailInput.reportValidity();
      return;
    }
    if(!consentInput.checked){
      consentInput.reportValidity();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const payload = {
      email: emailInput.value.trim(),
      consent: true,
      website: honeypot.value,
      partner: params.get('partner'),
      source: params.get('utm_source') || 'direct',
      medium: params.get('utm_medium') || 'website',
      campaign: params.get('utm_campaign') || '2026-election-reminders'
    };

    button.disabled = true;
    button.textContent = 'ADDING REMINDER…';

    try{
      const response = await fetch(REMINDER_ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if(!response.ok || !data.ok) throw new Error(data.error || 'signup_failed');

      emailInput.value = '';
      consentInput.checked = false;
      localStorage.setItem('votePlan.reminderOptIn', 'true');
      status.classList.add('ok');
      status.textContent = 'You’re on the list. Four reminders maximum, then we stop.';
    }catch(error){
      status.classList.add('error');
      status.textContent = 'We could not add the reminder right now. Please try again.';
    }finally{
      button.disabled = false;
      button.innerHTML = 'REMIND ME <span>→</span>';
    }
  });
}
