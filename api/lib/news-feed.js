import { createHash } from 'node:crypto';

export const NEWS_SECTIONS = Object.freeze(['top', 'politics', 'elections', 'economy', 'world']);

const CLASSIFIERS = Object.freeze({
  politics: /\b(politics|political|congress|senate|senator|house of representatives|white house|administration|governor|government|supreme court|president|trump|democrat|democratic|republican|gop)\b/i,
  elections: /\b(election|elections|electoral|voting|vote|voter|voters|ballot|ballots|campaign|campaigns|poll|polling|primary|primaries|midterm|midterms|candidate|candidates)\b/i,
  economy: /\b(economy|economic|inflation|jobs|employment|unemployment|federal reserve|\bfed\b|interest rate|interest rates|markets|market|stocks|tariff|tariffs|trade|gdp|prices|recession|wages)\b/i,
  world: /\b(ukraine|russia|russian|china|chinese|israel|israeli|gaza|iran|iranian|europe|european|nato|united nations|war|ceasefire|diplomacy|diplomatic|foreign|international|middle east|asia|africa|latin america|mexico|canada|britain|uk|france|germany|japan|india)\b/i
});

const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref', 'ref_src', 'cmpid'
]);

const GOOGLE_NEWS_PARAMS = 'hl=en-US&gl=US&ceid=US:en';

export function buildGoogleNewsFeedUrls() {
  const electionQuery = encodeURIComponent('(election OR voting OR ballot OR campaign OR poll OR Congress OR Senate OR "White House") when:1d');
  return [
    { key: 'top', url: `https://news.google.com/rss?${GOOGLE_NEWS_PARAMS}` },
    { key: 'nation', url: `https://news.google.com/rss/headlines/section/topic/NATION?${GOOGLE_NEWS_PARAMS}` },
    { key: 'world', url: `https://news.google.com/rss/headlines/section/topic/WORLD?${GOOGLE_NEWS_PARAMS}` },
    { key: 'business', url: `https://news.google.com/rss/headlines/section/topic/BUSINESS?${GOOGLE_NEWS_PARAMS}` },
    { key: 'elections', url: `https://news.google.com/rss/search?q=${electionQuery}&${GOOGLE_NEWS_PARAMS}` }
  ];
}

