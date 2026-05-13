/* ═══════════════════════════════════════════════════
   News Service — RSS Feed Fetcher
   Uses rss2json API to parse RSS feeds from 
   multiple sources for each category/country
   ═══════════════════════════════════════════════════ */

const RSS_API = 'https://api.rss2json.com/v1/api.json';

// RSS feed sources by category
const RSS_FEEDS = {
  general: [
    'https://feeds.bbci.co.uk/news/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    'https://feeds.reuters.com/reuters/topNews',
    'https://www.theguardian.com/world/rss',
  ],
  business: [
    'https://feeds.bbci.co.uk/news/business/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
    'https://www.cnbc.com/id/10001147/device/rss/rss.html',
    'https://feeds.bloomberg.com/markets/news.rss',
  ],
  technology: [
    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    'https://www.theverge.com/rss/index.xml',
    'https://techcrunch.com/feed/',
  ],
  science: [
    'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',
    'https://www.newscientist.com/section/news/feed/',
  ],
  health: [
    'https://feeds.bbci.co.uk/news/health/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',
    'https://www.who.int/feeds/entity/mediacentre/news/en/rss.xml',
  ],
  sports: [
    'https://feeds.bbci.co.uk/sport/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml',
    'https://www.espn.com/espn/rss/news',
  ],
  entertainment: [
    'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml',
    'https://variety.com/feed/',
  ],
  politics: [
    'https://feeds.bbci.co.uk/news/politics/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
    'https://www.politico.com/rss/politicopicks.xml',
  ],
};

// Country-specific RSS feeds
const COUNTRY_FEEDS = {
  us: 'https://news.google.com/rss?gl=US&hl=en-US&ceid=US:en',
  gb: 'https://news.google.com/rss?gl=GB&hl=en-GB&ceid=GB:en',
  in: 'https://news.google.com/rss?gl=IN&hl=en-IN&ceid=IN:en',
  ca: 'https://news.google.com/rss?gl=CA&hl=en-CA&ceid=CA:en',
  au: 'https://news.google.com/rss?gl=AU&hl=en-AU&ceid=AU:en',
  de: 'https://news.google.com/rss?gl=DE&hl=de&ceid=DE:de',
  fr: 'https://news.google.com/rss?gl=FR&hl=fr&ceid=FR:fr',
  jp: 'https://news.google.com/rss?gl=JP&hl=ja&ceid=JP:ja',
  br: 'https://news.google.com/rss?gl=BR&hl=pt-BR&ceid=BR:pt-419',
  za: 'https://news.google.com/rss?gl=ZA&hl=en-ZA&ceid=ZA:en',
  ae: 'https://news.google.com/rss?gl=AE&hl=en-AE&ceid=AE:en',
  sg: 'https://news.google.com/rss?gl=SG&hl=en-SG&ceid=SG:en',
};

// Language to Google News language code
const LANG_MAP = {
  en: 'en', hi: 'hi', es: 'es', fr: 'fr', de: 'de',
  ja: 'ja', pt: 'pt-419', ar: 'ar', zh: 'zh-Hans', ko: 'ko',
};

export class NewsService {
  constructor() {
    this.cache = new Map();
  }

  async fetchNews(category = 'general', country = 'us', language = 'en') {
    const cacheKey = `${category}-${country}-${language}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.time < 5 * 60 * 1000) {
      return cached.data;
    }

    let articles = [];

    try {
      // Primary: Try Google News RSS for country/language specific
      const googleFeed = this.buildGoogleNewsFeed(category, country, language);
      const googleArticles = await this.fetchRSSFeed(googleFeed);
      articles = articles.concat(googleArticles);
    } catch (e) {
      console.warn('Google News RSS failed:', e);
    }

    // Secondary: Try category-specific feeds
    if (articles.length < 5) {
      const categoryFeeds = RSS_FEEDS[category] || RSS_FEEDS.general;
      for (const feedUrl of categoryFeeds.slice(0, 2)) {
        try {
          const feedArticles = await this.fetchRSSFeed(feedUrl);
          articles = articles.concat(feedArticles);
        } catch (e) {
          console.warn(`Feed failed: ${feedUrl}`, e);
        }
        if (articles.length >= 15) break;
      }
    }

    // Deduplicate by title
    const seen = new Set();
    articles = articles.filter(a => {
      const key = a.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date
    articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Limit
    articles = articles.slice(0, 20);

    this.cache.set(cacheKey, { data: articles, time: Date.now() });
    return articles;
  }

  buildGoogleNewsFeed(category, country, language) {
    const hl = LANG_MAP[language] || 'en';
    const gl = country.toUpperCase();
    const categoryMap = {
      general: '',
      business: '/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB',
      technology: '/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB',
      science: '/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB',
      health: '/CAAqIQgKIhtDQkFTRGdvSUwyMHZNR3QwTlRFU0FtVnVLQUFQAQ',
      sports: '/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB',
      entertainment: '/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB',
      politics: '',
    };
    
    const topicPath = categoryMap[category] || '';
    if (topicPath) {
      return `https://news.google.com/rss/topics${topicPath}?hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`;
    }
    return `https://news.google.com/rss?hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`;
  }

  async fetchRSSFeed(feedUrl) {
    const url = `${RSS_API}?rss_url=${encodeURIComponent(feedUrl)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);
    
    const data = await resp.json();
    
    if (data.status !== 'ok' || !data.items) {
      throw new Error('Invalid RSS response');
    }
    
    return data.items.map(item => ({
      title: this.cleanText(item.title || ''),
      description: this.cleanText(item.description || ''),
      content: this.cleanText(item.content || ''),
      url: item.link || '',
      image: item.enclosure?.link || item.thumbnail || this.extractImageFromContent(item.content) || '',
      source: item.author || data.feed?.title || 'News',
      publishedAt: item.pubDate || new Date().toISOString(),
      category: '',
    }));
  }

  cleanText(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    let text = div.textContent || div.innerText || '';
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    // Limit length
    return text.substring(0, 1000);
  }

  extractImageFromContent(html) {
    if (!html) return '';
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : '';
  }
}
