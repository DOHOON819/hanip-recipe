import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const config = window.HANIP_CONFIG;
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const state = { session: null, recipes: [], selectedFile: null, toastTimer: null };

if (!config?.supabaseUrl || !config?.supabasePublishableKey) throw new Error('Supabase connection is not configured.');

const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const elements = {
  openComposer: $('#openComposer'), composerDialog: $('#composerDialog'), detailDialog: $('#detailDialog'),
  recipeForm: $('#recipeForm'), recipeGrid: $('#recipeGrid'), feedStatus: $('#feedStatus'), emptyState: $('#emptyState'),
  videoFile: $('#videoFile'), videoLabel: $('#videoLabel'), selectedVideo: $('#selectedVideo'), uploadProgress: $('#uploadProgress'),
  uploadPercent: $('#uploadPercent'), progressBar: $('#progressBar'), uploadDetail: $('#uploadDetail'), recipeMessage: $('#recipeMessage'),
  search: $('#searchInput'), category: $('#categoryFilter'), recipeDetail: $('#recipeDetail'), toast: $('#toast')
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 3400);
}

function openDialog(dialog) { if (!dialog.open) dialog.showModal(); }
function closeDialog(dialog) { if (dialog.open) dialog.close(); }

async function ensureGuestSession() {
  if (state.session?.user) return state.session;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) { state.session = session; return session; }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error('익명 업로드 준비에 실패했어요. 잠시 후 다시 시도해주세요.');
  state.session = data.session;
  return data.session;
}

async function ensureProfile(user, displayName) {
  const name = String(displayName || '익명 요리사').trim().slice(0, 40);
  const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: name }, { onConflict: 'id' });
  if (error) throw error;
}

async function loadRecipes() {
  elements.feedStatus.textContent = '레시피를 불러오는 중이에요.';
  const { data, error } = await supabase.from('recipes')
    .select('id, title, description, category, cook_minutes, servings, difficulty, video_url, created_at, profiles(display_name), recipe_ingredients(position, item, quantity), recipe_steps(position, instruction)')
    .eq('visibility', 'published').order('created_at', { ascending: false });
  if (error) {
    elements.feedStatus.textContent = '레시피 공간을 준비하는 중이에요.';
    elements.recipeGrid.innerHTML = '';
    elements.emptyState.hidden = false;
    return;
  }
  state.recipes = data || [];
  renderRecipes();
}

function filteredRecipes() {
  const term = elements.search.value.trim().toLowerCase();
  const category = elements.category.value;
  return state.recipes.filter((recipe) => {
    const contents = [recipe.title, recipe.description, recipe.category, ...(recipe.recipe_ingredients || []).map((item) => item.item)].join(' ').toLowerCase();
    return (!term || contents.includes(term)) && (!category || recipe.category === category);
  });
}

function renderRecipes() {
  const recipes = filteredRecipes();
  elements.recipeGrid.innerHTML = recipes.map((recipe) => {
    const author = recipe.profiles?.display_name || '익명 요리사';
    return `<article class="recipe-card" data-recipe-id="${escapeHtml(recipe.id)}" tabindex="0" aria-label="${escapeHtml(recipe.title)} 상세 보기">
      <div class="video-thumb"><video src="${escapeHtml(recipe.video_url)}" muted playsinline preload="metadata"></video><div class="thumb-meta"><span class="badge">${escapeHtml(recipe.category)}</span><span class="badge">${escapeHtml(recipe.cook_minutes)}분</span></div><span class="play-chip" aria-hidden="true">▶</span></div>
      <div class="recipe-card-content"><div class="card-byline">${escapeHtml(author)}</div><h3>${escapeHtml(recipe.title)}</h3><p>${escapeHtml(recipe.description || '레시피를 열어 조리 순서를 확인해보세요.')}</p><div class="card-footer"><span>${escapeHtml(recipe.servings)}인분</span><span>·</span><span>${escapeHtml(recipe.difficulty)}</span></div></div>
    </article>`;
  }).join('');
  elements.emptyState.hidden = recipes.length !== 0;
  elements.feedStatus.textContent = state.recipes.length ? `${recipes.length}개의 실제 영상 레시피` : '아직 공개된 레시피가 없어요.';
}

