import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGdeltUrl,
  dedupeStories,
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
