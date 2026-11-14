import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
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
const state = { session: null, creatorName: '', recipes: [], view: 'all', selectedFile: null, selectedImage: null, mediaMode: 'image', previewUrl: null, step: 1, publishing: false, pendingPublication: null, loading: true, loadError: false, toastTimer: null, detailId: null, saved: readSaved() };
const elements = { composer: $('#composerDialog'), detail: $('#detailDialog'), form: $('#recipeForm'), grid: $('#recipeGrid'), status: $('#feedStatus'), empty: $('#emptyState'), search: $('#searchInput'), category: $('#categoryFilter'), time: $('#timeFilter'), difficulty: $('#difficultyFilter'), sort: $('#sortFilter'), message: $('#recipeMessage'), toast: $('#toast') };
const supabase = config?.supabaseUrl && config?.supabasePublishableKey ? createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

function escapeHtml(value = '') { return String(value ?? '').replace(/[&<>\"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
function safeUrl(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }
function icon(name) { return `<svg class="icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`; }
function categoryLabel(value) { return CATEGORY_LABELS[value] || value || 'Other'; }
function difficultyLabel(value) { return DIFFICULTY_LABELS[value] || value || 'Easy'; }
function readSaved() { try { const value = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); return new Set(Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []); } catch { return new Set(); } }
function writeSaved() { try { localStorage.setItem(SAVED_KEY, JSON.stringify([...state.saved])); return true; } catch { return false; } }
function showToast(message) { window.clearTimeout(state.toastTimer); elements.toast.textContent = message; elements.toast.classList.add('show'); state.toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 3800); }
function openDialog(dialog) { if (dialog && !dialog.open) dialog.showModal(); }
function closeDialog(dialog) { if (dialog === elements.composer && state.publishing) return; if (dialog?.open) dialog.close(); }
function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.code === '23505') return 'That name is already taken. Please choose a different name.';
  if (error?.code === '23514') return 'Please check the recipe fields and their limits, then try again.';
  if (error?.code === '42501') return 'This browser does not have permission to make that change.';
  if (/fetch|network|offline/i.test(error?.message || '')) return 'Connection lost. Check your internet connection and try again.';
  return error?.message || fallback;
}
async function ensureGuestSession() {
  if (!supabase) throw new Error('Recipe sharing is temporarily unavailable. Please try again later.');
  if (state.session?.user) return state.session;
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (session?.user) { state.session = session; return session; }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error('We could not prepare your guest profile. Please try again in a moment.');
  state.session = data.session; return data.session;
}
async function refreshCreatorName() {
  if (!state.session?.user || !supabase) return;
  const { data, error } = await supabase.from('profiles').select('display_name').eq('id', state.session.user.id).maybeSingle();
  if (error) throw error;
  state.creatorName = data?.display_name || '';
  const label = $('#profileLabel');
  if (label) label.textContent = state.creatorName || 'Your kitchen'; else if ($('#profileButton')) $('#profileButton').textContent = state.creatorName || 'Your kitchen';
  if ($('#profileButton')) { $('#profileButton').setAttribute('aria-label', state.creatorName ? `Your kitchen: ${state.creatorName}. Change creator name` : 'Choose your creator name'); $('#profileButton').title = state.creatorName || 'Your kitchen'; }
  if ($('#profileName')) $('#profileName').value = state.creatorName;
  if (!$('#authorName').value.trim()) $('#authorName').value = state.creatorName;
}
async function claimCreatorName(user, displayName) {
  const name = String(displayName || '').trim();
  if (name.length < 2 || name.length > 40) throw new Error('Your name must be between 2 and 40 characters.');
  const { data: existing, error: lookupError } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.display_name === name) { state.creatorName = name; return; }
  const result = existing ? await supabase.from('profiles').update({ display_name: name }).eq('id', user.id) : await supabase.from('profiles').insert({ id: user.id, display_name: name });
  if (result.error) throw result.error;
  state.creatorName = name;
}
async function loadRecipes() {
  state.loading = true; state.loadError = false;
  elements.status.textContent = 'Finding something delicious…'; elements.grid.setAttribute('aria-busy', 'true'); elements.empty.hidden = true;
  try {
    if (!supabase) throw new Error('Recipe connection is unavailable.');
    const { data, error } = await supabase.from('recipes').select('id, author_id, title, description, category, cook_minutes, servings, difficulty, video_url, image_url, image_fit, created_at, profiles(display_name), recipe_ingredients(position, item, quantity), recipe_steps(position, instruction)').eq('visibility', 'published').order('created_at', { ascending: false });
    if (error) throw error;
    state.recipes = data || [];
  } catch { state.loadError = true; state.recipes = []; }
  finally { state.loading = false; elements.grid.setAttribute('aria-busy', 'false'); renderRecipes(); }
}
function filteredRecipes() {
  const term = elements.search.value.trim().toLocaleLowerCase(); const category = elements.category.value; const time = Number(elements.time?.value) || Infinity; const difficulty = elements.difficulty?.value || '';
  const recipes = state.recipes.filter((recipe) => {
    const text = [recipe.title, recipe.description, recipe.category, categoryLabel(recipe.category), recipe.profiles?.display_name, ...(recipe.recipe_ingredients || []).map((item) => item.item)].join(' ').toLocaleLowerCase();
    const mediaMatch = state.view === 'all' || (state.view === 'saved' && state.saved.has(recipe.id)) || (state.view === 'video' && Boolean(recipe.video_url)) || (state.view === 'image' && Boolean(recipe.image_url) && !recipe.video_url);
    return mediaMatch && (!term || text.includes(term)) && (!category || recipe.category === category) && Number(recipe.cook_minutes) <= time && (!difficulty || recipe.difficulty === difficulty);
  });
  if (['quickest', 'fastest'].includes(elements.sort?.value)) recipes.sort((a, b) => a.cook_minutes - b.cook_minutes || new Date(b.created_at) - new Date(a.created_at));
  else recipes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return recipes;
}
function hasFilters() { return Boolean(elements.search.value.trim() || elements.category.value || elements.time?.value || elements.difficulty?.value); }
function updateViewControls() {
  $$('[data-quick]').forEach((button) => { const plain = state.view === 'all' && !elements.search.value.trim() && !elements.difficulty.value; const active = plain && (button.dataset.quick === 'quick' ? elements.time.value === '30' && !elements.category.value : button.dataset.quick === 'comfort' ? elements.category.value === '면·파스타' && !elements.time.value : elements.category.value === '디저트' && !elements.time.value); button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  $$('[data-view], [data-media-filter]').forEach((button) => { const active = (button.dataset.view || button.dataset.mediaFilter) === state.view; button.classList.toggle('active', active); if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active)); else button.setAttribute('aria-pressed', String(active)); });
  $$('[data-category]').forEach((button) => { const active = button.dataset.category === elements.category.value; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  const titles = { all: 'Find your next favorite.', video: 'Watch. Cook. Repeat.', image: 'A little visual inspiration.', saved: 'Your recipe collection.' };
  const subtitles = { all: 'Good food starts with a good idea.', video: 'Real cooking, one short video at a time.', image: 'Discover dishes worth making your own.', saved: 'Your favorites, saved on this device. Ready when you are.' };
  $('#feedTitle').textContent = titles[state.view]; if ($('#feedSubtitle')) $('#feedSubtitle').textContent = subtitles[state.view];
  if ($('#savedCount')) $('#savedCount').textContent = String(state.recipes.filter((recipe) => state.saved.has(recipe.id)).length);
}
function renderRecipes() {
  updateViewControls(); const recipes = filteredRecipes();
  elements.grid.innerHTML = recipes.map((recipe) => {
    const author = recipe.profiles?.display_name || 'Home cook'; const initial = Array.from(author)[0] || 'R';
    const videoUrl = safeUrl(recipe.video_url); const imageUrl = safeUrl(recipe.image_url); const mediaKind = videoUrl ? 'video' : imageUrl ? 'image' : 'recipe'; const fit = recipe.image_fit === 'contain' ? 'contain' : 'cover';
    const media = videoUrl ? `<video src="${escapeHtml(videoUrl)}"${imageUrl ? ` poster="${escapeHtml(imageUrl)}"` : ''} muted playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video>` : imageUrl ? `<img class="photo-${fit}" src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" />` : `<div class="media-placeholder">${icon('utensils')}<span>Made to be shared.</span></div>`;
    const saved = state.saved.has(recipe.id);
    return `<article class="recipe-card is-${mediaKind}"><div class="card-media">${media}<button class="card-open" type="button" data-recipe-id="${escapeHtml(recipe.id)}" aria-label="Open ${escapeHtml(recipe.title)}">${mediaKind === 'video' ? `<span class="play-circle">${icon('play')}</span>` : ''}</button><span class="media-badge">${icon(mediaKind === 'video' ? 'play' : mediaKind === 'image' ? 'image' : 'book')}${mediaKind === 'video' ? 'Video' : mediaKind === 'image' ? 'Photo' : 'Recipe'}</span><button class="save-button${saved ? ' is-saved' : ''}" type="button" data-save-id="${escapeHtml(recipe.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Unsave' : 'Save'} ${escapeHtml(recipe.title)}">${icon('bookmark')}</button></div><div class="card-content"><div class="card-author"><span class="avatar-small" aria-hidden="true">${escapeHtml(initial)}</span><span>${escapeHtml(author)}</span><span class="card-category">${escapeHtml(categoryLabel(recipe.category))}</span></div><h3><button type="button" data-recipe-id="${escapeHtml(recipe.id)}">${escapeHtml(recipe.title)}</button></h3><p class="card-description">${escapeHtml(recipe.description || 'A recipe from a real home kitchen. Make it yours.')}</p><div class="card-meta"><span>${icon('clock')}${escapeHtml(recipe.cook_minutes)} min</span><span>${icon('utensils')}${escapeHtml(recipe.servings)} ${Number(recipe.servings) === 1 ? 'serving' : 'servings'}</span><span>${escapeHtml(difficultyLabel(recipe.difficulty))}</span></div></div></article>`;
  }).join('');
  const empty = recipes.length === 0; elements.empty.hidden = !empty;
  if ($('#retryButton')) $('#retryButton').hidden = !state.loadError;
  if ($('#emptyClearButton')) $('#emptyClearButton').hidden = state.loadError || !hasFilters();
  if ($('#clearFilters')) $('#clearFilters').hidden = !hasFilters();
  if (state.loadError) { elements.status.textContent = 'The recipe feed is temporarily unavailable.'; $('#emptyTitle').textContent = 'Your next favorite is worth the wait.'; $('#emptyDescription').textContent = 'We could not connect to the recipe collection. Please try again.'; return; }
  elements.status.textContent = `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}${state.view === 'saved' ? ' saved on this device' : ''}`;
  if (empty) { $('#emptyTitle').textContent = hasFilters() ? 'Nothing here just yet.' : state.view === 'saved' ? 'Start your personal recipe book.' : state.view === 'video' ? 'The first video is yours to share.' : state.view === 'image' ? 'A delicious photo belongs here.' : 'Every recipe book starts somewhere.'; $('#emptyDescription').textContent = hasFilters() ? 'Try another ingredient or clear your filters to explore more.' : state.view === 'saved' ? 'Tap the bookmark on a recipe to keep it here on this device.' : 'Share something you love to cook. A simple recipe can make someone’s day.'; }
}
function setView(view, scroll = false) { if (!['all', 'video', 'image', 'saved'].includes(view)) return; state.view = view; renderRecipes(); if (scroll) $('#feed').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function clearFilters() { elements.search.value = ''; elements.category.value = ''; if (elements.time) elements.time.value = ''; if (elements.difficulty) elements.difficulty.value = ''; $$('[data-quick]').forEach((button) => button.classList.remove('active')); renderRecipes(); }
function toggleSave(recipeId) {
  if (!state.recipes.some((recipe) => recipe.id === recipeId)) return;
  const saved = !state.saved.has(recipeId); if (saved) state.saved.add(recipeId); else state.saved.delete(recipeId);
  const persisted = writeSaved(); renderRecipes();
  $$('[data-save-id]', elements.detail).forEach((button) => { if (button.dataset.saveId !== recipeId) return; button.classList.toggle('is-saved', saved); button.setAttribute('aria-pressed', String(saved)); button.innerHTML = `${icon('bookmark')} ${saved ? 'Saved' : 'Save recipe'}`; });
  showToast(persisted ? (saved ? 'Saved to your recipe book on this device.' : 'Removed from your saved recipes.') : 'Saved for this visit. This browser is blocking storage.');
}

function renderRecipeDetail(recipe) {
  state.detailId = recipe.id; elements.detail.classList.remove('cook-mode');
  const ingredients = [...(recipe.recipe_ingredients || [])].sort((a, b) => a.position - b.position);
  const steps = [...(recipe.recipe_steps || [])].sort((a, b) => a.position - b.position);
  const videoUrl = safeUrl(recipe.video_url); const imageUrl = safeUrl(recipe.image_url);
  const media = videoUrl ? `<video class="detail-video" src="${escapeHtml(videoUrl)}"${imageUrl ? ` poster="${escapeHtml(imageUrl)}"` : ''} controls playsinline preload="metadata">Your browser cannot play this video.</video>` : imageUrl ? `<img class="detail-image photo-${recipe.image_fit === 'contain' ? 'contain' : 'cover'}" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(recipe.title)}" />` : '';
  const saved = state.saved.has(recipe.id);
  $('#recipeDetail').innerHTML = `${media}<div class="detail-content"><p class="eyebrow">${escapeHtml(categoryLabel(recipe.category))} · BY ${escapeHtml(recipe.profiles?.display_name || 'Home cook')}</p><h2 id="detailTitle">${escapeHtml(recipe.title)}</h2><p class="detail-description">${escapeHtml(recipe.description || '')}</p><div class="detail-meta"><span>${icon('clock')}${escapeHtml(recipe.cook_minutes)} min</span><span>${icon('utensils')}${escapeHtml(recipe.servings)} ${Number(recipe.servings) === 1 ? 'serving' : 'servings'}</span><span>${escapeHtml(difficultyLabel(recipe.difficulty))}</span></div><div class="detail-actions"><button class="secondary-button${saved ? ' is-saved' : ''}" type="button" data-save-id="${escapeHtml(recipe.id)}" aria-pressed="${saved}">${icon('bookmark')}${saved ? 'Saved' : 'Save recipe'}</button><button id="shareRecipeButton" class="secondary-button" type="button">${icon('external')}Share</button><button id="cookModeButton" class="primary-button" type="button" aria-pressed="false">${icon('utensils')}Start cooking</button></div><div class="detail-columns"><section><h3>Ingredients</h3><p class="section-help">Check them off as you go.</p><ul class="ingredient-checklist">${ingredients.map((item) => `<li><label><input type="checkbox" /><span><strong>${escapeHtml(item.quantity)}</strong> ${escapeHtml(item.item)}</span></label></li>`).join('') || '<li>No ingredients were added.</li>'}</ul></section><section><h3>Let’s make it.</h3><ol class="cooking-steps">${steps.map((step, index) => `<li><label><input type="checkbox" /><span class="step-number">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(step.instruction)}</span></label></li>`).join('') || '<li>No steps were added.</li>'}</ol></section></div>${recipe.author_id === state.session?.user?.id ? '<button class="text-button delete-recipe" type="button">Delete my recipe</button>' : ''}</div>`;
  $('#cookModeButton').addEventListener('click', () => {
    const active = elements.detail.classList.toggle('cook-mode'); $('#cookModeButton').setAttribute('aria-pressed', String(active)); $('#cookModeButton').innerHTML = `${icon('utensils')}${active ? 'Exit cooking mode' : 'Start cooking'}`;
    if (active) { const first = $('.cooking-steps input:not(:checked)', elements.detail); first?.focus({ preventScroll: true }); $('.cooking-steps', elements.detail)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  $('#shareRecipeButton').addEventListener('click', () => shareRecipe(recipe));
  $('.delete-recipe', elements.detail)?.addEventListener('click', () => deleteRecipe(recipe));
  openDialog(elements.detail);
}
async function shareRecipe(recipe) {
  const url = new URL(window.location.href); url.searchParams.set('recipe', recipe.id); url.hash = 'feed';
  try {
    if (navigator.share) await navigator.share({ title: `${recipe.title} · Recipe Book`, url: url.href });
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url.href); showToast('Recipe link copied. Share something delicious.'); }
    else showToast('Sharing is unavailable in this browser.');
  } catch (error) { if (error.name !== 'AbortError') showToast('Could not share the link. Please try again.'); }
}
async function deleteRecipe(recipe) {
  if (recipe.author_id !== state.session?.user?.id) return;
  if (!window.confirm(`Delete “${recipe.title}”? This cannot be undone.`)) return;
  const button = $('.delete-recipe', elements.detail); if (button) button.disabled = true;
  try {
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id).eq('author_id', state.session.user.id);
    if (error) throw error;
    closeDialog(elements.detail); state.saved.delete(recipe.id); writeSaved(); await loadRecipes(); showToast('Your recipe has been deleted.');
  } catch (error) { showToast(friendlyError(error, 'We could not delete this recipe.')); }
  finally { if (button) button.disabled = false; }
}
function addRow(kind, values = {}) {
  const row = document.createElement('div'); row.className = kind === 'ingredient' ? 'entry-row' : 'entry-row step-row';
  row.innerHTML = kind === 'ingredient' ? `<input data-quantity maxlength="60" aria-label="Ingredient amount" placeholder="e.g. 200 g" value="${escapeHtml(values.quantity || '')}" /><input data-item maxlength="120" aria-label="Ingredient name" placeholder="Ingredient" value="${escapeHtml(values.item || '')}" /><button class="remove-row" type="button" aria-label="Remove ingredient">${icon('x')}</button>` : `<span class="row-number" aria-hidden="true"></span><textarea rows="2" maxlength="500" aria-label="Cooking instruction" placeholder="Describe one simple step…">${escapeHtml(values.instruction || '')}</textarea><button class="remove-row" type="button" aria-label="Remove step">${icon('x')}</button>`;
  $(kind === 'ingredient' ? '#ingredients' : '#steps').append(row); refreshStepNumbers();
}
function refreshStepNumbers() { $$('#steps .row-number').forEach((element, index) => { element.textContent = String(index + 1).padStart(2, '0'); }); }
function getEntryValues() { const ingredients = $$('#ingredients .entry-row').map((row) => ({ quantity: $('[data-quantity]', row).value.trim(), item: $('[data-item]', row).value.trim() })).filter((item) => item.item || item.quantity); const steps = $$('#steps textarea').map((textarea) => textarea.value.trim()).filter(Boolean); return { ingredients, steps }; }
function setFormStep(step) {
  state.step = Math.min(3, Math.max(1, step));
  $$('[data-form-step]').forEach((section) => { section.hidden = Number(section.dataset.formStep) !== state.step; });
  $$('[data-step-indicator]').forEach((indicator) => { const number = Number(indicator.dataset.stepIndicator); indicator.classList.toggle('active', number === state.step); indicator.classList.toggle('completed', number < state.step); if (number === state.step) indicator.setAttribute('aria-current', 'step'); else indicator.removeAttribute('aria-current'); });
  $('#composerBack').hidden = state.step === 1; $('#composerNext').hidden = state.step === 3; $('#publishButton').hidden = state.step !== 3; elements.message.textContent = '';
}
function validateStep(step) {
  let message = ''; let target;
  if (step === 1) {
    const name = $('#authorName').value.trim(); const title = $('#recipeTitle').value.trim(); const minutes = Number($('#cookMinutes').value); const servings = Number($('#servings').value);
    if (name.length < 2 || name.length > 40) { message = 'Choose a creator name between 2 and 40 characters.'; target = $('#authorName'); }
    else if (title.length < 2 || title.length > 80) { message = 'Give your recipe a title between 2 and 80 characters.'; target = $('#recipeTitle'); }
    else if ($('#recipeDescription').value.trim().length > 600) { message = 'Keep your description to 600 characters or fewer.'; target = $('#recipeDescription'); }
    else if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) { message = 'Cooking time must be a whole number from 1 to 600 minutes.'; target = $('#cookMinutes'); }
    else if (!Number.isInteger(servings) || servings < 1 || servings > 50) { message = 'Servings must be a whole number from 1 to 50.'; target = $('#servings'); }
    else if (!CATEGORY_LABELS[$('#recipeCategory').value] || !DIFFICULTY_LABELS[$('#difficulty').value]) { message = 'Choose a category and difficulty.'; target = $('#recipeCategory'); }
  } else if (step === 2) {
    const { ingredients, steps } = getEntryValues();
    if (!ingredients.length) { message = 'Add at least one ingredient.'; target = $('[data-item]'); }
    else if (ingredients.some((item) => !item.item || item.item.length > 120 || item.quantity.length > 60)) { message = 'Each ingredient needs a name (up to 120 characters) and an optional amount (up to 60).'; target = $('[data-item]'); }
    else if (!steps.length || steps.some((instruction) => instruction.length < 2 || instruction.length > 500)) { message = 'Add at least one cooking step. Each step needs 2–500 characters.'; target = $('#steps textarea'); }
  } else if (!['cover', 'contain'].includes($('#imageFit').value)) { message = 'Choose how your photo should fit the card.'; target = $('#imageFit'); }
  if (message) { setFormStep(step); elements.message.textContent = message; target?.focus(); return false; }
  return true;
}

function clearSelectedMedia() {
  state.selectedFile = null; state.selectedImage = null; $('#videoFile').value = ''; $('#imageFile').value = '';
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl); state.previewUrl = null;
  $('#mediaPreview').replaceChildren(); $('#mediaPreview').hidden = true;
  $('#selectedVideo').textContent = ''; $('#selectedVideo').hidden = true; $('#selectedImage').textContent = ''; $('#selectedImage').hidden = true; $('#clearMedia').hidden = true;
}
function setMediaMode(mode) {
  if (!['image', 'video', 'none'].includes(mode) || state.publishing) return;
  if (state.mediaMode !== mode) clearSelectedMedia(); state.mediaMode = mode;
  $$('[data-media-mode]').forEach((button) => { const active = button.dataset.mediaMode === mode; button.classList.toggle('active', active); if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active)); else button.setAttribute('aria-pressed', String(active)); });
  $('#imagePicker').hidden = mode !== 'image'; $('#videoPicker').hidden = mode !== 'video';
  const fitField = $('#imageFit').closest('.field'); if (fitField) fitField.hidden = mode !== 'image';
}
function handleMediaSelect(file, kind) {
  if (!file || state.publishing) return;
  const video = kind === 'video'; const types = video ? ['video/mp4', 'video/webm', 'video/quicktime'] : ['image/jpeg', 'image/png', 'image/webp']; const limit = (video ? 100 : 10) * 1024 * 1024;
  if (!types.includes(file.type) || !file.size || file.size > limit) { const retained = state.selectedFile || state.selectedImage ? ' Your previous attachment is still selected.' : ''; showToast((video ? 'Choose an MP4, WebM or MOV video under 100 MB.' : 'Choose a JPG, PNG or WebP photo under 10 MB.') + retained); $(video ? '#videoFile' : '#imageFile').value = ''; return; }
  clearSelectedMedia(); state.mediaMode = kind;
  if (video) state.selectedFile = file; else state.selectedImage = file;
  state.previewUrl = URL.createObjectURL(file); const preview = document.createElement(video ? 'video' : 'img'); preview.src = state.previewUrl;
  if (video) { preview.controls = true; preview.playsInline = true; } else { preview.alt = 'Your selected recipe photo'; preview.style.objectFit = $('#imageFit').value; }
  $('#mediaPreview').replaceChildren(preview); $('#mediaPreview').hidden = false;
  const selected = $(video ? '#selectedVideo' : '#selectedImage'); selected.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`; selected.hidden = false; $('#clearMedia').hidden = false;
}
function resetRecipeForm() {
  elements.form.reset(); $('#authorName').value = state.creatorName;
  $('#ingredients').replaceChildren(); $('#steps').replaceChildren(); addRow('ingredient'); addRow('step');
  clearSelectedMedia(); state.mediaMode = 'image'; setMediaMode('image'); setFormStep(1); $('#uploadProgress').hidden = true; elements.message.textContent = '';
}
function openComposer() { if (!$('#authorName').value.trim()) $('#authorName').value = state.creatorName; openDialog(elements.composer); }
function setPublishing(publishing) {
  state.publishing = publishing; $$('button, input, select, textarea', elements.composer).forEach((control) => { control.disabled = publishing; });
  elements.composer.setAttribute('aria-busy', String(publishing)); $('#publishButton').textContent = publishing ? 'Preparing your recipe…' : state.pendingPublication ? 'Check publication status' : 'Publish recipe';
}
function safeFileName(name) { const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'; return `${crypto.randomUUID()}.${extension}`; }
async function uploadFile(file, userId, bucket, kind, uploadedFiles) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Your upload session expired. Please try again.');
  if (!window.tus?.Upload) throw new Error('The upload service has not loaded. Refresh this page and try again.');
  const projectRef = new URL(config.supabaseUrl).hostname.split('.')[0]; const path = `${userId}/${safeFileName(file.name)}`;
  uploadedFiles.push({ bucket, path }); $('#uploadProgress').hidden = false; $('#progressBar').style.width = '0%'; $('#uploadPercent').textContent = '0%'; $('#uploadProgressLabel').textContent = `Uploading ${kind}…`;
  await new Promise((resolve, reject) => {
    const upload = new window.tus.Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`, retryDelays: [0, 3000, 5000, 10000, 20000], chunkSize: 6 * 1024 * 1024,
      headers: { authorization: `Bearer ${session.access_token}`, apikey: config.supabasePublishableKey, 'x-upsert': 'false' }, uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
      metadata: { bucketName: bucket, objectName: path, contentType: file.type, cacheControl: '3600' },
      onError(uploadError) { reject(new Error(uploadError?.message || `The ${kind} could not upload. Please try again.`)); },
      onProgress(uploaded, total) { const progress = Math.min(100, Math.round((uploaded / total) * 100)); $('#progressBar').style.width = `${progress}%`; $('#uploadPercent').textContent = `${progress}%`; $('#uploadDetail').textContent = progress === 100 ? 'Finishing your upload…' : `${(uploaded / (1024 * 1024)).toFixed(1)} MB / ${(total / (1024 * 1024)).toFixed(1)} MB`; },
      onSuccess() { resolve(); }
    });
    // Retries within this upload keep the same owner path. A new submission gets a fresh path.
    upload.start();
  });
  return { path, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}
