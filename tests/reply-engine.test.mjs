import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNotification, stripHtml, trimQuotedHistory } from '../api/reply-engine.js';

test('stripHtml preserves useful line breaks and text', () => {
  const value = stripHtml('<p>Hello <strong>team</strong>.</p><p>Please send the pilot cities.</p>');
  assert.match(value, /Hello team\./);
  assert.match(value, /Please send the pilot cities\./);
});

test('trimQuotedHistory removes a common quoted thread', () => {
  const value = trimQuotedHistory(`Thanks — we are interested. Please send projected volume.\n\nOn Fri, Sep 4, 2026 at 2:00 PM Team wrote:\n> Our proposal says we can fund 5,000 rides.`);
  assert.equal(value, 'Thanks — we are interested. Please send projected volume.');
  assert.doesNotMatch(value, /5,000 rides/);
});

test('trimQuotedHistory removes Original Message blocks', () => {
  const value = trimQuotedHistory(`Not a fit this cycle.\n\n-----Original Message-----\nFrom: Partner Team\nSent: Friday`);
  assert.equal(value, 'Not a fit this cycle.');
});

test('formatNotification is concise and action oriented', () => {
  const summary = {
    organization: 'Example Mobility',
    stance: 'interested',
    priority: 'high',
    summary: 'Interested in a city pilot and wants projected ride volume.',
    asks: ['pilot cities', 'projected ride volume'],
    commitments: [],
    next_action: 'Send the one-page pilot brief and offer two meeting times',
    deadline: null,
    meeting_requested: true
  };
  const email = { from: 'Jordan <jordan@example.com>' };
  const value = formatNotification(summary, email);
  assert.match(value, /PARTNER REPLY — Example Mobility/);
  assert.match(value, /INTERESTED · HIGH PRIORITY/);
  assert.match(value, /ASKS: pilot cities; projected ride volume/);
  assert.match(value, /MEETING: Requested/);
});
