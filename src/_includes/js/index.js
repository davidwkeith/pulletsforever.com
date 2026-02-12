// Webmentions client-side refresh
(function() {
  const section = document.querySelector('.webmentions');
  if (!section) return;

  const pageUrl = section.dataset.pageUrl;
  if (!pageUrl) return;

  const API_URL = 'https://webmention.io/api/mentions.jf2';
  const DOMAIN = 'pulletsforever.com';

  async function fetchWebmentions() {
    const url = new URL(API_URL);
    url.searchParams.set('target', pageUrl);
    url.searchParams.set('per-page', '100');
    url.searchParams.set('sort-by', 'published');
    url.searchParams.set('sort-dir', 'down');

    try {
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      return data.children || [];
    } catch (error) {
      console.warn('[webmentions] Client fetch error:', error.message);
      return null;
    }
  }

  function categorize(mentions) {
    const result = { likes: [], reposts: [], replies: [], mentions: [] };
    for (const m of mentions) {
      switch (m['wm-property']) {
        case 'like-of': result.likes.push(m); break;
        case 'repost-of': result.reposts.push(m); break;
        case 'in-reply-to': result.replies.push(m); break;
        default: result.mentions.push(m);
      }
    }
    return result;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function getHost(urlStr) {
    if (!urlStr) return '';
    try {
      return new URL(urlStr).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function renderFacepile(items, label) {
    if (!items.length) return '';
    return `
      <div class="wm-${label}s">
        <h4>${items.length} ${label.charAt(0).toUpperCase() + label.slice(1)}${items.length !== 1 ? 's' : ''}</h4>
        <ul class="wm-facepile" aria-label="People who ${label}d this">
          ${items.map(item => `
            <li>
              <a href="${escapeHtml(item.author?.url || '#')}" title="${escapeHtml(item.author?.name || 'Anonymous')}" rel="nofollow ugc">
                ${item.author?.photo
                  ? `<img src="${escapeHtml(item.author.photo)}" alt="${escapeHtml(item.author.name)}" width="48" height="48" loading="lazy">`
                  : '<span class="wm-avatar-placeholder" aria-hidden="true"></span>'}
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  function renderReplies(replies) {
    if (!replies.length) return '';
    return `
      <div class="wm-replies">
        <h4>${replies.length} Repl${replies.length === 1 ? 'y' : 'ies'}</h4>
        <ol class="wm-reply-list">
          ${replies.map(reply => `
            <li class="wm-reply h-cite">
              <div class="wm-reply-author">
                <a href="${escapeHtml(reply.author?.url || '#')}" class="p-author h-card" rel="nofollow ugc">
                  ${reply.author?.photo
                    ? `<img src="${escapeHtml(reply.author.photo)}" alt="" width="48" height="48" loading="lazy" class="u-photo">`
                    : '<span class="wm-avatar-placeholder" aria-hidden="true"></span>'}
                  <span class="p-name">${escapeHtml(reply.author?.name || 'Anonymous')}</span>
                </a>
                <time class="dt-published" datetime="${escapeHtml(reply.published || reply['wm-received'])}">
                  ${formatDate(reply.published || reply['wm-received'])}
                </time>
              </div>
              ${reply.content?.text
                ? `<blockquote class="wm-reply-content p-content">${escapeHtml(truncate(reply.content.text, 500))}</blockquote>`
                : ''}
              <a href="${escapeHtml(reply.url)}" class="u-url wm-reply-source" rel="nofollow ugc">View original</a>
            </li>
          `).join('')}
        </ol>
      </div>
    `;
  }

  function renderMentions(mentions) {
    if (!mentions.length) return '';
    return `
      <div class="wm-mentions">
        <h4>${mentions.length} Mention${mentions.length !== 1 ? 's' : ''}</h4>
        <ul class="wm-mention-list">
          ${mentions.map(mention => `
            <li class="wm-mention h-cite">
              <a href="${escapeHtml(mention.url)}" class="u-url wm-mention-tile" rel="nofollow ugc">
                ${(mention.published || mention['wm-received'] || getHost(mention.url)) ? `
                  <p class="wm-mention-meta">
                    ${mention.published || mention['wm-received']
                      ? `<time datetime="${escapeHtml(mention.published || mention['wm-received'])}">${formatDate(mention.published || mention['wm-received'])}</time>`
                      : ''}
                    ${(mention.published || mention['wm-received']) && getHost(mention.url) ? '<span aria-hidden="true">&middot;</span>' : ''}
                    ${getHost(mention.url) ? `<span>${escapeHtml(getHost(mention.url))}</span>` : ''}
                  </p>
                ` : ''}
                ${mention.content?.text
                  ? `<p class="p-content">${escapeHtml(truncate(mention.content.text, 200))}</p>`
                  : ''}
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  function render(data) {
    const hasAny = data.likes.length || data.reposts.length || data.replies.length || data.mentions.length;

    if (!hasAny) {
      section.innerHTML = '';
      return;
    }

    section.setAttribute('aria-live', 'polite');
    section.innerHTML = `
      <h3 id="webmentions-heading">Webmentions</h3>
      ${renderFacepile(data.likes, 'like')}
      ${renderFacepile(data.reposts, 'repost')}
      ${renderReplies(data.replies)}
      ${renderMentions(data.mentions)}
    `;
  }

  // Fetch fresh data and update if there are changes
  fetchWebmentions().then(mentions => {
    if (mentions === null) return; // fetch failed, keep static content
    const data = categorize(mentions);
    render(data);
  });
})();
