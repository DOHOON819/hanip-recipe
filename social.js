import { t, applyTranslations, getLanguage, localizeMinutes } from './i18n.js?v=20261115-recent-v1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url = value => { try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
const paths = {
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  like: '<path d="M7 10v11H3V10zm0 0 5-8c3 0 2 5 1 7h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7"/>',
  dislike: '<path d="M7 14V3H3v11zm0 0 5 8c3 0 2-5 1-7h6a2 2 0 0 0 2-2l-2-8a2 2 0 0 0-2-2H7"/>',
  comment: '<path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.8L3 21l1.3-5A9 9 0 1 1 21 11.5Z"/>',
  shorts: '<rect x="6" y="2" width="12" height="20" rx="4"/><path d="m10 8 5 4-5 4z"/>',
  sound: '<path d="M11 4 6 8H2v8h4l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 4 6 8H2v8h4l5 4zm5 5 6 6m0-6-6 6"/>',
  up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>'
};
const icon = name => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${paths[name] || `<use href="#icon-${name}"/>`}</svg>`;
const blank = () => ({ hearts:0, likes:0, dislikes:0, mine:{heart:false,vote:0}, comments:[] });

export async function checkVideo(file) {
  const source = URL.createObjectURL(file); const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'auto';
  try { return await new Promise(resolve => { let done = false; const finish = ok => { if (done) return; done = true; clearTimeout(timer); resolve(ok); }; const timer = setTimeout(() => finish(false), 15000); video.onloadeddata = () => finish(video.videoWidth > 0); video.onerror = () => finish(false); video.src = source; }); }
  finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(source); }
}

export function createSocialExperience(api) {
  const cache = new Map(), busy = new Set(), pending = new Map(), versions = new Map();
  let current = null, muted = true, userPaused = false, observer, shortsRecipes = [], commentRecipe = null;
  const symbols = document.querySelector('.icon-definitions defs');
  for (const [name, path] of Object.entries(paths)) if (!document.getElementById(`icon-${name}`)) symbols.insertAdjacentHTML('beforeend', `<symbol id="icon-${name}" viewBox="0 0 24 24">${path}</symbol>`);
  for (const selector of ['.header-nav','.side-nav','.mobile-nav']) {
    const nav = document.querySelector(selector); const button = document.createElement('button'); button.type = 'button'; button.dataset.openShorts = ''; button.innerHTML = `${icon('shorts')}<span>Shorts</span>`; nav.insertBefore(button, nav.children[1]);
  }
  document.querySelector('.media-feed-tabs').insertAdjacentHTML('afterend', '<button class="shorts-entry" type="button" data-open-shorts>' + icon('shorts') + '<span>Watch shorts</span></button>');
  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="shortsDialog" class="shorts-dialog" aria-labelledby="shortsTitle">
      <header class="shorts-header"><h2 id="shortsTitle">Shorts</h2><span id="shortsHint" role="status">Scroll to explore</span><button type="button" data-close-shorts class="icon-button" aria-label="Close">${icon('x')}</button></header>
      <div id="shortsViewport" class="shorts-viewport" tabindex="0" aria-label="Recipe shorts"></div>
      <nav class="shorts-navigation" aria-label="Browse shorts"><button type="button" data-short-step="-1" aria-label="Previous recipe">${icon('up')}</button><button type="button" data-short-step="1" aria-label="Next recipe">${icon('down')}</button></nav>
    </dialog>
    <dialog id="commentsDialog" class="dialog comments-dialog" aria-labelledby="commentsTitle"><header class="dialog-header"><div><p class="eyebrow">Join the conversation</p><h2 id="commentsTitle">Comments</h2></div><button class="icon-button" type="button" data-close-comments aria-label="Close">${icon('x')}</button></header><div id="commentsContent"></div></dialog>`);
  const shorts = document.getElementById('shortsDialog'), viewport = document.getElementById('shortsViewport'), comments = document.getElementById('commentsDialog');

  function reactionButtons(recipeId) {
    return `<div class="reaction-buttons" data-social-for="${esc(recipeId)}">${[['heart','Heart','hearts'],['like','Like','likes'],['dislike','Dislike','dislikes']].map(([kind,label,count]) => `<button type="button" data-react="${kind}" data-id="${esc(recipeId)}" aria-pressed="false" aria-label="${esc(t(label))}">${icon(kind)}<span>${esc(t(label))}</span><b data-count="${count}">—</b></button>`).join('')}</div>`;
  }
  function paint(id) {
    const data = cache.get(id);
    document.querySelectorAll('[data-social-for]').forEach(group => {
      if (group.dataset.socialFor !== id) return;
      group.querySelectorAll('[data-react]').forEach(button => {
        const kind = button.dataset.react, active = kind === 'heart' ? data?.mine.heart : data?.mine.vote === (kind === 'like' ? 1 : -1);
        button.setAttribute('aria-pressed', String(!!active)); button.disabled = busy.has(id) || !data;
        const count = button.querySelector('[data-count]'); count.textContent = data ? data[count.dataset.count] : '—';
      });
    });
    document.querySelectorAll('[data-comments-list]').forEach(list => {
      if (list.dataset.commentsList !== id || !data) return;
      // Draft textarea and send button live outside this region and survive polling.
      list.innerHTML = data.comments.length ? data.comments.map(c => `<article class="comment"><div><b dir="auto" data-no-translate>${esc(c.name)}</b><time>${esc(new Date(c.created_at * 1000).toLocaleString(getLanguage(), { dateStyle:'medium', timeStyle:'short' }))}</time>${c.author_id === api.getUser() ? `<button type="button" data-delete-comment="${esc(c.id)}" data-id="${esc(id)}" aria-label="${esc(t('Delete comment'))}">${icon('x')}</button>` : ''}</div><p dir="auto" data-no-translate>${esc(c.body)}</p></article>`).join('') : `<p class="comments-empty">${esc(t('Be the first to comment.'))}</p>`;
    });
    document.querySelectorAll('[data-comment-count]').forEach(el => { if (el.dataset.commentCount === id) el.textContent = data ? data.comments.length : '—'; });
  }
  async function load(id, quiet = false) {
    if (pending.has(id)) return pending.get(id);
    const request = (async () => {
      const version = versions.get(id) || 0;
      try {
        if (!api.backend) throw new Error('Social features are unavailable. Please try again.');
        const data = await api.backend.loadSocial(id); if ((versions.get(id) || 0) === version) cache.set(id, data); paint(id); status(id, ''); return cache.get(id);
      } catch { if (!quiet) status(id, t('Could not load reactions and comments. Try again.')); throw new Error('Social features are unavailable. Please try again.'); }
      finally { pending.delete(id); }
    })(); pending.set(id, request); return request;
  }
  function status(id, message) { document.querySelectorAll('[data-social-status]').forEach(el => { if (el.dataset.socialStatus === id) el.textContent = message; }); if (shorts.open && current?.dataset.shortId === id) document.getElementById('shortsHint').textContent = message || t('Scroll to explore'); }
  function mount(container, recipe) {
    container.innerHTML = `<section class="social-panel" data-panel-id="${esc(recipe.id)}"><h3>${esc(t('Reactions & comments'))}</h3>${reactionButtons(recipe.id)}<p class="social-status" role="status" data-social-status="${esc(recipe.id)}"></p><button class="text-button" type="button" data-social-refresh="${esc(recipe.id)}">${icon('refresh')}${esc(t('Refresh comments'))}</button><div class="comments-list" data-comments-list="${esc(recipe.id)}"><p>${esc(t('Loading comments…'))}</p></div><form class="comment-form" data-comment-form="${esc(recipe.id)}"><label>${esc(t('Write a comment'))}<textarea dir="auto" required maxlength="1000" rows="3" placeholder="${esc(t('Share a tip or ask a question…'))}"></textarea></label><div><button type="button" class="text-button" data-open-profile>${esc(api.getName() || t('Choose your creator name'))}</button><button type="submit" class="primary-button">${esc(t('Post comment'))}</button></div><p class="comment-message" role="status"></p></form></section>`;
    paint(recipe.id); load(recipe.id).catch(() => {});
  }
  function pause() { viewport.querySelectorAll('video').forEach(v => v.pause()); }
  function playCurrent() {
    if (!shorts.open || comments.open || document.querySelector('#detailDialog[open],#profileDialog[open],#shareDialog[open]') || document.hidden || userPaused) return;
    const video = current?.querySelector('video'); if (!video) return;
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    video.muted = muted;
    const button = current.querySelector('[data-short-play]');
    video.play().then(() => { button.textContent = t('Pause'); }).catch(() => { button.textContent = t('Play video'); });
  }
  function guardVideo(video) {
    video.addEventListener('error', () => {
      if (video.parentElement.querySelector('.video-error')) return;
      const message = document.createElement('p'); message.className = 'video-error'; message.textContent = t('Video unavailable. Try again or open the original.');
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'secondary-button'; retry.textContent = t('Try again'); retry.onclick = () => { message.remove(); video.load(); video.play().catch(() => {}); };
      const link = document.createElement('a'); link.href = url(video.currentSrc || video.src || video.dataset.src); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = t('Open original');
      message.append(retry, link); video.after(message);
    });
  }
  function activate(slide) {
    if (current === slide) return;
    pause(); current = slide; userPaused = false;
    if (current) {
      playCurrent(); load(current.dataset.shortId).catch(() => {});
      const recipe = shortsRecipes.find(item => item.id === current.dataset.shortId);
      if (recipe) api.onView?.(recipe);
    }
    const position = shortsRecipes.findIndex(r => r.id === current?.dataset.shortId);
    document.querySelector('[data-short-step="-1"]').disabled = position <= 0;
    document.querySelector('[data-short-step="1"]').disabled = position < 0 || position >= shortsRecipes.length - 1;
  }
  function openShorts(startId) {
    shortsRecipes = api.getRecipes(); current = null; observer?.disconnect();
    viewport.innerHTML = shortsRecipes.map((recipe, index) => {
      const video = url(recipe.video_url), photo = url(recipe.image_url);
      const meta = [...new Set([api.categoryLabel(recipe.category), recipe.cuisine ? t(recipe.cuisine) : '', localizeMinutes(recipe.cook_minutes), api.difficultyLabel(recipe.difficulty)].filter(Boolean))].join(' · ');
      const media = video ? `<video data-src="${esc(video)}" ${photo ? `poster="${esc(photo)}"` : ''} playsinline muted loop preload="none" controls aria-label="${esc(recipe.title)}"></video>` : photo ? `<img src="${esc(photo)}" loading="${index ? 'lazy':'eager'}" alt="${esc(recipe.title)}"/>` : `<div class="short-text-recipe">${icon('book')}<p dir="auto" data-no-translate>${esc(recipe.description)}</p></div>`;
      return `<article class="short-slide" data-short-id="${esc(recipe.id)}" aria-label="${index+1} / ${shortsRecipes.length}"><div class="short-card"><div class="short-media">${media}</div><div class="short-caption"><span class="short-author" dir="auto" data-no-translate>${esc(recipe.profiles?.display_name || t('Home cook'))}</span><h3 dir="auto" data-no-translate>${esc(recipe.title)}</h3><p>${esc(meta)}</p><div class="short-caption-actions"><button type="button" class="primary-button" data-short-detail="${esc(recipe.id)}">${icon('book')}${esc(t('Full recipe'))}</button>${video ? `<button type="button" data-short-play>${esc(t('Pause'))}</button><button type="button" data-short-sound aria-label="${esc(t('Turn sound on'))}">${icon('mute')}</button>` : ''}</div></div></div><aside class="short-actions">${reactionButtons(recipe.id)}<button type="button" data-comments-id="${esc(recipe.id)}">${icon('comment')}<span>${esc(t('Comments'))}</span><b data-comment-count="${esc(recipe.id)}">—</b></button><button type="button" data-share-id="${esc(recipe.id)}">${icon('external')}<span>${esc(t('Share'))}</span></button><p class="social-status" data-social-status="${esc(recipe.id)}" role="status"></p></aside></article>`;
    }).join('') || `<div class="shorts-empty">${icon('book')}<h3>${esc(t('No recipes here yet.'))}</h3><p>${esc(t('Share a recipe to start the feed.'))}</p><button type="button" class="primary-button" data-open-composer>${esc(t('Share a recipe'))}</button></div>`;
    viewport.querySelectorAll('video').forEach(guardVideo);
    if (!shorts.open) shorts.showModal(); document.body.classList.add('shorts-open');
    observer = new IntersectionObserver(entries => { const visible = entries.filter(e => e.isIntersecting && e.intersectionRatio > .6).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0]; if (visible) activate(visible.target); }, { root:viewport, threshold:[.6,.8] });
    viewport.querySelectorAll('.short-slide').forEach(slide => observer.observe(slide));
    const start = [...viewport.children].find(el => el.dataset.shortId === startId) || viewport.firstElementChild;
    if (start) { viewport.scrollTo({ top:start.offsetTop, behavior:'instant' }); if (start.dataset.shortId) activate(start); }
    applyTranslations(shorts);
  }
  function move(step) {
    const slides = [...viewport.querySelectorAll('.short-slide')], index = slides.indexOf(current), next = slides[Math.max(0,Math.min(slides.length-1,index+step))];
    if (next) viewport.scrollTo({ top:next.offsetTop, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant':'smooth' });
  }
  function find(id) { return shortsRecipes.find(r => r.id === id) || api.getRecipes().find(r => r.id === id); }
  async function react(id, kind) {
    if (busy.has(id)) return; busy.add(id); paint(id);
    try {
      const data = cache.get(id) || await load(id), next = { heart:data.mine.heart, vote:data.mine.vote };
      if (kind === 'heart') next.heart = !next.heart; else { const vote = kind === 'like' ? 1 : -1; next.vote = next.vote === vote ? 0 : vote; }
      await api.backend.react(id, next);
      versions.set(id, (versions.get(id) || 0) + 1);
      cache.set(id, { ...data, hearts:data.hearts+Number(next.heart)-Number(data.mine.heart), likes:data.likes+Number(next.vote===1)-Number(data.mine.vote===1), dislikes:data.dislikes+Number(next.vote===-1)-Number(data.mine.vote===-1), mine:next });
      status(id, '');
    } catch { status(id, t('Could not save your reaction. Please try again.')); api.toast(t('Could not save your reaction. Please try again.')); }
    finally { busy.delete(id); paint(id); }
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-open-shorts')) { openShorts(); return; }
    if (button.hasAttribute('data-close-shorts')) { shorts.close(); return; }
    if (button.hasAttribute('data-close-comments')) { comments.close(); return; }
    if (button.dataset.shortStep) { move(Number(button.dataset.shortStep)); return; }
    if (button.dataset.react) { await react(button.dataset.id, button.dataset.react); return; }
    if (button.dataset.socialRefresh) { load(button.dataset.socialRefresh).catch(() => {}); return; }
    if (button.dataset.shortDetail) { const recipe = find(button.dataset.shortDetail); if (recipe) api.openRecipe(recipe); return; }
    if (button.dataset.shareId) { const recipe = find(button.dataset.shareId); if (recipe) { pause(); api.share(recipe); } return; }
    if (button.dataset.commentsId) { const recipe = find(button.dataset.commentsId); if (recipe) { commentRecipe = recipe; pause(); mount(document.getElementById('commentsContent'), recipe); comments.showModal(); } return; }
    if (button.hasAttribute('data-short-sound')) { muted = !muted; const video = current?.querySelector('video'); if (video) video.muted = muted; viewport.querySelectorAll('[data-short-sound]').forEach(b => { b.innerHTML = icon(muted ? 'mute':'sound'); b.setAttribute('aria-label',t(muted ? 'Turn sound on':'Mute')); }); return; }
    if (button.hasAttribute('data-short-play')) { const video = current?.querySelector('video'); if (video) { userPaused = !video.paused; if (userPaused) { video.pause(); button.textContent = t('Play video'); } else playCurrent(); } return; }
    if (button.hasAttribute('data-open-profile') || button.id === 'profileButton') pause();
    if (button.hasAttribute('data-open-composer') && shorts.open) shorts.close();
    if (button.dataset.deleteComment) {
      const id = button.dataset.id, comment = cache.get(id)?.comments.find(c => c.id === button.dataset.deleteComment);
      if (!comment || !confirm(t('Delete this comment?'))) return;
      button.disabled = true;
      try { await api.backend.deleteComment(id, comment); versions.set(id, (versions.get(id) || 0) + 1); const data = cache.get(id); data.comments = data.comments.filter(c => c.id !== comment.id); paint(id); } catch { api.toast(t('Could not delete your comment. Please try again.')); button.disabled = false; }
    }
  });
  document.addEventListener('submit', async event => {
    const form = event.target.closest('[data-comment-form]'); if (!form) return; event.preventDefault();
    const input = form.querySelector('textarea'), button = form.querySelector('[type="submit"]'), message = form.querySelector('.comment-message'), id = form.dataset.commentForm;
    if (button.disabled) return;
    if (!input.value.trim()) { message.textContent = t('Write a comment first.'); input.focus(); return; }
    if (!api.getName()) { message.textContent = t('Choose your creator name before commenting.'); api.openProfile(); return; }
    button.disabled = true; message.textContent = t('Posting comment…');
    try { if (!cache.has(id)) await load(id); const body = input.value.trim(); const result = await api.backend.addComment(id, body, api.getName()); versions.set(id, (versions.get(id) || 0) + 1); const data = cache.get(id) || blank(); if (!data.comments.some(c => c.id === result.id)) data.comments.push({id:result.id,author_id:api.getUser(),name:api.getName(),body,created_at:result.created_at}); cache.set(id,data); input.value = ''; message.textContent = t('Comment posted.'); paint(id); }
    catch { message.textContent = t('Could not post your comment. Your text is saved here.'); }
    finally { button.disabled = false; }
  });
  shorts.addEventListener('close', () => { pause(); observer?.disconnect(); current = null; viewport.replaceChildren(); document.body.classList.remove('shorts-open'); });
  for (const dialog of [comments, document.getElementById('detailDialog'),document.getElementById('profileDialog'),document.getElementById('shareDialog')]) dialog.addEventListener('close', playCurrent);
  viewport.addEventListener('keydown', event => { if (event.target.closest('input,textarea,button,video')) return; if (['ArrowDown','PageDown','ArrowUp','PageUp'].includes(event.key)) { event.preventDefault(); move(['ArrowDown','PageDown'].includes(event.key) ? 1:-1); } });
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : playCurrent());
  setInterval(() => { if (document.hidden || busy.size) return; const ids = new Set([...document.querySelectorAll('dialog[open] [data-panel-id]')].map(el => el.dataset.panelId)); if (shorts.open && current) ids.add(current.dataset.shortId); ids.forEach(id => load(id, true).catch(() => {})); }, 15000);
  window.addEventListener('recipe-language-change', () => { if (shorts.open) openShorts(current?.dataset.shortId); if (comments.open && commentRecipe) { const draft = comments.querySelector('textarea')?.value; mount(document.getElementById('commentsContent'), commentRecipe); if (draft) comments.querySelector('textarea').value = draft; } });
  return { mount, pause, guardVideo, openShorts };
}
