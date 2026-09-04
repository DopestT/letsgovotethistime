# Partner Reply Intelligence Engine

## Purpose

Turn inbound partnership replies into decision-ready notifications.

Flow:

1. Outreach is sent from a reply-capable partner address.
2. A reply reaches Resend Receiving.
3. Resend sends a signed `email.received` webhook to `/api/reply-engine`.
4. The engine verifies the webhook signature before doing any work.
5. The engine retrieves the full received email body from Resend.
6. The reply is summarized into a strict structured record.
7. The engine sends the executive summary by SMS when Twilio is configured; otherwise it can send a summary email.
8. The structured summary and thread metadata can be stored in Supabase. Raw email body content is not copied into the database.

## Notification format

Example:

```text
PARTNER REPLY — Lyft
INTERESTED · HIGH PRIORITY
Interested in discussing a pilot and wants projected ride volume before scheduling.
ASKS: pilot cities; projected ride volume
NEXT: send the one-page pilot brief and offer two meeting times
MEETING: Requested
FROM: Name <person@example.com>
```

The engine is intentionally conservative. It must not turn polite language into a commitment.

## Classification

`stance`

- `interested`
- `needs_info`
- `not_now`
- `declined`
- `auto_reply`
- `unclear`

`priority`

- `high` — time-sensitive, meeting requested, material commitment, or concrete next step
- `medium` — substantive reply that requires follow-up
- `low` — auto-reply, decline, non-actionable response, or low-information response

## Required environment variables

```text
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
OPENAI_API_KEY=
```

Optional model override:

```text
SUMMARY_MODEL=gpt-5.6-luna
```

### SMS notification

```text
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
SUMMARY_NOTIFY_PHONE=
```

### Email notification fallback

```text
SUMMARY_NOTIFY_EMAIL=
SUMMARY_FROM_EMAIL=
```

### Supabase persistence

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Run `docs/reply-engine.sql` in the target Supabase project before enabling persistence.

## Resend configuration

Use a dedicated inbound partner address or receiving domain. Register:

```text
POST https://<production-host>/api/reply-engine
```

for the `email.received` event.

Copy the webhook signing secret into `RESEND_WEBHOOK_SECRET`.

For clean reply matching, outbound partnership emails should use the same reply-capable system so the standard `Message-ID`, `In-Reply-To`, and `References` headers remain available to the engine.

## Privacy

The engine intentionally stores only metadata and the structured summary in Supabase. Raw email bodies remain in the email provider rather than being duplicated into the application database.

The OpenAI Responses call uses `store: false`.

Do not include political affiliation, candidate preference, intended vote, or voter profiling information in this partnership inbox workflow.

## Failure behavior

- Invalid webhook signature: reject request.
- Non-`email.received` event: acknowledge and ignore.
- Empty body: acknowledge and skip.
- Model or notification failure: return failure so the provider can retry the webhook.
- Duplicate provider delivery: Supabase's unique `resend_email_id` prevents duplicate stored records.
- No notification destination configured: summary is logged, which is suitable only for setup/testing.

## Acceptance tests before production

1. Valid plain-text reply → summary + notification.
2. HTML-only reply → readable summary.
3. Automated out-of-office reply → `auto_reply` and low priority.
4. Clear rejection → `declined`; engine must not invent a next meeting.
5. Interested reply with specific questions → questions extracted into `asks`.
6. Meeting request with a date → `meeting_requested=true` and deadline/date captured when explicit.
7. Duplicate webhook replay → no duplicate database record.
8. Invalid webhook signature → rejected.
9. Reply containing quoted prior thread → summary focuses on the new sender response and does not mistake our own earlier pitch for their commitment.
10. SMS unavailable but notification email configured → email fallback works.
11. Neither SMS nor email configured → logs only and is visibly marked as test/setup state.
12. Health check `GET /api/reply-engine` exposes no credentials.
