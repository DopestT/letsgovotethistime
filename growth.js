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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => track('page_view'), { once: true });
  } else {
    track('page_view');
  }

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

    if (target instanceof HTMLAnchorElement) {
      const href = target.href || '';
      if (href.includes('/partner-kit')) track('partner_kit_open');
      else if (href.includes('uber.com')) track('ride_provider_click', { provider: 'uber' });
      else if (href.includes('lyft.com')) track('ride_provider_click', { provider: 'lyft' });
    }
  }, { passive: true });
})();
