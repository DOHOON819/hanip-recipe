export const RECENT_KEY = 'recipe-book:recent:v1';
export const RECENT_LIMIT = 100;

// Only IDs and viewing times stay on this device; history is never published.
export function createRecentHistory(storage, clock = Date.now) {
  function read() {
    try {
      const raw = JSON.parse(storage.getItem(RECENT_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      const seen = new Set();
      return raw.filter(item => item && typeof item.id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(item.id) && Number.isFinite(item.viewedAt) && item.viewedAt > 0 && item.viewedAt <= clock() + 60000)
        .sort((a,b) => b.viewedAt - a.viewedAt)
        .filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; })
        .slice(0, RECENT_LIMIT).map(({id, viewedAt}) => ({id, viewedAt}));
    } catch { return []; }
  }
  let entries = read();
  const persist = () => { try { storage.setItem(RECENT_KEY, JSON.stringify(entries)); return true; } catch { return false; } };
  return {
    list: () => entries.map(item => ({...item})),
    sync() { entries = read(); },
    record(id) {
      if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return true;
      // Merge another tab's changes before adding this view.
      const merged = new Map();
      for (const item of [...read(), ...entries]) if (!merged.has(item.id) || merged.get(item.id).viewedAt < item.viewedAt) merged.set(item.id,item);
      const viewedAt = Math.max(clock(), ...[...merged.values()].map(item => item.viewedAt + 1));
      entries = [{id, viewedAt}, ...[...merged.values()].filter(item => item.id !== id).sort((a,b) => b.viewedAt-a.viewedAt)].slice(0,RECENT_LIMIT);
      return persist();
    },
    remove(id) { entries = entries.filter(item => item.id !== id); return persist(); },
    clear() { entries = []; return persist(); }
  };
}
