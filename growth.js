(() => {
  const ENDPOINT = 'https://zxmdfmiueapjhktqchts.supabase.co/functions/v1/lgvtt-track';
  const params = new URLSearchParams(window.location.search);
  const base = {
    path: window.location.pathname,
    partner: params.get('partner'),
    source: params.get('utm_source') || (document.referrer ? 'referral' : 'direct'),
    medium: params.get('utm_medium') || (document.referrer ? 'referral' : 'website'),
    campaign: params.get('utm_campaign') || null,
    content: params.get('utm_content') || null
  };

  const attributionKeys = ['partner', 'utm_source', 'utm_medium', 'utm_campaign'];
  const attribution = Object.fromEntries(
    attributionKeys
      .map((key) => [key, params.get(key)])
      .filter(([, value]) => typeof value === 'string' && value.trim())
  );

  const sessionFacts = [
    {
      label: 'EARLY VOTING',
      text: 'Early-voting dates, hours and locations vary by state and local jurisdiction. Verify the current dates before you go.',
      href: '/voter-guide',
      cta: 'CHECK MY STATE →'
    },
    {
      label: 'MAIL BALLOTS',
      text: 'Depending on local rules, a mail ballot may be returned by mail, at an authorized drop box, or directly to an election office. Check the deadline and return rules first.',
      href: '/voter-guide',
      cta: 'CHECK RETURN RULES →'
    },
    {
      label: 'POLLING PLACE',
      text: 'Your voting location can change. Confirm your address-specific polling place with an official source before leaving home.',
      href: '/voter-guide',
      cta: 'VERIFY LOCATION →'
    },
    {
      label: 'SEE SOMETHING? SAY SOMETHING.',
      text: 'If you see intimidation, misleading voting instructions, obstruction, or conduct that appears to interfere with voting, document what happened and report it through the proper channel.',
      href: '/report-election-problem',
      cta: 'HOW TO REPORT →'
    },
    {
      label: 'DOCUMENT FIRST',
      text: 'Save the date, time, location, screenshots, links and exact words or conduct you observed. Avoid confrontation and avoid publishing an accusation before it is verified.',
      href: '/report-election-problem',
      cta: 'REPORTING GUIDE →'
    },
    {
      label: 'IMMEDIATE THREAT',
      text: 'If there is an immediate threat of violence or danger at a voting location, call 911 first. Voting-rights concerns can also be reported through Election Protection or DOJ channels.',
      href: '/report-election-problem',
      cta: 'GET REPORTING INFO →'
    },
    {
      label: 'LAW ENFORCEMENT / ICE',
      text: 'The presence of law-enforcement or immigration-enforcement personnel is not, by itself, proof of misconduct. If specific conduct appears to intimidate voters or interfere with access, document the facts and report them.',
      href: '/report-election-problem',
      cta: 'SEE REPORTING STEPS →'
    }
  ];

  function trim(value, max) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
  }

  function track(eventName, extra = {}) {
    const payload = {
      event_name: eventName,
      path: base.path,
      partner: trim(base.partner, 80),
      source: trim(base.source, 80),
      medium: trim(base.medium, 80),
      campaign: trim(base.campaign, 120),
      content: trim(extra.content || base.content, 120),
      provider: trim(extra.provider, 40)
    };

    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit',
        keepalive: true
      }).catch(() => {});
    } catch (_) {}
  }

  window.lgvttTrack = track;

  function preserveAttributionAcrossInternalLinks() {
    if (!Object.keys(attribution).length) return;

    document.querySelectorAll('a[href]').forEach((anchor) => {
      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;

      try {
        const url = new URL(rawHref, window.location.href);
        if (url.origin !== window.location.origin) return;

        Object.entries(attribution).forEach(([key, value]) => {
          if (!url.searchParams.has(key)) url.searchParams.set(key, value);
        });

        anchor.href = url.toString();
      } catch (_) {}
    });
  }

  function installSessionFacts() {
    if (!document.body || document.querySelector('#lgvttSessionFact')) return;

    const style = document.createElement('style');
    style.textContent = `
      #lgvttSessionFact{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:min(390px,calc(100vw - 28px));background:#07110d;color:#fff;border:1px solid #50ef9b;box-shadow:7px 7px 0 rgba(0,0,0,.25);font-family:DM Sans,system-ui,-apple-system,sans-serif;transition:transform .22s ease,opacity .22s ease}
      #lgvttSessionFact .sf-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid #345044;background:#0d1b15}
      #lgvttSessionFact .sf-kicker{font-size:10px;font-weight:900;letter-spacing:.1em;color:#50ef9b}
      #lgvttSessionFact .sf-count{font-size:10px;color:#aebdb5;font-weight:800}
      #lgvttSessionFact .sf-body{padding:15px 16px 16px}
      #lgvttSessionFact .sf-label{font:800 18px/1 Space Grotesk,DM Sans,sans-serif;letter-spacing:-.02em;margin:0 0 9px}
      #lgvttSessionFact .sf-text{font-size:13px;line-height:1.48;color:#d2dad5;margin:0 0 13px}
      #lgvttSessionFact .sf-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}
      #lgvttSessionFact .sf-link{display:inline-flex;align-items:center;min-height:34px;padding:0 10px;background:#50ef9b;color:#07110d;text-decoration:none;font-size:10px;font-weight:900;letter-spacing:.04em;border:1px solid #50ef9b}
      #lgvttSessionFact .sf-next{min-width:34px;height:34px;background:transparent;color:#fff;border:1px solid #52685d;font-size:18px;cursor:pointer}
      #lgvttSessionFact.sf-change{opacity:.35;transform:translateY(5px)}
      @media(max-width:700px){#lgvttSessionFact{right:14px;bottom:74px;width:calc(100vw - 28px);box-shadow:5px 5px 0 rgba(0,0,0,.25)}#lgvttSessionFact .sf-body{padding:13px 14px 14px}#lgvttSessionFact .sf-text{font-size:12px}}
      @media(prefers-reduced-motion:reduce){#lgvttSessionFact{transition:none}}
    `;
    document.head.appendChild(style);

    const panel = document.createElement('aside');
    panel.id = 'lgvttSessionFact';
    panel.setAttribute('aria-label', 'Voting fact');
    panel.innerHTML = `
      <div class="sf-top"><span class="sf-kicker">VOTER FACT · WHILE YOU'RE HERE</span><span class="sf-count" id="sfCount"></span></div>
      <div class="sf-body" aria-live="polite">
        <div class="sf-label" id="sfLabel"></div>
        <p class="sf-text" id="sfText"></p>
        <div class="sf-actions"><a class="sf-link" id="sfLink" href="/voter-guide"></a><button class="sf-next" id="sfNext" type="button" aria-label="Show next voter fact">›</button></div>
      </div>`;
    document.body.appendChild(panel);

    let index = Number(sessionStorage.getItem('lgvtt_fact_index'));
    if (!Number.isFinite(index)) index = 0;
    index = ((index % sessionFacts.length) + sessionFacts.length) % sessionFacts.length;

    const render = (nextIndex, animate = true) => {
      index = ((nextIndex % sessionFacts.length) + sessionFacts.length) % sessionFacts.length;
      const fact = sessionFacts[index];
      const apply = () => {
        panel.querySelector('#sfLabel').textContent = fact.label;
        panel.querySelector('#sfText').textContent = fact.text;
        panel.querySelector('#sfLink').textContent = fact.cta;
        panel.querySelector('#sfLink').href = fact.href;
        panel.querySelector('#sfCount').textContent = `${index + 1}/${sessionFacts.length}`;
        sessionStorage.setItem('lgvtt_fact_index', String(index));
        panel.classList.remove('sf-change');
      };
      if (animate) {
        panel.classList.add('sf-change');
        window.setTimeout(apply, 170);
      } else apply();
    };

    render(index, false);
    panel.querySelector('#sfNext').addEventListener('click', () => render(index + 1));

    window.setInterval(() => {
      if (!document.hidden) render(index + 1);
    }, 22000);
  }

  function start() {
    preserveAttributionAcrossInternalLinks();
    installSessionFacts();
    track('page_view');

    const reminderStatus = document.querySelector('#reminderStatus');
    if (reminderStatus) {
      let reminderTracked = false;
      const observer = new MutationObserver(() => {
        if (!reminderTracked && reminderStatus.classList.contains('ok') && reminderStatus.textContent.includes('You’re on the list')) {
          reminderTracked = true;
          track('reminder_signup_success');
        }
      });
      observer.observe(reminderStatus, { childList: true, characterData: true, subtree: true, attributes: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('a,button') : null;
    if (!target) return;

    if (target.id === 'lookupButton') {
      track('official_lookup_click');
      return;
    }

    if (target.id === 'shareButton') {
      track('share_plan');
      return;
    }

    if (target instanceof HTMLButtonElement && target.dataset.mode) {
      track('route_plan_click', { content: target.dataset.mode });
      return;
    }

    if (target instanceof HTMLAnchorElement) {
      const url = new URL(target.href, window.location.href);
      const href = target.href || '';

      if (url.origin === window.location.origin) {
        if (url.pathname === '/partner-kit' || url.pathname === '/partner-kit.html') track('partner_kit_open');
        else if (url.pathname === '/ride-board' || url.pathname === '/ride-board.html') track('ride_board_open_from_site');
        else if (url.pathname === '/voting-map' || url.pathname === '/voting-map.html') track('voting_map_open');
        else if (url.pathname === '/check-in' || url.pathname === '/check-in.html') track('check_in_open');
      } else if (href.includes('uber.com')) {
        track('ride_provider_click', { provider: 'uber' });
      } else if (href.includes('lyft.com')) {
        track('ride_provider_click', { provider: 'lyft' });
      }
    }
  }, { passive: true });
})();
