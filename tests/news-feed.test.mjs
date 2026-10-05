import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleNewsFeedUrls,
  classifyStories,
  dedupeStories,
  fetchMajorNews,
  parseGoogleNewsRss
} from '../api/lib/news-feed.js';

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Google News</title>
  <item>
    <title>Election officials prepare for November ballot - Associated Press</title>
    <link>https://news.google.com/rss/articles/example-election</link>
    <guid isPermaLink="false">guid-election</guid>
    <pubDate>Mon, 05 Oct 2026 03:55:00 GMT</pubDate>
    <source url="https://apnews.com">Associated Press</source>
  </item>
  <item>
    <title>Markets rise as investors weigh rates &amp; jobs - Reuters</title>
    <link>https://news.google.com/rss/articles/example-economy</link>
    <guid isPermaLink="false">guid-economy</guid>
    <pubDate>Mon, 05 Oct 2026 03:54:00 GMT</pubDate>
    <source url="https://www.reuters.com">Reuters</source>
  </item>
</channel></rss>`;

test('parseGoogleNewsRss preserves publisher attribution and Google story links', () => {
  const stories = parseGoogleNewsRss(SAMPLE_RSS, 'top');
  assert.equal(stories.length, 2);
  assert.equal(stories[0].id, 'guid-election');
  assert.equal(stories[0].title, 'Election officials prepare for November ballot');
  assert.equal(stories[0].url, 'https://news.google.com/rss/articles/example-election');
  assert.equal(stories[0].source, 'Associated Press');
  assert.equal(stories[0].domain, 'apnews.com');
  assert.equal(stories[0].publisherUrl, 'https://apnews.com');
  assert.equal(stories[0].category, 'top');
  assert.match(stories[0].publishedAt, /^2026-10-05T03:55:00/);
  assert.equal(stories[1].title, 'Markets rise as investors weigh rates & jobs');
});

test('dedupeStories collapses the same Google News item seen in multiple feeds', () => {
  const rows = [
    { id: 'same-guid', url: 'https://news.google.com/rss/articles/a', title: 'Headline', source: 'AP' },
    { id: 'same-guid', url: 'https://news.google.com/rss/articles/a', title: 'Headline', source: 'AP' }
  ];
  const deduped = dedupeStories(rows);
  assert.equal(deduped.length, 1);
});

test('buildGoogleNewsFeedUrls covers top, US, world, business, and election discovery', () => {
  const feeds = buildGoogleNewsFeedUrls();
  assert.equal(feeds.length, 5);
  assert.equal(feeds.every((feed) => feed.url.startsWith('https://news.google.com/rss')), true);
  assert.equal(feeds.some((feed) => feed.key === 'top'), true);
  assert.equal(feeds.some((feed) => feed.key === 'nation'), true);
  assert.equal(feeds.some((feed) => feed.key === 'world'), true);
  assert.equal(feeds.some((feed) => feed.key === 'business'), true);
  const elections = feeds.find((feed) => feed.key === 'elections');
  assert.match(elections.url, /rss\/search\?/);
  assert.match(decodeURIComponent(elections.url), /election/i);
});

test('classifyStories maps fetched stories into useful sections', () => {
  const stories = [
    { id: '1', title: 'Senate votes on budget deal', url: 'https://news.google.com/a', source: 'Reuters', domain: 'reuters.com' },
    { id: '2', title: 'Georgia election officials update ballot rules', url: 'https://news.google.com/b', source: 'Associated Press', domain: 'apnews.com' },
    { id: '3', title: 'Federal Reserve holds interest rates steady', url: 'https://news.google.com/c', source: 'CNBC', domain: 'cnbc.com' },
    { id: '4', title: 'Ukraine peace talks resume', url: 'https://news.google.com/d', source: 'BBC', domain: 'bbc.com' }
  ];

  const sections = classifyStories(stories);
  assert.equal(sections.top.length, 4);
  assert.equal(sections.politics.some((story) => story.id === '1'), true);
  assert.equal(sections.elections.some((story) => story.id === '2'), true);
  assert.equal(sections.economy.some((story) => story.id === '3'), true);
  assert.equal(sections.world.some((story) => story.id === '4'), true);
});

test('fetchMajorNews aggregates RSS feeds and tolerates one failed section', async () => {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    if (url.includes('/topic/WORLD')) throw new Error('world feed unavailable');
    return {
      ok: true,
      text: async () => SAMPLE_RSS
    };
  };

  const result = await fetchMajorNews({
    fetchImpl,
    maxRecords: 50,
    timeoutMs: 1000,
    now: new Date('2026-10-05T04:00:00Z')
  });

  assert.equal(calls, 5);
  assert.equal(result.status, 'degraded');
  assert.equal(result.provider, 'Google News RSS');
  assert.equal(result.sections.top.length, 2);
  assert.equal(result.sections.elections.length >= 1, true);
  assert.equal(result.sections.economy.length >= 1, true);
  assert.equal(result.feedStatus.world, 'unavailable');
  assert.equal(result.sourceCount, 2);
});
