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

  function start() {
    preserveAttributionAcrossInternalLinks();
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
