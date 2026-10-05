const NEWS_ENDPOINT = '/api/news-feed?limit=50&timespan=12h';
const SECTION_LABELS = {
  top: 'Top News',
  politics: 'Politics',
  elections: 'Elections',
  economy: 'Economy',
  world: 'World'
};

const state = {
  data: null,
  activeSection: new URLSearchParams(window.location.search).get('section') || 'top'
};

function relativeTime(iso) {
  if (!iso) return 'Time unavailable';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  const delta = Date.now() - date.getTime();
  const mins = Math.max(0, Math.floor(delta / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function safeImage(value) {
  return typeof value === 'string' && value.startsWith('https://') ? value : null;
}

function storyCard(story) {
  const link = document.createElement('a');
  link.className = 'news-card';
  link.href = story.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  const media = document.createElement('div');
  media.className = 'news-card-media';
  const imageUrl = safeImage(story.image);
  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => {
      media.classList.add('no-image');
      media.textContent = story.source || 'NEWS';
    }, { once: true });
    media.append(image);
  } else {
    media.classList.add('no-image');
    media.textContent = story.source || 'NEWS';
  }

  const body = document.createElement('div');
  body.className = 'news-card-body';

  const meta = document.createElement('div');
  meta.className = 'news-card-meta';
  const source = document.createElement('span');
  source.textContent = story.source || story.domain || 'Source';
  const time = document.createElement('span');
  time.textContent = relativeTime(story.publishedAt);
  meta.append(source, time);

  const title = document.createElement('h3');
  title.textContent = story.title;

  const footer = document.createElement('div');
  footer.className = 'news-card-source';
  const domain = document.createElement('span');
  domain.textContent = story.domain || 'Open original';
  const arrow = document.createElement('span');
  arrow.textContent = '↗';
  footer.append(domain, arrow);

  body.append(meta, title, footer);
  link.append(media, body);
  return link;
}

function emptyState(message = 'No stories are available in this section yet.') {
  const box = document.createElement('div');
  box.className = 'news-empty';
  const strong = document.createElement('strong');
  strong.textContent = 'NO LIVE STORIES';
  const p = document.createElement('p');
  p.textContent = message;
  box.append(strong, p);
  return box;
}

function setStatus(data) {
  const pill = document.querySelector('#newsStatusPill');
  const text = document.querySelector('#newsStatusText');
  const stamp = document.querySelector('#newsUpdated');
  if (!pill || !text || !stamp) return;

  pill.dataset.state = data?.status || 'unavailable';
  if (data?.status === 'live') text.textContent = 'LIVE MAJOR NEWS FEED';
  else if (data?.status === 'degraded') text.textContent = 'PARTIAL FEED — SOME SOURCES UNAVAILABLE';
  else text.textContent = 'FEED TEMPORARILY UNAVAILABLE';

  stamp.textContent = data?.generatedAt
    ? `Updated ${new Date(data.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Update time unavailable';
}

function renderSection(section) {
  const grid = document.querySelector('#newsGrid');
  const heading = document.querySelector('#newsSectionTitle');
  const count = document.querySelector('#newsStoryCount');
  if (!grid || !heading || !count || !state.data) return;

  const valid = Object.prototype.hasOwnProperty.call(SECTION_LABELS, section) ? section : 'top';
  state.activeSection = valid;
  const stories = state.data.sections?.[valid] || [];
  const sourceStatus = state.data.sourceStatus?.[valid] || 'unavailable';

  heading.textContent = SECTION_LABELS[valid];
  count.textContent = `${stories.length} stories · ${sourceStatus === 'live' ? 'live source index' : sourceStatus}`;
  grid.replaceChildren();

  if (!stories.length) {
    grid.append(emptyState(sourceStatus === 'unavailable'
      ? 'This section could not be refreshed. Other sections may still be live.'
      : 'No qualifying major-source stories were returned for this window.'));
  } else {
    const fragment = document.createDocumentFragment();
    stories.forEach((story) => fragment.append(storyCard(story)));
    grid.append(fragment);
  }

  document.querySelectorAll('[data-news-section]').forEach((button) => {
    button.setAttribute('aria-selected', button.dataset.newsSection === valid ? 'true' : 'false');
  });

  const url = new URL(window.location.href);
  if (valid === 'top') url.searchParams.delete('section');
  else url.searchParams.set('section', valid);
  history.replaceState({}, '', url);
}

function renderPreview(data) {
  const preview = document.querySelector('#majorNewsPreview');
  if (!preview) return;
  const stories = data.sections?.top?.slice(0, 6) || [];
  preview.replaceChildren();
  if (!stories.length) {
    preview.append(emptyState('Major news is loading or temporarily unavailable.'));
    return;
  }
  stories.forEach((story) => preview.append(storyCard(story)));
}

async function loadNews() {
  const grid = document.querySelector('#newsGrid');
  try {
    const response = await fetch(NEWS_ENDPOINT, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.data = data;
    setStatus(data);
    renderPreview(data);
    renderSection(state.activeSection);
  } catch (error) {
    if (grid) {
      grid.replaceChildren(emptyState('The major-news feed could not be refreshed. Try again shortly.'));
    }
    setStatus({ status: 'unavailable' });
  }
}

document.querySelectorAll('[data-news-section]').forEach((button) => {
  button.addEventListener('click', () => renderSection(button.dataset.newsSection));
});

loadNews();
