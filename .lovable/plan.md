

# Improve SEO for Fractured Crown

## Current State
- Basic meta tags exist (title, description, OG tags, Twitter cards)
- OG image uses a temporary signed GCS URL that will expire
- No sitemap.xml
- robots.txt exists but has no sitemap reference
- No canonical URL tags
- No structured data (JSON-LD)
- SPA with no per-page meta tag updates (only `usePageTitle` for title)
- No `og:url` tag

## Plan

### 1. Fix OG image URL
The current OG image uses a signed GCS URL with an expiration date. Replace it with a permanent self-hosted image at `/og-image.png` in the `public/` folder (using the uploaded logo or a designed OG card). Update both `og:image` and `twitter:image` to use the published domain URL.

### 2. Add missing meta tags to `index.html`
- `og:url` pointing to `https://fractured-crown.lovable.app`
- `<link rel="canonical" href="https://fractured-crown.lovable.app/" />`
- Richer keywords in description (e.g., "social deduction", "online board game", "play free")
- `og:site_name`

### 3. Create `public/sitemap.xml`
Static sitemap listing the public crawlable pages:
- `/` (landing)
- `/install` (PWA install)
- `/privacy`
- `/terms`

Dynamic game room URLs are excluded (ephemeral, auth-gated).

### 4. Update `public/robots.txt`
Add `Sitemap: https://fractured-crown.lovable.app/sitemap.xml` directive. Disallow `/room/` and `/join/` paths (ephemeral, no SEO value).

### 5. Add JSON-LD structured data to `index.html`
A `WebApplication` schema with name, description, URL, and application category for richer search results.

### 6. Per-page meta descriptions
Extend `usePageTitle` into a `usePageMeta` hook that also updates the `<meta name="description">` tag dynamically for `/privacy`, `/terms`, and `/install` pages.

## Files Changed

| File | Action |
|---|---|
| `index.html` | Fix OG image, add canonical/og:url/og:site_name, add JSON-LD |
| `public/og-image.png` | Create from uploaded logo |
| `public/sitemap.xml` | New static sitemap |
| `public/robots.txt` | Add sitemap directive, disallow ephemeral paths |
| `src/hooks/usePageTitle.ts` | Extend to also set meta description |
| `src/pages/Index.tsx` | Pass description to hook |
| `src/pages/PrivacyPolicy.tsx` | Pass description to hook |
| `src/pages/TermsOfService.tsx` | Pass description to hook |
| `src/pages/Install.tsx` | Pass description to hook |