async function cleanupSubmission(draftId, uploadedFiles) {
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
  state.pendingPublication = null; setPublishing(false); closeDialog(elements.composer); resetRecipeForm();
  try { await refreshCreatorName(); } catch { /* Publication succeeded; a name refresh can wait. */ }
  clearFilters(); state.view = 'all'; await loadRecipes(); $('#feed').scrollIntoView({ behavior: 'smooth' }); showToast('Your recipe is live. Thanks for sharing your kitchen.');
}
async function checkPublicationStatus() {
  const pending = state.pendingPublication; if (!pending) return;
  setPublishing(true); $('#publishButton').textContent = 'Checking publication…';
  try {
    const { data, error } = await supabase.from('recipes').select('id, visibility').eq('id', pending.id).eq('author_id', state.session.user.id).maybeSingle();
    if (error) throw error;
    if (data?.visibility === 'published') { await finishPublication(); return; }
    if (data && data.visibility !== 'draft') throw new Error('Publication status is not yet available.');
    const cleaned = await cleanupSubmission(data ? pending.id : null, pending.files);
    if (!cleaned) throw new Error('The pending draft could not be cleared safely.');
    state.pendingPublication = null;
    elements.message.textContent = 'Publication did not finish. Your draft is still here. Click Publish recipe to try again.';
  } catch { elements.message.textContent = 'We could not confirm publication. Your recipe may already be live. Check its status before trying again; your draft and uploaded files have been kept.'; }
  finally { setPublishing(false); }
}
async function publishRecipe(event) {
  event.preventDefault(); if (state.publishing) return;
  if (state.pendingPublication) { await checkPublicationStatus(); return; }
  if (state.step < 3) { if (validateStep(state.step)) setFormStep(state.step + 1); return; }
  for (const step of [1, 2, 3]) if (!validateStep(step)) return;
  const { ingredients, steps } = getEntryValues(); const uploadedFiles = []; let draftId = null; let published = false; let publishAttempted = false;
  setPublishing(true); elements.message.textContent = '';
  try {
    await ensureGuestSession(); const userId = state.session.user.id; await claimCreatorName(state.session.user, $('#authorName').value);
    let video = null; let image = null;
    if (state.selectedFile) video = await uploadFile(state.selectedFile, userId, 'recipe-videos', 'video', uploadedFiles);
    if (state.selectedImage) image = await uploadFile(state.selectedImage, userId, 'recipe-images', 'photo', uploadedFiles);
    $('#publishButton').textContent = 'Saving your recipe…';
    const { data: draft, error: recipeError } = await supabase.from('recipes').insert({ author_id: userId, title: $('#recipeTitle').value.trim(), description: $('#recipeDescription').value.trim(), category: $('#recipeCategory').value, cook_minutes: Number($('#cookMinutes').value), servings: Number($('#servings').value), difficulty: $('#difficulty').value, video_path: video?.path || null, video_url: video?.url || null, video_mime: state.selectedFile?.type || null, video_size_bytes: state.selectedFile?.size || null, image_path: image?.path || null, image_url: image?.url || null, image_mime: state.selectedImage?.type || null, image_size_bytes: state.selectedImage?.size || null, image_fit: $('#imageFit').value, visibility: 'draft' }).select('id').single();
    if (recipeError) throw recipeError; draftId = draft.id;
    const [ingredientResult, stepResult] = await Promise.all([supabase.from('recipe_ingredients').insert(ingredients.map((item, position) => ({ recipe_id: draftId, position, ...item }))), supabase.from('recipe_steps').insert(steps.map((instruction, position) => ({ recipe_id: draftId, position, instruction })))]);
    if (ingredientResult.error || stepResult.error) throw ingredientResult.error || stepResult.error;
    publishAttempted = true;
    const { error: publishError } = await supabase.from('recipes').update({ visibility: 'published' }).eq('id', draftId).eq('author_id', userId);
    if (publishError) throw publishError; published = true;
    await finishPublication();
  } catch (error) {
    if (!published && publishAttempted) {
      state.pendingPublication = { id: draftId, files: uploadedFiles }; await checkPublicationStatus();
    } else if (!published) {
      await cleanupSubmission(draftId, uploadedFiles);
      elements.message.textContent = friendlyError(error, 'We could not publish your recipe. Your draft is still here.');
    } else showToast('Your recipe is published. Refresh the feed to see it.');
  } finally { setPublishing(false); $('#uploadProgress').hidden = true; }
}

