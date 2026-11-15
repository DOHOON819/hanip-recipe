import { finalizeEvent, generateSecretKey, getPublicKey, verifyEvent } from 'https://cdn.jsdelivr.net/npm/nostr-tools@2/+esm';

const KEY_STORAGE = 'recipe-book:community-key:v1';
const PROFILE_KIND = 30078;
const RECIPE_KIND = 30023;
const DELETE_KIND = 5;

function bytesToHex(bytes) { return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(hex) { return new Uint8Array((hex.match(/.{2}/g) || []).map((byte) => Number.parseInt(byte, 16))); }
function now() { return Math.floor(Date.now() / 1000); }
function appTag(config) { return config.communityTag || 'recipe-book-global-v1'; }
function tagValue(event, name) { return event.tags?.find((tag) => tag[0] === name)?.[1] || ''; }
function normalizeName(name) { return String(name || '').trim().normalize('NFKC').toLocaleLowerCase(); }

function loadSecretKey() {
  try {
    const stored = localStorage.getItem(KEY_STORAGE);
    if (stored && /^[0-9a-f]{64}$/i.test(stored)) return hexToBytes(stored);
  } catch { /* A session-only key is still better than blocking the editor. */ }
  const secret = generateSecretKey();
  try { localStorage.setItem(KEY_STORAGE, bytesToHex(secret)); } catch { /* Browser storage can be unavailable. */ }
  return secret;
}

function queryRelay(url, filters, timeoutMs = 6500) {
  return new Promise((resolve, reject) => {
    const events = []; const subscription = `rb-${crypto.randomUUID().slice(0, 8)}`; let settled = false;
    const socket = new WebSocket(url);
    const finish = (complete = false) => { if (settled) return; settled = true; window.clearTimeout(timer); try { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(['CLOSE', subscription])); socket.close(); } catch { /* Already closed. */ } complete ? resolve(events) : reject(new Error('Connection lost. Check your internet connection and try again.')); };
    const timer = window.setTimeout(() => finish(), timeoutMs);
    socket.addEventListener('open', () => socket.send(JSON.stringify(['REQ', subscription, ...filters])));
    socket.addEventListener('message', (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data[0] === 'EVENT' && data[1] === subscription && verifyEvent(data[2])) events.push(data[2]);
        if (data[0] === 'EOSE' && data[1] === subscription) finish(true);
      } catch { /* Ignore malformed relay messages. */ }
    });
    socket.addEventListener('error', () => finish()); socket.addEventListener('close', () => finish());
  });
}

async function queryRelays(relays, filters) {
  const results = await Promise.allSettled(relays.map((relay) => queryRelay(relay, filters)));
  if (!results.some(result => result.status === 'fulfilled')) throw new Error('Connection lost. Check your internet connection and try again.');
  const unique = new Map();
  results.forEach((result) => { if (result.status === 'fulfilled') result.value.forEach((event) => unique.set(event.id, event)); });
  return [...unique.values()];
}

function publishRelay(url, event, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url); let settled = false;
    const finish = (error) => { if (settled) return; settled = true; window.clearTimeout(timer); try { socket.close(); } catch { /* Already closed. */ } error ? reject(error) : resolve(); };
    const timer = window.setTimeout(() => finish(new Error('A community relay did not respond.')), timeoutMs);
    socket.addEventListener('open', () => socket.send(JSON.stringify(['EVENT', event])));
    socket.addEventListener('message', (message) => {
      try { const data = JSON.parse(message.data); if (data[0] === 'OK' && data[1] === event.id) finish(data[2] ? null : new Error(data[3] || 'The community relay rejected this recipe.')); } catch { /* Wait for another response. */ }
    });
    socket.addEventListener('error', () => finish(new Error('Could not reach a community relay.')));
  });
}

async function publishRelays(relays, event) {
  const attempts = await Promise.allSettled(relays.map((relay) => publishRelay(relay, event)));
  if (!attempts.some(result => result.status === 'fulfilled')) throw new Error('Connection lost. Check your internet connection and try again.');
  return event;
}

