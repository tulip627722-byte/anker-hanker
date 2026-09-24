const $ = id => document.getElementById(id);
const STORAGE_KEY = 'xunyi-memory-demo-v2';

const seedMemories = [
  {
    id: 'cinema-first-date',
    title: '第一次和爷爷看电影',
    people: ['爷爷'],
    locations: ['旧电影院'],
    themes: ['看电影', '下雨'],
    keywords: ['散场', '雨', '电影院'],
    sources: [{ id: 'voice-0612', date: '6 月 12 日', duration: 23 }]
  },
  {
    id: 'loquat-tree',
    title: '院子里那棵枇杷树',
    people: ['妈妈'],
    locations: ['老院子'],
    themes: ['枇杷树'],
    keywords: ['白花', '春天'],
    sources: [{ id: 'voice-0416', date: '4 月 16 日', duration: 31 }]
  }
];

const incomingVoice = {
  id: 'voice-today-0842',
  transcript: '我第一次和你爷爷看电影，就是在这里。电影院门口有一棵很大的香樟树。',
  people: ['爷爷'],
  locations: ['旧电影院'],
  themes: ['看电影', '香樟树'],
  keywords: ['第一次', '电影院', '香樟树'],
  date: '今天 08:42',
  duration: 18
};

function scoreMemory(voice, memory) {
  const person = voice.people.some(item => memory.people.includes(item)) ? 30 : 0;
  const place = voice.locations.some(item => memory.locations.includes(item)) ? 30 : 0;
  const theme = voice.themes.some(item => memory.themes.includes(item)) ? 15 : 0;
  const semantic = voice.keywords.some(item => memory.keywords.includes(item)) ? 17 : 0;
  return Math.min(100, person + place + theme + semantic);
}

function findBestMemory(voice) {
  return seedMemories
    .map(memory => ({ memory, score: scoreMemory(voice, memory) }))
    .sort((a, b) => b.score - a.score)[0];
}

const match = findBestMemory(incomingVoice);
let state = readState();
let processing = false;
let playing = false;
let audioTimer = null;
let promptIndex = 0;

const prompts = [
  '“后来雨停了吗？”',
  '“散场后，你们去了哪里？”',
  '“那天有没有一个你一直记得的声音？”'
];

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { accepted: false };
  } catch {
    return { accepted: false };
  }
}

function saveState(next) {
  state = { ...state, ...next };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
}

function switchView(view) {
  document.querySelectorAll('[data-view-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === view));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAcceptedState() {
  const accepted = Boolean(state.accepted);
  $('revealWaiting').hidden = accepted;
  $('revealResult').hidden = !accepted;
  $('matchScore').textContent = `${state.matchScore || match.score}%`;
  $('heroCard').classList.toggle('accepted', accepted);
  if (accepted) {
    $('receiveButton').innerHTML = '<span>长期记忆已更新</span><b>查看结果</b>';
  } else {
    $('receiveButton').innerHTML = '<span>让 AI 找回与它有关的记忆</span><b>开始匹配</b>';
  }
}

function setProcessStep(name, percent, title, hint) {
  const steps = [...document.querySelectorAll('[data-process-step]')];
  const index = steps.findIndex(step => step.dataset.processStep === name);
  steps.forEach((step, current) => {
    step.classList.toggle('active', current === index);
    step.classList.toggle('done', current <= index);
  });
  $('processPercent').textContent = `${percent}%`;
  $('processTitle').textContent = title;
  $('processHint').textContent = hint;
}

function finishMemoryMatch() {
  $('processMatch').textContent = `${match.memory.title} · 匹配度 ${match.score}%`;
  setProcessStep('match', 100, '新原声已补进一段旧故事', 'AI 只组织已有证据，不补写未知事实');
  setTimeout(() => {
    saveState({ accepted: true, matchScore: match.score, matchedMemoryId: match.memory.id, sourceCount: 2 });
    $('processingSheet').hidden = true;
    processing = false;
    renderAcceptedState();
    $('memoryReveal').scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('长期记忆已从 1 段原声生长为 2 段');
  }, 680);
}

function receiveVoice() {
  if (processing) return;
  if (state.accepted) {
    $('memoryReveal').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  processing = true;
  document.querySelectorAll('[data-process-step]').forEach(step => step.classList.remove('active', 'done'));
  $('processMatch').textContent = '正在搜索个人记忆空间';
  $('processingSheet').hidden = false;
  setProcessStep('voice', 18, '从原声中找到可靠的线索', '原声永远是事实底座');
  setTimeout(() => setProcessStep('place', 43, '这段声音发生在旧电影院附近', '地点来自本次授权，不保存轨迹'), 650);
  setTimeout(() => setProcessStep('person', 69, '她提到了“爷爷”', '正在查找相同人物与地点的旧片段'), 1300);
  setTimeout(finishMemoryMatch, 2050);
}

document.querySelectorAll('[data-view]').forEach(control => control.addEventListener('click', () => switchView(control.dataset.view)));
$('receiveButton').addEventListener('click', receiveVoice);
$('hardwareDemo').addEventListener('click', () => toast('珠珠轻震一下：原声已离线保存，等待回到手机'));
$('resetDemo').addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  state = { accepted: false };
  renderAcceptedState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('演示已重置，可以重新观看记忆生长');
});

$('playEvidence').addEventListener('click', () => {
  const range = $('audioProgress');
  const button = $('playEvidence');
  if (playing) {
    playing = false;
    clearInterval(audioTimer);
    button.textContent = '继续播放';
    return;
  }
  playing = true;
  button.textContent = '暂停';
  audioTimer = setInterval(() => {
    range.value = Number(range.value) + 1;
    $('audioTime').textContent = `00:${String(range.value).padStart(2, '0')}`;
    if (Number(range.value) >= 18) {
      clearInterval(audioTimer);
      playing = false;
      button.textContent = '再听一次';
      range.value = 0;
    }
  }, 300);
});

$('audioProgress').addEventListener('input', event => {
  $('audioTime').textContent = `00:${String(event.target.value).padStart(2, '0')}`;
});

$('nextPrompt').addEventListener('click', () => {
  promptIndex = (promptIndex + 1) % prompts.length;
  const card = $('promptCard');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = 'rise .45s ease';
  $('promptText').textContent = prompts[promptIndex];
});

$('usePrompt').addEventListener('click', () => toast('问句已放大，交给家人自己选择要不要问'));

document.querySelectorAll('.place-pin').forEach(pin => pin.addEventListener('click', () => {
  document.querySelectorAll('.place-pin').forEach(item => item.classList.remove('active'));
  pin.classList.add('active');
  const garden = pin.dataset.place === 'garden';
  $('placeStory').innerHTML = garden
    ? '<small>老院子 · 3 段原声</small><h3>院子里那棵枇杷树</h3><p>“每年春天，树下总落着一层白花……”</p><button data-view="story">查看证据链</button>'
    : '<small>旧电影院 · 2 段原声</small><h3>第一次和爷爷看电影</h3><p>“电影院门口有一棵很大的香樟树……”</p><button data-view="story">查看证据链</button>';
  $('placeStory').querySelector('[data-view]').addEventListener('click', () => switchView('story'));
}));

$('locationToggle').addEventListener('click', event => {
  const value = event.currentTarget.querySelector('em');
  value.textContent = value.textContent === '开启' ? '关闭' : '开启';
  toast(value.textContent === '开启' ? '地点线索已开启，仍按次授权' : '地点线索已关闭');
});

renderAcceptedState();
