// Only browser-safe public endpoints and the optional fallback publishable key belong here.
// Never place a Supabase secret/service-role key or a private signing key in this file.
window.HANIP_CONFIG = {
  backend: 'community',
  communityTag: 'recipe-book-global-v1',
  communityRelays: ['wss://nos.lol', 'wss://relay.primal.net', 'wss://relay.nostr.band'],
  communityMediaUrl: 'https://cdn.nostrcheck.me',
  supabaseUrl: 'https://ichjyjmqvxbdhjghvsnc.supabase.co',
  supabasePublishableKey: 'sb_publishable_pFrik80qQe2FysNGP3AB0A_Ye23bgTf'
};