function decodeXml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function tagValue(block, tag) {
  const match = String(block).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function sourceValue(block) {
  const match = String(block).match(/<source\b([^>]*)>([\s\S]*?)<\/source>/i);
  if (!match) return { name: '', url: '' };
  const urlMatch = match[1].match(/\burl=["']([^"']+)["']/i);
  return {
    name: decodeXml(match[2]),
    url: decodeXml(urlMatch?.[1] || '')
  };
}

function domainFromUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function cleanGoogleTitle(title, source) {
  const value = decodeXml(title);
  if (!source) return value;
  const suffix = ` - ${source}`;
  return value.endsWith(suffix) ? value.slice(0, -suffix.length).trim() : value;
}

export function parseGoogleNewsRss(xml, category = 'top') {
  const items = [...String(xml || '').matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  return dedupeStories(items.map((match) => {
    const block = match[1];
    const source = sourceValue(block);
    const url = canonicalizeStoryUrl(tagValue(block, 'link'));
    const rawTitle = tagValue(block, 'title');
    const title = cleanGoogleTitle(rawTitle, source.name);
    const guid = tagValue(block, 'guid');
    const published = tagValue(block, 'pubDate');
    const publishedDate = published ? new Date(published) : null;
    const publishedAt = publishedDate && !Number.isNaN(publishedDate.getTime()) ? publishedDate.toISOString() : null;
    const stable = `${url}|${title}|${publishedAt || ''}`;

    return {
      id: guid || createHash('sha1').update(stable).digest('hex'),
      title,
      url,
      source: source.name || 'Unknown publisher',
      domain: domainFromUrl(source.url),
      publisherUrl: source.url || null,
      category: NEWS_SECTIONS.includes(category) ? category : 'top',
      publishedAt,
      image: null
    };
  }));
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

function dedupeKey(story) {
  if (story?.id) return `id:${String(story.id).toLowerCase()}`;
  const url = canonicalizeStoryUrl(story?.url || '');
  if (url) return `url:${url.toLowerCase()}`;
  return `title:${String(story?.source || '').toLowerCase()}|${String(story?.title || '').toLowerCase().replace(/\s+/g, ' ').trim()}`;
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

function newestFirst(a, b) {
  const aTime = a?.publishedAt ? Date.parse(a.publishedAt) : 0;
  const bTime = b?.publishedAt ? Date.parse(b.publishedAt) : 0;
  return bTime - aTime;
}

export function classifyStories(stories = []) {
  const top = dedupeStories(stories).sort(newestFirst);
  const sections = { top };
  for (const section of NEWS_SECTIONS.filter((name) => name !== 'top')) {
    const classifier = CLASSIFIERS[section];
    sections[section] = top.filter((story) => classifier.test(`${story.title || ''} ${story.domain || ''}`));
  }
  return sections;
}

async function fetchText(url, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'user-agent': 'Mozilla/5.0 (compatible; LGVTT-Major-News/1.0; +https://letsgovotethistime.com/news)'
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Google News RSS HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function sectionSourceStatus(feedStatus) {
  const anyLive = Object.values(feedStatus).some((status) => status === 'live');
  return {
    top: anyLive ? 'live' : 'unavailable',
    politics: feedStatus.nation === 'live' || feedStatus.elections === 'live' || feedStatus.top === 'live' ? 'live' : 'unavailable',
    elections: feedStatus.elections === 'live' || feedStatus.nation === 'live' ? 'live' : 'unavailable',
    economy: feedStatus.business === 'live' || feedStatus.top === 'live' ? 'live' : 'unavailable',
    world: feedStatus.world === 'live' || feedStatus.top === 'live' ? 'live' : 'unavailable'
  };
}

export async function fetchMajorNews({
  fetchImpl = fetch,
  maxRecords = 50,
  timeoutMs = 6000,
  now = new Date()
} = {}) {
  const feeds = buildGoogleNewsFeedUrls();
  const results = await Promise.all(feeds.map(async (feed) => {
    try {
      const xml = await fetchText(feed.url, fetchImpl, timeoutMs);
      return { key: feed.key, status: 'live', stories: parseGoogleNewsRss(xml, 'top') };
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[news-feed] ${feed.key}: ${normalizedError.name}: ${normalizedError.message}`);
      return { key: feed.key, status: 'unavailable', stories: [] };
    }
  }));

  const byKey = Object.fromEntries(results.map((result) => [result.key, result]));
  const feedStatus = Object.fromEntries(results.map((result) => [result.key, result.status]));
  const combined = dedupeStories(results.flatMap((result) => result.stories)).sort(newestFirst);
  const limit = Math.max(1, Math.min(Number(maxRecords) || 50, 100));
  const classified = classifyStories(combined.slice(0, Math.max(limit, 50)));

  classified.top = combined.slice(0, limit);
  classified.world = dedupeStories([
    ...(byKey.world?.stories || []),
    ...classified.world
  ]).sort(newestFirst).slice(0, limit);
  classified.economy = dedupeStories([
    ...(byKey.business?.stories || []),
    ...classified.economy
  ]).sort(newestFirst).slice(0, limit);
  classified.elections = dedupeStories([
    ...(byKey.elections?.stories || []),
    ...classified.elections
  ]).sort(newestFirst).slice(0, limit);
  classified.politics = dedupeStories(classified.politics).slice(0, limit);

  const liveFeeds = results.filter((result) => result.status === 'live').length;
  const failedFeeds = results.length - liveFeeds;
  const status = combined.length === 0
    ? (failedFeeds > 0 ? 'degraded' : 'data_pending')
    : (failedFeeds > 0 ? 'degraded' : 'live');
  const uniqueSources = new Set(combined.map((story) => story.source).filter(Boolean));

  return {
    status,
    generatedAt: now.toISOString(),
    provider: 'Google News RSS',
    sections: classified,
    sourceStatus: sectionSourceStatus(feedStatus),
    feedStatus,
    sourceCount: uniqueSources.size
  };
}
