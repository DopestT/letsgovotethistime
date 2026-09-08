// Reserved adapter for future official polling-place feed integration.
// This file intentionally contains no polling-place data. Exact locations remain
// sourced from official election systems and will be rendered only after a
// verified provider feed is connected.
window.LGVTTOfficialMapAdapter = {
  provider: 'pending_verified_feed',
  exactPollingPlacesEnabled: false,
  note: 'Exact polling-place pins require a verified official data feed.'
};
