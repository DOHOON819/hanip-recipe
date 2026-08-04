import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const config = window.HANIP_CONFIG;
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const state = { session: null, recipes: [], selectedFile: null, selectedImage: null, toastTimer: null };

if (!config?.supabaseUrl || !config?.supabasePublishableKey) throw new Error('Supabase connection is not configured.');

const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const elements = {
  openComposer: $('#openComposer'), composerDialog: $('#composerDialog'), detailDialog: $('#detailDialog'),
  recipeForm: $('#recipeForm'), recipeGrid: $('#recipeGrid'), feedStatus: $('#feedStatus'), emptyState: $('#emptyState'),
  videoFile: $('#videoFile'), videoLabel: $('#videoLabel'), selectedVideo: $('#selectedVideo'), imageFile: $('#imageFile'), imageLabel: $('#imageLabel'), selectedImage: $('#selectedImage'), uploadProgress: $('#uploadProgress'),
  uploadProgressLabel: $('#uploadProgressLabel'), uploadPercent: $('#uploadPercent'), progressBar: $('#progressBar'), uploadDetail: $('#uploadDetail'), recipeMessage: $('#recipeMessage'),
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
    .select('id, author_id, title, description, category, cook_minutes, servings, difficulty, video_url, image_url, image_fit, created_at, profiles(display_name), recipe_ingredients(position, item, quantity), recipe_steps(position, instruction)')
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
    const imageFit = recipe.image_fit === 'contain' ? 'contain' : 'cover';
    const media = recipe.video_url ? `<video src="${escapeHtml(recipe.video_url)}" muted playsinline preload="metadata"></video><span class="play-chip" aria-hidden="true">▶</span>` : recipe.image_url ? `<img class="photo-${imageFit}" src="${escapeHtml(recipe.image_url)}" alt="${escapeHtml(recipe.title)}" loading="lazy" />` : '<div class="media-placeholder">한입 레시피</div>';
    return `<article class="recipe-card" data-recipe-id="${escapeHtml(recipe.id)}" tabindex="0" aria-label="${escapeHtml(recipe.title)} 상세 보기">
      <div class="video-thumb">${media}<div class="thumb-meta"><span class="badge">${escapeHtml(recipe.category)}</span><span class="badge">${escapeHtml(recipe.cook_minutes)}분</span></div></div>
      <div class="recipe-card-content"><div class="card-byline">${escapeHtml(author)}</div><h3>${escapeHtml(recipe.title)}</h3><p>${escapeHtml(recipe.description || '레시피를 열어 조리 순서를 확인해보세요.')}</p><div class="card-footer"><span>${escapeHtml(recipe.servings)}인분</span><span>·</span><span>${escapeHtml(recipe.difficulty)}</span></div></div>
    </article>`;
  }).join('');
  elements.emptyState.hidden = recipes.length !== 0;
  elements.feedStatus.textContent = state.recipes.length ? `${recipes.length}개의 실제 영상 레시피` : '아직 공개된 레시피가 없어요.';
}

function renderRecipeDetail(recipe) {
  const ingredients = [...(recipe.recipe_ingredients || [])].sort((a, b) => a.position - b.position);
  const steps = [...(recipe.recipe_steps || [])].sort((a, b) => a.position - b.position);
  const imageFit = recipe.image_fit === 'contain' ? 'contain' : 'cover';
  const detailMedia = `${recipe.image_url ? `<img class="detail-image photo-${imageFit}" src="${escapeHtml(recipe.image_url)}" alt="${escapeHtml(recipe.title)}" />` : ''}${recipe.video_url ? `<video class="detail-video" src="${escapeHtml(recipe.video_url)}" controls playsinline preload="metadata">브라우저에서 영상을 재생할 수 없어요.</video>` : ''}`;
  elements.recipeDetail.innerHTML = `${detailMedia}
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
  state.selectedImage = null;
  elements.videoLabel.textContent = '조리 영상 선택';
  elements.imageLabel.textContent = '대표 사진 선택';
  elements.selectedVideo.hidden = true;
  elements.selectedImage.hidden = true;
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

function handleImageSelect(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('JPG, PNG, WebP 파일만 올릴 수 있어요.'); elements.imageFile.value = ''; return; }
  if (file.size > 10 * 1024 * 1024) { showToast('사진은 10MB 이하로 올려주세요.'); elements.imageFile.value = ''; return; }
  state.selectedImage = file;
  elements.imageLabel.textContent = '다른 사진 선택';
  elements.selectedImage.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)}MB`;
  elements.selectedImage.hidden = false;
}

