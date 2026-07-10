// 渲染層：統計列、情境選單、依角色/依情境兩種檢視、答案延遲注入
import { contentEl, statsEl, noMatchEl, scenarioSelect, scenarioBannerEl, searchBarEl } from './dom.js';
import { loadScenario } from './dataService.js';

function esc(text){
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function compareSid(a, b){
  const [a1, a2] = a.split('-').map(Number);
  const [b1, b2] = b.split('-').map(Number);
  return a1 - b1 || a2 - b2;
}

export function renderStats(manifest){
  const totalRoles = manifest.categories.reduce((s, c) => s + c.roles.length, 0);
  const totalEntries = manifest.categories.reduce(
    (s, c) => s + c.roles.reduce((s2, r) => s2 + r.sids.length, 0), 0);
  const totalScenarios = Object.keys(manifest.scenarios).length;

  statsEl.innerHTML = `
    <div class="stat"><b>${totalRoles}</b><span>院內角色</span></div>
    <div class="stat"><b>${totalScenarios}</b><span>特別狀況</span></div>
    <div class="stat"><b>${totalEntries}</b><span>因應作為條目</span></div>
  `;
}

// 依大項分組建立情境下拉選單
export function buildScenarioPicker(manifest){
  const scenarioIds = Object.keys(manifest.scenarios).sort(compareSid);
  const groups = {};
  scenarioIds.forEach(sid => {
    const major = sid.split('-')[0];
    (groups[major] = groups[major] || []).push(sid);
  });
  Object.keys(groups).sort().forEach(major => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = `特別狀況 ${major}`;
    groups[major].forEach(sid => {
      const opt = document.createElement('option');
      opt.value = sid;
      opt.textContent = `情境 ${sid}　${manifest.scenarios[sid].title}`;
      optgroup.appendChild(opt);
    });
    scenarioSelect.appendChild(optgroup);
  });
}

export function renderByRole(manifest){
  scenarioBannerEl.innerHTML = '';
  searchBarEl.style.display = '';
  contentEl.innerHTML = '';

  manifest.categories.forEach(cat => {
    if(cat.roles.length === 0) return;
    const catDiv = document.createElement('div');
    catDiv.className = 'cat';
    catDiv.dataset.cat = cat.id;
    catDiv.innerHTML = `<div class="cat-head"><span>${esc(cat.name)}</span><span class="count">${cat.roles.length} 個角色</span></div>`;

    const rolesDiv = document.createElement('div');
    rolesDiv.className = 'roles';

    cat.roles.forEach(roleObj => {
      const el = document.createElement('div');
      el.className = 'role';
      el.dataset.role = roleObj.role;
      const answerKey = `${cat.id}|${roleObj.role}`;

      // 同一角色同一情境可能有多則條目，依出現順序對應答案陣列索引
      const occurrence = {};
      const scenariosHtml = roleObj.sids.map(sid => {
        const idx = occurrence[sid] = (occurrence[sid] ?? -1) + 1;
        const meta = manifest.scenarios[sid];
        return `
        <div class="scenario" data-sid="${esc(sid)}" data-key="${esc(answerKey)}" data-idx="${idx}">
          <button class="scenario-head">
            <span class="scenario-tag">情境 ${esc(sid)}</span>
            <span class="scenario-title-wrap">
              <span class="scenario-title">${esc(meta.title)}</span>
            </span>
            <span class="chev">▾</span>
          </button>
          <div class="scenario-body">
            <div class="scenario-body-inner">
              <div class="scenario-desc">${esc(meta.desc)}</div>
              <div class="answer"></div>
            </div>
          </div>
        </div>
      `;
      }).join('');

      el.innerHTML = `
        <button class="role-head">
          <span class="role-name">${esc(roleObj.role)}</span>
          <span class="role-count">${roleObj.sids.length} 則情境</span>
          <span class="chev">▾</span>
        </button>
        <div class="role-body">
          <div class="role-body-inner">${scenariosHtml}</div>
        </div>
      `;
      rolesDiv.appendChild(el);
    });

    catDiv.appendChild(rolesDiv);
    contentEl.appendChild(catDiv);
  });
}

// 展開情境時才載入答案內容（載入一次後由快取供其他角色共用）
export function fillAnswer(scenarioDiv){
  const answerEl = scenarioDiv.querySelector('.answer');
  if(!answerEl || answerEl.dataset.loaded === '1') return;
  answerEl.dataset.loaded = '1';

  const { sid, key, idx } = scenarioDiv.dataset;
  answerEl.innerHTML = '<div class="loading-hint">內容載入中…</div>';

  loadScenario(sid)
    .then(answers => {
      const htmlList = answers[key] || [];
      answerEl.innerHTML = htmlList[Number(idx)] || '<div class="load-error">找不到對應內容。</div>';
    })
    .catch(() => {
      delete answerEl.dataset.loaded; // 允許收合後再展開重試
      answerEl.innerHTML = '<div class="load-error">內容載入失敗，請檢查網路後收合再展開重試。</div>';
    });
}

export function renderByScenario(manifest, sid){
  searchBarEl.style.display = 'none';
  noMatchEl.style.display = 'none';
  const meta = manifest.scenarios[sid];
  scenarioBannerEl.innerHTML = `
    <div class="scenario-banner">
      <span class="tag">情境 ${esc(sid)}</span>
      <div class="title">${esc(meta.title)}</div>
      <div class="desc">${esc(meta.desc)}</div>
    </div>
  `;
  contentEl.innerHTML = '<div class="loading-hint" style="padding:18px;">內容載入中…</div>';

  loadScenario(sid)
    .then(answers => {
      if(scenarioSelect.value !== sid) return; // 使用者已切換至其他情境
      contentEl.innerHTML = '';

      manifest.categories.forEach(cat => {
        const matched = cat.roles.filter(r => r.sids.includes(sid));
        if(matched.length === 0) return;

        const catDiv = document.createElement('div');
        catDiv.className = 'cat';
        catDiv.innerHTML = `<div class="cat-head"><span>${esc(cat.name)}</span><span class="count">${matched.length} 個角色</span></div>`;

        const rolesDiv = document.createElement('div');
        rolesDiv.className = 'roles';

        matched.forEach(roleObj => {
          const htmlList = answers[`${cat.id}|${roleObj.role}`] || [];
          const el = document.createElement('div');
          el.className = 'role';
          el.dataset.role = roleObj.role;
          el.innerHTML = `
            <button class="role-head">
              <span class="role-name">${esc(roleObj.role)}</span>
              <span class="chev">▾</span>
            </button>
            <div class="role-body">
              <div class="role-body-inner">
                <div class="answer">${htmlList[0] || ''}</div>
              </div>
            </div>
          `;
          rolesDiv.appendChild(el);
        });

        catDiv.appendChild(rolesDiv);
        contentEl.appendChild(catDiv);
      });
    })
    .catch(() => {
      if(scenarioSelect.value !== sid) return;
      contentEl.innerHTML = '<div class="load-error" style="padding:18px;">內容載入失敗，請檢查網路後重新選擇情境。</div>';
    });
}