function safeRecipe(event, profiles) {
  try {
    const value = JSON.parse(event.content); const category = String(value.category || '');
    if (!value || typeof value.title !== 'string' || value.title.length < 2 || value.title.length > 80) return null;
    if (!Number.isInteger(value.cook_minutes) || value.cook_minutes < 1 || value.cook_minutes > 600) return null;
    if (!Array.isArray(value.recipe_ingredients) || !Array.isArray(value.recipe_steps)) return null;
    const media = value.media && typeof value.media === 'object' ? value.media : {};
    return {
      id: event.id, author_id: event.pubkey, title: value.title, description: String(value.description || '').slice(0, 2000), category, cuisine: String(value.cuisine || ''),
      cook_minutes: value.cook_minutes, servings: Number(value.servings) || 1, difficulty: String(value.difficulty || '쉬움'),
      video_url: media.video?.url || null, image_url: media.image?.url || null, image_fit: value.image_fit === 'contain' ? 'contain' : 'cover',
      created_at: new Date(event.created_at * 1000).toISOString(), profiles: { display_name: profiles.get(event.pubkey) || String(value.author_name || 'Home cook') },
      recipe_ingredients: value.recipe_ingredients.slice(0, 40).map((item, position) => ({ position, item: String(item.item || '').slice(0, 120), quantity: String(item.quantity || '').slice(0, 60) })),
      recipe_steps: value.recipe_steps.slice(0, 40).map((instruction, position) => ({ position, instruction: String(instruction || '').slice(0, 500) })),
      _community: { eventId: event.id, coordinate: `${RECIPE_KIND}:${event.pubkey}:${tagValue(event, 'd')}`, media }
    };
  } catch { return null; }
}

function encodeAuthorization(event) {
  return `Nostr ${btoa(unescape(encodeURIComponent(JSON.stringify(event))))}`;
}

