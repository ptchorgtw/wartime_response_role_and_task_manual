// 應用進入點：載入目錄、綁定事件（檢視切換、展開/收合、搜尋）
import { contentEl, noMatchEl, scenarioSelect, searchInput } from './dom.js';
import { loadManifest } from './dataService.js';
import { renderStats, buildScenarioPicker, renderByRole, renderByScenario, fillAnswer } from './render.js';

let manifest = null;

scenarioSelect.addEventListener('change', () => {
  if(!manifest) return;
  const sid = scenarioSelect.value;
  if(sid === ''){
    renderByRole(manifest);
  } else {
    renderByScenario(manifest, sid);
  }
});

// 事件委派：角色與情境的展開/收合
contentEl.addEventListener('click', (e) => {
  const roleHead = e.target.closest('.role-head');
  if(roleHead){
    roleHead.closest('.role').classList.toggle('open');
    return;
  }
  const scenarioHead = e.target.closest('.scenario-head');
  if(scenarioHead){
    const scenario = scenarioHead.closest('.scenario');
    scenario.classList.toggle('open');
    if(scenario.classList.contains('open')) fillAnswer(scenario);
  }
});

// 角色名稱搜尋（僅於依角色檢視時顯示）
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  let anyMatch = false;
  document.querySelectorAll('.cat').forEach(catDiv => {
    let catHasMatch = false;
    catDiv.querySelectorAll('.role').forEach(roleDiv => {
      const name = roleDiv.dataset.role.toLowerCase();
      const match = q === '' || name.includes(q);
      roleDiv.style.display = match ? '' : 'none';
      if(match) catHasMatch = true;
    });
    catDiv.style.display = catHasMatch ? '' : 'none';
    if(catHasMatch) anyMatch = true;
  });
  noMatchEl.style.display = anyMatch ? 'none' : 'block';
});

loadManifest()
  .then(m => {
    manifest = m;
    renderStats(manifest);
    buildScenarioPicker(manifest);
    renderByRole(manifest);
  })
  .catch(() => {
    contentEl.innerHTML = '<div class="load-error" style="padding:18px;">目錄載入失敗，請重新整理頁面。</div>';
  });
