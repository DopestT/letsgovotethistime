import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGdeltUrl,
  classifyStories,
  dedupeStories,
  fetchMajorNews,
  normalizeGdeltArticle,
  normalizeNewsPayload
} from '../api/lib/news-feed.js';

test('normalizeGdeltArticle preserves source, link, title, image, and timestamp', () => {
  const article = normalizeGdeltArticle({
    url: 'https://www.reuters.com/world/example',
    title: 'Example headline',
    domain: 'reuters.com',
    seendate: '20261005T035500Z',
    socialimage: 'https://example.com/image.jpg',
    sourcecountry: 'United States',
    language: 'English'
  }, 'top');

  assert.equal(article.title, 'Example headline');
  assert.equal(article.url, 'https://www.reuters.com/world/example');
  assert.equal(article.source, 'Reuters');
  assert.equal(article.domain, 'reuters.com');
  assert.equal(article.category, 'top');
  assert.equal(article.image, 'https://example.com/image.jpg');
  assert.match(article.publishedAt, /^2026-10-05T03:55:00/);
});

test('dedupeStories collapses tracking variants of the same canonical URL', () => {
  const rows = [
    { id: 'a', url: 'https://apnews.com/article/example?utm_source=x', title: 'Headline', source: 'AP' },
    { id: 'b', url: 'https://apnews.com/article/example?utm_source=y', title: 'Headline', source: 'AP' }
  ];
  const deduped = dedupeStories(rows);
  assert.equal(deduped.length, 1);
});

test('buildGdeltUrl restricts top feed to the curated major-source set', () => {
  const url = buildGdeltUrl('top', { maxRecords: 50, timespan: '12h' });
  assert.match(url, /api\.gdeltproject\.org/);
  assert.match(url, /domainis%3Aapnews\.com/i);
  assert.match(url, /domainis%3Areuters\.com/i);
  assert.match(url, /domainis%3Anpr\.org/i);
  assert.match(url, /maxrecords=50/i);
  assert.match(url, /timespan=12h/i);
});

test('normalizeNewsPayload keeps sections independent and reports degradation without inventing stories', () => {
  const result = normalizeNewsPayload({
    top: [{ url: 'https://apnews.com/a', title: 'A', domain: 'apnews.com', seendate: '20261005T035500Z' }],
    politics: new Error('upstream failed'),
    elections: []
  }, new Date('2026-10-05T04:00:00Z'));

  assert.equal(result.status, 'degraded');
  assert.equal(result.sections.top.length, 1);
  assert.deepEqual(result.sections.politics, []);
  assert.deepEqual(result.sections.elections, []);
  assert.equal(result.sourceStatus.politics, 'unavailable');
  assert.equal(result.sourceStatus.top, 'live');
});

test('classifyStories maps a single fetched stream into useful news sections', () => {
  const stories = [
    { id: '1', title: 'Senate votes on budget deal', url: 'https://reuters.com/a', source: 'Reuters', domain: 'reuters.com' },
    { id: '2', title: 'Georgia election officials update ballot rules', url: 'https://apnews.com/b', source: 'Associated Press', domain: 'apnews.com' },
    { id: '3', title: 'Federal Reserve holds interest rates steady', url: 'https://cnbc.com/c', source: 'CNBC', domain: 'cnbc.com' },
    { id: '4', title: 'Ukraine peace talks resume', url: 'https://bbc.com/d', source: 'BBC', domain: 'bbc.com' }
  ];

  const sections = classifyStories(stories);
  assert.equal(sections.top.length, 4);
  assert.equal(sections.politics.some((story) => story.id === '1'), true);
  assert.equal(sections.elections.some((story) => story.id === '2'), true);
  assert.equal(sections.economy.some((story) => story.id === '3'), true);
  assert.equal(sections.world.some((story) => story.id === '4'), true);
});

test('fetchMajorNews performs one upstream request and classifies locally', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => ({
        articles: [
          { url: 'https://apnews.com/election', title: 'Election officials prepare for November ballot', domain: 'apnews.com', seendate: '20261005T035500Z' },
          { url: 'https://reuters.com/world', title: 'Ukraine peace talks resume', domain: 'reuters.com', seendate: '20261005T035400Z' }
        ]
      })
    };
  };

  const result = await fetchMajorNews({
    fetchImpl,
    maxRecords: 50,
    timespan: '12h',
    timeoutMs: 1000,
    now: new Date('2026-10-05T04:00:00Z')
  });

  assert.equal(calls, 1);
  assert.equal(result.status, 'live');
  assert.equal(result.sections.top.length, 2);
  assert.equal(result.sections.elections.length, 1);
  assert.equal(result.sections.world.length, 1);
});
