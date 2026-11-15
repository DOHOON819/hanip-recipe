# Recipe Story

An English-, Korean-, and Japanese-ready mobile recipe-sharing app with a vivid citrus-and-forest identity and an original Recipe Story logo. The community feed contains only real user submissions—no invented launch posts.

## Experience

- Discover all recipes, videos, photos or your saved collection.
- Browse Korean, Japanese, Chinese, Mexican, American, French, Italian, Indian, brunch, lunchbox, quick, pasta, vegetarian, dessert and drink categories.
- Combine ingredient/title search with category, cooking-time and difficulty filters; sort by newest or quickest.
- Explore quick meals, noodles & pasta, desserts, or a random matching recipe.
- Save favorites **on the current browser/device**. Bookmarks do not sync between devices.
- Read ingredients and instructions as a cooking checklist.
- Share through three short steps: basics, recipe, then an optional photo or video.
- Upload JPG/PNG/WebP photos up to 10 MB, or MP4/WebM/MOV videos up to 100 MB. Playback depends on the browser's codec support.
- Choose full-bleed or uncropped photo framing.
- Claim or rename a unique creator name without a visible sign-up/login flow.

## Identity and data

The production app uses a no-sign-up community backend. Each browser creates a private local signing key and publishes signed recipe/profile events to redundant public relays. The key never leaves that browser; it proves ownership when deleting a recipe. A creator name is **not** a password or recovery method. Keep the same browser storage to retain ownership.

Creator names are checked case-insensitively against current community profiles before they are claimed. Signed ownership prevents someone using a different browser key from deleting another creator's recipe. Clearing browser data removes the local ownership key, so there is intentionally no password-reset flow.

Photos and videos are uploaded with signed HTTP authorization to the configured public media service. The current free tier supports JPG/PNG/WebP up to 10 MB in the interface and MP4/WebM/MOV up to 100 MB. Recipe events are replicated to the relays configured in `config.js`; media is removed on creator deletion when the host accepts the cleanup request.

The historical Supabase implementation and migrations remain available as a fallback/reference under `supabase/`. `config.js` contains only browser-safe public settings. Never put a secret/service-role key in browser code.

## Run and deploy

This is a static site with no build step. Serve the project folder with any static HTTP server. Relative asset URLs work at a GitHub Pages repository subpath and on Vercel.

- GitHub Pages: https://dohoon819.github.io/hanip-recipe/
- Existing Vercel address: https://hanip-recipe.vercel.app/

The project URL remains unchanged; the product name is now **Recipe Story**. Visitors can switch between English, 한국어, and 日本語, and their choice is remembered in the browser.

## Tests

Install a test dependency without changing the static app:

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node tests/recipe-book.spec.cjs
```

Optional environment variables: `RECIPE_BOOK_PLAYWRIGHT` (module path), `RECIPE_BOOK_BROWSER` (browser executable), `RECIPE_BOOK_TEST_OUTPUT` (screenshots, default `test-results/`).

The main browser suite intercepts the backend and uploads with in-memory fixtures. It **does not create production posts or accounts**. It covers filters, local bookmarks, cooking checks, composer validation, media switching, draft publication/rollback, duplicate names, load-error recovery, sharing and mobile overflow.

`tests/community-smoke.spec.cjs` checks the live public feed. `tests/community-publish.spec.cjs` performs an end-to-end photo or video publish, opens the shared deep link as a new visitor, and immediately deletes the clearly marked test recipe.

For a read-only production smoke test, run `node tests/live-smoke.cjs https://dohoon819.github.io/hanip-recipe/`. It opens the page, reads the public feed and checks both screen sizes without creating a session or posting content.

## Artwork

The hero, link-preview image, favicon and interface icons are original code-native Recipe Story artwork. See [asset notes](assets/README.md).
