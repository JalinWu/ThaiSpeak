// 由 JSON 載入的資料
let data = [];

// ===== DOM =====
const tbody = document.getElementById('tbody');
const sidebar = document.getElementById('sidebarTopics');
const sidebarPanel = document.getElementById('sidebar');
const topicToggle = document.getElementById('topicToggle');
const q = document.getElementById('q');
const speakSelectedBtn = document.getElementById('speakSelected');
let isReading = false;

// ===== 語音 =====
let voices = [];
function refreshVoices(){ voices = window.speechSynthesis.getVoices(); }
refreshVoices();
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = refreshVoices;
}
function getThaiVoice(){
  const th = voices.find(v => /th(-TH)?/i.test(v.lang) || /Thai/i.test(v.name));
  return th || voices.find(v => /^en/i.test(v.lang)) || voices[0];
}
function speakThai(text){
  if (!('speechSynthesis' in window)) return alert('此瀏覽器不支援語音合成。');
  const u = new SpeechSynthesisUtterance(text);
  const v = getThaiVoice();
  if (v) u.voice = v;
  u.rate = 0.92;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
function speakThaiAsync(text){
  return new Promise((resolve)=>{
    if (!('speechSynthesis' in window)) {
      alert('此瀏覽器不支援語音合成。');
      return resolve();
    }
    const u = new SpeechSynthesisUtterance(text);
    const v = getThaiVoice();
    if (v) u.voice = v;
    u.rate = 0.92;
    // u.onend = resolve;
    // u.onerror = resolve;

    speechSynthesis.speak(u);
  });
}

// ===== 渲染 =====
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
}
function render(rows){
  tbody.innerHTML = '';
  for (const r of rows){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.zh)}</td>
      <td>${escapeHtml(r.th)}</td>
      <td>${escapeHtml(r.rtgs)}</td>
      <td><button class="btn play" title="播放泰文發音">▶️</button></td>
      `;
    //   <td><span class="pill">${escapeHtml(r.cat||'')}</span></td>
    tr.querySelector('.play').addEventListener('click', () => speakThai(r.th));
    tbody.appendChild(tr);
  }
}

// ===== 主題 / 搜尋 篩選 =====
let activeTopic = '全部';
function getAllTopics(){ return ['全部', ...Array.from(new Set(data.map(r => r.cat).filter(Boolean)))] }
function countByTopic(){
  const c = {};
  for (const r of data){ c[r.cat] = (c[r.cat]||0)+1; }
  return c;
}
function renderTopics(){
  const topics = getAllTopics();
  const counts = countByTopic();
  sidebar.innerHTML = '';
  topics.forEach(tp => {
    const btn = document.createElement('button');
    btn.className = 'topic-btn' + (tp===activeTopic?' active':'');
    btn.innerHTML = `<span>${tp}</span><span class="badge">${tp==='全部'?data.length:(counts[tp]||0)}</span>`;
    btn.addEventListener('click', ()=>{
      activeTopic = tp;
      filter();
      renderTopics();
      if (window.matchMedia('(max-width:1000px)').matches){
        sidebarPanel.classList.remove('open');
        if (topicToggle) topicToggle.setAttribute('aria-expanded','false');
      }
    });
    sidebar.appendChild(btn);
  });
}
function filter(){
  const t = q.value.trim().toLowerCase();
  let out = data;
  if (activeTopic !== '全部') out = out.filter(r => r.cat === activeTopic);
  if (t) out = out.filter(r =>
    r.zh.toLowerCase().includes(t) ||
    r.th.toLowerCase().includes(t) ||
    r.rtgs.toLowerCase().includes(t) ||
    (r.cat||'').toLowerCase().includes(t)
  );
  render(out);
}

// ===== 事件 =====
q.addEventListener('input', filter);
speakSelectedBtn.addEventListener('click', async () => {
  if (isReading) {
    isReading = false;
    speechSynthesis.cancel();
    speakSelectedBtn.textContent = '▶ 朗讀';
    speakSelectedBtn.title = '使用語音朗讀目前篩選結果';
    return;
  }
  const rows = [...tbody.querySelectorAll('tr')];
  if (!rows.length) return alert('沒有可朗讀的資料');

  isReading = true;
  speakSelectedBtn.textContent = '■ 停止';
  speakSelectedBtn.title = '■ 停止';

  for (const tr of rows) {
    if (!isReading) break;
    const th = tr.children[1].textContent.trim();
    await speakThaiAsync(th);
    if (!isReading) break;
    await new Promise(r => setTimeout(r, 150));
  }
  isReading = false;
  speakSelectedBtn.textContent = '▶ 朗讀';
  speakSelectedBtn.title = '使用語音朗讀目前篩選結果';
});

// 手機：主題切換按鈕
if (topicToggle){
  topicToggle.addEventListener('click', ()=>{
    const open = sidebarPanel.classList.toggle('open');
    topicToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open){
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// ===== 載入 JSON 並初始化 =====
async function loadData(){
  try{
    // 同站相對路徑；GitHub Pages OK。若以 file:// 開啟請用小型伺服器測試。
    const res = await fetch('./data/data.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  }catch(err){
    console.error('載入 data.json 失敗：', err);
    data = [];
  }
}

(async function init(){
  // 簡單的載入指示
  tbody.innerHTML = `<tr><td colspan="5" style="padding:14px">資料載入中…</td></tr>`;
  await loadData();
  render(data);
  renderTopics();
})();
