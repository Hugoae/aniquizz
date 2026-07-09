# SEO & Google Search Console — AniQuizz

Canonical production URL: **https://aniquizz.com**

## Already in the codebase

- Per-route metadata via `SeoHead` (`title`, `description`, canonical, OG/Twitter)
- `public/robots.txt` + `public/sitemap.xml`
- JSON-LD on Home (`WebSite`, `Organization`, `VideoGame`)
- `noindex` on auth/gameplay routes (`/play`, `/game`, `/profile`, `/admin`, …)
- Vercel redirects: `aniquizz.vercel.app` and `www.aniquizz.com` → `aniquizz.com`

## Manual steps after deploy

### 1. Supabase Auth redirect URLs

Dashboard → **Authentication → URL Configuration**

**Site URL:** `https://aniquizz.com`

**Redirect URLs** (add, keep localhost for dev):

```
http://localhost:8080/**
https://aniquizz.com/**
https://aniquizz.com/reset-password
```

Optional during transition:

```
https://aniquizz.vercel.app/**
```

### 2. Render `CLIENT_URL`

Dashboard → **aniquizz-server** → Environment → set:

```
CLIENT_URL=https://aniquizz.com
```

(`render.yaml` already documents this; sync if the live service still has the old Vercel URL.)

### 3. Vercel env (optional)

Project → Settings → Environment Variables:

```
VITE_SITE_URL=https://aniquizz.com
```

Redeploy client after change.

### 4. Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. **Add property** → URL prefix: `https://aniquizz.com`
3. Verify ownership (recommended: **HTML tag** in `index.html`, or DNS TXT via Vercel)
4. **Sitemaps** → submit: `https://aniquizz.com/sitemap.xml`
5. Request indexing for `/` and `/news` once live

### 5. Optional: `www` subdomain

In Vercel → Project → Domains → add `www.aniquizz.com`  
Redirect to apex is configured in `apps/client/vercel.json`.

### 6. Bing Webmaster Tools (optional)

Same sitemap URL: `https://aniquizz.com/sitemap.xml`

## Verify

```bash
curl -I https://aniquizz.com/robots.txt
curl -I https://aniquizz.com/sitemap.xml
curl -I https://aniquizz.vercel.app/   # should 308 → aniquizz.com
```

Check rich results: [Google Rich Results Test](https://search.google.com/test/rich-results) on `https://aniquizz.com`
