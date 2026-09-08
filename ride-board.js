const RIDE_RESOURCE_ENDPOINT = 'https://zxmdfmiueapjhktqchts.supabase.co/functions/v1/lgvtt-ride-resource-submit';

const rideForm = document.querySelector('#rideResourceForm');
const rideResult = document.querySelector('#rideResourceResult');

rideForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = rideForm.querySelector('button[type="submit"]');
  const data = new FormData(rideForm);
  const payload = {
    resource_name: String(data.get('resource_name') || '').trim(),
    coverage_area: String(data.get('coverage_area') || '').trim(),
    source_url: String(data.get('source_url') || '').trim(),
    resource_type: String(data.get('resource_type') || '').trim(),
    contact_email: String(data.get('contact_email') || '').trim(),
    details: String(data.get('details') || '').trim()
  };

  rideResult.textContent = 'Sending for verification…';
  submitButton.disabled = true;

  try {
    const response = await fetch(RIDE_RESOURCE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      if (response.status === 429) throw new Error('Too many submissions from this network right now. Please try again later.');
      if (result.error === 'invalid_submission') throw new Error('Please check the fields and make sure the source is a valid web address.');
      throw new Error('The submission could not be saved right now.');
    }

    rideForm.reset();
    rideResult.textContent = 'Received. We’ll verify the source before anything appears on the public Ride Board.';
    window.lgvttTrack?.('ride_resource_submit_success');
  } catch (error) {
    rideResult.textContent = error?.message || 'The submission could not be saved right now.';
  } finally {
    submitButton.disabled = false;
  }
});

window.lgvttTrack?.('ride_board_open');
