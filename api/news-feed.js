import { fetchMajorNews, NEWS_SECTIONS } from './lib/news-feed.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const requestedSection = typeof req.query?.section === 'string' ? req.query.section : null;
  const maxRecords = Math.min(Math.max(Number(req.query?.limit) || 40, 1), 100);
  const timespan = typeof req.query?.timespan === 'string' && /^\d+(min|h|d|w|m)$/.test(req.query.timespan)
    ? req.query.timespan
    : '12h';

  try {
    const data = await fetchMajorNews({ maxRecords, timespan });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    if (requestedSection && NEWS_SECTIONS.includes(requestedSection)) {
      return res.status(200).json({
        status: data.sourceStatus[requestedSection] === 'live' ? 'live' : 'degraded',
        generatedAt: data.generatedAt,
        provider: data.provider,
        section: requestedSection,
        stories: data.sections[requestedSection],
        sourceStatus: data.sourceStatus[requestedSection],
        sourceCount: data.sourceCount
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(200).json({
      status: 'degraded',
      generatedAt: new Date().toISOString(),
      provider: 'GDELT DOC 2.0',
      sections: Object.fromEntries(NEWS_SECTIONS.map((section) => [section, []])),
      sourceStatus: Object.fromEntries(NEWS_SECTIONS.map((section) => [section, 'unavailable'])),
      sourceCount: 0,
      error: 'news_feed_temporarily_unavailable'
    });
  }
}
