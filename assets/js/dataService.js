// 資料存取層：manifest 目錄與情境答案的取得及快取
const MANIFEST_URL = 'data/manifest.json';
const scenarioUrl = (sid) => `data/scenarios/${encodeURIComponent(sid)}.json`;

// 情境答案快取：sid -> Promise<{ "catId|role": [html, ...] }>
const scenarioCache = new Map();

async function fetchJson(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function loadManifest(){
  return fetchJson(MANIFEST_URL);
}

export function loadScenario(sid){
  if(!scenarioCache.has(sid)){
    const promise = fetchJson(scenarioUrl(sid)).catch(err => {
      scenarioCache.delete(sid); // 失敗不快取，讓使用者可重試
      throw err;
    });
    scenarioCache.set(sid, promise);
  }
  return scenarioCache.get(sid);
}