function renderRecipeDetail(recipe) {
  const ingredients = [...(recipe.recipe_ingredients || [])].sort((a, b) => a.position - b.position);
  const steps = [...(recipe.recipe_steps || [])].sort((a, b) => a.position - b.position);
  elements.recipeDetail.innerHTML = `<video class="detail-video" src="${escapeHtml(recipe.video_url)}" controls playsinline preload="metadata">브라우저에서 영상을 재생할 수 없어요.</video>
    <div class="detail-content"><p class="eyebrow">${escapeHtml(recipe.category)} · ${escapeHtml(recipe.profiles?.display_name || '익명 요리사')}</p><h2 id="detailTitle">${escapeHtml(recipe.title)}</h2><div class="detail-meta"><span>${escapeHtml(recipe.cook_minutes)}분</span><span>${escapeHtml(recipe.servings)}인분</span><span>${escapeHtml(recipe.difficulty)}</span></div><p class="detail-description">${escapeHtml(recipe.description || '')}</p><div class="detail-columns"><section><h3>재료</h3><ul>${ingredients.map((item) => `<li>${escapeHtml(item.item)}${item.quantity ? ` · ${escapeHtml(item.quantity)}` : ''}</li>`).join('') || '<li>등록된 재료가 없어요.</li>'}</ul></section><section><h3>조리 순서</h3><ol>${steps.map((step) => `<li>${escapeHtml(step.instruction)}</li>`).join('') || '<li>등록된 조리 순서가 없어요.</li>'}</ol></section></div></div>`;
  openDialog(elements.detailDialog);
}

function addRow(kind) {
  const target = kind === 'ingredient' ? $('#ingredients') : $('#steps');
  const row = document.createElement('div');
  row.className = kind === 'ingredient' ? 'entry-row' : 'entry-row step-row';
  row.innerHTML = kind === 'ingredient'
    ? '<input maxlength="60" aria-label="재료 분량" placeholder="예: 200g" /><input maxlength="120" aria-label="재료 이름" placeholder="재료 이름" /><button class="remove-row" type="button" aria-label="재료 삭제">×</button>'
    : '<span class="row-number" aria-hidden="true"></span><textarea rows="2" maxlength="500" aria-label="조리 순서" placeholder="예: 면을 삶아 찬물에 헹궈주세요."></textarea><button class="remove-row" type="button" aria-label="조리 순서 삭제">×</button>';
  target.append(row);
  refreshStepNumbers();
}

function refreshStepNumbers() { $$('#steps .row-number').forEach((element, index) => { element.textContent = String(index + 1).padStart(2, '0'); }); }

function resetRecipeForm() {
  elements.recipeForm.reset();
  $('#ingredients').innerHTML = '';
  $('#steps').innerHTML = '';
  addRow('ingredient'); addRow('step');
  state.selectedFile = null;
  elements.videoLabel.textContent = '조리 영상 선택';
  elements.selectedVideo.hidden = true;
  elements.uploadProgress.hidden = true;
  elements.recipeMessage.textContent = '';
}