function getEntryValues() {
  const ingredients = $$('#ingredients .entry-row').map((row) => ({ quantity: $('input[aria-label="재료 분량"]', row).value.trim(), item: $('input[aria-label="재료 이름"]', row).value.trim() })).filter((item) => item.item);
  return { ingredients, steps: $$('#steps textarea').map((textarea) => textarea.value.trim()).filter(Boolean) };
}

function safeFileName(name) { const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'; return `${crypto.randomUUID()}.${extension}`; }

async function uploadFile(file, userId, bucket, kind) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('업로드 세션을 확인할 수 없어요. 다시 시도해주세요.');
  if (!window.tus?.Upload) throw new Error('영상 업로드 도구를 불러오지 못했어요. 새로고침 후 다시 시도해주세요.');
  const projectRef = new URL(config.supabaseUrl).hostname.split('.')[0];
  const path = `${userId}/${safeFileName(file.name)}`;
  elements.uploadProgress.hidden = false; elements.progressBar.style.width = '0%'; elements.uploadPercent.textContent = '0%';
  elements.uploadProgressLabel.textContent = `${kind} 업로드 중`;
  return new Promise((resolve, reject) => {
    const upload = new window.tus.Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`, retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${session.access_token}`, apikey: config.supabasePublishableKey, 'x-upsert': 'false' }, uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
      metadata: { bucketName: bucket, objectName: path, contentType: file.type, cacheControl: '3600' },
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
  const publishButton = $('#publishButton'); publishButton.disabled = true; publishButton.textContent = '업로드 준비 중…';
  try {
    await ensureGuestSession(); await claimCreatorName(state.session.user, authorName);
    let video = null; let image = null;
    if (state.selectedFile) { const path = await uploadFile(state.selectedFile, state.session.user.id, 'recipe-videos', '영상'); video = { path, url: supabase.storage.from('recipe-videos').getPublicUrl(path).data.publicUrl }; }
    if (state.selectedImage) { const path = await uploadFile(state.selectedImage, state.session.user.id, 'recipe-images', '사진'); image = { path, url: supabase.storage.from('recipe-images').getPublicUrl(path).data.publicUrl }; }
    publishButton.textContent = '레시피 저장 중…';
    const { data: recipe, error: recipeError } = await supabase.from('recipes').insert({ author_id: state.session.user.id, title, description: $('#recipeDescription').value.trim(), category: $('#recipeCategory').value, cook_minutes: Number($('#cookMinutes').value), servings: Number($('#servings').value), difficulty: $('#difficulty').value, video_path: video?.path || null, video_url: video?.url || null, video_mime: state.selectedFile?.type || null, video_size_bytes: state.selectedFile?.size || null, image_path: image?.path || null, image_url: image?.url || null, image_mime: state.selectedImage?.type || null, image_size_bytes: state.selectedImage?.size || null, image_fit: $('#imageFit').value, visibility: 'published' }).select('id').single();
    if (recipeError) throw recipeError;
    const results = await Promise.all([supabase.from('recipe_ingredients').insert(ingredients.map((item, position) => ({ recipe_id: recipe.id, position, ...item }))), supabase.from('recipe_steps').insert(steps.map((instruction, position) => ({ recipe_id: recipe.id, position, instruction })))]);
    if (results.find((result) => result.error)?.error) throw results.find((result) => result.error).error;
    closeDialog(elements.composerDialog); resetRecipeForm(); showToast('영상 레시피가 공개되었어요.'); await loadRecipes(); document.querySelector('#feed').scrollIntoView({ behavior: 'smooth' });
  } catch (error) { elements.recipeMessage.textContent = error.message || '업로드 중 문제가 생겼어요. 다시 시도해주세요.'; }
  finally { publishButton.disabled = false; publishButton.textContent = '레시피 공개하기'; elements.uploadProgress.hidden = true; }
}

async function openComposer() { try { await ensureGuestSession(); resetRecipeForm(); openDialog(elements.composerDialog); } catch (error) { showToast(error.message); } }

elements.openComposer.addEventListener('click', openComposer);
$$('[data-open-composer]').forEach((button) => button.addEventListener('click', openComposer));
$$('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => closeDialog($(`#${button.dataset.closeDialog}`))));
elements.recipeForm.addEventListener('submit', publishRecipe);
elements.videoFile.addEventListener('change', () => handleVideoSelect(elements.videoFile.files?.[0]));
elements.imageFile.addEventListener('change', () => handleImageSelect(elements.imageFile.files?.[0]));
elements.search.addEventListener('input', renderRecipes); elements.category.addEventListener('change', renderRecipes);
document.addEventListener('click', (event) => { const addButton = event.target.closest('[data-add-row]'); if (addButton) addRow(addButton.dataset.addRow); const removeButton = event.target.closest('.remove-row'); if (removeButton) { removeButton.closest('.entry-row').remove(); refreshStepNumbers(); } const card = event.target.closest('[data-recipe-id]'); if (card) { const recipe = state.recipes.find((item) => item.id === card.dataset.recipeId); if (recipe) renderRecipeDetail(recipe); } });
document.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.matches('[data-recipe-id]')) event.target.click(); });
supabase.auth.onAuthStateChange((_event, session) => { state.session = session; });
(async function initialize() { const { data: { session } } = await supabase.auth.getSession(); state.session = session; resetRecipeForm(); await loadRecipes(); })();
(async function creatorIdentityControls() {
  const profileButton = $('#profileButton');
  const profileDialog = $('#profileDialog');
  const profileForm = $('#profileForm');
  const profileName = $('#profileName');
  const profileMessage = $('#profileMessage');

  async function refreshCreatorName() {
    if (!state.session?.user) return null;
    const { data } = await supabase.from('profiles').select('display_name').eq('id', state.session.user.id).maybeSingle();
    if (data?.display_name) { profileButton.textContent = data.display_name; profileName.value = data.display_name; return data.display_name; }
    return null;
  }

  profileButton.addEventListener('click', async () => { try { await ensureGuestSession(); await refreshCreatorName(); openDialog(profileDialog); } catch (error) { showToast(error.message); } });
  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault(); profileMessage.textContent = '';
    try { await ensureGuestSession(); await claimCreatorName(state.session.user, profileName.value); await refreshCreatorName(); closeDialog(profileDialog); showToast('이름이 연결되었어요.'); }
    catch (error) { profileMessage.textContent = error.code === '23505' ? '이미 사용 중인 이름이에요. 다른 이름을 정해주세요.' : (error.message || '이름을 저장하지 못했어요.'); }
  });
  const { data: { session } } = await supabase.auth.getSession(); state.session = session; await refreshCreatorName();
})();

