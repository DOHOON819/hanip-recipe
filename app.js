import { createCommunityBackend } from './community-backend.js?v=20261115-quick-post-v1';
import { createSocialExperience, checkVideo } from './social.js?v=20261115-privacy-v1';
import { applyTranslations, byline, confirmDelete, getLanguage, localizeCount, localizeMinutes, localizeServings, setLanguage, t } from './i18n.js?v=20261115-quick-post-v1';
import { createRecentHistory, RECENT_KEY } from './recent.js?v=20261115-recent-v1';
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const config = window.HANIP_CONFIG;
const CATEGORY_LABELS = {
  '한식': 'Korean',
  '일식': 'Japanese',
  '중식': 'Chinese',
  '멕시칸': 'Mexican',
  '아메리칸': 'American',
  '프렌치': 'French',
  '이탈리안': 'Italian',
  '인도식': 'Indian',
  '아랍식': 'Arab',
  '호주식': 'Australian',
  '브런치': 'Brunch',
  '도시락': 'Lunchbox',
  '간편식': 'Quick & Easy',
  '면·파스타': 'Noodles & Pasta',
  '채식': 'Vegetarian',
  '디저트': 'Desserts',
  '음료': 'Drinks',
  '기타': 'Other'
};
const DIFFICULTY_LABELS = { '쉬움': 'Easy', '보통': 'Medium', '어려움': 'Advanced' };
const SAVED_KEY = 'recipe-book:saved:v1';
let historyStorage; try { historyStorage = window.localStorage; } catch { historyStorage = null; }
const recentHistory = createRecentHistory(historyStorage);
let historyRecipes = null, historyLoading = false, historyError = false, historyRequest = 0, historyStorageWarned = false;
const state = { session: null, creatorName: '', recipes: [], view: 'all', selectedFile: null, selectedImage: null, mediaMode: 'none', previewUrl: null, step: 3, publishing: false, pendingPublication: null, loading: true, loadError: false, toastTimer: null, detailId: null, saved: readSaved() };
const elements = { composer: $('#composerDialog'), detail: $('#detailDialog'), form: $('#recipeForm'), grid: $('#recipeGrid'), status: $('#feedStatus'), empty: $('#emptyState'), search: $('#searchInput'), category: $('#categoryFilter'), time: $('#timeFilter'), difficulty: $('#difficultyFilter'), sort: $('#sortFilter'), message: $('#recipeMessage'), toast: $('#toast') };
const community = config?.backend === 'community' && !window.__mockClient ? createCommunityBackend(config) : null;
let supabase = null;
if (!community && config?.supabaseUrl && config?.supabasePublishableKey) { const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'); supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); }
const CUISINES = ['Korean','Japanese','Chinese','Mexican','American','French','Italian','Indian','Arab','Australian','Other cuisine'];
const social = createSocialExperience({ backend: community, getRecipes: () => filteredRecipes(), getName: () => state.creatorName, getUser: () => state.session?.user?.id, openProfile: () => openProfile(), openRecipe: recipe => renderRecipeDetail(recipe), onView: recipe => rememberRecipe(recipe), share: recipe => shareRecipe(recipe), toast: showToast, categoryLabel, difficultyLabel });
$('#recipeCuisine').innerHTML = `<option value="">${t('Choose a cuisine')}</option>` + CUISINES.map(c => `<option value="${c}">${t(c)}</option>`).join('');
for (const select of [$('#recipeCategory'), $('#categoryFilter')]) for (const [value, label] of [['아랍식','Arab'],['호주식','Australian']]) { const option = new Option(label, value); select.querySelector('optgroup').append(option); }
$('.category-nav [data-category="인도식"]').insertAdjacentHTML('afterend', '<button data-category="아랍식"><span class="category-dot tone-16"></span>Arab</button><button data-category="호주식"><span class="category-dot tone-17"></span>Australian</button>');
$('.side-nav [data-view="saved"]').insertAdjacentHTML('afterend', `<button type="button" data-view="recent">${icon('clock')}<span>Recently viewed</span><span class="count" id="recentCount">0</span></button>`);
$('.media-feed-tabs').insertAdjacentHTML('beforeend', `<button type="button" data-media-filter="recent" aria-pressed="false">${icon('clock')}<span>Recent</span></button>`);
$('.feed-toolbar').insertAdjacentHTML('afterend', '<div id="recentTools" class="recent-tools" hidden><p id="historyNotice" role="status"></p><button type="button" id="clearHistory" class="text-button">Clear viewing history</button></div>');
const australian = new Option('English (Australia)', 'en-AU'); $('#languageSelect').insertBefore(australian, $('#languageSelect').options[1]);
$('#profileLabel').classList.remove('sr-only'); $('#profileLabel').setAttribute('data-no-translate', ''); $('.language-picker').after($('#profileButton'));
$('#feedStatus').insertAdjacentHTML('afterend', `<button type="button" id="refreshFeed" class="text-button">${icon('refresh')}<span>${t('Refresh recipes')}</span></button>`);
$('#refreshFeed').addEventListener('click', async event => { const button = event.currentTarget; button.disabled = true; try { await loadRecipes(); } finally { button.disabled = false; } });
applyTranslations();
for (const control of $$('input:not([type=number]):not([type=file]),textarea')) control.dir = 'auto';

function escapeHtml(value = '') { return String(value ?? '').replace(/[&<>\"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
function safeUrl(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
function icon(name) { return `<svg class="icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`; }
function categoryLabel(value) { return t(CATEGORY_LABELS[value] || value || 'Other'); }
function difficultyLabel(value) { return t(DIFFICULTY_LABELS[value] || value || 'Easy'); }
function readSaved() { try { const value = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); return new Set(Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []); } catch { return new Set(); } }
function writeSaved() { try { localStorage.setItem(SAVED_KEY, JSON.stringify([...state.saved])); return true; } catch { return false; } }
function historyPersisted(ok) {
  if (!ok && !historyStorageWarned) { historyStorageWarned = true; showToast(t('Viewing history is only saved for this visit because browser storage is blocked.')); }
}
function rememberRecipe(recipe) {
  historyPersisted(recentHistory.record(recipe.id));
  if (historyRecipes) historyRecipes = [recipe, ...historyRecipes.filter(item => item.id !== recipe.id)];
  if (state.view === 'recent') renderRecipes(); else updateViewControls();
}
async function loadRecentRecipes() {
  const request = ++historyRequest, ids = recentHistory.list().map(item => item.id);
  historyLoading = true; historyError = false; renderRecipes();
  try {
    const recipes = community ? await community.loadRecipesByIds(ids) : state.recipes.filter(recipe => ids.includes(recipe.id));
    if (request !== historyRequest) return;
    historyRecipes = recipes;
  } catch { if (request === historyRequest) historyError = true; }
  finally { if (request === historyRequest) { historyLoading = false; renderRecipes(); } }
}
function findRecipe(id) { return state.recipes.find(recipe => recipe.id === id) || historyRecipes?.find(recipe => recipe.id === id); }
function removeHistory(id) {
  historyPersisted(recentHistory.remove(id));
  renderRecipes(); showToast(t('Removed from viewing history.'));
}
function showToast(message) { window.clearTimeout(state.toastTimer); elements.toast.textContent = message; elements.toast.classList.add('show'); state.toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 3800); }
function openDialog(dialog) { if (dialog && !dialog.open) dialog.showModal(); }
function closeDialog(dialog) { if (dialog === elements.composer && state.publishing) return; if (dialog?.open) dialog.close(); }
function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.code === '23505') return t('That name is already taken. Please choose a different name.');
  if (error?.code === '23514') return t('Please check the recipe fields and their limits, then try again.');
  if (error?.code === '42501') return t('This browser does not have permission to make that change.');
  if (/fetch|network|offline/i.test(error?.message || '')) return t('Connection lost. Check your internet connection and try again.');
  return t(error?.message || fallback);
}
async function ensureGuestSession() {
  if (community) { state.session ||= community.session(); return state.session; }
  if (!supabase) throw new Error(t('Recipe sharing is temporarily unavailable. Please try again later.'));
  if (state.session?.user) return state.session;
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (session?.user) { state.session = session; return session; }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(t('We could not prepare your guest profile. Please try again in a moment.'));
  state.session = data.session; return data.session;
}
async function refreshCreatorName() {
  if (!state.session?.user) return;
  if (community) state.creatorName = await community.creatorName();
  else {
    if (!supabase) return;
    const { data, error } = await supabase.from('profiles').select('display_name').eq('id', state.session.user.id).maybeSingle();
    if (error) throw error;
    state.creatorName = data?.display_name || '';
  }
  updateProfileLabel();
  if ($('#profileName')) $('#profileName').value = state.creatorName;
  if (!$('#authorName').value.trim()) $('#authorName').value = state.creatorName;
}
function updateProfileLabel() {
  const label = $('#profileLabel');
  if (label) label.textContent = state.creatorName || t('Your kitchen'); else if ($('#profileButton')) $('#profileButton').textContent = state.creatorName || t('Your kitchen');
  if ($('#profileButton')) { $('#profileButton').setAttribute('aria-label', state.creatorName ? `${t('Your kitchen')}: ${state.creatorName}. ${t('Change creator name')}` : t('Choose your creator name')); $('#profileButton').title = state.creatorName || t('Your kitchen'); }
}
async function claimCreatorName(user, displayName) {
  const name = String(displayName || '').trim();
  if (name.length < 2 || name.length > 40) throw new Error(t('Your name must be between 2 and 40 characters.'));
  if (community) { state.creatorName = await community.claimName(name); return; }
  const { data: existing, error: lookupError } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.display_name === name) { state.creatorName = name; return; }
  const result = existing ? await supabase.from('profiles').update({ display_name: name }).eq('id', user.id) : await supabase.from('profiles').insert({ id: user.id, display_name: name });
  if (result.error) throw result.error;
  state.creatorName = name;
}
async function loadRecipes() {
  state.loading = true; state.loadError = false;
  elements.status.textContent = t('Finding something delicious…'); elements.grid.setAttribute('aria-busy', 'true'); elements.empty.hidden = true;
  try {
    if (community) state.recipes = await community.loadRecipes();
    else {
      if (!supabase) throw new Error(t('Recipe connection is unavailable.'));
      const { data, error } = await supabase.from('recipes').select('id, author_id, title, description, category, cook_minutes, servings, difficulty, video_url, image_url, image_fit, created_at, profiles(display_name), recipe_ingredients(position, item, quantity), recipe_steps(position, instruction)').eq('visibility', 'published').order('created_at', { ascending: false });
      if (error) throw error;
      state.recipes = data || [];
    }
  } catch { state.loadError = true; state.recipes = []; }
  finally { state.loading = false; elements.grid.setAttribute('aria-busy', 'false'); renderRecipes(); if (state.view === 'recent') await loadRecentRecipes(); }
}
function filteredRecipes() {
  const term = elements.search.value.trim().toLocaleLowerCase(); const category = elements.category.value; const time = Number(elements.time?.value) || Infinity; const difficulty = elements.difficulty?.value || '';
  const viewed = new Map(recentHistory.list().map(item => [item.id,item.viewedAt]));
  const recipes = (state.view === 'recent' ? historyRecipes || state.recipes : state.recipes).filter((recipe) => {
    const text = [recipe.title, recipe.description, recipe.category, categoryLabel(recipe.category), recipe.profiles?.display_name, ...(recipe.recipe_ingredients || []).map((item) => item.item)].join(' ').toLocaleLowerCase();
    const mediaMatch = state.view === 'all' || (state.view === 'recent' && viewed.has(recipe.id)) || (state.view === 'saved' && state.saved.has(recipe.id)) || (state.view === 'video' && Boolean(recipe.video_url)) || (state.view === 'image' && Boolean(recipe.image_url) && !recipe.video_url);
    return mediaMatch && (!term || text.includes(term)) && (!category || recipe.category === category) && Number(recipe.cook_minutes) <= time && (!difficulty || recipe.difficulty === difficulty);
  });
  if (state.view === 'recent') recipes.sort((a,b) => viewed.get(b.id)-viewed.get(a.id));
  else if (['quickest', 'fastest'].includes(elements.sort?.value)) recipes.sort((a, b) => a.cook_minutes - b.cook_minutes || new Date(b.created_at) - new Date(a.created_at));
  else recipes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return recipes;
}
function hasFilters() { return Boolean(elements.search.value.trim() || elements.category.value || elements.time?.value || elements.difficulty?.value); }
function updateViewControls() {
  $$('[data-quick]').forEach((button) => { const plain = state.view === 'all' && !elements.search.value.trim() && !elements.difficulty.value; const active = plain && (button.dataset.quick === 'quick' ? elements.time.value === '30' && !elements.category.value : button.dataset.quick === 'comfort' ? elements.category.value === '면·파스타' && !elements.time.value : elements.category.value === '디저트' && !elements.time.value); button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  $$('[data-view], [data-media-filter]').forEach((button) => { const active = (button.dataset.view || button.dataset.mediaFilter) === state.view; button.classList.toggle('active', active); if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active)); else button.setAttribute('aria-pressed', String(active)); });
  $$('[data-category]').forEach((button) => { const active = button.dataset.category === elements.category.value; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  const titles = { all: 'Find your next favorite.', video: 'Watch. Cook. Repeat.', image: 'A little visual inspiration.', saved: 'Your recipe collection.', recent: 'Your recently viewed recipes.' };
  const subtitles = { all: 'Good food starts with a good idea.', video: 'Real cooking, one short video at a time.', image: 'Discover dishes worth making your own.', saved: 'Your favorites, saved on this device. Ready when you are.', recent: 'Up to 100 recipes you opened or watched in shorts, newest first. Private to this browser.' };
  $('#feedTitle').textContent = t(titles[state.view]); if ($('#feedSubtitle')) $('#feedSubtitle').textContent = t(subtitles[state.view]);
  if ($('#savedCount')) $('#savedCount').textContent = String(state.recipes.filter((recipe) => state.saved.has(recipe.id)).length);
  $('#recentCount').textContent = String(recentHistory.list().length);
  $('#recentTools').hidden = state.view !== 'recent';
  $('#clearHistory').hidden = recentHistory.list().length === 0;
  $('#historyNotice').textContent = t(historyLoading ? 'Loading your viewing history…' : historyError ? 'Some recently viewed recipes could not be checked. Refresh to try again.' : 'Deleted or unavailable recipes are not shown.');
  elements.sort.disabled = state.view === 'recent';
  // Keep the mobile library destination highlighted while its history view is open.
  if (state.view === 'recent') { const library = $('.mobile-nav [data-view="saved"]'); library?.classList.add('active'); library?.setAttribute('aria-pressed', 'true'); }
}
function renderRecipes() {
  updateViewControls(); const recipes = filteredRecipes();
  elements.grid.innerHTML = recipes.map((recipe) => {
    const author = recipe.profiles?.display_name || t('Home cook'); const initial = Array.from(author)[0] || 'R';
    const videoUrl = safeUrl(recipe.video_url); const imageUrl = safeUrl(recipe.image_url); const mediaKind = videoUrl ? 'video' : imageUrl ? 'image' : 'recipe'; const fit = recipe.image_fit === 'contain' ? 'contain' : 'cover';
    const media = videoUrl ? `<video src="${escapeHtml(videoUrl)}"${imageUrl ? ` poster="${escapeHtml(imageUrl)}"` : ''} muted playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video>` : imageUrl ? `<img class="photo-${fit}" src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" />` : `<div class="media-placeholder">${icon('utensils')}<span>${escapeHtml(t('Made to be shared.'))}</span></div>`;
    const saved = state.saved.has(recipe.id);
    return `<article class="recipe-card is-${mediaKind}"><div class="card-media">${media}<button class="card-open" type="button" data-recipe-id="${escapeHtml(recipe.id)}" aria-label="${escapeHtml(t('Open'))} ${escapeHtml(recipe.title)}">${mediaKind === 'video' ? `<span class="play-circle">${icon('play')}</span>` : ''}</button><span class="media-badge">${icon(mediaKind === 'video' ? 'play' : mediaKind === 'image' ? 'image' : 'book')}${escapeHtml(t(mediaKind === 'video' ? 'Video' : mediaKind === 'image' ? 'Photo' : 'Recipe'))}</span><button class="save-button${saved ? ' is-saved' : ''}" type="button" data-save-id="${escapeHtml(recipe.id)}" aria-pressed="${saved}" aria-label="${escapeHtml(t(saved ? 'Unsave' : 'Save'))} ${escapeHtml(recipe.title)}">${icon('bookmark')}</button></div><div class="card-content"><div class="card-author"><span class="avatar-small" aria-hidden="true">${escapeHtml(initial)}</span><span>${escapeHtml(author)}</span><span class="card-category">${escapeHtml(categoryLabel(recipe.category))}</span></div><h3><button type="button" data-recipe-id="${escapeHtml(recipe.id)}">${escapeHtml(recipe.title)}</button></h3><p class="card-description">${escapeHtml(recipe.description || t('A recipe from a real home kitchen. Make it yours.'))}</p><div class="card-meta"><span>${icon('clock')}${escapeHtml(localizeMinutes(recipe.cook_minutes))}</span><span>${icon('utensils')}${escapeHtml(localizeServings(recipe.servings))}</span><span>${escapeHtml(difficultyLabel(recipe.difficulty))}</span></div></div></article>`;
  }).join('');
  $$('.recipe-card').forEach((card, index) => { const recipe = recipes[index]; card.querySelector('.card-content').insertAdjacentHTML('beforeend', `<div class="card-social"><button type="button" data-comments-id="${escapeHtml(recipe.id)}">${icon('heart')} ${escapeHtml(t('Reactions & comments'))}</button><button type="button" data-share-id="${escapeHtml(recipe.id)}" aria-label="${escapeHtml(t('Share'))}">${icon('external')}</button></div>`); });
  if (state.view === 'recent') $$('.recipe-card').forEach((card,index) => {
    const recipe = recipes[index], entry = recentHistory.list().find(item => item.id === recipe.id);
    const date = new Date(entry.viewedAt);
    card.querySelector('.card-content').insertAdjacentHTML('beforeend', `<div class="recent-card-meta"><time datetime="${date.toISOString()}" data-no-translate>${escapeHtml(date.toLocaleString(getLanguage(), {dateStyle:'medium',timeStyle:'short'}))}</time><button type="button" class="icon-button" data-remove-history="${escapeHtml(recipe.id)}" aria-label="${escapeHtml(t('Remove from viewing history'))}">${icon('x')}</button></div>`);
  });
  const empty = recipes.length === 0; elements.empty.hidden = !empty;
  if ($('#retryButton')) $('#retryButton').hidden = !(state.loadError || (state.view === 'recent' && historyError));
  if ($('#emptyClearButton')) $('#emptyClearButton').hidden = state.loadError || !hasFilters();
  if ($('#clearFilters')) $('#clearFilters').hidden = !hasFilters();
  if (state.loadError && state.view !== 'recent') { elements.status.textContent = t('The recipe feed is temporarily unavailable.'); $('#emptyTitle').textContent = t('Your next favorite is worth the wait.'); $('#emptyDescription').textContent = t('We could not connect to the recipe collection. Please try again.'); return; }
  elements.status.textContent = localizeCount(recipes.length, state.view === 'saved');
  if (empty && state.view === 'recent' && !hasFilters()) {
    $('#emptyTitle').textContent = t(historyError ? 'Your next favorite is worth the wait.' : 'No recently viewed recipes yet.');
    $('#emptyDescription').textContent = t(historyError ? 'Some recently viewed recipes could not be checked. Refresh to try again.' : recentHistory.list().length ? 'Deleted or unavailable recipes are not shown.' : 'Open a recipe or watch shorts. The recipes you view will appear here automatically.');
    elements.empty.hidden = historyLoading; return;
  }
  if (empty) { $('#emptyTitle').textContent = t(hasFilters() ? 'Nothing here just yet.' : state.view === 'saved' ? 'Start your personal recipe book.' : state.view === 'video' ? 'The first video is yours to share.' : state.view === 'image' ? 'A delicious photo belongs here.' : 'Every recipe book starts somewhere.'); $('#emptyDescription').textContent = t(hasFilters() ? 'Try another ingredient or clear your filters to explore more.' : state.view === 'saved' ? 'Tap the bookmark on a recipe to keep it here on this device.' : 'Share something you love to cook. A simple recipe can make someone’s day.'); }
}
function setView(view, scroll = false) {
  if (!['all', 'video', 'image', 'saved', 'recent'].includes(view)) return;
  state.view = view;
  if (view === 'recent') { clearFilters(); loadRecentRecipes(); } else renderRecipes();
  if (scroll) $('#feed').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function clearFilters() { elements.search.value = ''; elements.category.value = ''; if (elements.time) elements.time.value = ''; if (elements.difficulty) elements.difficulty.value = ''; $$('[data-quick]').forEach((button) => button.classList.remove('active')); renderRecipes(); }
function toggleSave(recipeId) {
  if (!findRecipe(recipeId)) return;
  const saved = !state.saved.has(recipeId); if (saved) state.saved.add(recipeId); else state.saved.delete(recipeId);
  if (saved && !state.recipes.some(recipe => recipe.id === recipeId)) state.recipes.push(findRecipe(recipeId));
  const persisted = writeSaved(); renderRecipes();
  $$('[data-save-id]', elements.detail).forEach((button) => { if (button.dataset.saveId !== recipeId) return; button.classList.toggle('is-saved', saved); button.setAttribute('aria-pressed', String(saved)); button.innerHTML = `${icon('bookmark')} ${escapeHtml(t(saved ? 'Saved' : 'Save recipe'))}`; });
  showToast(t(persisted ? (saved ? 'Saved to your recipe book on this device.' : 'Removed from your saved recipes.') : 'Saved for this visit. This browser is blocking storage.'));
}

function renderRecipeDetail(recipe, remember = true) {
  social.pause();
  $$('video', elements.detail).forEach(video => video.pause());
  state.detailId = recipe.id; elements.detail.classList.remove('cook-mode');
  const ingredients = [...(recipe.recipe_ingredients || [])].sort((a, b) => a.position - b.position);
  const steps = [...(recipe.recipe_steps || [])].sort((a, b) => a.position - b.position);
  const videoUrl = safeUrl(recipe.video_url); const imageUrl = safeUrl(recipe.image_url);
  const media = videoUrl ? `<video class="detail-video" src="${escapeHtml(videoUrl)}"${imageUrl ? ` poster="${escapeHtml(imageUrl)}"` : ''} controls playsinline preload="metadata">${escapeHtml(t('Your browser cannot play this video.'))}</video>` : imageUrl ? `<img class="detail-image photo-${recipe.image_fit === 'contain' ? 'contain' : 'cover'}" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(recipe.title)}" />` : '';
  const saved = state.saved.has(recipe.id);
  $('#recipeDetail').innerHTML = `${media}<div class="detail-content"><p class="eyebrow">${escapeHtml(categoryLabel(recipe.category))} · ${escapeHtml(byline(recipe.profiles?.display_name || t('Home cook')))}</p><h2 id="detailTitle">${escapeHtml(recipe.title)}</h2><p class="detail-description">${escapeHtml(recipe.description || '')}</p><div class="detail-meta"><span>${icon('clock')}${escapeHtml(localizeMinutes(recipe.cook_minutes))}</span><span>${icon('utensils')}${escapeHtml(localizeServings(recipe.servings))}</span><span>${escapeHtml(difficultyLabel(recipe.difficulty))}</span></div><div class="detail-actions"><button class="secondary-button${saved ? ' is-saved' : ''}" type="button" data-save-id="${escapeHtml(recipe.id)}" aria-pressed="${saved}">${icon('bookmark')}${escapeHtml(t(saved ? 'Saved' : 'Save recipe'))}</button><button id="shareRecipeButton" class="secondary-button" type="button">${icon('external')}${escapeHtml(t('Share'))}</button><button id="cookModeButton" class="primary-button" type="button" aria-pressed="false">${icon('utensils')}${escapeHtml(t('Start cooking'))}</button></div><div class="detail-columns"><section><h3>${escapeHtml(t('Ingredients'))}</h3><p class="section-help">${escapeHtml(t('Check them off as you go.'))}</p><ul class="ingredient-checklist">${ingredients.map((item) => `<li><label><input type="checkbox" /><span><strong>${escapeHtml(item.quantity)}</strong> ${escapeHtml(item.item)}</span></label></li>`).join('') || `<li>${escapeHtml(t('No ingredients were added.'))}</li>`}</ul></section><section><h3>${escapeHtml(t('Let’s make it.'))}</h3><ol class="cooking-steps">${steps.map((step, index) => `<li><label><input type="checkbox" /><span class="step-number">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(step.instruction)}</span></label></li>`).join('') || `<li>${escapeHtml(t('No steps were added.'))}</li>`}</ol></section></div>${recipe.author_id === state.session?.user?.id ? `<button class="text-button delete-recipe" type="button">${escapeHtml(t('Delete my recipe'))}</button>` : ''}</div>`;
  $('#cookModeButton').addEventListener('click', () => {
    const active = elements.detail.classList.toggle('cook-mode'); $('#cookModeButton').setAttribute('aria-pressed', String(active)); $('#cookModeButton').innerHTML = `${icon('utensils')}${escapeHtml(t(active ? 'Exit cooking mode' : 'Start cooking'))}`;
    if (active) { const first = $('.cooking-steps input:not(:checked)', elements.detail); first?.focus({ preventScroll: true }); $('.cooking-steps', elements.detail)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  $('#shareRecipeButton').addEventListener('click', () => shareRecipe(recipe));
  $('.delete-recipe', elements.detail)?.addEventListener('click', () => deleteRecipe(recipe));
  openDialog(elements.detail);
  if (remember) rememberRecipe(recipe);
  const panel = document.createElement('div'); $('.detail-content', elements.detail).append(panel); social.mount(panel, recipe);
  if (recipe.cuisine) $('.detail-meta', elements.detail).insertAdjacentHTML('afterbegin', `<span>${escapeHtml(t('Country / cuisine'))}: ${escapeHtml(t(recipe.cuisine))}</span>`);
  const video = $('video', elements.detail); if (video) social.guardVideo(video);
}
let activeShare = null;
function recipeShareUrl(recipeId) { const url = new URL(window.location.href); url.search = ''; url.searchParams.set('recipe', recipeId); url.hash = 'feed'; return url.href; }
function shareRecipe(recipe) {
  activeShare = { title: `${recipe.title} · Recipe Story`, url: recipeShareUrl(recipe.id) };
  $('#shareLink').value = activeShare.url; $('#shareMessage').textContent = '';
  $('#nativeShareButton').hidden = typeof navigator.share !== 'function'; openDialog($('#shareDialog'));
}
async function copyShareLink() {
  if (!activeShare) return;
  let copied = false;
  try { if (navigator.clipboard?.writeText && window.isSecureContext) { await navigator.clipboard.writeText(activeShare.url); copied = true; } } catch { /* Use the selection fallback below. */ }
  if (!copied) {
    const input = $('#shareLink'); input.focus(); input.select(); input.setSelectionRange(0, input.value.length);
    try { copied = document.execCommand('copy'); } catch { copied = false; }
  }
  $('#shareMessage').textContent = t(copied ? 'Link copied. Ready to share.' : 'The link is selected. Press Ctrl+C or choose Copy from your device.');
}
async function deleteRecipe(recipe) {
  if (recipe.author_id !== state.session?.user?.id) return;
  if (!window.confirm(confirmDelete(recipe.title))) return;
  const button = $('.delete-recipe', elements.detail); if (button) button.disabled = true;
  try {
    if (community) await community.deleteRecipe(recipe);
    else { const { error } = await supabase.from('recipes').delete().eq('id', recipe.id).eq('author_id', state.session.user.id); if (error) throw error; }
    closeDialog(elements.detail); state.saved.delete(recipe.id); writeSaved(); historyPersisted(recentHistory.remove(recipe.id)); await loadRecipes(); showToast(t('Your recipe has been deleted.'));
  } catch (error) { showToast(friendlyError(error, t('We could not delete this recipe.'))); }
  finally { if (button) button.disabled = false; }
}
function addRow(kind, values = {}) {
  const row = document.createElement('div'); row.className = kind === 'ingredient' ? 'entry-row' : 'entry-row step-row';
  row.innerHTML = kind === 'ingredient' ? `<input data-quantity maxlength="60" aria-label="${escapeHtml(t('Ingredient amount'))}" placeholder="${escapeHtml(t('e.g. 200 g'))}" value="${escapeHtml(values.quantity || '')}" /><input data-item maxlength="120" aria-label="${escapeHtml(t('Ingredient name'))}" placeholder="${escapeHtml(t('Ingredient'))}" value="${escapeHtml(values.item || '')}" /><button class="remove-row" type="button" aria-label="${escapeHtml(t('Remove ingredient'))}">${icon('x')}</button>` : `<span class="row-number" aria-hidden="true"></span><textarea rows="2" maxlength="500" aria-label="${escapeHtml(t('Cooking instruction'))}" placeholder="${escapeHtml(t('Describe one simple step…'))}">${escapeHtml(values.instruction || '')}</textarea><button class="remove-row" type="button" aria-label="${escapeHtml(t('Remove step'))}">${icon('x')}</button>`;
  $(kind === 'ingredient' ? '#ingredients' : '#steps').append(row); refreshStepNumbers();
}
function refreshStepNumbers() { $$('#steps .row-number').forEach((element, index) => { element.textContent = String(index + 1).padStart(2, '0'); }); }
function getEntryValues() { const ingredients = $$('#ingredients .entry-row').map((row) => ({ quantity: $('[data-quantity]', row).value.trim(), item: $('[data-item]', row).value.trim() })).filter((item) => item.item || item.quantity); const steps = $$('#steps textarea').map((textarea) => textarea.value.trim()).filter(Boolean); return { ingredients, steps }; }
function setFormStep() { state.step = 3; elements.message.textContent = ''; }
function generatedTitle(description) {
  const firstLine = String(description || '').split(/\r?\n/).map(line => line.trim()).find(Boolean) || 'Quick recipe';
  const compact = firstLine.replace(/^[#>*\-\s]+/, '').replace(/\s+/g, ' ').trim();
  return (compact.length >= 2 ? compact : 'Quick recipe').slice(0, 80).trim();
}
function recipeDraft() {
  const description = $('#recipeDescription').value.trim();
  return {
    description,
    title: $('#recipeTitle').value.trim() || generatedTitle(description),
    cuisine: $('#recipeCuisine').value || 'Other cuisine',
    category: $('#recipeCategory').value || '기타',
    difficulty: $('#difficulty').value || '쉬움',
    cookMinutes: Number($('#cookMinutes').value) || 1,
    servings: Number($('#servings').value) || 1
  };
}
function guestCreatorName(userId) { return `Cook ${String(userId || crypto.randomUUID()).replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()}`; }
function validateStep(step) {
  let message = ''; let target;
  if (step === 1) {
    const draft = recipeDraft(); const name = $('#authorName').value.trim();
    if (draft.description.length < 2 || draft.description.length > 2000) { message = t('Write at least 2 characters so people know what you made.'); target = $('#recipeDescription'); }
    else if (name && (name.length < 2 || name.length > 40)) { message = t('Choose a creator name between 2 and 40 characters.'); target = $('#authorName'); }
    else if ($('#recipeTitle').value.trim() && ($('#recipeTitle').value.trim().length < 2 || $('#recipeTitle').value.trim().length > 80)) { message = t('Give your recipe a title between 2 and 80 characters.'); target = $('#recipeTitle'); }
    else if (!Number.isInteger(draft.cookMinutes) || draft.cookMinutes < 1 || draft.cookMinutes > 600) { message = t('Cooking time must be a whole number from 1 to 600 minutes.'); target = $('#cookMinutes'); }
    else if (!Number.isInteger(draft.servings) || draft.servings < 1 || draft.servings > 50) { message = t('Servings must be a whole number from 1 to 50.'); target = $('#servings'); }
  } else if (step === 2) {
    const { ingredients, steps } = getEntryValues();
    if (ingredients.some((item) => !item.item || item.item.length > 120 || item.quantity.length > 60)) { message = t('If you add an ingredient, enter its name. The amount is optional.'); target = $('[data-item]'); }
    else if (steps.some((instruction) => instruction.length < 2 || instruction.length > 500)) { message = t('If you add a cooking step, use 2–500 characters.'); target = $('#steps textarea'); }
  } else if (mediaChecking) { message = t('Checking video…'); target = $('#videoFile'); }
  else if (!['cover', 'contain'].includes($('#imageFit').value)) { message = t('Choose how your photo should fit the card.'); target = $('#imageFit'); }
  if (message) { elements.message.textContent = message; target?.focus(); return false; }
  return true;
}

function clearSelectedMedia() {
  mediaSelection++; mediaChecking = false;
  state.selectedFile = null; state.selectedImage = null; $('#videoFile').value = ''; $('#imageFile').value = '';
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl); state.previewUrl = null;
  $('#mediaPreview').replaceChildren(); $('#mediaPreview').hidden = true;
  $('#selectedVideo').textContent = ''; $('#selectedVideo').hidden = true; $('#selectedImage').textContent = ''; $('#selectedImage').hidden = true; $('#clearMedia').hidden = true;
}
function setMediaMode(mode) {
  if (!['image', 'video', 'none'].includes(mode) || state.publishing) return;
  if (state.mediaMode !== mode) { clearSelectedMedia(); elements.message.textContent = ''; } state.mediaMode = mode;
  $$('[data-media-mode]').forEach((button) => { const active = button.dataset.mediaMode === mode; button.classList.toggle('active', active); if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active)); else button.setAttribute('aria-pressed', String(active)); });
  $('#imagePicker').hidden = mode !== 'image'; $('#videoPicker').hidden = mode !== 'video';
  const fitField = $('#imageFit').closest('.field'); if (fitField) fitField.hidden = mode !== 'image';
}
let mediaSelection = 0, mediaChecking = false;
async function handleMediaSelect(file, kind) {
  if (!file || state.publishing) return;
  const video = kind === 'video'; const types = video ? ['video/mp4', 'video/webm', 'video/quicktime'] : ['image/jpeg', 'image/png', 'image/webp']; const maxMb = video ? 100 : 10; const limit = maxMb * 1024 * 1024;
  if (!types.includes(file.type) || !file.size || file.size > limit) { const retained = state.selectedFile || state.selectedImage ? t(' Your previous attachment is still selected.') : ''; showToast(t(video ? 'Choose an MP4, WebM or MOV video under 100 MB.' : 'Choose a JPG, PNG or WebP photo under 10 MB.') + retained); $(video ? '#videoFile' : '#imageFile').value = ''; return; }
  const selection = ++mediaSelection;
  if (video) { mediaChecking = true; elements.message.textContent = t('Checking video…'); const result = await checkVideo(file); if (selection !== mediaSelection) return; mediaChecking = false; elements.message.textContent = ''; if (state.mediaMode !== kind) return; if (!result) { $('#videoFile').value = ''; showToast(t('This video cannot be played. Export it as MP4 (H.264) or WebM and try again.')); return; } }
  clearSelectedMedia(); state.mediaMode = kind;
  if (video) state.selectedFile = file; else state.selectedImage = file;
  state.previewUrl = URL.createObjectURL(file); const preview = document.createElement(video ? 'video' : 'img'); preview.src = state.previewUrl;
  if (video) { preview.controls = true; preview.playsInline = true; } else { preview.alt = t('Your selected recipe photo'); preview.style.objectFit = $('#imageFit').value; }
  $('#mediaPreview').replaceChildren(preview); $('#mediaPreview').hidden = false;
  const selected = $(video ? '#selectedVideo' : '#selectedImage'); selected.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`; selected.hidden = false; $('#clearMedia').hidden = false;
}
function resetRecipeForm() {
  elements.form.reset(); $('#authorName').value = state.creatorName;
  $('#recipeCuisine').value = 'Other cuisine'; $('#recipeCategory').value = '기타'; $('#difficulty').value = '쉬움'; $('#cookMinutes').value = '1'; $('#servings').value = '1';
  $('#ingredients').replaceChildren(); $('#steps').replaceChildren(); addRow('ingredient'); addRow('step');
  clearSelectedMedia(); state.mediaMode = 'none'; setMediaMode('none'); setFormStep(); $('#uploadProgress').hidden = true; elements.message.textContent = ''; $('.optional-recipe-details')?.removeAttribute('open');
}
function openComposer() { if (!$('#authorName').value.trim()) $('#authorName').value = state.creatorName; openDialog(elements.composer); window.setTimeout(() => $('#recipeDescription')?.focus(), 30); }
function setPublishing(publishing) {
  state.publishing = publishing; $$('button, input, select, textarea', elements.composer).forEach((control) => { control.disabled = publishing; });
  elements.composer.setAttribute('aria-busy', String(publishing)); $('#publishButton').textContent = t(publishing ? 'Preparing your recipe…' : state.pendingPublication ? 'Check publication status' : 'Publish recipe');
}
function safeFileName(name) { const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'; return `${crypto.randomUUID()}.${extension}`; }
async function uploadFile(file, userId, bucket, kind, uploadedFiles) {
  if (community) {
    $('#uploadProgress').hidden = false; $('#progressBar').style.width = '0%'; $('#uploadPercent').textContent = '0%'; $('#uploadProgressLabel').textContent = `${t('Uploading')} ${t(kind === 'video' ? 'Video' : 'Photo')}…`;
    const media = await community.upload(file, kind, (progress, detail) => { $('#progressBar').style.width = `${progress}%`; $('#uploadPercent').textContent = `${progress}%`; $('#uploadDetail').textContent = t(detail); });
    uploadedFiles.push(media); return media;
  }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error(t('Your upload session expired. Please try again.'));
  if (!window.tus?.Upload) throw new Error(t('The upload service has not loaded. Refresh this page and try again.'));
  const projectRef = new URL(config.supabaseUrl).hostname.split('.')[0]; const path = `${userId}/${safeFileName(file.name)}`;
  uploadedFiles.push({ bucket, path }); $('#uploadProgress').hidden = false; $('#progressBar').style.width = '0%'; $('#uploadPercent').textContent = '0%'; $('#uploadProgressLabel').textContent = `${t('Uploading')} ${t(kind === 'video' ? 'Video' : 'Photo')}…`;
  await new Promise((resolve, reject) => {
    const upload = new window.tus.Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`, retryDelays: [0, 3000, 5000, 10000, 20000], chunkSize: 6 * 1024 * 1024,
      headers: { authorization: `Bearer ${session.access_token}`, apikey: config.supabasePublishableKey, 'x-upsert': 'false' }, uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
      metadata: { bucketName: bucket, objectName: path, contentType: file.type, cacheControl: '3600' },
      onError(uploadError) { reject(new Error(uploadError?.message || `The ${kind} could not upload. Please try again.`)); },
      onProgress(uploaded, total) { const progress = Math.min(100, Math.round((uploaded / total) * 100)); $('#progressBar').style.width = `${progress}%`; $('#uploadPercent').textContent = `${progress}%`; $('#uploadDetail').textContent = progress === 100 ? t('Finishing your upload…') : `${(uploaded / (1024 * 1024)).toFixed(1)} MB / ${(total / (1024 * 1024)).toFixed(1)} MB`; },
      onSuccess() { resolve(); }
    });
    // Retries within this upload keep the same owner path. A new submission gets a fresh path.
    upload.start();
  });
  return { path, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}
async function cleanupSubmission(draftId, uploadedFiles) {
  if (community) { await Promise.allSettled(uploadedFiles.map((media) => community.removeUpload(media))); return true; }
  if (draftId) {
    try {
      const { data, error } = await supabase.from('recipes').delete().eq('id', draftId).eq('author_id', state.session.user.id).eq('visibility', 'draft').select('id');
      // Keep media if the draft could not be confirmed deleted; it may have become public.
      if (error || !data?.length) return false;
    } catch { return false; }
  }
  await Promise.allSettled(uploadedFiles.map(({ bucket, path }) => supabase.storage.from(bucket).remove([path])));
  return true;
}
async function finishPublication() {
  updateProfileLabel();
  state.pendingPublication = null; setPublishing(false); closeDialog(elements.composer); resetRecipeForm();
  if (!community) { try { await refreshCreatorName(); } catch { /* Publication succeeded; a name refresh can wait. */ } }
  clearFilters(); state.view = 'all'; await loadRecipes(); $('#feed').scrollIntoView({ behavior: 'smooth' }); showToast(t('Your recipe is live. Thanks for sharing your kitchen.'));
}
async function checkPublicationStatus() {
  const pending = state.pendingPublication; if (!pending) return;
  setPublishing(true); $('#publishButton').textContent = t('Checking publication…');
  try {
    const { data, error } = await supabase.from('recipes').select('id, visibility').eq('id', pending.id).eq('author_id', state.session.user.id).maybeSingle();
    if (error) throw error;
    if (data?.visibility === 'published') { await finishPublication(); return; }
    if (data && data.visibility !== 'draft') throw new Error('Publication status is not yet available.');
    const cleaned = await cleanupSubmission(data ? pending.id : null, pending.files);
    if (!cleaned) throw new Error('The pending draft could not be cleared safely.');
    state.pendingPublication = null;
    elements.message.textContent = t('Publication did not finish. Your draft is still here. Click Publish recipe to try again.');
  } catch { elements.message.textContent = t('We could not confirm publication. Your recipe may already be live. Check its status before trying again; your draft and uploaded files have been kept.'); }
  finally { setPublishing(false); }
}
async function publishRecipe(event) {
  event.preventDefault(); if (state.publishing) return;
  if (state.pendingPublication) { await checkPublicationStatus(); return; }
  for (const step of [1, 2, 3]) if (!validateStep(step)) return;
  const draft = recipeDraft(); const { ingredients, steps } = getEntryValues(); const uploadedFiles = []; let draftId = null; let published = false; let publishAttempted = false;
  setPublishing(true); elements.message.textContent = '';
  try {
    await ensureGuestSession(); const userId = state.session.user.id; const creatorName = $('#authorName').value.trim() || state.creatorName || guestCreatorName(userId); await claimCreatorName(state.session.user, creatorName); $('#authorName').value = state.creatorName; updateProfileLabel();
    let video = null; let image = null;
    if (state.selectedFile) video = await uploadFile(state.selectedFile, userId, 'recipe-videos', 'video', uploadedFiles);
    if (state.selectedImage) image = await uploadFile(state.selectedImage, userId, 'recipe-images', 'photo', uploadedFiles);
    $('#publishButton').textContent = t('Saving your recipe…');
    if (community) {
      const communityEvent = await community.publishRecipe({ author_name: state.creatorName, title: draft.title, description: draft.description, cuisine: draft.cuisine, category: draft.category, cook_minutes: draft.cookMinutes, servings: draft.servings, difficulty: draft.difficulty, image_fit: $('#imageFit').value, media: { video, image }, recipe_ingredients: ingredients, recipe_steps: steps });
      draftId = communityEvent.id; published = true; await finishPublication(); return;
    }
    const { data: storedDraft, error: recipeError } = await supabase.from('recipes').insert({ author_id: userId, title: draft.title, description: draft.description, category: draft.category, cook_minutes: draft.cookMinutes, servings: draft.servings, difficulty: draft.difficulty, video_path: video?.path || null, video_url: video?.url || null, video_mime: state.selectedFile?.type || null, video_size_bytes: state.selectedFile?.size || null, image_path: image?.path || null, image_url: image?.url || null, image_mime: state.selectedImage?.type || null, image_size_bytes: state.selectedImage?.size || null, image_fit: $('#imageFit').value, visibility: 'draft' }).select('id').single();
    if (recipeError) throw recipeError; draftId = storedDraft.id;
    const childWrites = [];
    if (ingredients.length) childWrites.push(supabase.from('recipe_ingredients').insert(ingredients.map((item, position) => ({ recipe_id: draftId, position, ...item }))));
    if (steps.length) childWrites.push(supabase.from('recipe_steps').insert(steps.map((instruction, position) => ({ recipe_id: draftId, position, instruction }))));
    const childResults = await Promise.all(childWrites); const childError = childResults.find(result => result.error)?.error; if (childError) throw childError;
    publishAttempted = true;
    const { error: publishError } = await supabase.from('recipes').update({ visibility: 'published' }).eq('id', draftId).eq('author_id', userId);
    if (publishError) throw publishError; published = true;
    await finishPublication();
  } catch (error) {
    if (!published && publishAttempted) {
      state.pendingPublication = { id: draftId, files: uploadedFiles }; await checkPublicationStatus();
    } else if (!published) {
      await cleanupSubmission(draftId, uploadedFiles);
      elements.message.textContent = friendlyError(error, t('We could not publish your recipe. Your draft is still here.'));
    } else showToast(t('Your recipe is published. Refresh the feed to see it.'));
  } finally { setPublishing(false); $('#uploadProgress').hidden = true; }
}

elements.form.addEventListener('submit', publishRecipe);
$('#discardDraft')?.addEventListener('click', () => { if (state.pendingPublication) { elements.message.textContent = t('Check the publication status before starting over.'); return; } if (!state.publishing && window.confirm(t('Discard this unfinished recipe and start again?'))) { resetRecipeForm(); showToast(t('Your unfinished recipe has been cleared.')); } });
$('#videoFile').addEventListener('change', () => handleMediaSelect($('#videoFile').files?.[0], 'video'));
$('#imageFile').addEventListener('change', () => handleMediaSelect($('#imageFile').files?.[0], 'image'));
$('#clearMedia').addEventListener('click', clearSelectedMedia);
$('#imageFit').addEventListener('change', () => { const image = $('#mediaPreview img'); if (image) image.style.objectFit = $('#imageFit').value; });
elements.search.addEventListener('input', renderRecipes);
[elements.category, elements.time, elements.difficulty, elements.sort].filter(Boolean).forEach((element) => element.addEventListener('change', renderRecipes));
$('#clearFilters')?.addEventListener('click', clearFilters);
$('#emptyClearButton')?.addEventListener('click', clearFilters);
$('#retryButton')?.addEventListener('click', loadRecipes);
$('#clearHistory').addEventListener('click', () => {
  if (!window.confirm(t('Clear all viewing history on this browser? Saved recipes and published posts will not be deleted.'))) return;
  historyRequest++; historyLoading = false; historyError = false; historyRecipes = [];
  historyPersisted(recentHistory.clear()); renderRecipes(); showToast(t('Viewing history cleared.'));
});
$('#copyShareLink')?.addEventListener('click', copyShareLink);
$('#nativeShareButton')?.addEventListener('click', async () => { if (!activeShare || typeof navigator.share !== 'function') return; try { await navigator.share(activeShare); } catch (error) { if (error.name !== 'AbortError') $('#shareMessage').textContent = t('Your device could not open its share menu. Copy the link instead.'); } });
$('#filtersButton')?.addEventListener('click', () => { const panel = $('#filterPanel'); panel.hidden = !panel.hidden; $('#filtersButton').setAttribute('aria-expanded', String(!panel.hidden)); });
$('#surpriseButton')?.addEventListener('click', () => { const recipes = filteredRecipes(); if (!recipes.length) { showToast(t('Add a recipe or clear your filters to find some inspiration.')); return; } renderRecipeDetail(recipes[Math.floor(Math.random() * recipes.length)]); });
document.addEventListener('click', (event) => {
  const target = event.target.closest('button, a'); if (!target) return;
  if (target.matches('[data-close-dialog]')) { closeDialog($(`#${target.dataset.closeDialog}`)); return; }
  if (target.matches('[data-open-composer], #openComposer')) { event.preventDefault(); openComposer(); return; }
  if (target.matches('[data-open-profile], #profileButton, #tabProfileButton')) { event.preventDefault(); openProfile(); return; }
  if (target.matches('[data-save-id]')) { toggleSave(target.dataset.saveId); return; }
  if (target.matches('[data-remove-history]')) { removeHistory(target.dataset.removeHistory); return; }
  if (target.matches('[data-recipe-id]')) { const recipe = findRecipe(target.dataset.recipeId); if (recipe) renderRecipeDetail(recipe); return; }
  if (target.matches('[data-view], [data-media-filter]')) { event.preventDefault(); setView(target.dataset.view || target.dataset.mediaFilter, Boolean(target.dataset.view)); return; }
  if (target.matches('[data-category]')) { elements.category.value = target.dataset.category; renderRecipes(); return; }
  if (target.matches('[data-quick]')) {
    clearFilters(); state.view = 'all'; const quick = target.dataset.quick;
    if (quick === 'quick' && elements.time) elements.time.value = '30';
    if (quick === 'sweet') elements.category.value = '디저트';
    if (quick === 'comfort') elements.category.value = '면·파스타';
    target.classList.add('active'); renderRecipes(); $('#feed').scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
  }
  if (target.matches('[data-media-mode]')) { setMediaMode(target.dataset.mediaMode); return; }
  if (target.matches('[data-add-row]') && !state.publishing) { addRow(target.dataset.addRow); return; }
  if (target.matches('.remove-row') && !state.publishing) { const list = target.closest('.entry-row').parentElement; target.closest('.entry-row').remove(); if (!list.children.length) addRow(list.id === 'ingredients' ? 'ingredient' : 'step'); refreshStepNumbers(); }
});
function openProfile() { $('#profileName').value = state.creatorName; $('#profileMessage').textContent = ''; openDialog($('#profileDialog')); }
$('#profileForm').addEventListener('submit', async (event) => {
  event.preventDefault(); const button = $('button[type="submit"]', event.currentTarget); if (button.disabled) return;
  button.disabled = true; $('#profileMessage').textContent = '';
  try { await ensureGuestSession(); await claimCreatorName(state.session.user, $('#profileName').value); $('#authorName').value = state.creatorName; await refreshCreatorName(); closeDialog($('#profileDialog')); await loadRecipes(); showToast(t('Your creator name has been updated.')); }
  catch (error) { $('#profileMessage').textContent = friendlyError(error, t('Your name could not be saved.')); }
  finally { button.disabled = false; }
});
elements.composer.addEventListener('cancel', (event) => { if (state.publishing) event.preventDefault(); });
elements.detail.addEventListener('close', () => { $$('video', elements.detail).forEach((video) => video.pause()); elements.detail.classList.remove('cook-mode'); });
window.addEventListener('beforeunload', (event) => { if (state.publishing) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('storage', (event) => { if (event.key === SAVED_KEY) { state.saved = readSaved(); renderRecipes(); } });
window.addEventListener('storage', (event) => {
  if (event.key === RECENT_KEY || event.key === null) { recentHistory.sync(); if (state.view === 'recent') loadRecentRecipes(); else updateViewControls(); }
});
$('#languageSelect')?.addEventListener('change', (event) => setLanguage(event.currentTarget.value));
window.addEventListener('recipe-language-change', () => {
  applyTranslations(); renderRecipes();
  if (state.detailId && elements.detail.open) { const recipe = findRecipe(state.detailId); if (recipe) renderRecipeDetail(recipe, false); }
  updateProfileLabel();
});
supabase?.auth.onAuthStateChange((_event, session) => { state.session = session; });
(async function initialize() {
  resetRecipeForm();
  if (community) { try { state.session = community.session(); await refreshCreatorName(); } catch { /* Browsing remains available even if profile relays are temporarily offline. */ } }
  else if (supabase) { try { const { data: { session } } = await supabase.auth.getSession(); state.session = session; await refreshCreatorName(); } catch { /* Browsing remains available without a creator session. */ } }
  await loadRecipes();
  const sharedId = new URL(window.location.href).searchParams.get('recipe');
  if (sharedId) { try { const recipe = community ? await community.loadRecipe(sharedId) : state.recipes.find((item) => item.id === sharedId); if (recipe) { if (!state.recipes.some(r => r.id === recipe.id)) state.recipes.push(recipe); renderRecipeDetail(recipe); } else showToast(t('That recipe is no longer available. Explore something new.')); } catch (error) { showToast(friendlyError(error)); } }
})();
