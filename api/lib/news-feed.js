import { createHash } from 'node:crypto';

export const MAJOR_NEWS_SOURCES = Object.freeze([
  { domain: 'apnews.com', name: 'Associated Press' },
  { domain: 'reuters.com', name: 'Reuters' },
  { domain: 'npr.org', name: 'NPR' },
  { domain: 'pbs.org', name: 'PBS' },
  { domain: 'cnn.com', name: 'CNN' },
  { domain: 'nbcnews.com', name: 'NBC News' },
  { domain: 'cbsnews.com', name: 'CBS News' },
  { domain: 'abcnews.go.com', name: 'ABC News' },
  { domain: 'foxnews.com', name: 'Fox News' },
  { domain: 'nytimes.com', name: 'The New York Times' },
  { domain: 'washingtonpost.com', name: 'The Washington Post' },
  { domain: 'wsj.com', name: 'The Wall Street Journal' },
  { domain: 'bloomberg.com', name: 'Bloomberg' },
  { domain: 'cnbc.com', name: 'CNBC' },
  { domain: 'politico.com', name: 'POLITICO' },
  { domain: 'axios.com', name: 'Axios' },
  { domain: 'thehill.com', name: 'The Hill' },
  { domain: 'bbc.com', name: 'BBC' },
  { domain: 'bbc.co.uk', name: 'BBC' }
]);

export const NEWS_SECTIONS = Object.freeze(['top', 'politics', 'elections', 'economy', 'world']);

const SECTION_QUERIES = Object.freeze({
  top: '',
  politics: '(politics OR congress OR senate OR "white house" OR government)',
  elections: '(election OR elections OR voting OR ballot OR campaign OR poll)',
  economy: '(economy OR inflation OR jobs OR markets OR tariffs OR "interest rates")',
  world: '(world OR international OR war OR diplomacy OR foreign)'
});

const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref', 'ref_src', 'cmpid'
]);

function sourceClause() {
  return `(${MAJOR_NEWS_SOURCES.map(({ domain }) => `domainis:${domain}`).join(' OR ')})`;
}

export function buildGdeltUrl(section = 'top', { maxRecords = 40, timespan = '12h' } = {}) {
  const safeSection = NEWS_SECTIONS.includes(section) ? section : 'top';
  const query = [SECTION_QUERIES[safeSection], sourceClause()].filter(Boolean).join(' ');
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: String(Math.max(1, Math.min(Number(maxRecords) || 40, 100))),
    timespan,
    sort: 'datedesc',
    format: 'json'
  });
  return `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;
}

function parseGdeltDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();

  const compact = String(value).match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/);
  if (compact) {
    const [, year, month, day, hour, minute, second] = compact;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeDomain(value, url) {
  const candidate = String(value || '').trim().toLowerCase().replace(/^www\./, '');
  if (candidate) return candidate;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function sourceName(domain) {
  const match = MAJOR_NEWS_SOURCES.find((source) => domain === source.domain || domain.endsWith(`.${source.domain}`));
  if (match) return match.name;
  return domain || 'Unknown source';
}

export function canonicalizeStoryUrl(value) {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.hash = '';
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return String(value || '').trim();
  }
}

export function normalizeGdeltArticle(article = {}, category = 'top') {
  const rawUrl = article.url || article.external_url || article.id || '';
  const url = canonicalizeStoryUrl(rawUrl);
  const title = String(article.title || article.headline || '').trim();
  const domain = normalizeDomain(article.domain || article.source?.domain, url);
  const publishedAt = parseGdeltDate(article.seendate || article.date || article.date_published || article.publishedAt);
  const image = article.socialimage || article.image || article.image_url || null;
  const stable = `${url}|${title}|${publishedAt || ''}`;

  return {
    id: createHash('sha1').update(stable).digest('hex'),
    title,
    url,
    source: sourceName(domain),
    domain,
    category: NEWS_SECTIONS.includes(category) ? category : 'top',
    publishedAt,
    image: image || null,
    sourceCountry: article.sourcecountry || article.source_country || null,
    language: article.language || article.lang || null
  };
}

function dedupeKey(story) {
  const url = canonicalizeStoryUrl(story.url || '');
  if (url) return `url:${url.toLowerCase()}`;
  return `title:${String(story.source || '').toLowerCase()}|${String(story.title || '').toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

export function dedupeStories(stories = []) {
  const seen = new Set();
  const out = [];
  for (const story of stories) {
    if (!story || !story.title || !story.url) continue;
    const key = dedupeKey(story);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(story);
  }
  return out;
}

function extractArticles(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.articles)) return value.articles;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

export function normalizeNewsPayload(sectionPayloads = {}, now = new Date()) {
  const sections = {};
  const sourceStatus = {};
  let liveSections = 0;
  let failedSections = 0;

  for (const section of NEWS_SECTIONS) {
    const payload = sectionPayloads[section];
    if (payload instanceof Error) {
      sections[section] = [];
      sourceStatus[section] = 'unavailable';
      failedSections += 1;
      continue;
    }

    const normalized = dedupeStories(extractArticles(payload).map((article) => normalizeGdeltArticle(article, section)));
    sections[section] = normalized;
    sourceStatus[section] = 'live';
    if (normalized.length) liveSections += 1;
  }

  let status = 'live';
  if (failedSections > 0) status = 'degraded';
  else if (liveSections === 0) status = 'data_pending';

  return {
    status,
    generatedAt: now.toISOString(),
    provider: 'GDELT DOC 2.0',
    sections,
    sourceStatus,
    sourceCount: MAJOR_NEWS_SOURCES.length
  };
}

async function fetchJson(url, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json', 'user-agent': 'LGVTT-Major-News/1.0' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`GDELT HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMajorNews({
  fetchImpl = fetch,
  maxRecords = 40,
  timespan = '12h',
  timeoutMs = 4500,
  now = new Date()
} = {}) {
  const entries = await Promise.all(NEWS_SECTIONS.map(async (section) => {
    try {
      const payload = await fetchJson(buildGdeltUrl(section, { maxRecords, timespan }), fetchImpl, timeoutMs);
      return [section, payload];
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[news-feed] ${section}: ${normalizedError.name}: ${normalizedError.message}`);
      return [section, normalizedError];
    }
  }));

  return normalizeNewsPayload(Object.fromEntries(entries), now);
}
