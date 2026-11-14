# Recipe Book

An English-first, mobile-friendly recipe-sharing app. Warm ivory, forest-green details and an original food photograph give it a modern cookbook identity without filling the community feed with invented posts.

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

Supabase anonymous authentication identifies the owner of a recipe. A creator name is **not** a password, recovery method or transferable login. Keep the same browser and its storage to retain ownership. A different origin (for example GitHub Pages versus Vercel) has separate browser storage and therefore a different anonymous session.

Existing database values and IDs are preserved. English UI labels map to the stored category/difficulty values. Existing Supabase projects must run `supabase/add-global-recipe-categories.sql` once before publishing with a newly added category.

The SQL files under `supabase/` document the schema and historical updates. Existing deployments already have their schema; do not rerun migrations blindly. New installations must configure anonymous sign-ins, profiles, recipes, ingredients, steps, image/video storage and their RLS policies. Display-name uniqueness and ownership enforcement belong in the database, not only the interface.

Publishing uses a draft followed by ingredients/steps, then a published state. Failed final responses are checked before cleanup; uncertain results preserve the recipe and attachments and offer a status check.

`config.js` contains only the public Supabase URL and publishable key. Never put a secret/service-role key in browser code.

## Run and deploy

This is a static site with no build step. Serve the project folder with any static HTTP server. Relative asset URLs work at a GitHub Pages repository subpath and on Vercel.

- GitHub Pages: https://dohoon819.github.io/hanip-recipe/
- Existing Vercel address: https://hanip-recipe.vercel.app/

The project URL remains unchanged; the product name is now **Recipe Book**.

## Tests

Install a test dependency without changing the static app:

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node tests/recipe-book.spec.cjs
```

Optional environment variables: `RECIPE_BOOK_PLAYWRIGHT` (module path), `RECIPE_BOOK_BROWSER` (browser executable), `RECIPE_BOOK_TEST_OUTPUT` (screenshots, default `test-results/`).

The browser suite intercepts Supabase and uploads with in-memory fixtures. It **does not create production posts or accounts**. It covers filters, local bookmarks, cooking checks, composer validation, media switching, draft publication/rollback, duplicate names, load-error recovery and mobile overflow.

For a read-only production smoke test, run `node tests/live-smoke.cjs https://dohoon819.github.io/hanip-recipe/`. It opens the page, reads the public feed and checks both screen sizes without creating a session or posting content.

## Artwork

The hero is decorative brand artwork, not a community recipe or endorsement. See [asset provenance](assets/README.md) for its generation prompt. The favicon and interface icons are code-native SVG.