function handleVideoSelect(file) {
  if (!file) return;
  if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) { showToast('MP4, WebM, MOV 파일만 올릴 수 있어요.'); elements.videoFile.value = ''; return; }
  if (file.size > 100 * 1024 * 1024) { showToast('영상은 100MB 이하로 올려주세요.'); elements.videoFile.value = ''; return; }
  state.selectedFile = file;
  elements.videoLabel.textContent = '다른 영상 선택';
  elements.selectedVideo.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)}MB`;
  elements.selectedVideo.hidden = false;
}

function getEntryValues() {
  const ingredients = $$('#ingredients .entry-row').map((row) => ({ quantity: $('input[aria-label="재료 분량"]', row).value.trim(), item: $('input[aria-label="재료 이름"]', row).value.trim() })).filter((item) => item.item);
  return { ingredients, steps: $$('#steps textarea').map((textarea) => textarea.value.trim()).filter(Boolean) };
}

function safeFileName(name) { const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'; return `${crypto.randomUUID()}.${extension}`; }

async function uploadVideo(file, userId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('업로드 세션을 확인할 수 없어요. 다시 시도해주세요.');
  if (!window.tus?.Upload) throw new Error('영상 업로드 도구를 불러오지 못했어요. 새로고침 후 다시 시도해주세요.');
  const projectRef = new URL(config.supabaseUrl).hostname.split('.')[0];
  const path = `${userId}/${safeFileName(file.name)}`;
  elements.uploadProgress.hidden = false; elements.progressBar.style.width = '0%'; elements.uploadPercent.textContent = '0%';
  return new Promise((resolve, reject) => {
    const upload = new window.tus.Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`, retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${session.access_token}`, apikey: config.supabasePublishableKey, 'x-upsert': 'false' }, uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
      metadata: { bucketName: 'recipe-videos', objectName: path, contentType: file.type, cacheControl: '3600' },
      onError(error) { reject(new Error(error?.message || '영상 업로드에 실패했어요.')); },
      onProgress(uploaded, total) { const progress = Math.min(100, Math.round((uploaded / total) * 100)); elements.progressBar.style.width = `${progress}%`; elements.uploadPercent.textContent = `${progress}%`; elements.uploadDetail.textContent = progress === 100 ? '파일을 확인하고 있어요.' : `${(uploaded / (1024 * 1024)).toFixed(1)}MB / ${(total / (1024 * 1024)).toFixed(1)}MB`; },
      onSuccess() { resolve(path); }
    });
    upload.findPreviousUploads().then((previousUploads) => { if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]); upload.start(); }).catch(reject);
  });
}

async function publishRecipe(event) {
  event.preventDefault(); elements.recipeMessage.textContent = '';
  const authorName = $('#authorName').value.trim(); const title = $('#recipeTitle').value.trim(); const { ingredients, steps } = getEntryValues();
  if (!authorName || !title || !ingredients.length || !steps.length) { elements.recipeMessage.textContent = '닉네임, 메뉴 이름, 재료 1개, 조리 순서 1개는 꼭 필요해요.'; return; }
  if (!state.selectedFile) { elements.recipeMessage.textContent = '실제 조리 영상을 선택해주세요.'; return; }
  const publishButton = $('#publishButton'); publishButton.disabled = true; publishButton.textContent = '업로드 준비 중…';
  try {
    await ensureGuestSession(); await ensureProfile(state.session.user, authorName);
    const path = await uploadVideo(state.selectedFile, state.session.user.id); publishButton.textContent = '레시피 저장 중…';
    const { data: publicData } = supabase.storage.from('recipe-videos').getPublicUrl(path);
    const { data: recipe, error: recipeError } = await supabase.from('recipes').insert({ author_id: state.session.user.id, title, description: $('#recipeDescription').value.trim(), category: $('#recipeCategory').value, cook_minutes: Number($('#cookMinutes').value), servings: Number($('#servings').value), difficulty: $('#difficulty').value, video_path: path, video_url: publicData.publicUrl, video_mime: state.selectedFile.type, video_size_bytes: state.selectedFile.size, visibility: 'published' }).select('id').single();
    if (recipeError) throw recipeError;
    const results = await Promise.all([supabase.from('recipe_ingredients').insert(ingredients.map((item, position) => ({ recipe_id: recipe.id, position, ...item }))), supabase.from('recipe_steps').insert(steps.map((instruction, position) => ({ recipe_id: recipe.id, position, instruction })))]);
    if (results.find((result) => result.error)?.error) throw results.find((result) => result.error).error;
    closeDialog(elements.composerDialog); resetRecipeForm(); showToast('영상 레시피가 공개되었어요.'); await loadRecipes(); document.querySelector('#feed').scrollIntoView({ behavior: 'smooth' });
  } catch (error) { elements.recipeMessage.textContent = error.message || '업로드 중 문제가 생겼어요. 다시 시도해주세요.'; }
  finally { publishButton.disabled = false; publishButton.textContent = '영상과 레시피 공개하기'; elements.uploadProgress.hidden = true; }
}

async function openComposer() { try { await ensureGuestSession(); resetRecipeForm(); openDialog(elements.composerDialog); } catch (error) { showToast(error.message); } }

elements.openComposer.addEventListener('click', openComposer);
$$('[data-open-composer]').forEach((button) => button.addEventListener('click', openComposer));
$$('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => closeDialog($(`#${button.dataset.closeDialog}`))));
elements.recipeForm.addEventListener('submit', publishRecipe);
elements.videoFile.addEventListener('change', () => handleVideoSelect(elements.videoFile.files?.[0]));
elements.search.addEventListener('input', renderRecipes); elements.category.addEventListener('change', renderRecipes);
document.addEventListener('click', (event) => { const addButton = event.target.closest('[data-add-row]'); if (addButton) addRow(addButton.dataset.addRow); const removeButton = event.target.closest('.remove-row'); if (removeButton) { removeButton.closest('.entry-row').remove(); refreshStepNumbers(); } const card = event.target.closest('[data-recipe-id]'); if (card) { const recipe = state.recipes.find((item) => item.id === card.dataset.recipeId); if (recipe) renderRecipeDetail(recipe); } });
document.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.matches('[data-recipe-id]')) event.target.click(); });
supabase.auth.onAuthStateChange((_event, session) => { state.session = session; });
(async function initialize() { const { data: { session } } = await supabase.auth.getSession(); state.session = session; resetRecipeForm(); await loadRecipes(); })();
