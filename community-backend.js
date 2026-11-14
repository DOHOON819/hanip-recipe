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
  return new Promise((resolve) => {
    const events = []; const subscription = `rb-${crypto.randomUUID().slice(0, 8)}`; let settled = false;
    const socket = new WebSocket(url);
    const finish = () => { if (settled) return; settled = true; window.clearTimeout(timer); try { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(['CLOSE', subscription])); socket.close(); } catch { /* Already closed. */ } resolve(events); };
    const timer = window.setTimeout(finish, timeoutMs);
    socket.addEventListener('open', () => socket.send(JSON.stringify(['REQ', subscription, ...filters])));
    socket.addEventListener('message', (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data[0] === 'EVENT' && data[1] === subscription && verifyEvent(data[2])) events.push(data[2]);
        if (data[0] === 'EOSE' && data[1] === subscription) finish();
      } catch { /* Ignore malformed relay messages. */ }
    });
    socket.addEventListener('error', finish); socket.addEventListener('close', finish);
  });
}

async function queryRelays(relays, filters) {
  const results = await Promise.allSettled(relays.map((relay) => queryRelay(relay, filters)));
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
  const attempts = relays.map((relay) => publishRelay(relay, event));
  try { await Promise.any(attempts); }
  catch (error) { throw error?.errors?.[0] || new Error('The recipe community is temporarily unavailable.'); }
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
      id: event.id, author_id: event.pubkey, title: value.title, description: String(value.description || '').slice(0, 600), category,
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
  const mediaUrl = config.communityMediaUrl || 'https://cdn.nostrcheck.me';
  const sign = (template) => finalizeEvent(template, secretKey);
  const profileFilter = { kinds: [PROFILE_KIND], '#t': [appTag(config)], limit: 500 };

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
      const events = await queryRelays(relays, [{ kinds: [PROFILE_KIND, RECIPE_KIND, DELETE_KIND], '#t': [appTag(config)], limit: 500 }]);
      const profileEvents = events.filter((event) => event.kind === PROFILE_KIND && tagValue(event, 'd') === 'recipe-book-profile');
      const profileLatest = new Map(); profileEvents.forEach((event) => { const previous = profileLatest.get(event.pubkey); if (!previous || previous.created_at < event.created_at) profileLatest.set(event.pubkey, event); });
      const profiles = new Map(); profileLatest.forEach((event, author) => { try { profiles.set(author, JSON.parse(event.content).displayName); } catch { /* Ignore invalid profiles. */ } });
      const deletedIds = new Set(); const deletedCoordinates = new Set();
      events.filter((event) => event.kind === DELETE_KIND).forEach((event) => { event.tags.forEach((tag) => { if (tag[0] === 'e') deletedIds.add(`${event.pubkey}:${tag[1]}`); if (tag[0] === 'a') deletedCoordinates.add(`${event.pubkey}:${tag[1]}`); }); });
      return events.filter((event) => event.kind === RECIPE_KIND && !deletedIds.has(`${event.pubkey}:${event.id}`) && !deletedCoordinates.has(`${event.pubkey}:${RECIPE_KIND}:${event.pubkey}:${tagValue(event, 'd')}`)).map((event) => safeRecipe(event, profiles)).filter(Boolean);
    },
    async upload(file, kind, onProgress) {
      if (file.size > 100 * 1024 * 1024) throw new Error('Community uploads currently support files up to 100 MB.');
      const hash = bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())));
      const auth = sign({ kind: 27235, created_at: now(), tags: [['u', mediaUrl], ['method', 'POST'], ['payload', hash]], content: '' });
      const form = new FormData(); form.append('file', file); form.append('size', String(file.size)); form.append('content_type', file.type); form.append('alt', `Recipe ${kind}`);
      onProgress?.(12, 'Securing your upload…');
      const response = await fetch(mediaUrl, { method: 'POST', headers: { Authorization: encodeAuthorization(auth) }, body: form });
      if (!response.ok) throw new Error(`The ${kind} upload failed (${response.status}). Please try again.`);
      const data = await response.json(); const tags = data?.nip94_event?.tags || []; const url = tags.find((tag) => tag[0] === 'url')?.[1]; const originalHash = tags.find((tag) => tag[0] === 'ox')?.[1] || hash;
      if (!url) throw new Error(`The ${kind} upload did not return a usable link.`);
      onProgress?.(100, 'Upload complete.'); return { url, hash: originalHash, kind };
    },
    async removeUpload(media) {
      if (!media?.hash) return;
      const url = `${mediaUrl}/${media.hash}`; const auth = sign({ kind: 27235, created_at: now(), tags: [['u', url], ['method', 'DELETE']], content: '' });
      try { await fetch(url, { method: 'DELETE', headers: { Authorization: encodeAuthorization(auth) } }); } catch { /* Recipe deletion remains successful even if media cleanup is delayed. */ }
    },
    async publishRecipe(value) {
      const d = crypto.randomUUID(); const event = sign({ kind: RECIPE_KIND, created_at: now(), tags: [['d', d], ['t', appTag(config)], ['title', value.title], ['published_at', String(now())]], content: JSON.stringify(value) });
      return publishRelays(relays, event);
    },
    async deleteRecipe(recipe) {
      const community = recipe._community; if (!community || recipe.author_id !== pubkey) throw new Error('Only the creator can delete this recipe.');
      const event = sign({ kind: DELETE_KIND, created_at: now(), tags: [['e', community.eventId], ['a', community.coordinate], ['k', String(RECIPE_KIND)], ['t', appTag(config)]], content: 'Deleted from Recipe Book' });
      await publishRelays(relays, event); await Promise.allSettled([this.removeUpload(community.media?.image), this.removeUpload(community.media?.video)]);
    }
  };
}