async function claimCreatorName(user, displayName) {
  const name = String(displayName || '').trim().slice(0, 40);
  if (name.length < 2) throw new Error('이름은 2자 이상 입력해주세요.');
  const { data: existing, error: lookupError } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.display_name) {
    if (existing.display_name === name) return existing.display_name;
    const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', user.id);
    if (error) throw error;
    return name;
  }
  const { error } = await supabase.from('profiles').insert({ id: user.id, display_name: name });
  if (error) throw error;
  return name;
}

document.addEventListener('click', (event) => {
  const card = event.target.closest('[data-recipe-id]');
  if (!card) return;
  window.setTimeout(() => {
    const recipe = state.recipes.find((item) => item.id === card.dataset.recipeId);
    if (!recipe || recipe.author_id !== state.session?.user?.id || $('#deleteRecipeButton')) return;
    const target = $('.detail-content');
    if (!target) return;
    const button = document.createElement('button');
    button.id = 'deleteRecipeButton'; button.className = 'text-button delete-recipe'; button.type = 'button'; button.textContent = '이 레시피 삭제';
    button.addEventListener('click', async () => {
      if (!window.confirm('이 레시피를 삭제할까요?')) return;
      const { error } = await supabase.from('recipes').delete().eq('id', recipe.id);
      if (error) { showToast(error.message || '삭제하지 못했어요.'); return; }
      closeDialog(elements.detailDialog); await loadRecipes(); showToast('레시피를 삭제했어요.');
    });
    target.append(button);
  }, 0);
});
