/**
 * Fetch Amazon (or amzn.to) product HTML and extract Open Graph + product images.
 * Used server-side only for admin "import from URL" — affiliate link stays exactly as pasted.
 */

const FETCH_TIMEOUT_MS = 15000;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isAllowedAmazonHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (h === 'amzn.to' || h === 'www.amzn.to' || h === 'a.co' || h === 'www.a.co') return true;
  if (h === 'amazon.com' || h.endsWith('.amazon.com')) return true;
  return /amazon\.(co\.uk|de|fr|es|it|nl|se|pl|ca|co\.jp|com\.mx|com\.br|com\.tr|in|ae|sg|com\.au)$/.test(h);
}

/**
 * @param {string} rawUrl
 * @returns {boolean}
 */
function isAmazonProductUrl(rawUrl) {
  try {
    const u = new URL(rawUrl.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return isAllowedAmazonHost(u.hostname);
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function isLikelyAmazonProductImageUrl(url) {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const h = u.hostname.toLowerCase();
    if (h.includes('media-amazon.com')) return true;
    if (h.includes('ssl-images-amazon.com')) return true;
    if (h.includes('images-amazon.com')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Prefer a larger CDN variant when Amazon encodes a small tile in the path.
 * @param {string} url
 * @returns {string}
 */
function preferLargerAmazonImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  let u = url.trim();
  // Common small multi-size segments → single large side (best-effort)
  u = u.replace(/\._AC_UL\d+_SR\d+,\d+_\./gi, '._AC_SL1500_.');
  u = u.replace(/\._AC_SR\d+,\d+_\./gi, '._AC_SL1500_.');
  u = u.replace(/\._AC_SL\d+_\./gi, '._AC_SL1500_.');
  return u;
}

/**
 * @param {string} html
 * @param {string} key property or name value e.g. og:title
 * @returns {string|null}
 */
function parseMetaContent(html, key) {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta\\s+property=["']${esc}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta\\s+name=["']${esc}["']\\s+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta\\s+content=["']([^"']*)["']\\s+property=["']${esc}["']`, 'i'),
    new RegExp(`<meta\\s+content=["']([^"']*)["']\\s+name=["']${esc}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

/**
 * @param {string} s
 * @returns {string}
 */
function decodeBasicEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * @param {unknown} image
 * @param {string[]} out
 */
function collectLdJsonImages(image, out) {
  if (!image) return;
  if (typeof image === 'string') {
    out.push(image);
    return;
  }
  if (Array.isArray(image)) {
    image.forEach((i) => collectLdJsonImages(i, out));
    return;
  }
  if (typeof image === 'object' && image !== null) {
    if (typeof image.url === 'string') out.push(image.url);
    if (typeof image.contentUrl === 'string') out.push(image.contentUrl);
  }
}

/**
 * @param {unknown} node
 * @param {string[]} out
 */
function walkLdJsonForProduct(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n) => walkLdJsonForProduct(n, out));
    return;
  }
  const t = node['@type'];
  const types = Array.isArray(t) ? t : t ? [t] : [];
  if (types.some((x) => String(x).toLowerCase() === 'product')) {
    collectLdJsonImages(node.image, out);
  }
  if (node['@graph']) walkLdJsonForProduct(node['@graph'], out);
}

/**
 * @param {string} html
 * @returns {string[]}
 */
function extractLdJsonImageUrls(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      walkLdJsonForProduct(data, out);
    } catch {
      /* ignore invalid JSON blocks */
    }
  }
  return out;
}

/**
 * @param {string} html
 * @returns {string[]}
 */
function extractDomImageHints(html) {
  const found = [];

  const hires = html.match(/data-old-hires=["'](https?:\/\/[^"']+)["']/i);
  if (hires) found.push(decodeBasicEntities(hires[1]));

  const dyn = html.match(/data-a-dynamic-image=["']([^"']+)["']/i);
  if (dyn) {
    const decoded = decodeBasicEntities(dyn[1]).replace(/&quot;/g, '"');
    try {
      const obj = JSON.parse(decoded);
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach((k) => {
          if (/^https?:\/\//i.test(k)) found.push(k);
        });
      }
    } catch {
      /* ignore */
    }
  }

  const landing = html.match(
    /<img[^>]*\bid=["']landingImage["'][^>]*\bsrc=["'](https?:\/\/[^"']+)["']/i
  );
  if (landing) found.push(decodeBasicEntities(landing[1]));

  return found;
}

/**
 * Dedupe while preserving order; keep only plausible Amazon CDN image URLs.
 * @param {string[]} urls
 * @returns {string|null}
 */
function pickBestProductImage(urls) {
  const seen = new Set();
  const cleaned = [];
  for (const raw of urls) {
    if (!raw || typeof raw !== 'string') continue;
    const u = preferLargerAmazonImageUrl(decodeBasicEntities(raw.trim()));
    if (!u || !/^https?:\/\//i.test(u)) continue;
    if (!isLikelyAmazonProductImageUrl(u)) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    cleaned.push(u);
  }
  // Prefer /images/I/ main gallery assets when multiple
  const primary =
    cleaned.find((u) => /\/images\/I\//i.test(u)) ||
    cleaned.find((u) => /media-amazon\.com/i.test(u)) ||
    cleaned[0];
  return primary || null;
}

/**
 * @param {string} html
 * @returns {string|null}
 */
function extractPrimaryProductImage(html) {
  const candidates = [];

  candidates.push(...extractLdJsonImageUrls(html));

  const og = decodeBasicEntities(parseMetaContent(html, 'og:image'));
  if (og) candidates.push(og);

  const tw = decodeBasicEntities(parseMetaContent(html, 'twitter:image'));
  if (tw) candidates.push(tw);

  const twSrc = decodeBasicEntities(parseMetaContent(html, 'twitter:image:src'));
  if (twSrc) candidates.push(twSrc);

  candidates.push(...extractDomImageHints(html));

  return pickBestProductImage(candidates);
}

/**
 * @param {string} rawUrl
 * @returns {Promise<{ html: string, responseUrl: string }>}
 */
async function fetchAmazonHtml(rawUrl) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(rawUrl.trim(), {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) {
      const err = new Error(`HTTP_${res.status}`);
      err.status = res.status;
      throw err;
    }
    const html = await res.text();
    return { html, responseUrl: res.url || rawUrl.trim() };
  } finally {
    clearTimeout(tid);
  }
}

/**
 * @param {string} rawUrl
 * @returns {Promise<{ title: string, imageUrl: string | null, description: string | null }>}
 */
async function extractAmazonProductMeta(rawUrl) {
  if (!isAmazonProductUrl(rawUrl)) {
    const err = new Error('INVALID_AMAZON_URL');
    err.code = 'INVALID_AMAZON_URL';
    throw err;
  }

  let html;
  try {
    ({ html } = await fetchAmazonHtml(rawUrl));
  } catch (e) {
    const err = new Error('FETCH_FAILED');
    err.code = 'FETCH_FAILED';
    err.cause = e;
    throw err;
  }

  let title =
    decodeBasicEntities(parseMetaContent(html, 'og:title')) ||
    decodeBasicEntities(parseMetaContent(html, 'twitter:title')) ||
    '';

  title = title.replace(/\s+:\s*Amazon\.[^:]*$/i, '').trim() || 'Amazon product';

  const imageUrl = extractPrimaryProductImage(html);

  const descRaw = decodeBasicEntities(parseMetaContent(html, 'og:description'));
  const description = descRaw && descRaw.trim() ? descRaw.trim().slice(0, 2000) : null;

  return { title: title.slice(0, 255), imageUrl, description };
}

module.exports = {
  isAmazonProductUrl,
  extractAmazonProductMeta,
};
