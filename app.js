(() => {
  'use strict';

  const STORAGE_KEYS = {
    published: 'hanip-menu-published-v1',
    draft: 'hanip-menu-draft-v1',
    saved: 'hanip-menu-saved-v1'
  };

  const seededDishes = [
    {
      id: 'seed-udon', title: '참기름 버터 간장 우동', category: '면·파스타', duration: '12분', author: '수연의 저녁',
      description: '버터의 고소함과 참기름 향이 만나는, 퇴근 후 가장 빠른 위로.', emoji: '🍜', tone: 'noodle', saves: '2.4k',
      ingredients: ['냉동 우동면 1봉', '버터 1큰술', '진간장 1큰술', '참기름 1작은술', '김가루와 쪽파 약간'],
      steps: ['우동면을 끓는 물에 2분간 삶아 물기를 뺍니다.', '팬에 버터를 녹이고 우동면과 간장을 넣어 빠르게 볶습니다.', '불을 끄고 참기름, 김가루, 쪽파를 곁들입니다.']
    },
    {
      id: 'seed-tomato-rice', title: '통토마토 솥밥', category: '한그릇', duration: '20분', author: '한그릇연구소',
      description: '토마토 하나가 밥 전체에 스며드는 산뜻하고 달큰한 한 그릇.', emoji: '🍅', tone: 'rice', saves: '1.8k',
      ingredients: ['쌀 1.5컵', '완숙 토마토 1개', '올리브오일 1큰술', '소금 2꼬집', '후추와 바질'],
      steps: ['씻은 쌀에 평소보다 약간 적은 물을 붓습니다.', '가운데에 토마토를 올리고 올리브오일과 소금을 뿌립니다.', '밥이 완성되면 토마토를 으깨며 골고루 섞어줍니다.']
    },
    {
      id: 'seed-tofu', title: '바삭 두부 강정', category: '반찬', duration: '18분', author: '집밥의 온도',
      description: '겉은 바삭하고 속은 촉촉한, 매콤달콤한 두부 반찬.', emoji: '🥢', tone: 'side', saves: '3.1k',
      ingredients: ['부침용 두부 1모', '감자전분 3큰술', '고추장 1큰술', '케첩 1큰술', '올리고당 1큰술'],
      steps: ['두부의 물기를 충분히 제거한 뒤 전분을 입힙니다.', '노릇하게 구운 두부를 따로 둡니다.', '양념을 끓인 뒤 두부를 넣고 재빨리 버무립니다.']
    },
    {
      id: 'seed-yogurt', title: '복숭아 그릭요거트볼', category: '디저트', duration: '7분', author: '오후의 단맛',
      description: '차가운 복숭아와 고소한 그래놀라로 여름 아침을 가볍게.', emoji: '🍑', tone: 'dessert', saves: '967',
      ingredients: ['그릭요거트 170g', '복숭아 1/2개', '그래놀라 3큰술', '꿀 1작은술', '민트 약간'],
      steps: ['그릇에 그릭요거트를 넓게 담습니다.', '얇게 썬 복숭아와 그래놀라를 올립니다.', '꿀과 민트를 더해 완성합니다.']
    },
    {
      id: 'seed-pasta', title: '레몬 바질 크림 파스타', category: '면·파스타', duration: '15분', author: '프라이팬 한 장',
      description: '생크림 없이도 산뜻하게 완성하는 레몬 향 가득한 파스타.', emoji: '🍝', tone: 'noodle', saves: '1.3k',
      ingredients: ['스파게티면 100g', '우유 180ml', '레몬 1/2개', '바질 한 줌', '파르미자노 치즈'],
      steps: ['면을 소금물에 삶고 면수 반 컵을 남깁니다.', '팬에 우유와 면수를 데운 뒤 면을 넣습니다.', '레몬 제스트, 바질, 치즈를 넣고 농도를 맞춥니다.']
    },
    {
      id: 'seed-ade', title: '청포도 얼그레이 에이드', category: '음료', duration: '5분', author: '한낮의 부엌',
      description: '향긋한 얼그레이에 청포도의 산뜻함을 더한 투명한 한 잔.', emoji: '🥤', tone: 'drink', saves: '744',
      ingredients: ['청포도 8알', '얼그레이 티 80ml', '탄산수 150ml', '얼음 한 컵', '레몬즙 약간'],
      steps: ['청포도를 잔 바닥에서 가볍게 으깹니다.', '얼음과 차가운 얼그레이를 차례로 넣습니다.', '탄산수와 레몬즙을 더해 살짝 저어줍니다.']
    },
    {
      id: 'seed-eggplant', title: '가지 된장구이 덮밥', category: '한그릇', duration: '16분', author: '오늘의 한입',
      description: '달큰하게 구운 가지에 된장 양념을 입힌 든든한 채소 덮밥.', emoji: '🍆', tone: 'rice', saves: '1.1k',
      ingredients: ['가지 2개', '밥 1공기', '된장 1큰술', '올리고당 1작은술', '다진 마늘 1작은술'],
      steps: ['가지를 길게 잘라 기름 두른 팬에 굽습니다.', '된장, 마늘, 올리고당, 물을 섞어 양념을 만듭니다.', '가지에 양념을 발라 한 번 더 굽고 밥에 올립니다.']
    },
    {
      id: 'seed-salad', title: '참외 루콜라 샐러드', category: '반찬', duration: '10분', author: '계절의 접시',
      description: '아삭한 참외와 짭조름한 치즈가 잘 어울리는 여름 샐러드.', emoji: '🥗', tone: 'side', saves: '638',
      ingredients: ['참외 1개', '루콜라 한 줌', '리코타 치즈 80g', '올리브오일 1큰술', '발사믹 식초 1작은술'],
      steps: ['참외는 씨를 빼고 얇게 썹니다.', '접시에 루콜라, 참외, 리코타를 차례로 담습니다.', '오일과 발사믹을 뿌리고 후추를 더합니다.']
    }
  ];

  const categoryTones = {
    '한그릇': 'rice',
    '반찬': 'side',
    '면·파스타': 'noodle',
    '디저트': 'dessert',
    '음료': 'drink'
  };

  const categoryEmojis = {
    '한그릇': '🍚',
    '반찬': '🥢',
    '면·파스타': '🍝',
    '디저트': '🍰',
    '음료': '🥤'
  };

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  function getStored(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function setStored(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      showToast('이 기기에서는 저장 공간을 사용할 수 없어요.');
      return false;
    }
  }

  function removeStored(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      // Storage access is optional; the visible page still works without it.
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeDish(dish) {
    const category = Object.prototype.hasOwnProperty.call(categoryTones, dish.category) ? dish.category : '한그릇';
    return {
      id: String(dish.id || `menu-${Date.now()}`),
      title: String(dish.title || '이름 없는 메뉴'),
      category,
      duration: String(dish.duration || '15분'),
      author: String(dish.author || '한입메뉴 사용자'),
      description: String(dish.description || '나만의 한입 레시피입니다.'),
      emoji: String(dish.emoji || categoryEmojis[category]),
      tone: categoryTones[category],
      saves: String(dish.saves || '새 메뉴'),
      ingredients: Array.isArray(dish.ingredients) ? dish.ingredients.map(String).filter(Boolean) : [],
      steps: Array.isArray(dish.steps) ? dish.steps.map(String).filter(Boolean) : [],
      mediaName: dish.mediaName ? String(dish.mediaName) : ''
    };
  }

  let publishedDishes = getStored(STORAGE_KEYS.published, []).filter((item) => item && typeof item === 'object').map(normalizeDish);
  let savedIds = new Set(getStored(STORAGE_KEYS.saved, []).map(String));
  let activeCategory = '전체';
  let currentStep = 1;
  let activePreviewUrl = '';
  let selectedMedia = { name: '', type: '' };
  let toastTimer;

  const dishGrid = $('#dishGrid');
  const emptyState = $('#emptyState');
  const resultCount = $('#resultCount');
  const searchInput = $('#menuSearch');
  const clearSearch = $('#clearSearch');
  const composerDialog = $('#composerDialog');
  const recipeDialog = $('#recipeDialog');
  const composerForm = $('#composerForm');
  const composerNotice = $('#composerNotice');
  const ingredientsList = $('#ingredientsList');
  const stepsList = $('#stepsList');
  const mediaInput = $('#mediaInput');
  const mediaPreview = $('#mediaPreview');
  const publishSummary = $('#publishSummary');
  const toast = $('#toast');

  function allDishes() {
    return [...publishedDishes, ...seededDishes].map(normalizeDish);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }

  function setSearch(value) {
    searchInput.value = value;
    clearSearch.hidden = !value;
    renderDishes();
    if (value) searchInput.focus();
  }

  function getFilteredDishes() {
    const query = searchInput.value.trim().toLocaleLowerCase('ko-KR');
    return allDishes().filter((dish) => {
      const matchesCategory = activeCategory === '전체' || dish.category === activeCategory;
      const searchable = [dish.title, dish.category, dish.duration, dish.author, dish.description, ...dish.ingredients, ...dish.steps].join(' ').toLocaleLowerCase('ko-KR');
      return matchesCategory && (!query || searchable.includes(query));
    });
  }

  function dishCardTemplate(dish) {
    const isSaved = savedIds.has(dish.id);
    return `
      <article class="dish-card">
        <div class="dish-visual tone-${escapeHtml(dish.tone)}">
          <span class="dish-time">${escapeHtml(dish.duration)}</span>
          <span class="dish-emoji" aria-hidden="true">${escapeHtml(dish.emoji)}</span>
        </div>
        <button class="save-button" type="button" data-save-id="${escapeHtml(dish.id)}" aria-pressed="${isSaved}" aria-label="${escapeHtml(dish.title)} ${isSaved ? '저장 취소' : '저장'}">${isSaved ? '♥' : '♡'}</button>
        <div class="dish-content">
          <div class="card-meta"><span>${escapeHtml(dish.category)}</span><span>·</span><span class="author">${escapeHtml(dish.author)}</span></div>
          <h3>${escapeHtml(dish.title)}</h3>
          <p>${escapeHtml(dish.description)}</p>
          <button class="view-recipe" type="button" data-view-id="${escapeHtml(dish.id)}">레시피 보기 <span aria-hidden="true">→</span></button>
        </div>
      </article>`;
  }

  function renderDishes() {
    const dishes = getFilteredDishes();
    dishGrid.innerHTML = dishes.map(dishCardTemplate).join('');
    emptyState.hidden = dishes.length !== 0;
    resultCount.textContent = `${dishes.length}개의 메뉴`;
  }

  function getDish(id) {
    return allDishes().find((dish) => dish.id === id);
  }

  function openNativeDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function closeNativeDialog(dialog) {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  function openRecipe(id) {
    const dish = getDish(id);
    if (!dish) return;
    $('#recipeDialogBody').innerHTML = `
      <article class="recipe-detail">
        <div class="detail-cover tone-${escapeHtml(dish.tone)}" aria-hidden="true">${escapeHtml(dish.emoji)}</div>
        <h2 id="recipeDialogTitle">${escapeHtml(dish.title)}</h2>
        <div class="detail-meta"><span>${escapeHtml(dish.category)}</span><span>조리 ${escapeHtml(dish.duration)}</span><span>${escapeHtml(dish.author)}</span></div>
        <p>${escapeHtml(dish.description)}</p>
        <div class="detail-columns">
          <section class="detail-section"><h3>재료</h3><ul>${dish.ingredients.length ? dish.ingredients.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>재료 정보가 아직 없어요.</li>'}</ul></section>
          <section class="detail-section"><h3>조리 순서</h3><ol>${dish.steps.length ? dish.steps.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>조리 순서가 아직 없어요.</li>'}</ol></section>
        </div>
      </article>`;
    openNativeDialog(recipeDialog);
    $('#closeRecipe').focus();
  }

  function createRow(kind, value = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    const isStep = kind === 'steps';
    row.innerHTML = `
      ${isStep ? '<span class="step-number" aria-hidden="true">1</span>' : ''}
      <label class="sr-only"></label>
      ${isStep ? '<textarea rows="2" maxlength="220" placeholder="예: 면을 삶는 동안 소스를 준비해요."></textarea>' : '<input maxlength="100" placeholder="예: 들기름 1큰술" />'}
      <button class="row-control" type="button" data-move="up" aria-label="위로 이동" title="위로 이동">↑</button>
      <button class="row-control" type="button" data-move="down" aria-label="아래로 이동" title="아래로 이동">↓</button>
      <button class="row-control remove-row" type="button" data-remove-row aria-label="항목 삭제" title="삭제">×</button>`;
    const control = isStep ? $('textarea', row) : $('input', row);
    control.value = value;
    return row;
  }

  function syncRows(list) {
    const kind = list.dataset.kind;
    const labelPrefix = kind === 'steps' ? '조리 순서' : '재료';
    const rows = $$('.dynamic-row', list);
    rows.forEach((row, index) => {
      const input = $('input, textarea', row);
      const label = $('label', row);
      const id = `${kind}-${index + 1}`;
      input.id = id;
      input.setAttribute('aria-label', `${labelPrefix} ${index + 1}`);
      label.htmlFor = id;
      label.textContent = `${labelPrefix} ${index + 1}`;
      const num = $('.step-number', row);
      if (num) num.textContent = String(index + 1);
      const up = $('[data-move="up"]', row);
      const down = $('[data-move="down"]', row);
      up.disabled = index === 0;
      down.disabled = index === rows.length - 1;
      up.setAttribute('aria-label', `${labelPrefix} ${index + 1} 위로 이동`);
      down.setAttribute('aria-label', `${labelPrefix} ${index + 1} 아래로 이동`);
      $('[data-remove-row]', row).setAttribute('aria-label', `${labelPrefix} ${index + 1} 삭제`);
    });
  }

  function addRow(kind, value = '', shouldFocus = true) {
    const list = kind === 'steps' ? stepsList : ingredientsList;
    const row = createRow(kind, value);
    list.append(row);
    syncRows(list);
    if (shouldFocus) {
      const input = $('input, textarea', row);
      input.focus();
    }
  }

  function getRows(list) {
    return $$('input, textarea', list).map((field) => field.value.trim()).filter(Boolean);
  }

  function getFormData() {
    return {
      title: $('#menuTitle').value.trim(),
      category: $('#menuCategory').value,
      duration: $('#menuDuration').value,
      description: $('#menuDescription').value.trim(),
      ingredients: getRows(ingredientsList),
      steps: getRows(stepsList),
      mediaName: selectedMedia.name,
      mediaType: selectedMedia.type
    };
  }

  function fillRows(list, values) {
    list.innerHTML = '';
    const kind = list.dataset.kind;
    const safeValues = Array.isArray(values) && values.length ? values : [''];
    safeValues.forEach((value) => list.append(createRow(kind, String(value))));
    syncRows(list);
  }

  function resetMediaPreview() {
    if (activePreviewUrl) {
      URL.revokeObjectURL(activePreviewUrl);
      activePreviewUrl = '';
    }
    selectedMedia = { name: '', type: '' };
    mediaInput.value = '';
    mediaPreview.innerHTML = '';
    mediaPreview.hidden = true;
  }

  function hydrateComposer(data = {}) {
    $('#menuTitle').value = data.title || '';
    $('#menuCategory').value = Object.prototype.hasOwnProperty.call(categoryTones, data.category) ? data.category : '한그릇';
    $('#menuDuration').value = ['10분 이내', '15분', '20분', '30분 이상'].includes(data.duration) ? data.duration : '15분';
    $('#menuDescription').value = data.description || '';
    fillRows(ingredientsList, data.ingredients);
    fillRows(stepsList, data.steps);
    resetMediaPreview();
    selectedMedia = { name: data.mediaName || '', type: data.mediaType || '' };
    if (selectedMedia.name) {
      mediaPreview.hidden = false;
      mediaPreview.innerHTML = `<figcaption><span>${escapeHtml(selectedMedia.name)} (파일은 다시 선택해주세요)</span><button class="clear-media" type="button">지우기</button></figcaption>`;
    }
  }

  function clearInvalid() {
    $$('[aria-invalid="true"]', composerForm).forEach((field) => field.removeAttribute('aria-invalid'));
    composerNotice.hidden = true;
    composerNotice.textContent = '';
  }

  function showStep(step, moveFocus = false) {
    currentStep = Math.max(1, Math.min(4, Number(step)));
    $$('.composer-panel', composerForm).forEach((panel) => {
      const isActive = Number(panel.dataset.step) === currentStep;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });
    $$('.composer-progress li', composerForm).forEach((item, index) => {
      item.classList.toggle('is-current', index + 1 === currentStep);
      item.classList.toggle('is-done', index + 1 < currentStep);
      const button = $('button', item);
      button.setAttribute('aria-current', index + 1 === currentStep ? 'step' : 'false');
    });
    $('#previousStep').hidden = currentStep === 1;
    $('#nextStep').hidden = currentStep === 4;
    $('#publishMenu').hidden = currentStep !== 4;
    if (currentStep === 4) updatePublishSummary();
    if (moveFocus) {
      const heading = $(`.composer-panel[data-step="${currentStep}"] h3`, composerForm);
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }

  function updatePublishSummary() {
    const data = getFormData();
    const title = data.title || '아직 이름을 적지 않은 메뉴';
    publishSummary.innerHTML = `
      <div class="summary-title">
        <span class="summary-media" aria-hidden="true">${escapeHtml(categoryEmojis[data.category] || '🍽️')}</span>
        <div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(data.description || '한 줄 소개를 더하면 메뉴가 더 잘 보여요.')}</p></div>
      </div>
      <div class="summary-info">
        <span>${escapeHtml(data.category)}</span>
        <span>조리 ${escapeHtml(data.duration)}</span>
        <span>재료 ${data.ingredients.length}개</span>
        <span>순서 ${data.steps.length}단계</span>
        ${data.mediaName ? '<span>사진·영상 첨부</span>' : ''}
      </div>`;
  }

  function setComposerNotice(message) {
    composerNotice.textContent = message;
    composerNotice.hidden = false;
  }

  function openComposer() {
    const draft = getStored(STORAGE_KEYS.draft, null);
    if (!composerDialog.open && !composerDialog.hasAttribute('open')) {
      clearInvalid();
      if (draft && typeof draft === 'object') {
        hydrateComposer(draft);
        showToast('임시 저장한 메뉴를 불러왔어요.');
      } else {
        hydrateComposer();
      }
      showStep(1);
    }
    openNativeDialog(composerDialog);
    window.setTimeout(() => $('#menuTitle').focus(), 0);
  }

  function saveDraft() {
    const data = getFormData();
    setStored(STORAGE_KEYS.draft, data);
    showToast(data.title ? '임시 저장했어요. 언제든 이어서 작성하세요.' : '빈 초안도 임시 저장했어요.');
  }

  function validatePublish(data) {
    clearInvalid();
    const issues = [];
    if (!data.title) {
      issues.push('메뉴 이름');
      $('#menuTitle').setAttribute('aria-invalid', 'true');
    }
    if (!data.ingredients.length) {
      issues.push('재료 1개 이상');
      const firstIngredient = $('input', ingredientsList);
      if (firstIngredient) firstIngredient.setAttribute('aria-invalid', 'true');
    }
    if (!data.steps.length) {
      issues.push('조리 순서 1개 이상');
      const firstStep = $('textarea', stepsList);
      if (firstStep) firstStep.setAttribute('aria-invalid', 'true');
    }
    if (!issues.length) return true;

    setComposerNotice(`${issues.join(', ')}을(를) 입력해주세요.`);
    if (!data.title) {
      showStep(1);
      $('#menuTitle').focus();
    } else {
      showStep(3);
      const firstMissing = !data.ingredients.length ? $('input', ingredientsList) : $('textarea', stepsList);
      if (firstMissing) firstMissing.focus();
    }
    return false;
  }

  function publishMenu() {
    const data = getFormData();
    if (!validatePublish(data)) return;
    const dish = normalizeDish({
      id: `mine-${Date.now()}`,
      title: data.title,
      category: data.category,
      duration: data.duration,
      description: data.description || '한입메뉴에서 방금 공개한 새로운 레시피예요.',
      author: '나의 한입',
      emoji: categoryEmojis[data.category],
      saves: '새 메뉴',
      ingredients: data.ingredients,
      steps: data.steps,
      mediaName: data.mediaName
    });
    publishedDishes = [dish, ...publishedDishes];
    setStored(STORAGE_KEYS.published, publishedDishes);
    removeStored(STORAGE_KEYS.draft);
    renderDishes();
    closeNativeDialog(composerDialog);
    hydrateComposer();
    showToast(`“${dish.title}” 메뉴를 공개했어요!`);
    window.setTimeout(() => document.querySelector('#discover').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  function updateMediaPreview(file) {
    resetMediaPreview();
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('이미지 또는 영상 파일을 선택해주세요.');
      return;
    }
    selectedMedia = { name: file.name, type: file.type };
    activePreviewUrl = URL.createObjectURL(file);
    const media = file.type.startsWith('image/')
      ? `<img src="${activePreviewUrl}" alt="선택한 메뉴 사진 미리보기" />`
      : `<video src="${activePreviewUrl}" controls muted playsinline aria-label="선택한 메뉴 영상 미리보기"></video>`;
    mediaPreview.hidden = false;
    mediaPreview.innerHTML = `${media}<figcaption><span>${escapeHtml(file.name)}</span><button class="clear-media" type="button">지우기</button></figcaption>`;
    showToast('파일을 미리보기로 불러왔어요.');
  }

  function moveRow(row, direction) {
    const list = row.parentElement;
    const target = direction === 'up' ? row.previousElementSibling : row.nextElementSibling;
    if (!target) return;
    if (direction === 'up') {
      list.insertBefore(row, target);
    } else {
      list.insertBefore(target, row);
    }
    syncRows(list);
    const field = $('input, textarea', row);
    field.focus();
    showToast('순서를 바꿨어요.');
  }

  function onDynamicListClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const row = button.closest('.dynamic-row');
    if (!row) return;
    if (button.dataset.move) {
      moveRow(row, button.dataset.move);
      return;
    }
    if (button.hasAttribute('data-remove-row')) {
      const list = row.parentElement;
      const nextFocus = row.nextElementSibling || row.previousElementSibling;
      row.remove();
      syncRows(list);
      if (nextFocus) $('input, textarea', nextFocus).focus();
      else $(`[data-add-row="${list.dataset.kind}"]`, composerForm).focus();
      showToast('항목을 삭제했어요.');
    }
  }

  function onDynamicListKeydown(event) {
    if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const row = event.target.closest('.dynamic-row');
    if (!row) return;
    event.preventDefault();
    moveRow(row, event.key === 'ArrowUp' ? 'up' : 'down');
  }

  document.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-open-composer]');
    if (openButton) {
      openComposer();
      return;
    }
    const categoryButton = event.target.closest('[data-category]');
    if (categoryButton) {
      activeCategory = categoryButton.dataset.category;
      $$('.category-chip').forEach((button) => {
        const isActive = button === categoryButton;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
      renderDishes();
      return;
    }
    const quickSearch = event.target.closest('[data-quick-search]');
    if (quickSearch) {
      activeCategory = '전체';
      $$('.category-chip').forEach((button) => {
        const isAll = button.dataset.category === '전체';
        button.classList.toggle('is-active', isAll);
        button.setAttribute('aria-pressed', String(isAll));
      });
      setSearch(quickSearch.dataset.quickSearch);
      document.querySelector('#discover').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const saveButton = event.target.closest('[data-save-id]');
    if (saveButton) {
      const id = saveButton.dataset.saveId;
      const dish = getDish(id);
      if (!dish) return;
      if (savedIds.has(id)) {
        savedIds.delete(id);
        showToast(`“${dish.title}” 저장을 취소했어요.`);
      } else {
        savedIds.add(id);
        showToast(`“${dish.title}”을(를) 저장했어요.`);
      }
      setStored(STORAGE_KEYS.saved, [...savedIds]);
      renderDishes();
      return;
    }
    const viewButton = event.target.closest('[data-view-id]');
    if (viewButton) {
      openRecipe(viewButton.dataset.viewId);
      return;
    }
    const addRowButton = event.target.closest('[data-add-row]');
    if (addRowButton) {
      addRow(addRowButton.dataset.addRow);
      return;
    }
    const progressButton = event.target.closest('[data-go-step]');
    if (progressButton) {
      clearInvalid();
      showStep(progressButton.dataset.goStep, true);
      return;
    }
    if (event.target.closest('#closeComposer')) {
      closeNativeDialog(composerDialog);
      return;
    }
    if (event.target.closest('#closeRecipe')) {
      closeNativeDialog(recipeDialog);
      return;
    }
    if (event.target.closest('.clear-media')) {
      resetMediaPreview();
      showToast('미리보기를 지웠어요.');
    }
  });

  $('#previousStep').addEventListener('click', () => {
    clearInvalid();
    showStep(currentStep - 1, true);
  });
  $('#nextStep').addEventListener('click', () => {
    clearInvalid();
    showStep(currentStep + 1, true);
  });
  $('#saveDraft').addEventListener('click', saveDraft);
  $('#publishMenu').addEventListener('click', publishMenu);
  searchInput.addEventListener('input', () => {
    clearSearch.hidden = !searchInput.value;
    renderDishes();
  });
  clearSearch.addEventListener('click', () => setSearch(''));
  mediaInput.addEventListener('change', () => updateMediaPreview(mediaInput.files && mediaInput.files[0]));
  ingredientsList.addEventListener('click', onDynamicListClick);
  stepsList.addEventListener('click', onDynamicListClick);
  ingredientsList.addEventListener('keydown', onDynamicListKeydown);
  stepsList.addEventListener('keydown', onDynamicListKeydown);
  composerDialog.addEventListener('click', (event) => {
    if (event.target === composerDialog) closeNativeDialog(composerDialog);
  });
  recipeDialog.addEventListener('click', (event) => {
    if (event.target === recipeDialog) closeNativeDialog(recipeDialog);
  });
  composerForm.addEventListener('submit', (event) => event.preventDefault());

  fillRows(ingredientsList, ['']);
  fillRows(stepsList, ['']);
  renderDishes();
})();
