import OpenAI from 'openai';
import { Resend } from 'resend';
import twilio from 'twilio';

export const config = { api: { bodyParser: false } };

const MAX_BODY_CHARS = 24000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export function stripHtml(html = '') {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanBody(email) {
  const source = email.text?.trim() || stripHtml(email.html || '');
  return source.slice(0, MAX_BODY_CHARS);
}

function getHeader(headers = {}, name) {
  const wanted = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === wanted);
  return entry?.[1] || null;
}

function buildThreadKey(email) {
  const inReplyTo = getHeader(email.headers, 'in-reply-to');
  const references = getHeader(email.headers, 'references');
  return inReplyTo || references || email.message_id || email.id;
}

const summarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'organization',
    'contact_name',
    'stance',
    'priority',
    'summary',
    'asks',
    'commitments',
    'next_action',
    'deadline',
    'meeting_requested',
    'needs_human_reply',
    'sentiment',
    'confidence'
  ],
  properties: {
    organization: { type: ['string', 'null'] },
    contact_name: { type: ['string', 'null'] },
    stance: {
      type: 'string',
      enum: ['interested', 'needs_info', 'not_now', 'declined', 'auto_reply', 'unclear']
    },
    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
    summary: { type: 'string' },
    asks: { type: 'array', items: { type: 'string' } },
    commitments: { type: 'array', items: { type: 'string' } },
    next_action: { type: 'string' },
    deadline: { type: ['string', 'null'] },
    meeting_requested: { type: 'boolean' },
    needs_human_reply: { type: 'boolean' },
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'mixed'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 }
  }
};

async function summarizeReply(email, body) {
  const client = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });
  const model = process.env.SUMMARY_MODEL || 'gpt-5.6-luna';

  const response = await client.responses.create({
    model,
    store: false,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text:
              'You summarize replies to nonpartisan voting-access partnership outreach. Be literal and conservative. Never invent interest, commitments, deadlines, organizations, names, or requested actions. Separate what the sender actually committed to from what they merely mentioned. Mark automated replies as auto_reply. The next_action must be the smallest concrete action needed from our team. Keep summary concise and useful for an executive SMS alert.'
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `FROM: ${email.from || ''}\nSUBJECT: ${email.subject || ''}\nRECEIVED: ${email.created_at || ''}\n\nREPLY BODY:\n${body}`
          }
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'partner_reply_summary',
        strict: true,
        schema: summarySchema
      }
    }
  });

  return JSON.parse(response.output_text);
}

export function formatNotification(summary, email) {
  const org = summary.organization || email.from || 'Unknown sender';
  const asks = summary.asks.length ? summary.asks.slice(0, 3).join('; ') : 'None stated';
  const deadline = summary.deadline ? `\nDEADLINE: ${summary.deadline}` : '';
  const meeting = summary.meeting_requested ? '\nMEETING: Requested' : '';

  return [
    `PARTNER REPLY — ${org}`,
    `${summary.stance.toUpperCase()} · ${summary.priority.toUpperCase()} PRIORITY`,
    summary.summary,
    `ASKS: ${asks}`,
    `NEXT: ${summary.next_action}${deadline}${meeting}`,
    `FROM: ${email.from || 'unknown'}`
  ].join('\n');
}

async function sendNotification(summary, email, resend) {
  const text = formatNotification(summary, email);

  const hasSms =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER &&
    process.env.SUMMARY_NOTIFY_PHONE;

  if (hasSms) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const result = await client.messages.create({
      body: text,
      from: process.env.TWILIO_FROM_NUMBER,
      to: process.env.SUMMARY_NOTIFY_PHONE
    });
    return { channel: 'sms', id: result.sid };
  }

  if (process.env.SUMMARY_NOTIFY_EMAIL) {
    const from = process.env.SUMMARY_FROM_EMAIL || 'Partner Reply Engine <onboarding@resend.dev>';
    const { data, error } = await resend.emails.send({
      from,
      to: process.env.SUMMARY_NOTIFY_EMAIL,
      subject: `Partner reply: ${summary.organization || email.from || email.subject || 'new reply'}`,
      text
    });
    if (error) throw error;
    return { channel: 'email', id: data?.id || null };
  }

  console.log(text);
  return { channel: 'log', id: null };
}

async function persistSummary({ email, summary, threadKey, notification }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { stored: false };

  const payload = {
    resend_email_id: email.id,
    message_id: email.message_id || null,
    thread_key: threadKey,
    sender: email.from || null,
    subject: email.subject || null,
    received_at: email.created_at || new Date().toISOString(),
    stance: summary.stance,
    priority: summary.priority,
    organization: summary.organization,
    summary,
    notification_channel: notification.channel,
    notification_id: notification.id
  };

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/partner_reply_summaries`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase insert failed: ${response.status} ${detail}`);
  }

  return { stored: true };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'partner-reply-engine',
      receives: 'Resend email.received webhooks',
      notification: process.env.SUMMARY_NOTIFY_PHONE ? 'sms' : process.env.SUMMARY_NOTIFY_EMAIL ? 'email' : 'log'
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const resend = new Resend(requireEnv('RESEND_API_KEY'));
    const payload = await readRawBody(req);

    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers['svix-id'],
        timestamp: req.headers['svix-timestamp'],
        signature: req.headers['svix-signature']
      },
      webhookSecret: requireEnv('RESEND_WEBHOOK_SECRET')
    });

    if (event.type !== 'email.received') {
      return res.status(200).json({ ok: true, ignored: event.type });
    }

    const { data: email, error } = await resend.emails.receiving.get(event.data.email_id);
    if (error || !email) throw error || new Error('Unable to retrieve received email');

    const body = cleanBody(email);
    if (!body) return res.status(200).json({ ok: true, skipped: 'empty-body' });

    const summary = await summarizeReply(email, body);
    const threadKey = buildThreadKey(email);
    const notification = await sendNotification(summary, email, resend);
    const storage = await persistSummary({ email, summary, threadKey, notification });

    return res.status(200).json({
      ok: true,
      email_id: email.id,
      thread_key: threadKey,
      stance: summary.stance,
      priority: summary.priority,
      notification: notification.channel,
      stored: storage.stored
    });
  } catch (error) {
    console.error('partner-reply-engine error', error);
    return res.status(500).json({ ok: false, error: 'Reply processing failed' });
  }
}