export function createCommunityBackend(config) {
  const secretKey = loadSecretKey(); const pubkey = getPublicKey(secretKey);
  const relays = config.communityRelays || ['wss://nos.lol', 'wss://relay.primal.net', 'wss://relay.nostr.band'];
  const mediaUrls = config.communityMediaUrls || [config.communityMediaUrl || 'https://nostrage.com/api/v2/media', 'https://cdn.nostrcheck.me'];
  const sign = (template) => finalizeEvent(template, secretKey);
  const reactionTimes = new Map();
  const profileFilter = { kinds: [PROFILE_KIND], '#d': ['recipe-book-profile'], '#t': [appTag(config)], limit: 500 };

  async function loadProfiles() {
    const events = await queryRelays(relays, [profileFilter]); const latest = new Map();
    events.forEach((event) => { if (tagValue(event, 'd') !== 'recipe-book-profile') return; const previous = latest.get(event.pubkey); if (!previous || previous.created_at < event.created_at) latest.set(event.pubkey, event); });
    const profiles = new Map();
    latest.forEach((event, author) => { try { const name = JSON.parse(event.content).displayName; if (typeof name === 'string' && name.trim().length >= 2) profiles.set(author, name.trim().slice(0, 40)); } catch { /* Ignore invalid profiles. */ } });
    return { profiles, events: latest };
  }

  return {
    session() { return { user: { id: pubkey } }; },
    async creatorName() { return (await loadProfiles()).profiles.get(pubkey) || ''; },
    async claimName(displayName) {
      const name = String(displayName || '').trim();
      if (name.length < 2 || name.length > 40) throw new Error('Your name must be between 2 and 40 characters.');
      const { profiles } = await loadProfiles(); const wanted = normalizeName(name);
      for (const [author, existing] of profiles) if (author !== pubkey && normalizeName(existing) === wanted) { const error = new Error('That name is already taken. Please choose a different name.'); error.code = '23505'; throw error; }
      const event = sign({ kind: PROFILE_KIND, created_at: now(), tags: [['d', 'recipe-book-profile'], ['t', appTag(config)]], content: JSON.stringify({ displayName: name }) });
      await publishRelays(relays, event); return name;
    },
    async loadRecipes() {
      const events = await queryRelays(relays, [profileFilter, { kinds: [RECIPE_KIND], '#t': [appTag(config)], limit: 500 }, { kinds: [DELETE_KIND], '#t': [appTag(config)], '#k': [String(RECIPE_KIND)], limit: 1000 }]);
      const profileEvents = events.filter((event) => event.kind === PROFILE_KIND && tagValue(event, 'd') === 'recipe-book-profile');
      const profileLatest = new Map(); profileEvents.forEach((event) => { const previous = profileLatest.get(event.pubkey); if (!previous || previous.created_at < event.created_at) profileLatest.set(event.pubkey, event); });
      const profiles = new Map(); profileLatest.forEach((event, author) => { try { profiles.set(author, JSON.parse(event.content).displayName); } catch { /* Ignore invalid profiles. */ } });
      const deletedIds = new Set(); const deletedCoordinates = new Set();
      events.filter((event) => event.kind === DELETE_KIND).forEach((event) => { event.tags.forEach((tag) => { if (tag[0] === 'e') deletedIds.add(`${event.pubkey}:${tag[1]}`); if (tag[0] === 'a') deletedCoordinates.add(`${event.pubkey}:${tag[1]}`); }); });
      return events.filter((event) => event.kind === RECIPE_KIND && tagValue(event, 't') === appTag(config) && !deletedIds.has(`${event.pubkey}:${event.id}`) && !deletedCoordinates.has(`${event.pubkey}:${RECIPE_KIND}:${event.pubkey}:${tagValue(event, 'd')}`)).map((event) => safeRecipe(event, profiles)).filter(Boolean);
    },
    async loadRecipe(id) {
      if (!/^[0-9a-f]{64}$/.test(id)) return null;
      const events = await queryRelays(relays, [{ ids: [id], kinds: [RECIPE_KIND] }]);
      const event = events.find(item => item.id === id && tagValue(item, 't') === appTag(config));
      if (!event) return null;
      const coordinate = `${RECIPE_KIND}:${event.pubkey}:${tagValue(event, 'd')}`;
      const related = await queryRelays(relays, [
        { kinds: [DELETE_KIND], authors: [event.pubkey], '#e': [id], '#k': [String(RECIPE_KIND)] },
        { kinds: [DELETE_KIND], authors: [event.pubkey], '#a': [coordinate], '#k': [String(RECIPE_KIND)] },
        { kinds: [PROFILE_KIND], authors: [event.pubkey], '#d': ['recipe-book-profile'], '#t': [appTag(config)] }
      ]);
      if (related.some(item => item.kind === DELETE_KIND && item.pubkey === event.pubkey && item.tags.some(tag => (tag[0] === 'e' && tag[1] === id) || (tag[0] === 'a' && tag[1] === coordinate && item.created_at >= event.created_at)))) return null;
      const profile = related.filter(item => item.kind === PROFILE_KIND).sort((a,b) => b.created_at-a.created_at)[0];
      const profiles = new Map(); try { if (profile) profiles.set(event.pubkey, JSON.parse(profile.content).displayName); } catch { /* Use recipe byline. */ }
      return safeRecipe(event, profiles);
    },
    async loadSocial(recipeId) {
      const events = await queryRelays(relays, [{ kinds: [PROFILE_KIND, 1], '#t': [appTag(config)], '#e': [recipeId], limit: 2000 }, { kinds: [DELETE_KIND], '#t': [appTag(config)], '#r': [recipeId], limit: 2000 }]);
      const latest = new Map(); const comments = []; const deleted = new Set();
      for (const event of events) if (event.kind === DELETE_KIND) for (const tag of event.tags) if (tag[0] === 'e') deleted.add(`${event.pubkey}:${tag[1]}`);
      for (const event of events) {
        if (!event.tags.some(tag => tag[0] === 'e' && tag[1] === recipeId) || tagValue(event, 't') !== appTag(config)) continue;
        try {
          const value = JSON.parse(event.content);
          if (event.kind === PROFILE_KIND && tagValue(event, 'd') === `recipe-reaction:${recipeId}` && typeof value.heart === 'boolean' && [-1,0,1].includes(value.vote)) {
            const old = latest.get(event.pubkey);
            if (!old || old.created_at < event.created_at || (old.created_at === event.created_at && event.id < old.id)) latest.set(event.pubkey, { ...value, id: event.id, created_at: event.created_at });
          }
          if (event.kind === 1 && value.type === 'recipe-comment' && typeof value.body === 'string' && value.body.trim() && value.body.length <= 1000 && !deleted.has(`${event.pubkey}:${event.id}`)) comments.push({ id: event.id, author_id: event.pubkey, name: String(value.name || 'Home cook').slice(0,40), body: value.body, created_at: event.created_at });
        } catch { /* Ignore unrelated or malformed events. */ }
      }
      const mine = latest.get(pubkey) || { heart: false, vote: 0 };
      reactionTimes.set(recipeId, Math.max(reactionTimes.get(recipeId) || 0, mine.created_at || 0));
      return { hearts: [...latest.values()].filter(v => v.heart).length, likes: [...latest.values()].filter(v => v.vote === 1).length, dislikes: [...latest.values()].filter(v => v.vote === -1).length, mine, comments: comments.sort((a,b) => a.created_at-b.created_at || a.id.localeCompare(b.id)) };
    },
    async react(recipeId, value) {
      if (!/^[0-9a-f]{64}$/.test(recipeId) || typeof value.heart !== 'boolean' || ![-1,0,1].includes(value.vote)) throw new Error('Invalid reaction.');
      // Addressable events replace the previous vote. Avoid same-second ties on rapid taps.
      const timestamp = Math.max(now(), (reactionTimes.get(recipeId) || 0) + 1);
      const event = sign({ kind: PROFILE_KIND, created_at: timestamp, tags: [['d', `recipe-reaction:${recipeId}`], ['t', appTag(config)], ['e', recipeId]], content: JSON.stringify({ heart: value.heart, vote: value.vote }) });
      await publishRelays(relays, event); reactionTimes.set(recipeId, timestamp);
    },
    async addComment(recipeId, body, name) {
      body = String(body || '').trim(); name = String(name || '').trim();
      if (!/^[0-9a-f]{64}$/.test(recipeId) || !body || body.length > 1000 || name.length < 2 || name.length > 40) throw new Error('Check your name and comment.');
      return publishRelays(relays, sign({ kind: 1, created_at: now(), tags: [['t', appTag(config)], ['e', recipeId]], content: JSON.stringify({ type: 'recipe-comment', body, name }) }));
    },
    async deleteComment(recipeId, comment) {
      if (comment.author_id !== pubkey) throw new Error('Only the author can delete this comment.');
      return publishRelays(relays, sign({ kind: DELETE_KIND, created_at: now(), tags: [['e', comment.id], ['r', recipeId], ['k', '1'], ['t', appTag(config)]], content: 'Deleted comment' }));
    },
    async upload(file, kind, onProgress) {
      if (file.size > 100 * 1024 * 1024) throw new Error('Community uploads currently support files up to 100 MB.');
      const hash = bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())));
      let lastError = null;
      for (const [index, mediaUrl] of mediaUrls.entries()) {
        const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 120000);
        try {
          const auth = sign({ kind: 27235, created_at: now(), tags: [['u', mediaUrl], ['method', 'POST']], content: '' });
          const form = new FormData(); form.append('file', file); form.append('size', String(file.size)); form.append('content_type', file.type); form.append('alt', `Recipe ${kind}`);
          onProgress?.(index ? 35 : 12, index ? 'Trying the backup upload service…' : 'Securing your upload…');
          const response = await fetch(mediaUrl, { method: 'POST', headers: { Authorization: encodeAuthorization(auth) }, body: form, signal: controller.signal });
          if (!response.ok) throw new Error(`The ${kind} upload service returned ${response.status}.`);
          const data = await response.json(); const tags = data?.nip94_event?.tags || []; const url = tags.find((tag) => tag[0] === 'url')?.[1]; const originalHash = tags.find((tag) => tag[0] === 'ox')?.[1] || hash;
          if (!url) throw new Error(`The ${kind} upload did not return a usable link.`);
          onProgress?.(100, 'Upload complete.'); return { url, hash: originalHash, kind, server: mediaUrl };
        } catch (error) { lastError = error; }
        finally { window.clearTimeout(timeout); }
      }
      throw lastError || new Error(`The ${kind} could not upload. Please try again.`);
    },
    async removeUpload(media) {
      if (!media?.hash) return;
      const url = `${media.server || mediaUrls[0]}/${media.hash}`; const auth = sign({ kind: 27235, created_at: now(), tags: [['u', url], ['method', 'DELETE']], content: '' });
      const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 15000);
      try { await fetch(url, { method: 'DELETE', headers: { Authorization: encodeAuthorization(auth) }, signal: controller.signal }); } catch { /* Recipe deletion remains successful even if media cleanup is delayed. */ }
      finally { window.clearTimeout(timeout); }
    },
    async publishRecipe(value) {
      if (typeof value.title !== 'string' || value.title.trim().length < 2 || value.title.length > 80 || typeof value.description !== 'string' || value.description.trim().length < 20 || value.description.length > 2000 || !value.cuisine || !value.category || !['쉬움','보통','어려움'].includes(value.difficulty) || !value.author_name?.trim() || !Number.isInteger(value.cook_minutes) || value.cook_minutes < 1 || value.cook_minutes > 600 || !Number.isInteger(value.servings) || value.servings < 1 || value.servings > 50 || !value.recipe_ingredients?.length || value.recipe_ingredients.length > 40 || value.recipe_ingredients.some(item => !item.item?.trim() || !item.quantity?.trim()) || !value.recipe_steps?.length || value.recipe_steps.length > 40 || value.recipe_steps.some(step => typeof step !== 'string' || step.trim().length < 10 || step.length > 500)) throw new Error('Complete all required recipe fields.');
      const d = crypto.randomUUID(); const event = sign({ kind: RECIPE_KIND, created_at: now(), tags: [['d', d], ['t', appTag(config)], ['title', value.title], ['published_at', String(now())]], content: JSON.stringify(value) });
      return publishRelays(relays, event);
    },
    async deleteRecipe(recipe) {
      const community = recipe._community; if (!community || recipe.author_id !== pubkey) throw new Error('Only the creator can delete this recipe.');
      const event = sign({ kind: DELETE_KIND, created_at: now(), tags: [['e', community.eventId], ['a', community.coordinate], ['k', String(RECIPE_KIND)], ['t', appTag(config)]], content: 'Deleted from Recipe Story' });
      await publishRelays(relays, event); await Promise.allSettled([this.removeUpload(community.media?.image), this.removeUpload(community.media?.video)]);
    }
  };
}