elements.form.addEventListener('submit', publishRecipe);
$('#composerNext').addEventListener('click', () => { if (!state.publishing && validateStep(state.step)) setFormStep(state.step + 1); });
$('#composerBack').addEventListener('click', () => { if (!state.publishing) setFormStep(state.step - 1); });
$('#discardDraft')?.addEventListener('click', () => { if (state.pendingPublication) { elements.message.textContent = 'Check the publication status before starting over.'; return; } if (!state.publishing && window.confirm('Discard this unfinished recipe and start again?')) { resetRecipeForm(); showToast('Your unfinished recipe has been cleared.'); } });
$('#videoFile').addEventListener('change', () => handleMediaSelect($('#videoFile').files?.[0], 'video'));
$('#imageFile').addEventListener('change', () => handleMediaSelect($('#imageFile').files?.[0], 'image'));
$('#clearMedia').addEventListener('click', clearSelectedMedia);
$('#imageFit').addEventListener('change', () => { const image = $('#mediaPreview img'); if (image) image.style.objectFit = $('#imageFit').value; });
elements.search.addEventListener('input', renderRecipes);
[elements.category, elements.time, elements.difficulty, elements.sort].filter(Boolean).forEach((element) => element.addEventListener('change', renderRecipes));
$('#clearFilters')?.addEventListener('click', clearFilters);
$('#emptyClearButton')?.addEventListener('click', clearFilters);
$('#retryButton')?.addEventListener('click', loadRecipes);
$('#filtersButton')?.addEventListener('click', () => { const panel = $('#filterPanel'); panel.hidden = !panel.hidden; $('#filtersButton').setAttribute('aria-expanded', String(!panel.hidden)); });
$('#surpriseButton')?.addEventListener('click', () => { const recipes = filteredRecipes(); if (!recipes.length) { showToast('Add a recipe or clear your filters to find some inspiration.'); return; } renderRecipeDetail(recipes[Math.floor(Math.random() * recipes.length)]); });
document.addEventListener('click', (event) => {
  const target = event.target.closest('button, a'); if (!target) return;
  if (target.matches('[data-close-dialog]')) { closeDialog($(`#${target.dataset.closeDialog}`)); return; }
  if (target.matches('[data-open-composer], #openComposer')) { event.preventDefault(); openComposer(); return; }
  if (target.matches('[data-open-profile], #profileButton, #tabProfileButton')) { event.preventDefault(); openProfile(); return; }
  if (target.matches('[data-save-id]')) { toggleSave(target.dataset.saveId); return; }
  if (target.matches('[data-recipe-id]')) { const recipe = state.recipes.find((item) => item.id === target.dataset.recipeId); if (recipe) renderRecipeDetail(recipe); return; }
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
  try { await ensureGuestSession(); await claimCreatorName(state.session.user, $('#profileName').value); $('#authorName').value = state.creatorName; await refreshCreatorName(); closeDialog($('#profileDialog')); await loadRecipes(); showToast('Your creator name has been updated.'); }
  catch (error) { $('#profileMessage').textContent = friendlyError(error, 'Your name could not be saved.'); }
  finally { button.disabled = false; }
});
elements.composer.addEventListener('cancel', (event) => { if (state.publishing) event.preventDefault(); });
elements.detail.addEventListener('close', () => { $$('video', elements.detail).forEach((video) => video.pause()); elements.detail.classList.remove('cook-mode'); });
window.addEventListener('beforeunload', (event) => { if (state.publishing) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('storage', (event) => { if (event.key === SAVED_KEY) { state.saved = readSaved(); renderRecipes(); } });
supabase?.auth.onAuthStateChange((_event, session) => { state.session = session; });
(async function initialize() {
  resetRecipeForm();
  if (supabase) { try { const { data: { session } } = await supabase.auth.getSession(); state.session = session; await refreshCreatorName(); } catch { /* Browsing remains available without a creator session. */ } }
  await loadRecipes();
  const sharedId = new URL(window.location.href).searchParams.get('recipe');
  if (sharedId) { const recipe = state.recipes.find((item) => item.id === sharedId); if (recipe) renderRecipeDetail(recipe); else if (!state.loadError) showToast('That recipe is no longer available. Explore something new.'); }
})();
