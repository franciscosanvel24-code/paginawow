import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const baseUrl = 'https://franciscosanvel24-code.github.io/paginawow';
const postsDir = path.join(root, 'content', 'posts');
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

async function loadPosts() {
  const names = (await fs.readdir(postsDir)).filter((name) => name.endsWith('.json'));
  const posts = [];
  for (const name of names) {
    const raw = await fs.readFile(path.join(postsDir, name), 'utf8');
    const post = JSON.parse(raw);
    if (post.published === true) posts.push(post);
  }
  return posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function replaceBlock(source, start, end, content) {
  const expression = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!expression.test(source)) throw new Error(`No se encontró el bloque ${start}`);
  return source.replace(expression, `${start}${content}${end}`);
}

function card(post, prefix = '') {
  return `<article class="reveal visible blog-card"><span>${esc(post.category)}</span><h3><a href="${prefix}blog/${esc(post.slug)}/">${esc(post.title)}</a></h3><p>${esc(post.excerpt)}</p><a class="blog-card-link" href="${prefix}blog/${esc(post.slug)}/">Leer artículo</a></article>`;
}

function articlePage(post) {
  const canonical = `${baseUrl}/blog/${encodeURIComponent(post.slug)}/`;
  const cover = String(post.cover || '').startsWith('http') ? post.cover : `${baseUrl}${post.cover}`;
  return `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(post.seo_title)}</title><meta name="description" content="${esc(post.seo_description)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(post.seo_title)}"><meta property="og:description" content="${esc(post.seo_description)}"><meta property="og:image" content="${esc(cover)}"><link rel="stylesheet" href="../../styles.css?v=20261120-1"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:post.title,description:post.excerpt,datePublished:post.date,author:{'@type':'Person',name:post.author},image:cover,mainEntityOfPage:canonical})}</script></head><body><a class="skip-link" href="#articulo">Saltar al artículo</a><header class="nav nav-on-dark"><a class="brand" href="../../#inicio"><img class="brand-light" src="../../assets/wow-logo-blanco.svg" alt="WOW Marketing"><img class="brand-dark" src="../../assets/wow-logo.svg" alt="WOW Marketing"></a><nav aria-label="Navegación"><a href="../">WOW Ideas</a><a href="../../#servicios">Servicios</a><a href="../../#contacto">Contacto</a></nav></header><main id="articulo"><article class="article-page"><header><p class="eyebrow">${esc(post.category)}</p><h1>${esc(post.title)}</h1><p class="article-excerpt">${esc(post.excerpt)}</p><p class="article-meta">${esc(post.author)} · <time datetime="${esc(post.date)}">${esc(post.date)}</time></p>${post.cover ? `<img src="${esc(post.cover)}" alt="" loading="eager">` : ''}</header><div class="article-content">${post.content || ''}</div><a class="blog-all" href="../">Volver a WOW Ideas</a></article></main><div class="brand-stripe"></div><footer><div class="footer-brand"><span class="footer-logo"><img src="../../assets/wow-logo-blanco.svg" alt="WOW Marketing"></span><p class="go-to-wow">GO TO WOW</p></div><p class="copyright">© 2026 WOW Marketing. Todos los derechos reservados.</p></footer></body></html>`;
}

const posts = await loadPosts();
const homePath = path.join(root, 'index.html');
const blogPath = path.join(root, 'blog', 'index.html');
let home = await fs.readFile(homePath, 'utf8');
let blog = await fs.readFile(blogPath, 'utf8');

if (posts.length) {
  const homeCards = `<div class="article-grid" aria-label="Artículos recientes">${posts.slice(0, 3).map((post) => card(post)).join('')}</div>`;
  const indexCards = `<div class="blog-index-grid">${posts.map((post) => card(post, '../')).join('')}</div>`;
  home = replaceBlock(home, '<!-- BLOG_CARDS_START -->', '<!-- BLOG_CARDS_END -->', homeCards);
  blog = replaceBlock(blog, '<!-- BLOG_INDEX_START -->', '<!-- BLOG_INDEX_END -->', indexCards);
  for (const post of posts) {
    const output = path.join(root, 'blog', post.slug);
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'index.html'), articlePage(post));
  }
}

await fs.writeFile(homePath, home);
await fs.writeFile(blogPath, blog);
const sitemapUrls = [
  { loc: `${baseUrl}/`, priority: '1.0' },
  { loc: `${baseUrl}/blog/`, priority: '0.7' },
  ...posts.map((post) => ({ loc: `${baseUrl}/blog/${encodeURIComponent(post.slug)}/`, priority: '0.6' })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(({ loc, priority }) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile(path.join(root, 'sitemap.xml'), sitemap);
console.log(`WOW Ideas: ${posts.length} artículo(s) publicado(s).`);
