# Recipe Story

A multilingual recipe-sharing app with a sage-and-beige palette. The community feed contains real user submissions. Advertising is intentionally deferred.

## Experience

- Discover all recipes, videos, photos or your saved collection.
- Open **Shorts** to swipe vertically through videos, photos and text recipes. Only the visible video plays, muted initially; comments, recipe details and background tabs pause playback. Touch scrolling, keyboard navigation, sound and native playback controls are available.
- Portrait and landscape viewing use sage/beige margins and uncropped media. The full ingredients and cooking method remain one tap away.
- Public hearts, likes/dislikes and comments are shared between visitors. Hearts are independent; like/dislike are mutually exclusive and can be withdrawn. Comment authors can delete their own comments. Failed writes preserve the draft and do not increment counts.
- Browse Korean, Japanese, Chinese, Mexican, American, French, Italian, Indian, Arab and Australian cuisines, alongside brunch, lunchbox, quick meals, pasta, vegetarian, desserts and drinks.
- Combine ingredient/title search with category, cooking-time and difficulty filters; sort by newest or quickest.
- Explore quick meals, noodles & pasta, desserts, or a random matching recipe.
- Save favorites **on the current browser/device**. Bookmarks do not sync between devices.
- Read ingredients and instructions as a cooking checklist.
- Share through three short steps: basics, recipe, then an optional photo or video.
- Every new recipe requires a creator name, title, country/cuisine, category, difficulty, time, servings, a 20–2,000-character description, ingredients with amounts and detailed cooking steps. Older recipes remain readable.
- Upload JPG/PNG/WebP photos up to 10 MB, or MP4/WebM/MOV videos up to 100 MB. Playback depends on the browser's codec support.
- Choose full-bleed or uncropped photo framing.
- Claim or rename a unique creator name without a visible sign-up/login flow.
- The name control is visible beside the language selector. Arabic text does not mirror navigation or the app layout.

## Identity and data

The production app uses a no-sign-up community backend. Each browser creates a private local signing key and publishes signed recipe/profile events to redundant public relays. The key never leaves that browser; it proves ownership when deleting a recipe. A creator name is **not** a password or recovery method. Keep the same browser storage to retain ownership.

Creator names are checked case-insensitively against current community profiles before they are claimed. Signed ownership prevents someone using a different browser key from deleting another creator's recipe. Clearing browser data removes the local ownership key, so there is intentionally no password-reset flow.

Photos and videos are uploaded with signed HTTP authorization to the configured public media service. The current free tier supports JPG/PNG/WebP up to 10 MB in the interface and MP4/WebM/MOV up to 100 MB. Recipe events are replicated to the relays configured in `config.js`; media is removed on creator deletion when the host accepts the cleanup request.

The historical Supabase implementation and migrations remain as reference under `supabase/`. New social features use the community backend configured in production. `config.js` contains only browser-safe public settings. Never put a secret/service-role key in browser code.

Shared recipe URLs query the exact signed recipe ID, so they can open posts outside the newest-feed window. Reactions use addressable events per recipe and visitor, comments use signed events, and deletion targets are checked against their author. Open interaction panels refresh every 15 seconds while the page is visible. Relay failures show retry feedback instead of a false empty success. Public relays and media hosts are third-party services: permanent hosting is not guaranteed. Keep originals of important uploads.

## Run and deploy

This is a static site with no build step. Serve the project folder with any static HTTP server. Relative asset URLs work at a GitHub Pages repository subpath and on Vercel.

- GitHub Pages: https://dohoon819.github.io/hanip-recipe/
- Existing Vercel address: https://hanip-recipe.vercel.app/

The project URL remains unchanged; the product name is **Recipe Story**. Visitors can choose English, English (Australia), 한국어, 日本語, Français, Italiano, हिन्दी, Español (México), 中文 or العربية. Their choice is remembered in the browser.

## Search visibility

- Google Search Console ownership verification file: `google6bf2038a52595488.html` (keep this file deployed)
- Canonical URL: `https://dohoon819.github.io/hanip-recipe/`
- XML sitemap: `https://dohoon819.github.io/hanip-recipe/sitemap.xml`
- Crawl guidance: `robots.txt`
- Search result metadata: descriptive title/summary, Open Graph, Twitter Card, and `WebSite` structured data

## Tests

Install a test dependency without changing the static app:

```sh
npm install --no-save --package-lock=false playwright@1.62.1 ws
npx playwright install chromium
node tests/recipe-book.spec.cjs
node tests/social.spec.cjs
node tests/translation-audit.cjs
```

Optional environment variables: `RECIPE_BOOK_PLAYWRIGHT` (module path), `RECIPE_BOOK_BROWSER` (browser executable), `RECIPE_BOOK_TEST_OUTPUT` (screenshots, default `test-results/`).

The main browser suite intercepts the backend and uploads with in-memory fixtures. It **does not create production posts or accounts**. It covers filters, local bookmarks, cooking checks, composer validation, media switching, draft publication/rollback, duplicate names, load-error recovery, sharing and mobile overflow.

`tests/social.spec.cjs` uses an isolated local relay with real signed events and two independent browser identities. It verifies shared reactions/comments, ownership, escaped comment text, failure recovery, exact-ID links, actual video decoding, shorts navigation, mobile/landscape layouts, locales and required fields. `tests/translation-audit.cjs` checks dictionary coverage.

For an explicitly opted-in infrastructure test, set `RECIPE_BOOK_LIVE=1` and run `node tests/community-social-live.cjs`. It uploads a short generated test video and tests cross-visitor delivery on the configured live services, under a separate test tag so it never appears in the normal feed. It deletes its temporary comment and recipe and checks their removal. `tests/public-media-audit.cjs` only reads and attempts playback of existing public videos.

`tests/community-smoke.spec.cjs` checks the live public feed. `tests/community-publish.spec.cjs` performs an end-to-end photo or video publish, opens the shared deep link as a new visitor, and immediately deletes the clearly marked test recipe.

For a read-only production smoke test, run `node tests/live-smoke.cjs https://dohoon819.github.io/hanip-recipe/`. It opens the page, reads the public feed and checks both screen sizes without creating a session or posting content.

## Recently viewed collection

The sidebar's **Recently viewed** entry and the feed's **Recent** tab show up to 100 recipes actually opened in details or viewed in shorts, most recently viewed first. Reopening a recipe moves it to the top without duplicates. Only recipe IDs and viewing timestamps are kept under `recipe-book:recent:v1` in this browser's localStorage. The app does not publish a viewing-history event or associate history with the public author profile. Loading remembered recipes sends ordinary ID-based read queries to public relays.

History supports individual removal, confirmed clearing, reload persistence and cross-tab updates. Clearing history does not delete posts or saved bookmarks. Public recipes are fetched by exact ID when opening history, including older posts outside the latest feed, and signed author deletions are respected. If browser storage is blocked, history lasts only for the current visit. Tests: `node tests/recent-unit.cjs`, `node tests/recipe-book.spec.cjs`, `node tests/social.spec.cjs`.

## Artwork

The hero, link-preview image, favicon and interface icons are original code-native Recipe Story artwork. See [asset notes](assets/README.md).
