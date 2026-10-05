import { fetchMajorNews, NEWS_SECTIONS } from './lib/news-feed.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const requestedSection = typeof req.query?.section === 'string' ? req.query.section : null;
  const maxRecords = Math.min(Math.max(Number(req.query?.limit) || 40, 1), 100);

  try {
    const data = await fetchMajorNews({ maxRecords });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    if (requestedSection && NEWS_SECTIONS.includes(requestedSection)) {
      const sourceStatus = data.sourceStatus[requestedSection] || 'unavailable';
      return res.status(200).json({
        status: sourceStatus === 'live' && data.sections[requestedSection]?.length ? 'live' : data.status,
        generatedAt: data.generatedAt,
        provider: data.provider,
        section: requestedSection,
        stories: data.sections[requestedSection] || [],
        sourceStatus,
        sourceCount: data.sourceCount
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.warn(`[news-feed] handler: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(200).json({
      status: 'degraded',
      generatedAt: new Date().toISOString(),
      provider: 'Google News RSS',
      sections: Object.fromEntries(NEWS_SECTIONS.map((section) => [section, []])),
      sourceStatus: Object.fromEntries(NEWS_SECTIONS.map((section) => [section, 'unavailable'])),
      feedStatus: {},
      sourceCount: 0,
      error: 'news_feed_temporarily_unavailable'
    });
  }
}
