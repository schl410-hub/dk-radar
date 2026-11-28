/* 딮기 시그널 · DK SIGNAL 앱 로직 (프레임워크 없이 동작)
 * KO · EN · JA 다국어, 테마, 5인 보드, 공식 일정(생중계·VOD·하이라이트), 선수 방송국·전적, 대표 하이라이트
 */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var T = function (key, vars) { return window.I18N.t(key, vars); };
  var lang = function () { return window.I18N.lang; };

  /* { ko, en, ja, zh, tw, vi, es … } 묶음에서 현재 언어 값을 꺼냅니다.
   * data.js 의 문장형 내용은 5개 언어(ko·en·ja·zh·vi)만 있고, 나머지는 아래 순서로 대쳬합니다:
   * tw → zh(간체) → en / es·pt·th·id → en → ko */
  var LANG_FALLBACK = { tw: ['zh'], es: ['en'], pt: ['en'], th: ['en'], id: ['en'] };
  function pickLang(map) {
    if (map == null) return '';
    if (typeof map === 'string') return map;
    var l = lang();
    if (map[l] != null) return map[l];
    var fb = LANG_FALLBACK[l] || [];
    for (var i = 0; i < fb.length; i++) if (map[fb[i]] != null) return map[fb[i]];
    if (map.en != null) return map.en;
    return map.ko != null ? map.ko : '';
  }
  function L(value) { return pickLang(value); }

  var THEME_KEY = 'dk.signal.theme';
  var CHEER_KEY = 'dk.signal.cheer.';
  var MYPICK_KEY = 'dk.signal.mypick';
  var DEFAULT_PICK = 'doran';

  var state = {
    player: 'doran',
    tab: 'feed',
    filter: 'all',
    videoPlayer: 'all',
    videoCat: 'all',
    videoChamp: 'all',
    videoQuery: '',
    videoSort: 'player',
    checked: new Date(LAST_CHECKED)
  };

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  var theme = store.get(THEME_KEY, 'dark') === 'mint' ? 'mint' : 'dark';
  var swReg = null;

  /* 내 최애(MY PICK): 저장된 선수를 첫 화면 기본값으로 씁니다. 없거나 알 수 없는 값이면 도란. */
  var myPick = (function () {
    var saved = store.get(MYPICK_KEY, DEFAULT_PICK);
    for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].key === saved) return saved;
    return DEFAULT_PICK;
  })();
  state.player = myPick;

  /* 찜한 영상(⭐): 이 폰 브라우저의 localStorage 에만 저장합니다. 로그인·서버 없음. */
  var FAV_KEY = 'dk.signal.favs';
  var favs = (function () {
    try {
      var raw = JSON.parse(store.get(FAV_KEY, '[]'));
      if (!Array.isArray(raw)) return [];
      var out = [];
      raw.forEach(function (id) {
        if (typeof id === 'string' && id && out.indexOf(id) < 0) out.push(id);
      });
      return out;
    } catch (e) { return []; }
  })();
  function saveFavs() { store.set(FAV_KEY, JSON.stringify(favs)); }
  function isFav(id) { return !!id && favs.indexOf(id) > -1; }
  function toggleFav(id) {
    if (!id) return false;
    var i = favs.indexOf(id);
    if (i > -1) favs.splice(i, 1); else favs.push(id);
    saveFavs();
    return i < 0;
  }

  /* ---------- 나만의 재생목록 · 내 링크 (localStorage · 로그인 없음) ----------
   *  mine.folders: [{ id, name, ids: [videoId] }] — name 이 비면 '나만의 재생목록'(기본 폴더)
   *  mine.active : 'all' 이면 아카이브 전체 보기 + 기본 폴더에 담기, 폴더 id 면 그 폴더만 보기/담기
   *  links       : [{ id, title, added }] — 사용자가 붙여넣은 유튜브 링크 */
  var MINE_KEY = 'dk.signal.mine';
  var LINKS_KEY = 'dk.signal.links';
  var DEFAULT_FOLDER = 'f-default';

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  var links = (function () {
    try {
      var raw = JSON.parse(store.get(LINKS_KEY, '[]'));
      if (!Array.isArray(raw)) return [];
      var out = [];
      raw.forEach(function (row) {
        if (!row || typeof row.id !== 'string' || !row.id) return;
        if (out.some(function (x) { return x.id === row.id; })) return;
        out.push({ id: row.id, title: String(row.title || ''), added: Number(row.added) || Date.now() });
      });
      return out;
    } catch (e) { return []; }
  })();

  var mine = (function () {
    var raw = null;
    try { raw = JSON.parse(store.get(MINE_KEY, 'null')); } catch (e) { raw = null; }
    if (!raw || !Array.isArray(raw.folders)) raw = { folders: [], active: 'all' };
    var folders = [];
    raw.folders.forEach(function (f) {
      if (!f || typeof f.id !== 'string' || !f.id) return;
      if (folders.some(function (x) { return x.id === f.id; })) return;
      folders.push({
        id: f.id,
        name: String(f.name || ''),
        ids: Array.isArray(f.ids) ? f.ids.filter(function (id, i, arr) {
          return typeof id === 'string' && id && arr.indexOf(id) === i;
        }) : []
      });
    });
    if (!folders.length) folders.push({ id: DEFAULT_FOLDER, name: '', ids: [] });
    var active = typeof raw.active === 'string' ? raw.active : 'all';
    if (active !== 'all' && !folders.some(function (f) { return f.id === active; })) active = 'all';
    var target = typeof raw.target === 'string' ? raw.target : '';
    if (!folders.some(function (f) { return f.id === target; })) target = folders[0].id;
    return { folders: folders, active: active, target: target };
  })();

  function saveMine() { store.set(MINE_KEY, JSON.stringify(mine)); }
  function saveLinks() { store.set(LINKS_KEY, JSON.stringify(links)); }
  function folderName(f) { return (f && f.name) || T('mine.default'); }
  function folderById(id) {
    for (var i = 0; i < mine.folders.length; i++) if (mine.folders[i].id === id) return mine.folders[i];
    return null;
  }
  /* 담기 대상 폴더: 마지막에 고른 폴더(없으면 기본 폴더) */
  function targetFolder() {
    return folderById(mine.target) || mine.folders[0];
  }
  function inTargetFolder(id) {
    var f = targetFolder();
    return !!f && f.ids.indexOf(id) > -1;
  }
  function inAnyFolder(id) {
    return mine.folders.some(function (f) { return f.ids.indexOf(id) > -1; });
  }
  function playlistIds() {
    if (mine.active !== 'all') {
      var f = folderById(mine.active);
      return f ? f.ids.slice() : [];
    }
    var out = [];
    mine.folders.forEach(function (f) {
      f.ids.forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); });
    });
    return out;
  }
  /* 내 링크 영상 → 아카이브 카드와 같은 모양의 entry 로 */
  function linkEntries() {
    return links.map(function (l) {
      var title = l.title || ('YouTube · ' + l.id);
      var d = new Date(l.added || Date.now());
      return {
        p: null,
        v: {
          id: l.id, len: '', channel: '', team: '', cat: 'mine', mine: true,
          year: isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear(),
          match: { ko: title, en: title, ja: title, zh: title, vi: title },
          event: { ko: T('mine.srcLabel'), en: T('mine.srcLabel'), ja: T('mine.srcLabel'), zh: T('mine.srcLabel'), vi: T('mine.srcLabel') }
        }
      };
    });
  }
  function archiveById(id) {
    var all = archiveItems();
    for (var i = 0; i < all.length; i++) if (all[i].v.id === id) return all[i];
    return null;
  }
  /* 담기/빼기 — 담기는 곳(마지막으로 고른 폴더)에 넣고 뺍니다. */
  function toggleMineVideo(id) {
    if (!id) return false;
    var f = targetFolder();
    if (!f) return false;
    var at = f.ids.indexOf(id);
    var added;
    if (at > -1) {
      f.ids.splice(at, 1);
      added = false;
      toast(T('mine.removeOk', { name: folderName(f) }));
    } else {
      f.ids.push(id);
      added = true;
      toast(T('mine.addOk', { name: folderName(f) }));
    }
    saveMine();
    renderMineRow();
    renderVideoList();
    return added;
  }

  /* 알림 설정: 선수별 솔랭 알림 + DK 공식 경기 알림 (각각 localStorage 저장) */
  var OFFICIAL_KEY = 'dk.signal.official';
  var SOLO_KEY = 'dk.signal.solo.';
  function soloKey(k) { return SOLO_KEY + k; }
  function isSoloOn(k) {
    var def = k === 'doran' ? '1' : '0';
    return store.get(soloKey(k), def) === '1';
  }
  var officialOn = store.get(OFFICIAL_KEY, '1') === '1';
  /* 라이브 방송 알림: 선수가 SOOP·CHZZK에서 방송을 켰을 때 (기본 켜짐) */
  var LIVE_KEY = 'dk.signal.live';
  var liveAlerts = store.get(LIVE_KEY, '1') === '1';
  /* 방송국 공지 알림: SOOP 방송국에 새 공지가 올라왔을 때 (기본 켜짐) */
  var NOTICE_KEY = 'dk.signal.notice';
  var noticeAlerts = store.get(NOTICE_KEY, '1') === '1';

  /* ---------- 데이터 헬퍼 ---------- */
  function player(key) {
    for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].key === key) return PLAYERS[i];
    return PLAYERS[0];
  }
  function current() { return player(state.player); }

  /* 라이브 방송 상태 (/api/live): 방송 중이면 그 선수의 정보를 돌려줍니다. */
  function liveOf(key) {
    var d = LIVE.live;
    if (!d || !d.ok || !d.players) return null;
    var row = d.players[key];
    return row && row.live ? row : null;
  }
  function liveBadge(key, cls) {
    var row = liveOf(key);
    if (!row) return '';
    return '<span class="onair' + (cls ? ' ' + cls : '') + '"><i></i>' + T('live.badge') + '</span>';
  }

  function pName(p) {
    if (lang() === 'ko') return p.nameKo;
    if (lang() === 'ja') return p.nameJa || p.nameIntl || p.nameKo;
    if (lang() === 'zh') return p.nameZh || p.nameIntl || p.nameKo;
    if (lang() === 'tw') return p.nameTw || p.nameZh || p.nameIntl || p.nameKo;
    return p.nameIntl || p.nameEn || p.nameKo;
  }
  /* 캘린더 셀 배지용 이름: 한 칸이 45px 남짓이라 일본어는 카타카나 대신 라틴 표기를 씁니다. */
  function pBarName(p) {
    return lang() === 'ko' ? p.nameKo
      : ((lang() === 'zh' || lang() === 'tw') ? (pName(p) || p.nameIntl || p.nameKo)
        : (p.nameIntl || p.nameEn || p.nameKo));
  }
  /* ShowMaker 처럼 긴 라틴 이름은 낱말 경계(대문자 앞)에서 줄이 바뀔 수 있게 <wbr> 를 넣습니다. */
  function barNameHTML(name) {
    return esc(name).replace(/([a-z])([A-Z])/g, '$1<wbr>$2');
  }
  /* 영어 서수: 1st · 2nd · 3rd · 9th */
  function enOrdinal(n) {
    var m = n % 100;
    if (m >= 11 && m <= 13) return n + 'th';
    return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  }
  function pReal(p) {
    if (lang() === 'ko') return p.real;
    if (lang() === 'ja') return p.realJa || p.realEn || p.real;
    if (lang() === 'zh') return p.realZh || p.realEn || p.real;
    if (lang() === 'tw') return p.realTw || p.realZh || p.realEn || p.real;
    return p.realEn || p.real;
  }
  function pAvatar(p) {
    var n = pName(p);
    return n ? n.charAt(0) : '?';
  }
  function pPos(p) { return T('pos.' + (p.pos || 'TOP')); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* '11. 25.' 같은 경기 날짜 표기 → 언어별 */
  function matchDate(str) { return window.I18N.matchDate(str); }

  function parseMatchDate(str) {
    var m = /^\s*(\d{1,2})\.\s*(\d{1,2})\.\s*$/.exec(str || '');
    if (!m) return null;
    return new Date(state.checked.getFullYear(), Number(m[1]) - 1, Number(m[2]));
  }
  function relDay(str) {
    var d = parseMatchDate(str);
    if (!d) return matchDate(str);
    var base = new Date(2026, 10, 26);
    var diff = Math.round((base - d) / 86400000);
    if (diff <= 0) return T('day.today');
    if (diff === 1) return T('day.yesterday');
    if (diff <= 7) return T('time.day', { n: diff });
    return matchDate(str);
  }
  function recent(p, n) { return p.matches.slice(0, n || 5); }
  function tally(list) {
    var w = 0, l = 0, k = 0, d = 0, a = 0;
    list.forEach(function (m) {
      m.win ? w++ : l++;
      var parts = m.kda.split('/').map(Number);
      k += parts[0] || 0; d += parts[1] || 0; a += parts[2] || 0;
    });
    return {
      g: list.length, w: w, l: l, k: k, d: d, a: a,
      rate: list.length ? Math.round((w / list.length) * 100) : 0,
      kda: d ? ((k + a) / d).toFixed(1) : '-'
    };
  }
  function wl(w, l) { return T('pick.wl', { w: w, l: l }); }
  function barHeight(m) {
    var parts = m.kda.split('/').map(Number);
    var involvement = (parts[0] || 0) + (parts[2] || 0);
    return Math.max(4, Math.min(14, 4 + Math.round(involvement / 4)));
  }
  function relTime(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return T('time.just');
    if (diff < 3600000) return T('time.min', { n: Math.floor(diff / 60000) });
    if (diff < 86400000) return T('time.hour', { n: Math.floor(diff / 3600000) });
    if (diff < 604800000) return T('time.day', { n: Math.floor(diff / 86400000) });
    return T('time.old');
  }

  /* 티어·전적 표기: 서버가 숫자/키를 주면 언어별로, 없으면 넘어온 문자열 그대로 */
  function tierText(p) {
    if (p.tierKey) {
      var name = T('tier.' + String(p.tierKey).toUpperCase());
      var rank = p.tierRank && ['MASTER', 'GRANDMASTER', 'CHALLENGER'].indexOf(String(p.tierKey).toUpperCase()) < 0
        ? ' ' + p.tierRank : '';
      return name + rank;
    }
    return p.tier || T('tier.UNRANKED');
  }
  function tierShort(p) {
    if (p.tierKey && String(p.tierKey).toUpperCase() === 'DIAMOND') return T('tier.short.DIAMOND') + (p.tierRank ? ' ' + p.tierRank : '');
    return tierText(p);
  }
  function lpText(p) {
    if (p.lpValue != null) return p.lpValue + ' LP';
    return p.lp || '-';
  }
  function recordText(p) {
    if (p.wins != null && p.losses != null) {
      var total = p.wins + p.losses;
      var rate = total ? Math.round((p.wins / total) * 100) : 0;
      return wl(p.wins, p.losses) + ' · ' + T('winrate', { r: rate });
    }
    return p.record || '';
  }
  function winRateText(p) {
    if (p.wins != null && p.losses != null) {
      var total = p.wins + p.losses;
      var rate = total ? Math.round((p.wins / total) * 100) : 0;
      return T('winrate', { r: rate });
    }
    return (p.record || '').split('·')[1] ? (p.record.split('·')[1] || '').trim() : '';
  }

  /* 챔피언 이름: 데이터는 한국어, Riot API 는 영어로 줍니다. 표에서 각 언어 칸을 찾아 바꿉니다. */
  var CHAMP_INDEX = null;
  function normChamp(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function champIndex() {
    if (CHAMP_INDEX) return CHAMP_INDEX;
    CHAMP_INDEX = { ko: {}, en: {}, ja: {}, zh: {}, tw: {}, vi: {}, es: {}, pt: {}, th: {}, id: {} };
    Object.keys(CHAMPIONS || {}).forEach(function (id) {
      var row = CHAMPIONS[id];
      if (!row || !row.length) return;
      CHAMP_INDEX.ko[row[0]] = row;
      CHAMP_INDEX.en[normChamp(row[1])] = row;
      CHAMP_INDEX.ja[row[2]] = row;
      ['zh', 'tw', 'vi', 'es', 'pt', 'th', 'id'].forEach(function (code, i) {
        var name = row[3 + i];
        if (name) CHAMP_INDEX[code][name] = row;
      });
    });
    return CHAMP_INDEX;
  }
  /* 언어별 챔피언 이름이 들어 있는 표 칸 (ko·en·ja 다음 7개 언어는 같은 순서) */
  var CHAMP_COL = { ko: 0, en: 1, ja: 2, zh: 3, tw: 4, vi: 5, es: 6, pt: 7, th: 8, id: 9 };
  function champText(name) {
    if (name == null) return '';
    var idx = champIndex();
    var row = idx.ko[name] || idx.en[normChamp(name)] || idx.ja[name] || idx.zh[name];
    if (!row) {
      for (var k in idx) { if (idx[k][name]) { row = idx[k][name]; break; } }
    }
    if (!row) return name;
    var col = CHAMP_COL[lang()];
    return row[col] || row[1] || row[0];
  }

  function avatar(p) { return '<span class="pav">' + pAvatar(p) + '<span class="badge-pos">' + pPos(p) + '</span></span>'; }

  /* 경기 행의 포지션: 데이터는 한국어('탑')나 Riot 키('TOP') 둘 다 올 수 있어 하나로 맞춥니다. */
  var ROLE_KEY = { '탑': 'TOP', '정글': 'JGL', '미드': 'MID', '원딜': 'BOT', '서폿': 'SUP', 'TOP': 'TOP', 'JUNGLE': 'JGL', 'JGL': 'JGL', 'MIDDLE': 'MID', 'MID': 'MID', 'BOTTOM': 'BOT', 'BOT': 'BOT', 'ADC': 'BOT', 'UTILITY': 'SUP', 'SUPPORT': 'SUP', 'SUP': 'SUP' };
  function roleText(role) {
    var key = ROLE_KEY[role];
    return key ? T('pos.' + key) : (role || '');
  }

  /* ---------- 정적 문구(HTML) 다국어 ---------- */
  function applyStatic() {
    $$('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      el.textContent = T(key);
    });
    $$('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var i = pair.indexOf(':');
        if (i < 1) return;
        var attr = pair.slice(0, i).trim();
        var key = pair.slice(i + 1).trim();
        if (attr && key) el.setAttribute(attr, T(key));
      });
    });
    $$('.tab').forEach(function (tab) {
      var key = 'tab.' + tab.getAttribute('data-tab');
      var span = tab.querySelector('span');
      if (span) span.textContent = T(key);
    });
    var cheerInput = $('#cheerInput');
    if (cheerInput) cheerInput.setAttribute('aria-label', T('cheer.aria'));
    var cheerSend = $('.cheer-send');
    if (cheerSend) cheerSend.setAttribute('aria-label', T('cheer.send'));
    var pillsSolo = $('#pillsSolo');
    if (pillsSolo) pillsSolo.setAttribute('aria-label', T('solo.pickerAria'));
    var pillsRecords = $('#pillsRecords');
    if (pillsRecords) pillsRecords.setAttribute('aria-label', T('solo.pickerAria'));
    var footAbout = $('#footAbout');
    if (footAbout) footAbout.innerHTML = T('foot.about');
    var seasonMeta = $('#seasonMeta');
    if (seasonMeta) seasonMeta.innerHTML = T('official.seasonMeta');
    var seasonNote = $('#seasonNote');
    if (seasonNote) seasonNote.textContent = T('official.seasonNote');
    var lolesports = $('#lolesportsLink');
    if (lolesports) lolesports.href = L(CHANNELS.lolesportsSchedule);
  }

  /* ---------- 언어 전환 컨트롤 (10개국어 · 헤더 버튼 + 팝오버) ---------- */
  var GLOBE_IC = '<svg class="gl" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.4" stroke="currentColor" stroke-width="1.6"/><path d="M3.6 12h16.8M12 3.6c2.25 2.3 3.4 5.3 3.4 8.4s-1.15 6.1-3.4 8.4c-2.25-2.3-3.4-5.3-3.4-8.4S9.75 5.9 12 3.6Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  var CHEV_IC = '<svg class="chev" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7.5 10 4.5 4.5L16.5 10" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var OK_IC = '<svg class="lp-ok" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.7 4.4 4.4L19 7.3" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var INFO_IC = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.6" stroke="currentColor" stroke-width="1.7"/><path d="M12 10.6v6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.05" fill="currentColor"/></svg>';
  var langPopOpen = false;

  function langMetaOf(code) {
    var list = window.I18N.LANGS;
    for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i];
    return list[0];
  }

  /* 버튼 위치에 맞춰 팝오버를 붙입니다. 좁은 화면에서는 헤더 바로 아래 시트로. */
  function placeLangPop() {
    var btn = $('#langBtn'), pop = $('#langPop'), bar = document.querySelector('.appbar');
    if (!btn || !pop) return;
    var r = btn.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var narrow = vw <= 520;
    var w = narrow ? Math.min(vw - 20, 400) : 356;
    pop.style.width = w + 'px';
    var left = r.right - w;
    if (left < 10) left = 10;
    if (left + w > vw - 10) left = vw - w - 10;
    var top = narrow && bar ? Math.round(bar.getBoundingClientRect().bottom + 8) : Math.round(r.bottom + 10);
    pop.classList.toggle('is-sheet', narrow);
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = top + 'px';
    var cx = Math.round(r.left + r.width / 2 - left);
    cx = Math.max(18, Math.min(w - 18, cx));
    pop.style.setProperty('--caret-x', cx + 'px');
    if (!narrow) {
      var h = pop.getBoundingClientRect().height;
      if (top + h > vh - 12) {
        pop.classList.add('is-up');
        pop.style.top = Math.max(12, Math.round(r.top - h - 12)) + 'px';
        pop.style.setProperty('--pop-origin', 'bottom right');
      } else {
        pop.classList.remove('is-up');
        pop.style.setProperty('--pop-origin', 'top right');
      }
    }
  }

  function openLangPop(focusIt) {
    var pop = $('#langPop'), btn = $('#langBtn');
    if (!pop || !btn) return;
    langPopOpen = true;
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    placeLangPop();
    if (focusIt) {
      var on = pop.querySelector('.lp-item.is-on') || pop.querySelector('.lp-item');
      if (on) on.focus();
    }
  }

  function closeLangPop(refocus) {
    var pop = $('#langPop'), btn = $('#langBtn');
    if (!pop || !langPopOpen) return;
    langPopOpen = false;
    pop.hidden = true;
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      if (refocus) btn.focus();
    }
  }

  function renderLangSwitch() {
    var host = $('#langSwitch'), pop = $('#langPop');
    if (!host || !pop) return;
    var cur = lang();
    var meta = langMetaOf(cur);

    if (!host.firstElementChild) {
      host.innerHTML =
        '<button class="lang-trigger" id="langBtn" type="button" aria-haspopup="listbox" aria-expanded="false">' +
          GLOBE_IC +
          '<span class="ls-code">' + meta.label + '</span>' +
          CHEV_IC +
        '</button>';
      pop.innerHTML =
        '<div class="lp-head">' + GLOBE_IC + '<b class="lp-title"></b><span class="lp-count"></span></div>' +
        '<div class="lp-grid">' +
          window.I18N.LANGS.map(function (l) {
            return '<button class="lp-item" type="button" role="option" aria-selected="false"' +
              ' data-lang="' + l.code + '" lang="' + l.htmlLang + '" title="' + l.name + '">' +
                '<span class="lp-name">' + l.name + '</span>' +
                '<span class="lp-code">' + l.label + '</span>' +
                OK_IC +
              '</button>';
          }).join('') +
        '</div>' +
        '<div class="lp-foot">' + INFO_IC + '<span class="lp-foot-txt"></span></div>';

      $('#langBtn').addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (langPopOpen) closeLangPop(false); else openLangPop(false);
      });
      $('#langBtn').addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          /* 문서 쪽 ↑↓ 핸들러까지 올라가면 한 번에 두 칸씩 움직여, 여기서 멈춥니다. */
          e.preventDefault(); e.stopPropagation();
          openLangPop(true);
        }
      });
      pop.addEventListener('click', function (e) {
        var item = e.target.closest('[data-lang]');
        if (!item) return;
        var code = item.getAttribute('data-lang');
        closeLangPop(false);
        if (code !== lang()) window.I18N.setLang(code);
      });
      document.addEventListener('click', function (e) {
        if (!langPopOpen) return;
        if (e.target.closest('#langPop') || e.target.closest('#langSwitch')) return;
        closeLangPop(false);
      });
      document.addEventListener('keydown', function (e) {
        if (!langPopOpen) return;
        if (e.key === 'Escape') { e.preventDefault(); closeLangPop(true); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
        var items = [].slice.call(pop.querySelectorAll('.lp-item'));
        var i = items.indexOf(document.activeElement);
        e.preventDefault();
        if (e.key === 'Home') i = 0;
        else if (e.key === 'End') i = items.length - 1;
        else i = i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[i].focus();
      });
      window.addEventListener('resize', function () { if (langPopOpen) placeLangPop(); });
      window.addEventListener('scroll', function () { if (langPopOpen) closeLangPop(false); }, { passive: true });
    }

    var btn = $('#langBtn');
    if (btn) {
      btn.querySelector('.ls-code').textContent = meta.label;
      btn.setAttribute('aria-label', T('lang.label') + ' · ' + meta.name);
    }
    var title = pop.querySelector('.lp-title');
    if (title) title.textContent = T('lang.label');
    var count = pop.querySelector('.lp-count');
    if (count) count.textContent = T('lang.count');
    var foot = pop.querySelector('.lp-foot-txt');
    if (foot) foot.textContent = T('lang.saved');
    pop.setAttribute('aria-label', T('lang.menuAria'));
    [].slice.call(pop.querySelectorAll('.lp-item')).forEach(function (item) {
      var on = item.getAttribute('data-lang') === cur;
      item.classList.toggle('is-on', on);
      item.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  /* ---------- 테마 ---------- */
  function updateThemeUI() {
    var mint = theme === 'mint';
    document.documentElement.setAttribute('data-theme', theme);
    var btn = $('#themeBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', String(mint));
      btn.setAttribute('aria-label', mint ? T('theme.toDark') : T('theme.toMint'));
      btn.setAttribute('title', T('theme.title'));
    }
    var txt = $('#themeTxt');
    if (txt) txt.textContent = mint ? T('theme.mint') : T('theme.dark');
    var meta = $('#themeColor');
    if (meta) meta.setAttribute('content', mint ? '#EFFDF8' : '#05090F');
    var iosBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (iosBar) iosBar.setAttribute('content', mint ? 'default' : 'black-translucent');
  }
  function toggleTheme() {
    theme = theme === 'dark' ? 'mint' : 'dark';
    store.set(THEME_KEY, theme);
    updateThemeUI();
  }

  /* ---------- 알림 배너 ---------- */
  var banner = $('#pushBanner'), bannerTimer = null;
  function showBanner(title, text, stay) {
    if (!banner) return;
    $('#pbTitle').textContent = title;
    $('#pbText').textContent = text;
    banner.hidden = false;
    void banner.offsetWidth;
    banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(hideBanner, stay || 6500);
  }
  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('show');
    setTimeout(function () { banner.hidden = true; }, 260);
  }
  if (banner) {
    banner.addEventListener('click', function (e) {
      if (e.target.closest('.pb-close')) return hideBanner();
      hideBanner();
      window.open(current().opgg, '_blank');
    });
    var closeBtn = $('#pbClose');
    if (closeBtn) closeBtn.addEventListener('click', function (e) { e.stopPropagation(); hideBanner(); });
  }

  /* ---------- 공통 뷰 ---------- */
  function pillsHTML() {
    return PLAYERS.map(function (p) {
      return '<button class="pill' + (p.key === state.player ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' +
        (p.key === state.player) + '" data-player="' + p.key + '">' + pName(p) +
        '<span class="pos">' + p.pos + '</span></button>';
    }).join('');
  }

  function renderPills() {
    ['#pillsSolo', '#pillsRecords'].forEach(function (sel) {
      var host = $(sel);
      if (host) host.innerHTML = pillsHTML();
    });
  }

  function dotsHTML(list) {
    return list.map(function (m) { return '<i class="' + (m.win ? 'w' : 'l') + '"></i>'; }).join('');
  }

  function bellBtn(key, extraClass) {
    var on = isSoloOn(key);
    var p = player(key);
    return '<button class="' + (extraClass || 'bell-mini') + (on ? '' : ' is-off') + '" type="button" data-solo-toggle="' + key + '"' +
      ' role="switch" aria-checked="' + on + '" aria-label="' + T(on ? 'notify.toggleOn' : 'notify.toggleOff', { name: pName(p) }) + '">' +
      '<svg class="b-on" viewBox="0 0 20 20" width="13" height="13" fill="none" aria-hidden="true">' +
        '<path d="M4.7 13.2V9.4a5.3 5.3 0 0 1 10.6 0v3.8l1.2 1.5H3.5l1.2-1.5Z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M8.3 16.6a1.85 1.85 0 0 0 3.4 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
      '<svg class="b-off" viewBox="0 0 20 20" width="13" height="13" fill="none" aria-hidden="true">' +
        '<path d="M4.7 13.2V9.4a5.3 5.3 0 0 1 10.6 0v3.8l1.2 1.5H3.5l1.2-1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M8.3 16.6a1.85 1.85 0 0 0 3.4 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M3.4 3.4l13.2 13.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>';
  }

  /* ---------- 최애 포커스 배너 ---------- */
  var STAR_ON = '<svg class="st" viewBox="0 0 20 20" width="10" height="10" aria-hidden="true"><path d="M10 2.3l2.4 4.86 5.36.78-3.88 3.78.92 5.34L10 14.53l-4.8 2.53.92-5.34L2.24 7.94l5.36-.78L10 2.3Z" fill="currentColor"/></svg>';
  var STAR_OFF = '<svg class="st" viewBox="0 0 20 20" width="10" height="10" aria-hidden="true"><path d="M10 2.3l2.4 4.86 5.36.78-3.88 3.78.92 5.34L10 14.53l-4.8 2.53.92-5.34L2.24 7.94l5.36-.78L10 2.3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  function objParticle(name) {
    var c = name.charCodeAt(name.length - 1);
    return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? '을' : '를';
  }
  function topicParticle(name) {
    var c = name.charCodeAt(name.length - 1);
    return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? '은' : '는';
  }

  /* 화면 아래에 잠깐 뜨는 확인 문구 */
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('appToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'appToast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /* 배너 안 선수 퀵 스위처 (내 최애 칩에는 별 표시) */
  function pickSwitchHTML() {
    return '<div class="pick-switch" role="tablist" aria-label="' + T('pick.switchAria') + '">' +
      PLAYERS.map(function (pp) {
        var on = pp.key === state.player;
        var fav = pp.key === myPick;
        return '<button class="psw' + (on ? ' is-active' : '') + (fav ? ' is-fav' : '') + '" type="button" role="tab"' +
          ' aria-selected="' + on + '" data-player="' + pp.key + '"' +
          ' aria-label="' + T('pick.viewAria', { name: pName(pp) }) + (fav ? T('pick.favSuffix') : '') + '">' +
          (fav ? STAR_ON : '') + '<span>' + pName(pp) + '</span></button>';
      }).join('') +
    '</div>';
  }

  function pinBtnHTML(pinned) {
    return '<button class="pin-btn' + (pinned ? ' is-on' : '') + '" type="button" data-pin="1"' +
      ' aria-pressed="' + pinned + '"' +
      ' aria-label="' + T(pinned ? 'pick.pinAriaOn' : 'pick.pinAriaOff') + '"' +
      ' title="' + T(pinned ? 'pick.pinAriaOn' : 'pick.pinAriaOff') + '">' +
      (pinned ? STAR_ON : STAR_OFF) + '<span>' + T(pinned ? 'pick.pinned' : 'pick.pin') + '</span></button>';
  }

  function pinPlayer(key) {
    var p = player(key);
    if (key === myPick) {
      toast(T('pick.toastSame', { name: pName(p), topic: lang() === 'ko' ? topicParticle(p.nameKo) : '' }));
      return;
    }
    myPick = key;
    store.set(MYPICK_KEY, key);
    state.player = key;
    renderAll();
    toast(T('pick.toastNew', { name: pName(p), obj: lang() === 'ko' ? objParticle(p.nameKo) : '' }));
  }

  /* ---------- 방송국·전적 링크 ---------- */
  var PLATFORM = {
    chzzk: { label: 'CHZZK', cls: 'is-chzzk' },
    soop: { label: 'SOOP', cls: 'is-soop' }
  };

  function streamLinksHTML(p, withStats) {
    var out = '';
    (p.streams || []).forEach(function (s) {
      var meta = PLATFORM[s.platform] || { label: s.platform.toUpperCase(), cls: '' };
      out += '<a class="link-chip ' + meta.cls + '" href="' + s.url + '" target="_blank" rel="noopener"' +
        ' title="' + (s.handle || meta.label) + '">' +
        '<i class="dot"></i>' + meta.label + '<em>' + T('links.stream') + '</em></a>';
    });
    if (withStats !== false) {
      out += '<a class="link-chip is-stats" href="' + p.opgg + '" target="_blank" rel="noopener">' + p.statsLabel + '</a>';
    }
    return out;
  }

  function linksHTML(p, extraClass) {
    return '<div class="link-row ' + (extraClass || '') + '">' + streamLinksHTML(p) + '</div>' +
      '<p class="link-note">' + T('links.note') + '</p>';
  }

  /* MY PICK 안의 '지금 게임 중' 줄 — 누르면 양 팀 챔피언 시트가 열립니다. */
  function pickLiveHTML(p) {
    var g = liveGameOf(p.key);
    if (g) {
      return '<button class="pick-live" type="button" data-live="' + p.key + '" aria-label="' + esc(T('ingame.openAria', { name: pName(p) })) + '">' +
        '<i class="pl-dot" aria-hidden="true"></i><b class="pl-text">' + esc(liveBadgeText(g)) + '</b>' +
        '<span class="pl-go">' + T('ingame.detail') + ' ›</span></button>';
    }
    if (p.inGame) {
      return '<span class="pick-live is-plain"><i class="pl-dot" aria-hidden="true"></i><b class="pl-text">' + T('pick.inGame') + '</b></span>';
    }
    return '';
  }

  function renderPick() {
    var host = $('#pickBanner');
    if (!host) return;
    var p = current();
    var pinned = p.key === myPick;
    var fav = player(myPick);
    var r = recent(p, 5);
    var t = tally(r);
    var last = p.matches[0];
    host.innerHTML =
      '<div class="pick-head">' +
        (pinned
          ? '<span class="mypick">' + STAR_ON + T('pick.mypick', { name: pName(p) }) + '</span>'
          : '<span class="mypick is-preview"><i></i>' + T('pick.preview', { name: pName(p) }) + '</span>') +
        '<div class="pick-tools">' +
          pinBtnHTML(pinned) +
          bellBtn(p.key) +
          '<a class="pick-opgg" href="' + p.opgg + '" target="_blank" rel="noopener">' + p.statsLabel + '</a>' +
        '</div>' +
      '</div>' +
      pickSwitchHTML() +
      '<div class="pick-main">' +
        avatar(p) +
        '<div class="pick-id">' +
          '<div class="pick-name">' + pName(p) + '<em>' + pReal(p) + '</em>' + liveBadge(p.key, 'pick-onair') + '</div>' +
          '<div class="pick-tier">' + tierText(p) + '<span class="sep">·</span><span class="lp">' + lpText(p) + '</span><span class="sep">·</span>' + winRateText(p) + '</div>' +
        '</div>' +
        '<div class="pick-form">' +
          '<span class="lb">' + T('pick.recent5') + '</span>' +
          '<span class="dots">' + dotsHTML(r) + '</span>' +
          '<span class="rec">' + wl(t.w, t.l) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="pick-foot">' +
        '<span class="riot">' + p.riotId + '</span>' +
        '<span class="rec">' + T('pick.lastGame', { d: matchDate(last.d), t: last.t, champ: champText(last.champ), kda: last.kda, result: T(last.win ? 'result.win' : 'result.lose') }) + '</span>' +
      '</div>' +
      pickLiveHTML(p) +
      (p.tag ? '<div class="pick-tags">' + tagHTML(p.tag) + '</div>' : '') +
      '<div class="pick-links">' + streamLinksHTML(p) + '</div>';
    if (!pinned) {
      var hint = document.createElement('p');
      hint.className = 'pick-hint';
      hint.innerHTML = T('pick.hint', { fav: pName(fav), name: pName(p), obj: lang() === 'ko' ? objParticle(p.nameKo) : '' });
      host.appendChild(hint);
    }
  }

  /* ---------- 5인 상태 보드 ---------- */
  function renderTiles() {
    var host = $('#statusGrid');
    if (!host) return;
    host.innerHTML = PLAYERS.map(function (p) {
      var active = p.key === state.player;
      var r = recent(p, 5);
      var t = tally(r);
      var last = p.matches[0];
      var bars = r.map(function (m) {
        return '<i class="' + (m.win ? 'w' : 'l') + '" style="height:' + barHeight(m) + 'px"></i>';
      }).join('');
      return '<button class="tile' + (active ? ' is-active' : '') + '" type="button" data-player="' + p.key + '"' +
        ' aria-pressed="' + active + '" aria-label="' + T('pick.viewAria', { name: pName(p) }) + (p.key === myPick ? T('pick.favSuffix') : '') + '">' +
        '<span class="t-head">' +
          '<span class="t-pos">' + p.pos + (p.key === myPick ? '<span class="t-fav">' + STAR_ON + T('pick.pinned') + '</span>' : '') + '</span>' +
          '<span class="t-st"><i class="' + (last.win ? 'w' : 'l') + '"></i>' + relDay(last.d) + '</span>' +
        '</span>' +
        '<span class="t-name">' + pName(p) + '<em>' + pReal(p) + '</em></span>' +
        (liveOf(p.key) ? '<span class="t-onair"><i></i>' + T('live.badge') + '</span>' : '') +
        '<span class="t-tier">' + tierShort(p) + '<span class="t-dot">·</span><b>' + lpText(p) + '</b></span>' +
        (liveGameOf(p.key)
          ? '<span class="t-live is-live" title="' + esc(T('ingame.openAria', { name: pName(p) })) + '"><i></i><span class="t-live-tx">' + esc(liveBadgeText(liveGameOf(p.key))) + '</span></span>'
          : (p.inGame ? '<span class="t-live"><i></i>' + T('pick.inGame') + '</span>' : '')) +
        (p.tag ? '<span class="t-mu">' + tagHTML(p.tag, true) + '</span>' : '') +
        '<span class="bars">' + bars + '</span>' +
        (active ? '<span class="t-foot"><span class="chipk">' + T('pick.recent5') + ' <b>' + wl(t.w, t.l) + '</b></span><span class="chipk">KDA <b>' + t.kda + '</b></span>' +
          (p.key === myPick ? '<span class="chipk chipk-fav">' + STAR_ON + T('pick.pinned') + '</span>' : '') + '</span>' : '') +
      '</button>';
    }).join('');
  }

  /* ---------- 이벤트 · D-DAY ---------- */
  function isoDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  function daysUntil(iso) {
    var t = isoDate(iso);
    if (!t) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((t - today) / 86400000);
  }
  /* 생일은 해마다 돌아오므로 다음 생일까지 남은 날을 셉니다. */
  function nextBirthday(iso) {
    var m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var t = new Date(now.getFullYear(), Number(m[1]) - 1, Number(m[2]));
    if (t < today) t = new Date(now.getFullYear() + 1, Number(m[1]) - 1, Number(m[2]));
    return { days: Math.round((t - today) / 86400000), md: window.I18N.shortDate(t), date: t };
  }
  function ddayText(n) { return n <= 0 ? T('event.today') : T('event.dday', { n: n }); }

  /* 데뷔 기념일: 해마다 돌아오므로 다음 기념일까지 남은 날과 몇 주년인지 함께 셉니다. */
  function nextAnniversary(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return null;
    var born = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var t = new Date(now.getFullYear(), Number(m[2]) - 1, Number(m[3]));
    if (t < today) t = new Date(now.getFullYear() + 1, Number(m[2]) - 1, Number(m[3]));
    return {
      days: Math.round((t - today) / 86400000),
      years: t.getFullYear() - born.getFullYear(),
      date: t,
      md: window.I18N.shortDate(t),
      year: born.getFullYear()
    };
  }

  function eventCardHTML(ev, n) {
    var icon = ev.kind === 'awards' ? '🏆' : (ev.kind === 'vote' ? '🗳️' : '📅');
    return '<a class="ev-card is-' + ev.kind + (ev.tentative ? ' is-est' : '') + '" href="' + esc(ev.url) + '" target="_blank" rel="noopener">' +
      '<span class="ev-top"><span class="ev-kind"><i aria-hidden="true">' + icon + '</i>' + esc(L(ev.title)) +
        (ev.tentative ? '<em class="ev-est-tag">' + T('event.tentative') + '</em>' : '') + '</span>' +
        '<b class="ev-dd">' + ddayText(n) + '</b></span>' +
      '<span class="ev-sub">' + esc(L(ev.sub)) + '</span>' +
      (ev.note ? '<span class="ev-note">' + esc(L(ev.note)) + '</span>' : '') +
      '<span class="ev-go">' + T('event.link') + '</span>' +
    '</a>';
  }

  function birthdayCardHTML(p, b) {
    return '<div class="ev-card is-birthday">' +
      '<span class="ev-top"><span class="ev-kind"><i aria-hidden="true">🎂</i>' + esc(T('event.birthday', { name: pName(p) })) + '</span>' +
        '<b class="ev-dd">' + ddayText(b.days) + '</b></span>' +
      '<span class="ev-sub">' + esc(T('event.birthdaySub', { md: b.md })) + '</span>' +
    '</div>';
  }

  function debutCardHTML(p, a) {
    return '<div class="ev-card is-debut">' +
      '<span class="ev-top"><span class="ev-kind"><i aria-hidden="true">🎉</i>' +
        esc(T('event.debut', { name: pName(p), n: a.years })) + '</span>' +
        '<b class="ev-dd">' + ddayText(a.days) + '</b></span>' +
      '<span class="ev-sub">' + esc(T('event.debutSub', { md: a.md, year: a.year, event: L(p.debutNote) })) + '</span>' +
    '</div>';
  }

  function renderEvents() {
    var host = $('#eventStrip');
    if (!host) return;
    var cards = [];
    (typeof EVENTS !== 'undefined' ? EVENTS : []).forEach(function (ev) {
      var n = daysUntil(ev.date);
      if (n === null || n < 0) return; /* 지난 일정은 자동으로 숨김 */
      cards.push({ days: n, html: eventCardHTML(ev, n) });
    });
    var best = null;
    PLAYERS.forEach(function (p) {
      var b = nextBirthday(p.birthday);
      if (!b) return;
      if (!best || b.days < best.b.days) best = { p: p, b: b };
    });
    if (best) cards.push({ days: best.b.days, html: birthdayCardHTML(best.p, best.b), keep: true });

    /* 다가오는 데뷔 기념일: 가까운 두 명을 함께 보여줍니다. */
    var debuts = [];
    PLAYERS.forEach(function (p) {
      var a = nextAnniversary(p.debut);
      if (!a) return;
      debuts.push({ days: a.days, html: debutCardHTML(p, a) });
    });
    debuts.sort(function (a, b) { return a.days - b.days; });
    debuts.slice(0, 2).forEach(function (c) { cards.push(c); });

    cards.sort(function (a, b) { return a.days - b.days; });
    /* 생일 카드는 이벤트가 늘어도 항상 보이게 하고, 나머지를 날짜 순으로 6장까지 채웁니다. */
    var show = cards.filter(function (c) { return c.keep; }).slice(0, 1);
    cards.forEach(function (c) {
      if (show.length < 6 && show.indexOf(c) < 0) show.push(c);
    });
    show.sort(function (a, b) { return a.days - b.days; });
    host.innerHTML = show.map(function (c) { return c.html; }).join('');
    host.hidden = !show.length;
  }

  /* ---------- 🗳️ 투표 모아보기 (일정&투표 탭의 카드) ----------
   *  홈 상단 버튼·시트는 사용자 요청으로 빼고, 일정&투표 탭(리스트·캘린더)에서
   *  진행 중/마감 투표를 카드 한 장으로 모아 보여줍니다. */
  function voteClosed(v) {
    var t = Date.parse(v.deadline);
    return isNaN(t) ? false : Date.now() > t;
  }
  function openVotes() {
    return (typeof VOTES !== 'undefined' ? VOTES : []).filter(function (v) { return !voteClosed(v); })
      .sort(function (a, b) { return Date.parse(a.deadline) - Date.parse(b.deadline); });
  }
  function voteMd(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v.deadline || ''));
    if (!m) return '';
    var l = lang();
    if (l === 'vi' || l === 'th' || l === 'id' || l === 'es' || l === 'pt') return m[3] + '/' + m[2];
    if (l === 'en') return m[2] + '/' + m[3];
    return m[2] + '.' + m[3];
  }
  function voteDeadlineText(v) {
    var t = /T(\d{2}:\d{2})/.exec(String(v.deadline || ''));
    var md = voteMd(v);
    if (!md) return '';
    return T('vote.deadline', { md: md, time: t ? t[1] : '' });
  }
  function voteItemHTML(v, closed) {
    var dd = closed ? T('vote.closed') : (T('vote.ongoing') + ' ' + ddayText(daysUntil(v.deadline)));
    var rule = [L(v.method), L(v.rule)].filter(function (s) { return !!s; }).join(' · ');
    return '<li class="vote-item ' + (closed ? 'is-closed' : 'is-open') + '">' +
      '<a class="vote-link" href="' + esc(v.url) + '" target="_blank" rel="noopener">' +
        '<span class="vote-top"><span class="vote-event">' + esc(L(v.event)) + '</span>' +
          '<span class="vote-badge' + (closed ? ' is-closed' : '') + '">' + esc(dd) + '</span></span>' +
        '<span class="vote-name">' + esc(L(v.title)) + '</span>' +
        '<span class="vote-cand">' + (v.dk ? '<em class="vote-dk">DK</em>' : '') + esc(L(v.candidate)) +
          '<i class="vote-cand-note">' + esc(L(v.candidateNote)) + '</i></span>' +
        (rule ? '<span class="vote-rule">' + esc(rule) + '</span>' : '') +
        '<span class="vote-foot"><span class="vote-when">' + esc(voteDeadlineText(v)) + '</span>' +
          '<span class="vote-go">' + esc(T(closed ? 'vote.closedCta' : 'vote.cta')) + '</span></span>' +
      '</a></li>';
  }
  /* 🗳️ 투표 보기 한 곳에 진행 중·마감 투표를 그립니다. */
  function renderVotes() {
    var hosts = ['#votesHost'].map(function (sel) { return $(sel); }).filter(Boolean);
    if (!hosts.length) return;
    var all = (typeof VOTES !== 'undefined' ? VOTES : []);
    var open = openVotes();
    var shut = all.filter(voteClosed).sort(function (a, b) { return Date.parse(b.deadline) - Date.parse(a.deadline); });
    var html = '<div class="vote-sec">' +
      '<div class="vote-head"><b>' + esc(T('vote.ongoing')) + '</b><em>' + open.length + '</em>' +
        (open.length ? '<span>' + esc(T('vote.ongoingSub')) + '</span>' : '') + '</div>' +
      (open.length ? '<ul class="vote-list">' + open.map(function (v) { return voteItemHTML(v, false); }).join('') + '</ul>'
                   : '<p class="vote-empty">' + esc(T('vote.empty')) + '</p>') +
      '</div>';
    if (shut.length) {
      html += '<div class="vote-sec is-shut">' +
        '<div class="vote-head"><b>' + esc(T('vote.closedHead')) + '</b><em>' + shut.length + '</em></div>' +
        '<ul class="vote-list">' + shut.map(function (v) { return voteItemHTML(v, true); }).join('') + '</ul></div>';
    }
    html += '<p class="vote-note">' + esc(T('vote.note')) + '</p>';
    hosts.forEach(function (host) { host.innerHTML = html; });
    ['#voteCountBadge', '#vsVoteCount'].forEach(function (sel) {
      var badge = $(sel);
      if (!badge) return;
      badge.hidden = !open.length;
      badge.textContent = open.length;
      badge.setAttribute('aria-label', T('vote.hubAria', { n: open.length }));
    });
  }

  /* ---------- 📅 월간 캘린더 (일정&투표 탭) ----------
   *  기념일은 PLAYERS 의 birthday·debut 에서 그 해 기준으로 계산하고,
   *  경기는 MATCH_LOG + /api/official(다음·최근), 투표는 VOTES(시작일~마감일),
   *  방송은 EVENTS(시상식) · CAL_EXTRA · SOOP 방송국 공지에서 모읍니다. */
  var OFFICIAL_VIEW_KEY = 'dk.signal.officialView';
  /* 보기는 리스트 · 캘린더 · 투표 세 가지입니다. */
  function officialViewName(v) { return v === 'list' || v === 'votes' ? v : 'calendar'; }
  var calState = {
    view: officialViewName(store.get(OFFICIAL_VIEW_KEY, 'calendar')),
    year: null, month: null, sel: null, cat: 'all'
  };
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dateOf(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  function sameDay(a, b) {
    return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function calMd(d) {
    if (lang() === 'ko') return pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
    return window.I18N.shortDate(d);
  }
  function bornLabel(iso) {
    var d = dateOf(iso);
    if (!d) return '';
    var y = d.getFullYear(), mo = d.getMonth() + 1, da = d.getDate();
    if (lang() === 'ko') return y + '년 ' + mo + '월 ' + da + '일';
    if (lang() === 'ja' || lang() === 'zh' || lang() === 'tw') return y + '年' + mo + '月' + da + '日';
    if (lang() === 'vi') return da + '/' + mo + '/' + y;
    return window.I18N.shortDate(d) + ', ' + y;
  }
  function calPlayer(key) {
    for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].key === key) return PLAYERS[i];
    return null;
  }
  function soopOf(p) {
    var st = (p && p.streams) || [];
    for (var i = 0; i < st.length; i++) if (st[i].platform === 'soop') return st[i];
    return null;
  }

  /* 선수 SOOP 공지: data.js 기본값 + /api/notices 가 준 최신 공지 (제목_no 가 큰 쪽) */
  function calNotices() {
    var out = [];
    function merge(item) {
      for (var i = 0; i < out.length; i++) {
        if (out[i].player !== item.player) continue;
        var prev = out[i];
        if (Number(item.titleNo) === Number(prev.titleNo) && prev.title) {
          /* 같은 공지면 번역해 둔 제목(data.js)을 그대로 살립니다. */
          prev.posted = item.posted || prev.posted;
          prev.url = item.url || prev.url;
          return;
        }
        if (Number(item.titleNo || 0) >= Number(prev.titleNo || 0)) out[i] = item;
        return;
      }
      out.push(item);
    }
    (typeof SOOP_NOTICES !== 'undefined' ? SOOP_NOTICES : []).forEach(function (n) {
      merge({ player: n.player, titleNo: n.titleNo, posted: n.posted, date: n.date || n.posted,
        title: n.title, titleName: '', url: n.url });
    });
    (LIVE.notices || []).forEach(function (n) {
      var p = calPlayer(n.player);
      if (!p) return;
      var name = n.titleName || '';
      var m = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(name);
      var day = (m && n.posted) ? n.posted.slice(0, 4) + '-' + pad2(m[1]) + '-' + pad2(m[2]) : (n.posted || '');
      merge({ player: n.player, titleNo: n.titleNo, posted: n.posted, date: day,
        title: null, titleName: name, url: n.url });
    });
    return out;
  }

  /* 투표는 같은 대회·같은 기간을 한 묶음으로 보여줍니다 (인기상·신인상 → 하이원 본선 투표). */
  function calVoteGroups() {
    var groups = {};
    (typeof VOTES !== 'undefined' ? VOTES : []).forEach(function (v) {
      var end = dateOf(v.deadline);
      if (!end) return;
      var start = dateOf(v.start) || end;
      var key = L(v.event) + '|' + ymd(start) + '|' + ymd(end);
      var g = groups[key];
      if (!g) g = groups[key] = { event: v.event, start: start, end: end, items: [], url: v.url, label: v.calLabel || v.event };
      g.items.push(v);
      if (!g.label && v.calLabel) g.label = v.calLabel;
    });
    return Object.keys(groups).map(function (k) { return groups[k]; });
  }

  var calCache = { year: null, lang: null, list: null };
  function invalidateCalendar() { calCache.year = null; calCache.lang = null; calCache.list = null; }

  function calEvents(year) {
    /* 언어가 바뀌면 제목·부제를 다시 만들어야 합니다. */
    if (calCache.year === year && calCache.lang === lang() && calCache.list) return calCache.list;
    var list = [];
    function push(ev) {
      var s = dateOf(ev.start), e = dateOf(ev.end || ev.start);
      if (!s || !e) return;
      ev.startDate = s; ev.endDate = e;
      ev.start = ymd(s); ev.end = ymd(e);
      list.push(ev);
    }

    /* 1) 기념일 — 생일·데뷔일 */
    PLAYERS.forEach(function (p) {
      var b = dateOf(p.birthday);
      if (b) push({
        cat: 'anniv', start: ymd(new Date(year, b.getMonth(), b.getDate())), end: ymd(new Date(year, b.getMonth(), b.getDate())),
        bar: '🎂 ' + pName(p),
        title: T('cal.birthdayTitle', { name: pName(p) }) + ' 🎂',
        sub: T('cal.birthdaySub', { real: pReal(p), date: bornLabel(p.birthday) }),
        emoji: '🎂'
      });
      var db = dateOf(p.debut);
      if (!db || year < db.getFullYear()) return;
      var n = year - db.getFullYear();
      var dd = new Date(year, db.getMonth(), db.getDate());
      push({
        cat: 'anniv', start: ymd(dd), end: ymd(dd),
        bar: T('cal.debutBar', { name: pBarName(p), n: n, o: enOrdinal(n) }),
        barHtml: T('cal.debutBar', { name: barNameHTML(pBarName(p)), n: n, o: enOrdinal(n) }),
        title: T('cal.debutTitle', { name: pName(p), n: n }) + ' 🎉',
        sub: T('cal.debutSub', { real: pReal(p), note: L(p.debutNote) }),
        emoji: '🎉'
      });
    });

    /* 2) 경기 — 저장된 2026 월즈 기록 + 서버 공식 일정 */
    (typeof MATCH_LOG !== 'undefined' ? MATCH_LOG : []).forEach(function (g) {
      /* 같은 날짜의 공식 일정(getSchedule) 경기가 있으면 그 id 를 붙여
       * 캘린더에서 '밴픽 보기'로 경기로그 공식 경기에 바로 갈 수 있게 합니다. */
      var omHit = null;
      var offNow = LIVE.official;
      if (offNow && offNow.ok && Array.isArray(offNow.recent)) {
        omHit = offNow.recent.filter(function (r) {
          return r.startIso && String(r.startIso).slice(0, 10) === String(g.date).slice(0, 10);
        })[0] || null;
      }
      push({
        cat: 'match', start: g.date, end: g.date,
        bar: g.opp + ' ' + g.score.replace(/\s*:\s*/, ':') + (g.win ? ' W' : ' L'),
        title: L(g.league) + ' ' + L(g.round) + ' · DK ' + g.score + ' ' + g.opp,
        sub: T(g.win ? 'cal.gameWin' : 'cal.gameLoss', { opp: g.opp, score: g.score }),
        url: g.url, action: 'cal.matchLink', matchId: omHit ? omHit.id : ''
      });
    });
    var off = LIVE.official;
    var seen = {};
    list.forEach(function (ev) { if (ev.cat === 'match') seen[ev.start] = true; });
    if (off && off.ok && off.next && off.next.startIso) {
      var nd = dateOf(off.next.startIso);
      if (nd) {
        var oppN = (off.next.opponent && (off.next.opponent.code || off.next.opponent.name)) || 'TBD';
        push({
          cat: 'match', start: ymd(nd), end: ymd(nd),
          bar: 'DK vs ' + oppN,
          title: 'DK vs ' + oppN,
          sub: [leagueName(off.next.league), blockText(off.next.block), off.next.time].filter(Boolean).join(' · '),
          url: 'https://lolesports.com/ko-KR/schedule', action: 'cal.matchLink', matchId: off.next.id
        });
        seen[ymd(nd)] = true;
      }
    }
    if (off && off.ok && Array.isArray(off.recent)) {
      off.recent.forEach(function (g) {
        var d = dateOf(g.startIso);
        if (!d || seen[ymd(d)]) return;
        var opp = (g.opponent && (g.opponent.code || g.opponent.name)) || '';
        push({
          cat: 'match', start: ymd(d), end: ymd(d),
          bar: opp + ' ' + String(g.score || '').replace(/\s*:\s*/, ':'),
          title: (leagueName(g.league) || 'LCK') + ' ' + (blockText(g.block) || '') + ' · DK ' + (g.score || '') + ' ' + opp,
          sub: g.win === true ? T('cal.gameWin', { opp: opp, score: g.score || '' })
            : (g.win === false ? T('cal.gameLoss', { opp: opp, score: g.score || '' }) : ''),
          url: 'https://lolesports.com/ko-KR/schedule', action: 'cal.matchLink', matchId: g.id
        });
        seen[ymd(d)] = true;
      });
    }

    /* 3) 투표 — 시작일 ~ 마감일 */
    calVoteGroups().forEach(function (g) {
      var closed = Date.now() > Date.parse(String(g.items[0].deadline));
      var last = new Date(g.end.getFullYear(), g.end.getMonth(), g.end.getDate(), 23, 59);
      var dd = Math.round((startOfDay(last) - startOfDay(new Date())) / 86400000);
      push({
        cat: 'vote', start: ymd(g.start), end: ymd(g.end),
        bar: L(g.label),
        title: T('cal.voteTitle', { event: L(g.event) }),
        sub: sameDay(g.start, g.end)
          ? T('cal.voteSame', { md: voteMd(g.items[0]) })
          : T('cal.voteRange', { from: calMd(g.start), to: calMd(g.end) }),
        url: g.url, action: 'vote.cta',
        closed: closed, dday: closed ? null : dd
      });
    });

    /* 4) 방송 — 시상식 일정 + SOOP 방송국 공지 */
    (typeof EVENTS !== 'undefined' ? EVENTS : []).forEach(function (ev) {
      if (ev.kind !== 'awards') return;
      push({ cat: 'cast', start: ev.date, end: ev.date, bar: L(ev.title),
        title: L(ev.title), sub: L(ev.sub), url: ev.url, action: 'cal.noticeLink' });
    });
    (typeof CAL_EXTRA !== 'undefined' ? CAL_EXTRA : []).forEach(function (ev) {
      push({ cat: 'cast', start: ev.date, end: ev.date, bar: L(ev.title),
        title: L(ev.title), sub: L(ev.sub), url: ev.url, action: 'cal.noticeLink' });
    });
    calNotices().forEach(function (n) {
      var p = calPlayer(n.player);
      if (!p || !n.date) return;
      var st = soopOf(p);
      push({ cat: 'cast', start: n.date, end: n.date,
        bar: pName(p) + ' ' + (n.title ? L(n.title) : n.titleName),
        title: pName(p) + ' ' + (n.title ? L(n.title) : n.titleName),
        sub: T('cal.castSub', { handle: (st && st.handle) || n.soop }),
        url: n.url, action: 'cal.noticeLink' });
    });

    list.sort(function (a, b) {
      if (a.start !== b.start) return a.start < b.start ? -1 : 1;
      return a.cat < b.cat ? -1 : (a.cat > b.cat ? 1 : 0);
    });
    calCache = { year: year, lang: lang(), list: list };
    return list;
  }

  function calInMonth(ev, y, m) {
    var first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    return ev.startDate <= last && ev.endDate >= first;
  }

  /* 한 주 안의 이벤트를 겹치지 않게 레인에 배치합니다 (최대 4줄). */
  function calWeekBars(week, events) {
    var lanes = [];
    var placed = [];
    events.forEach(function (ev) {
      var s = ev.startDate > week[0] ? ev.startDate : week[0];
      var e = ev.endDate < week[6] ? ev.endDate : week[6];
      if (s > e) return;
      var cs = Math.round((startOfDay(s) - startOfDay(week[0])) / 86400000);
      var ce = Math.round((startOfDay(e) - startOfDay(week[0])) / 86400000);
      var lane = -1;
      for (var i = 0; i < lanes.length; i++) {
        var free = true;
        for (var j = 0; j < lanes[i].length; j++) {
          if (!(ce < lanes[i][j][0] || cs > lanes[i][j][1])) { free = false; break; }
        }
        if (free) { lane = i; break; }
      }
      if (lane < 0) { lane = lanes.length; lanes.push([]); }
      if (lane > 3) return; /* 4줄을 넘는 주는 아래 목록에서 */
      lanes[lane].push([cs, ce]);
      placed.push({ ev: ev, cs: cs, ce: ce, lane: lane });
    });
    return { placed: placed, rows: Math.min(4, lanes.length) };
  }

  function renderCalendar() {
    var wrap = $('#officialCalView');
    if (!wrap) return;
    var now = new Date();
    if (calState.year == null || calState.month == null) {
      calState.year = now.getFullYear();
      calState.month = now.getMonth();
    }
    if (!calState.sel) calState.sel = ymd(now);
    var y = calState.year, m = calState.month;
    var first = new Date(y, m, 1);
    var monthEl = $('#calMonth');
    if (monthEl) monthEl.textContent = window.I18N.monthLabel(first);
    var dow = $('#calDow');
    if (dow) {
      dow.innerHTML = window.I18N.wdShort().map(function (w, i) {
        return '<span' + (i === 0 ? ' class="is-sun"' : (i === 6 ? ' class="is-sat"' : '')) + '>' + esc(w) + '</span>';
      }).join('');
    }

    var events = calEvents(y).filter(function (ev) {
      return calInMonth(ev, y, m) && (calState.cat === 'all' || ev.cat === calState.cat);
    });
    var selDate = dateOf(calState.sel) || now;
    var today = startOfDay(now);
    var gridStart = new Date(y, m, 1 - first.getDay());
    var grid = $('#calGrid');
    var html = '';
    for (var w = 0; w < 6; w++) {
      var week = [];
      for (var d = 0; d < 7; d++) week.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7 + d));
      if (w === 5 && week[0].getMonth() !== m) break;
      var bars = calWeekBars(week, events);
      var rows = 1 + bars.rows;
      var cells = week.map(function (day, i) {
        var out = day.getMonth() !== m;
        var cls = 'cal-cell' + (out ? ' is-out' : '') + (sameDay(day, today) ? ' is-today' : '') + (ymd(day) === calState.sel ? ' is-sel' : '');
        var ncls = 'cal-num' + (day.getDay() === 0 ? ' is-sun' : (day.getDay() === 6 ? ' is-sat' : '')) + (out ? ' is-out' : '') + (sameDay(day, today) ? ' is-today' : '');
        return '<button type="button" class="' + cls + '" data-cal-day="' + ymd(day) + '"' +
          ' style="grid-area:1 / ' + (i + 1) + ' / span ' + rows + ' / span 1;"' +
          ' aria-label="' + esc(window.I18N.dayLabel(day)) + '">' +
          '<span class="' + ncls + '">' + day.getDate() + '</span></button>';
      }).join('');
      var barHTML = bars.placed.map(function (b) {
        var openL = b.ev.startDate < week[0];
        var openR = b.ev.endDate > week[6];
        var label = (openL ? '‹ ' : '') + (b.ev.barHtml || esc(b.ev.bar)) +
          (openR ? ' ~' + esc(calMd(b.ev.endDate)) : '');
        return '<span class="cal-bar cat-' + b.ev.cat + '" style="grid-area:' + (2 + b.lane) + ' / ' + (b.cs + 1) + ' / span 1 / span ' + (b.ce - b.cs + 1) + ';">' + label + '</span>';
      }).join('');
      html += '<div class="cal-week">' + cells + barHTML + '</div>';
    }
    if (grid) grid.innerHTML = html;

    var countEl = $('#calCount');
    if (countEl) countEl.textContent = T('cal.foot', { today: window.I18N.dayLabel(now), n: events.length });

    renderCalDay(selDate, events);
    renderCalMonth(y, m, events);
  }

  var CAL_ORDER = { cast: 0, match: 1, vote: 2, anniv: 3 };
  function renderCalDay(selDate, events) {
    var titleEl = $('#calDayTitle'), listEl = $('#calDayList'), countEl = $('#calDayCount');
    if (titleEl) titleEl.textContent = window.I18N.dayLabel(selDate);
    var day = events.filter(function (ev) { return ev.startDate <= selDate && ev.endDate >= selDate; });
    day.sort(function (a, b) { return (CAL_ORDER[a.cat] || 0) - (CAL_ORDER[b.cat] || 0); });
    if (countEl) countEl.textContent = T('cal.dayCount', { n: day.length });
    if (!listEl) return;
    if (!day.length) { listEl.innerHTML = '<li class="cal-empty">' + esc(T('cal.emptyDay')) + '</li>'; return; }
    listEl.innerHTML = day.map(function (ev) {
      var tag = T('cal.' + ev.cat);
      if (ev.cat === 'vote') tag = ev.closed ? T('cal.voteClosed') : (T('cal.voteOngoing') + (ev.dday != null ? ' ' + ddayText(ev.dday) : ''));
      return '<li class="cal-day-item">' +
        '<span class="cal-tag is-' + ev.cat + '">' + esc(tag) + '</span>' +
        '<span class="cal-day-body"><b>' + esc(ev.title) + '</b><span>' + esc(ev.sub) + '</span></span>' +
        (ev.matchId ? '<button class="cal-day-go is-om" type="button" data-om-open="' + esc(ev.matchId) + '">' +
          esc(T('cal.watchMatch')) + '</button>'
          : (ev.url ? '<a class="cal-day-go" href="' + esc(ev.url) + '" target="_blank" rel="noopener">' +
          esc(T(ev.action || (ev.cat === 'cast' ? 'cal.noticeLink' : 'vote.cta'))) + '</a>' : '')) +
      '</li>';
    }).join('');
  }

  function renderCalMonth(y, m, events) {
    var titleEl = $('#calMonthTitle'), listEl = $('#calMonthList');
    if (titleEl) titleEl.textContent = T('cal.monthHead', { month: window.I18N.monthShort(new Date(y, m, 1)) });
    if (!listEl) return;
    if (!events.length) { listEl.innerHTML = '<li class="cal-empty">' + esc(T('cal.emptyMonth')) + '</li>'; return; }
    listEl.innerHTML = events.map(function (ev) {
      var dateText = sameDay(ev.startDate, ev.endDate)
        ? calMd(ev.startDate)
        : (calMd(ev.startDate) + ' ~ ' + calMd(ev.endDate));
      return '<li><button class="cal-row cat-' + ev.cat + '" type="button" data-cal-day="' + ev.start + '">' +
        '<span class="cal-row-date">' + esc(dateText) + '</span>' +
        '<b class="cal-row-title">' + esc(ev.title) + '</b>' +
        '<span class="cal-row-tag">' + esc(T('cal.' + ev.cat)) + '</span>' +
      '</button></li>';
    }).join('');
  }

  function renderOfficialView() {
    var wrap = $('#officialCalView'), list = $('#officialListView'), votes = $('#officialVotesView');
    var showCal = calState.view === 'calendar';
    var showVotes = calState.view === 'votes';
    $$('[data-official-view]').forEach(function (btn) {
      var on = btn.getAttribute('data-official-view') === calState.view;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-selected', String(on));
    });
    if (wrap) wrap.hidden = !showCal;
    if (list) list.hidden = showCal || showVotes;
    if (votes) votes.hidden = !showVotes;
    if (showCal) renderCalendar();
    if (showVotes) renderVotes();
  }

  /* ---------- 인게임 레이더 (Spectator-V5) ---------- */
  function liveGameOf(key) {
    var list = (LIVE.solo && LIVE.solo.liveGames) || [];
    for (var i = 0; i < list.length; i++) if (list[i].playerKey === key) return list[i];
    return null;
  }
  function liveMinutes(g) {
    if (!g || !g.gameStartTime) return 0;
    return Math.max(0, Math.floor((Date.now() - Number(g.gameStartTime)) / 60000));
  }
  function liveBadgeText(g) {
    var champ = (g && (g.champion || (g.me && g.me.champion))) || '';
    var n = liveMinutes(g);
    return champ ? T('ingame.badge', { champ: champText(champ), n: n }) : T('ingame.elapsed', { n: n });
  }
  function champImg(name) {
    if (!name) return '';
    return (typeof DD_CDN !== 'undefined' ? DD_CDN : '') + '/img/champion/' + encodeURIComponent(name) + '.png';
  }
  /* Data Dragon 파일 이름(= CHAMPIONS 키)을 이름표에서 찾습니다.
   * Leaguepedia 밴 데이터는 "Lee Sin" 처럼 표시 이름으로 오기 때문에 필요합니다. */
  var CHAMP_KEYS = null;
  function champKey(name) {
    if (!name) return '';
    if (!CHAMP_KEYS) {
      CHAMP_KEYS = {};
      Object.keys(CHAMPIONS || {}).forEach(function (k) {
        CHAMP_KEYS[normChamp(k)] = k;
        var row = CHAMPIONS[k];
        if (!row) return;
        if (row[0]) CHAMP_KEYS[normChamp(row[0])] = k;
        if (row[1]) CHAMP_KEYS[normChamp(row[1])] = k;
      });
    }
    return CHAMP_KEYS[normChamp(name)] || name;
  }
  function spellImg(name) {
    if (!name) return '';
    var file = (typeof SPELL_IMG !== 'undefined' && SPELL_IMG[name]) ? SPELL_IMG[name] : name;
    var label = (typeof SPELLS !== 'undefined' && SPELLS[name]) ? (SPELLS[name][lang() === 'ko' ? 0 : (lang() === 'ja' ? 2 : ((lang() === 'zh' || lang() === 'tw') ? 3 : 1))] || name) : name;
    return '<img class="lg-spell-ico" src="' + (typeof DD_CDN !== 'undefined' ? DD_CDN : '') + '/img/spell/' + encodeURIComponent(file) + '.png" alt="' + esc(label) + '" title="' + esc(label) + '" loading="lazy">';
  }
  function playerNameByKey(key) {
    for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].key === key) return pName(PLAYERS[i]);
    return key || '';
  }
  function proLabel(pro) {
    if (!pro) return '';
    if (typeof pro === 'string') return pro;
    var name = lang() === 'ko' ? (pro.nameKo || pro.name) : pro.name;
    return pro.team ? name + ' (' + pro.team + ')' : name;
  }

  /* 같은 판 매치업 배지 — 내전/듀오는 DK 5인끼리, with/vs 는 타 팀 프로 선수 */
  function tagHTML(tag, compact) {
    if (!tag) return '';
    var a, b;
    if (tag.type === 'duo' || tag.type === 'rival') {
      var ks = tag.keys || (tag.key ? [tag.key] : []);
      a = playerNameByKey(ks[0]);
      b = playerNameByKey(ks[1]);
      if (!b && tag.nameKo) b = tag.nameKo;
      if (!a && tag.nameKo) a = tag.nameKo;
      if (!compact) {
        return '<span class="mu mu-' + tag.type + '">' +
          T(tag.type === 'duo' ? 'mu.duo' : 'mu.rival', { a: a, b: b }) + '</span>';
      }
      return '<span class="mu mu-' + tag.type + '">' +
        (tag.type === 'duo' ? '🤝 ' + a + '·' + b : '🔥 ' + a + ' vs ' + b) + '</span>';
    }
    if (tag.type === 'with' || tag.type === 'vs') {
      var pro = (tag.pro && typeof tag.pro === 'object') ? tag.pro : { slug: tag.pro, name: tag.name, nameKo: tag.nameKo, team: tag.team };
      if (!compact) return '<span class="mu mu-' + tag.type + '">' + T(tag.type === 'with' ? 'mu.with' : 'mu.vs', { pro: proLabel(pro) }) + '</span>';
      return '<span class="mu mu-' + tag.type + '">' + (tag.type === 'with' ? '🤝 with ' : '⚔️ vs ') + esc(lang() === 'ko' ? (pro.nameKo || pro.name) : pro.name) + '</span>';
    }
    return '';
  }

  function matchTagsHTML(matchId) {
    var box = (LIVE.solo && LIVE.solo.matchups) || {};
    var list = (matchId && box[matchId]) || [];
    if (!list.length) return '';
    var seen = {};
    var out = [];
    list.forEach(function (t) {
      var sig = t.type + ':' + (t.keys ? t.keys.slice().sort().join('-') : (t.pro ? t.pro.slug : ''));
      if (seen[sig]) return;
      seen[sig] = 1;
      out.push(tagHTML(t, true));
    });
    return '<span class="mu-row">' + out.slice(0, 2).join('') + '</span>';
  }

  /* 인게임 시트(모달) */
  var lgOpenKey = null;
  function lgTeamHTML(team, ally) {
    var rows = (team.players || []).map(function (pl) {
      var cls = 'lg-p';
      var who = '';
      if (pl.who && pl.who.kind === 'dk') {
        cls += ' is-dk' + (pl.me ? ' is-me' : '');
        who = 'DK ' + playerNameByKey(pl.who.key);
      } else if (pl.who && pl.who.kind === 'pro') {
        cls += ' is-pro';
        who = (pl.who.team ? pl.who.team + ' ' : '') + (lang() === 'ko' ? (pl.who.nameKo || pl.who.name) : pl.who.name);
      }
      return '<li class="' + cls + '">' +
        (pl.champion ? '<img class="lg-ch" src="' + champImg(pl.champion) + '" alt="' + esc(champText(pl.champion)) + '" loading="lazy">' : '<span class="lg-ch"></span>') +
        '<span class="lg-pc"><b>' + esc(champText(pl.champion)) + '</b>' +
          '<span class="lg-sp">' + spellImg(pl.spell1) + spellImg(pl.spell2) + '</span></span>' +
        (who ? '<span class="lg-who">' + esc(who) + '</span>' : '') +
      '</li>';
    }).join('');
    return '<section class="lg-team ' + (ally ? 'is-ally' : 'is-enemy') + ' is-' + (team.side === 'blue' ? 'blue' : (team.side === 'red' ? 'red' : 'other')) + '">' +
      '<div class="lg-team-head"><span>' + T(ally ? 'ingame.ally' : 'ingame.enemy') + '</span><em>' + (team.side === 'blue' ? 'BLUE' : (team.side === 'red' ? 'RED' : 'TEAM')) + '</em></div>' +
      '<ul>' + rows + '</ul>' +
    '</section>';
  }

  function openLive(key) {
    var host = $('#lgModal');
    var body = $('#lgBody');
    if (!host || !body) return;
    var g = liveGameOf(key);
    if (!g) { closeLive(); return; }
    lgOpenKey = key;
    var p = player(key);
    $('#lgTitle').textContent = '🔴 ' + T('ingame.title') + ' · ' + pName(p);
    var myTeam = (g.me && g.me.teamId) || 100;
    var ally = (g.teams || []).filter(function (t) { return t.teamId === myTeam; })[0];
    var foes = (g.teams || []).filter(function (t) { return t.teamId !== myTeam; });
    var tags = (g.tags || []).map(function (t) { return tagHTML(t); }).join('');
    body.innerHTML =
      '<p class="lg-live"><i class="lg-dot" aria-hidden="true"></i><b>' + esc(T('ingame.queue.' + (g.queueKey || 'other'))) + '</b><span>' + esc(T('ingame.elapsed', { n: liveMinutes(g) })) + '</span></p>' +
      (tags ? '<div class="lg-tags">' + tags + '</div>' : '') +
      '<div class="lg-grid">' +
        (ally ? lgTeamHTML(ally, true) : '') +
        foes.map(function (t) { return lgTeamHTML(t, false); }).join('') +
      '</div>' +
      '<p class="lg-note">' + esc(T('ingame.note')) + '</p>';
    host.hidden = false;
    document.body.classList.add('is-sheet');
    var close = $('#lgClose');
    if (close) close.focus();
  }

  function closeLive() {
    var host = $('#lgModal');
    if (!host) return;
    host.hidden = true;
    lgOpenKey = null;
    document.body.classList.remove('is-sheet');
  }

  /* ---------- 최근 5경기 하이라이트 ---------- */
  function renderHighlight() {
    var host = $('#highlightCard');
    if (!host) return;
    var p = current();
    var r = recent(p, 5);
    var t = tally(r);
    var games = r.map(function (m) {
      return '<div class="g ' + (m.win ? 'w' : 'l') + '">' +
        '<div class="gc">' + champText(m.champ) + '</div>' +
        '<div class="gk">' + m.kda + '</div>' +
        '<div class="gr">' + (m.win ? T('result.w') : T('result.l')) + '</div>' +
      '</div>';
    }).join('');
    var first = r[r.length - 1];
    var last = r[0];
    host.innerHTML =
      '<div class="hl-head">' +
        '<span class="hl-who">' + pName(p) + '<em>' + pReal(p) + ' · ' + pPos(p) + '</em></span>' +
        '<span class="hl-tag">' + t.w + 'W ' + t.l + 'L</span>' +
      '</div>' +
      '<div class="hl-row">' +
        '<div class="big"><span class="w">' + t.w + '</span><span class="dash">–</span><span class="l">' + t.l + '</span></div>' +
        '<div class="hl-brate"><div class="n">' + t.rate + '<small>%</small></div><div class="t">' + T('hl.last5Rate') + '</div></div>' +
      '</div>' +
      '<div class="hl-kda">' +
        '<span class="k"><b>' + t.kda + '</b> ' + T('hl.kda') + '</span>' +
        '<span class="k">' + t.k + ' / ' + t.d + ' / ' + t.a + '</span>' +
        '<span class="k">' + T('hl.total', { n: r.length }) + '</span>' +
      '</div>' +
      '<div class="games">' + games + '</div>' +
      '<div class="hl-foot"><span>' + matchDate(first.d) + ' ~ ' + matchDate(last.d) + ' · ' + p.riotId + '</span>' +
        '<a href="' + p.opgg + '" target="_blank" rel="noopener">' + T('hl.allStats') + '</a></div>';
  }

  /* ---------- 영상 탭 (생중계 · 방송국 · 하이라이트 · 다시보기) ---------- */
  function ytWatch(id) { return 'https://www.youtube.com/watch?v=' + id; }
  function ytThumb(id) { return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; }

  /* 공식 채널 4곳 (2026-11-27 확인) */
  var VIDEO_CHANNELS = [
    { url: CHANNELS.lckChzzk, name: 'CHZZK', cls: 'is-chzzk', sub: 'video.chanLckChzzk', aria: 'video.chzzkAria' },
    { url: CHANNELS.lckSoop, name: 'SOOP', cls: 'is-soop', sub: 'video.chanLckSoop', aria: 'video.soopAria' },
    { url: CHANNELS.lckYoutube, name: 'YouTube', cls: 'is-youtube', sub: 'video.chanLckYt', aria: 'video.youtubeAria' },
    { url: CHANNELS.dkYoutube, name: 'YouTube', cls: 'is-youtube', sub: 'video.chanDkYt', aria: 'video.dkYtAria' }
  ];

  function renderVideoChannels() {
    var host = $('#videoChannels');
    if (host) {
      host.innerHTML = VIDEO_CHANNELS.map(function (c) {
        return '<a class="chan ' + c.cls + '" href="' + c.url + '" target="_blank" rel="noopener" aria-label="' + esc(T(c.aria)) + '">' +
          '<span class="chan-top"><i class="dot"></i>' + c.name + '<span class="chan-go" aria-hidden="true">↗</span></span>' +
          '<span class="chan-sub">' + esc(T(c.sub)) + '</span>' +
        '</a>';
      }).join('');
    }

    var data = LIVE.official;
    var line = $('#videoNextLine');
    if (line) {
      var next = data && data.ok ? data.next : null;
      if (next) {
        var opp = (next.opponent && (next.opponent.code || next.opponent.name)) || 'TBD';
        line.className = 'next-line';
        line.innerHTML = '<i class="nl-dot" aria-hidden="true"></i><b>' + T('official.next') + '</b> DK vs ' + esc(opp) +
          '<span class="nl-sub">' + esc(eventDate(next)) + ' ' + esc(next.time || '') + '</span>';
      } else {
        line.className = 'next-line is-empty';
        line.innerHTML = '<b>' + T('official.next') + '</b><span class="nl-sub">' + T('video.noNext') + '</span>';
      }
    }

    /* 방송 중인 선수는 위 LIVE NOW 히어로(#liveHero)가 맡습니다. */
  }

  /* ---------- ③ LIVE NOW · 선수 방송 히어로 ----------
   * /api/live 가 방송 중이라고 하면 방제·썬네일·시청자·경과 시간을 크게 보여 주고,
   * 전원 오프라인이면 같은 자리에 컴팩트한 오프라인 바를 둡니다. */
  function fmtCount(n) {
    var v = Number(n) || 0;
    var loc = lang() === 'ko' ? 'ko-KR' : (lang() === 'ja' ? 'ja-JP' : (lang() === 'zh' ? 'zh-CN' : (lang() === 'tw' ? 'zh-TW' : (lang() === 'es' ? 'es-ES' : (lang() === 'pt' ? 'pt-BR' : (lang() === 'th' ? 'th-TH' : (lang() === 'id' ? 'id-ID' : 'en-US')))))));
    try { return v.toLocaleString(loc); } catch (e) { return String(v); }
  }

  /* 방송 시작 후 경과 시간 (01:42:08 / 42:08) */
  function elapsedText(iso) {
    var t = Date.parse(iso || '');
    if (!iso || isNaN(t)) return '';
    var s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (h > 0 ? p(h) + ':' : '') + p(m) + ':' + p(sec);
  }

  /* 플랫폼이 주는 방송 카테고리 이름 — 널리 쓰이는 것만 4개 국어로, 나머지는 준 값 그대로 */
  var LIVE_CATS = [
    { re: /리그\s*오브\s*레전드|league\s*of\s*legends|^lol$|英雄联盟|リーグ・オブ・レジェンド/i,
      t: { ko: '리그 오브 레전드', en: 'League of Legends', ja: 'リーグ・オブ・レジェンド', zh: '英雄联盟' } }
  ];
  function liveCatText(raw) {
    var s = String(raw || '');
    if (!s) return '';
    for (var i = 0; i < LIVE_CATS.length; i++) {
      if (LIVE_CATS[i].re.test(s)) return L(LIVE_CATS[i].t);
    }
    return s;
  }

  function platformText(platform) {
    if (platform === 'chzzk') return T('video.chzzk');
    if (platform === 'soop') return T('video.soop');
    return String(platform || '').toUpperCase();
  }

  function stationChipHTML(p, cls) {
    var s = (p.streams || [])[0];
    if (!s) return '';
    var label = platformText(s.platform);
    var meta = PLATFORM[s.platform] || { cls: '' };
    return '<a class="lh-chip ' + (cls != null ? cls : meta.cls) + '" href="' + esc(s.url) + '" target="_blank" rel="noopener"' +
      ' aria-label="' + esc(T('video.liveOpenAria', { name: pName(p), platform: label })) + '">' +
      '<i class="lh-dot"></i>' + esc(pName(p)) + '<em>' + esc(label) + '</em></a>';
  }

  function renderLiveHero() {
    var host = $('#liveHeroBody');
    if (!host) return;
    var timer = $('#liveHeroTimer');
    var rows = PLAYERS.map(function (p) { return { p: p, lv: liveOf(p.key) }; });
    var onAir = rows.filter(function (r) { return r.lv; })
      .sort(function (a, b) { return (Number(b.lv.viewers) || 0) - (Number(a.lv.viewers) || 0); });
    if (timer) timer.textContent = T(onAir.length ? 'video.liveCheckLive' : 'video.liveCheckOff');
    var hero = $('#liveHero');
    if (hero) hero.classList.toggle('is-off', !onAir.length);

    if (!onAir.length) {
      host.innerHTML =
        '<div class="lh-offbar"><i class="lh-dot" aria-hidden="true"></i>' +
          '<b>' + esc(T('video.liveAllOff')) + '</b>' +
          '<span>· ' + esc(T('video.liveCheckOff')) + '</span>' +
        '</div>' +
        '<div class="lh-chips" role="group" aria-label="' + esc(T('video.stationsAria')) + '">' +
          rows.map(function (r) { return stationChipHTML(r.p); }).join('') +
        '</div>';
      return;
    }

    var top = onAir[0];
    var lv = top.lv;
    var others = rows.filter(function (r) { return !r.lv; });
    var extraLive = onAir.slice(1);
    var title = lv.title || (pName(top.p) + ' ' + T('live.badge'));
    var metaParts = [esc(pName(top.p))];
    if (lv.category) metaParts.push(esc(liveCatText(lv.category)));
    if (lv.startedAt && elapsedText(lv.startedAt)) {
      metaParts.push('<span id="lhElapsed" data-start="' + esc(lv.startedAt) + '">' + esc(elapsedText(lv.startedAt)) + '</span>');
    }
    var meta = metaParts.join(' · ');
    var foot = others.map(function (r) {
      return '<i>' + esc(pName(r.p)) + '</i>';
    }).join('') + extraLive.map(function (r) {
      return '<i class="is-live">● ' + esc(pName(r.p)) + '</i>';
    }).join('');
    host.innerHTML =
      '<div class="lh-card">' +
        '<a class="lh-thumb" href="' + esc(lv.url || '#') + '" target="_blank" rel="noopener"' +
          ' aria-label="' + esc(T('video.liveOpenAria', { name: pName(top.p), platform: platformText(lv.platform) })) + '">' +
          (lv.thumb ? '<img src="' + esc(lv.thumb) + '" alt="" loading="lazy">' : '') +
          '<span class="lh-scrim" aria-hidden="true"></span>' +
          '<span class="lh-live">' + esc(T('live.badge')) + '</span>' +
          '<span class="lh-plat is-' + esc(lv.platform || '') + '">' + esc(platformText(lv.platform)) + '</span>' +
          '<span class="lh-cap"><b>' + esc(title) + '</b>' +
            '<span>' + meta +
              (lv.viewers ? ' <i class="lh-vdot" aria-hidden="true">●</i> ' + esc(T('video.liveViewers', { n: fmtCount(lv.viewers) })) : '') +
            '</span>' +
          '</span>' +
        '</a>' +
        '<div class="lh-foot">' +
          (foot ? '<span class="lh-off">' + esc(T('video.liveOffline')) + ' ' + foot + '</span>' : '') +
          '<a class="lh-go" href="' + esc(lv.url || '#') + '" target="_blank" rel="noopener">' +
            esc(T('video.liveGo')) + ' ↗</a>' +
        '</div>' +
      '</div>';
    var img = host.querySelector('.lh-thumb img');
    if (img) {
      img.addEventListener('error', function () {
        if (img.parentNode) img.parentNode.removeChild(img);
      });
    }
  }

  function renderVideoStations() {
    var host = $('#videoStations');
    if (!host) return;
    host.innerHTML = PLAYERS.map(function (p) {
      var lv = liveOf(p.key);
      var handles = (p.streams || []).map(function (s) { return s.handle; }).filter(Boolean).join(' · ');
      var chips = (p.streams || []).map(function (s) {
        var meta = PLATFORM[s.platform] || { label: String(s.platform || '').toUpperCase(), cls: '' };
        var label = s.platform === 'chzzk' ? T('video.chzzk') : (s.platform === 'soop' ? T('video.soop') : meta.label);
        var on = lv && lv.platform === s.platform ? ' is-onair' : '';
        return '<a class="link-chip ' + meta.cls + on + '" href="' + s.url + '" target="_blank" rel="noopener"' +
          ' title="' + esc(s.handle || label) + '"' +
          ' aria-label="' + esc(T('video.stationAria', { name: pName(p), platform: label })) + '">' +
          '<i class="dot"></i>' + label + '<em>' + (on ? T('live.stream') : T('links.stream')) + '</em></a>';
      }).join('');
      return '<li class="st-row' + (lv ? ' is-onair' : '') + '">' +
        '<span class="st-head">' +
          '<span class="st-av" aria-hidden="true">' + pAvatar(p) + '</span>' +
          '<span class="st-id"><b>' + pName(p) + '<em>' + pReal(p) + '</em><span class="st-pos">' + p.pos + '</span></b>' +
            (lv && lv.title ? '<span class="st-title">' + esc(lv.title) + '</span>' : '') +
            '<span class="st-handle">' + esc(handles || p.riotId) + '</span>' +
          '</span>' +
          (lv ? '<span class="onair st-onair"><i></i>' + T('live.badge') + '</span>' : '') +
        '</span>' +
        '<span class="st-links">' + (chips || '<span class="st-none">' + T('links.noStream') + '</span>') + '</span>' +
      '</li>';
    }).join('');
  }

  /* ---------- 영상 아카이브 (5인 + 디플러스 기아 공식) ----------
   * data.js 의 PLAYERS[].highlights(5인 33편) + DK_VIDEOS(DK 공식 12편) 를 한 줄로 폅니다.
   * 검색 · 챔피언 칩 · 종류 칩 · 선수 칩으로 걸러요. */
  function archiveItems() {
    var out = [];
    PLAYERS.forEach(function (p) {
      (p.highlights || []).forEach(function (v) { out.push({ p: p, v: v }); });
    });
    (typeof DK_VIDEOS !== 'undefined' ? DK_VIDEOS : []).forEach(function (v) {
      out.push({ p: null, v: v });
    });
    /* 내가 붙여넣은 링크는 맨 앞에 (최근 추가 순) */
    linkEntries().forEach(function (e) { out.unshift(e); });
    return out;
  }

  function videoCat(entry) { return entry.v.cat || 'highlight'; }
  function videoChamps(entry) { return entry.v.champ || []; }
  /* 선수 필터에 쓰는 키: 5인은 자기 키, DK 공식 영상은 v.player(있으면) 아니면 'dk' */
  function videoWhoKey(entry) {
    if (entry.p) return entry.p.key;
    return entry.v.player || 'dk';
  }

  function tagText(key) {
    var t = typeof HL_TAGS !== 'undefined' ? HL_TAGS[key] : null;
    if (!t) return key;
    return pickLang(t) || key;
  }
  function catText(key) {
    var c = typeof HL_CATS !== 'undefined' ? HL_CATS[key] : null;
    if (!c) return key;
    return pickLang(c) || key;
  }
  function whoText(entry) {
    if (entry.p) return pName(entry.p);
    if (entry.v.mine) return T('mine.srcLabel');
    if (entry.v.player) {
      for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].key === entry.v.player) return pName(PLAYERS[i]);
    }
    return T('video.teamName');
  }

  /* 추천 챔피언 칩: 아카이브에 실제로 태그된 챔피언만, 많이 나온 순서로 */
  function champKeys() {
    var count = {}, out = [];
    archiveItems().forEach(function (e) {
      videoChamps(e).forEach(function (k) {
        if (!count[k]) { count[k] = 0; out.push(k); }
        count[k]++;
      });
    });
    /* 추천 6종은 시안 순서 그대로 앞에, 나머지는 편수 많은 순서로 */
    var order = ['ambessa', 'gnar', 'azir', 'kaisa', 'leblanc', 'jayce'];
    out.sort(function (a, b) {
      var ai = order.indexOf(a), bi = order.indexOf(b);
      if (ai > -1 || bi > -1) {
        if (ai < 0) return 1;
        if (bi < 0) return -1;
        return ai - bi;
      }
      if (count[b] !== count[a]) return count[b] - count[a];
      return a < b ? -1 : (a > b ? 1 : 0);
    });
    return out;
  }

  function renderVideoFilters() {
    var host = $('#videoFilters');
    if (!host) return;
    var cur = state.videoPlayer;
    var chips = [{ key: 'all', label: T('video.filterAll') }].concat(PLAYERS.map(function (p) {
      return { key: p.key, label: pName(p) };
    }));
    host.innerHTML = chips.map(function (c) {
      var on = c.key === cur;
      return '<button class="chip' + (on ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' + on + '"' +
        ' data-video-filter="' + c.key + '">' + esc(c.label) + '</button>';
    }).join('');
  }

  function renderVideoCats() {
    var host = $('#videoCats');
    if (!host) return;
    var cats = Object.keys(typeof HL_CATS !== 'undefined' ? HL_CATS : { highlight: 1 });
    var all = '<button class="chip' + (state.videoCat === 'all' ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' +
      (state.videoCat === 'all') + '" data-video-cat="all">' + esc(T('video.filterAll')) + '</button>';
    var favOn = state.videoCat === 'fav';
    var fav = '<button class="chip is-fav' + (favOn ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' + favOn +
      '" data-video-cat="fav">' + esc(T('video.favChip', { n: favs.length })) + '</button>';
    /* 내 링크가 있을 때만 '내 링크' 칩 (기본 상태의 칩 목록·검증을 건드리지 않도록) */
    var mineChip = links.length
      ? '<button class="chip' + (state.videoCat === 'mine' ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' +
        (state.videoCat === 'mine') + '" data-video-cat="mine">' + esc(T('mine.srcLabel')) + ' ' + links.length + '</button>'
      : '';
    host.innerHTML = all + fav + mineChip + cats.map(function (key) {
      var on = key === state.videoCat;
      return '<button class="chip' + (on ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' + on + '"' +
        ' data-video-cat="' + key + '">' + esc(catText(key)) + '</button>';
    }).join('');
  }

  function renderVideoChamps() {
    var host = $('#videoChampChips');
    if (!host) return;
    host.innerHTML = champKeys().map(function (key) {
      var on = key === state.videoChamp;
      return '<button class="tag-chip' + (on ? ' is-active' : '') + '" type="button" aria-pressed="' + on + '"' +
        ' data-video-champ="' + key + '">#' + esc(tagText(key)) + '</button>';
    }).join('');
  }

  /* 검색은 화면 언어와 상관없이 4개 국어 제목·포인트·태그·선수 이름·챔피언 이름을 모두 훑습니다. */
  function hlHaystack(entry) {
    var p = entry.p, v = entry.v;
    var out = [v.channel, v.year, v.len, catText(videoCat(entry))];
    if (p) out.push(p.key, p.nameKo, p.nameEn, p.nameIntl, p.nameJa, p.nameZh, p.real, p.pos);
    else out.push('dplus kia', 'dk', T('video.teamName'));
    [v.match, v.event, v.point].forEach(function (o) {
      if (!o) return;
      Object.keys(o).forEach(function (k) { out.push(o[k]); });
    });
    (v.tags || []).concat(videoChamps(entry)).forEach(function (key) {
      out.push(key);
      var t = typeof HL_TAGS !== 'undefined' ? HL_TAGS[key] : null;
      if (t) Object.keys(t).forEach(function (k) { out.push(t[k]); });
    });
    return out.join(' ').toLowerCase();
  }

  /* 검색어: 앞의 # 은 떼고, 띄어쓰기 무관하게도 찾습니다 (한국어 IME 조합 중에도 안전) */
  function hlTokens(query) {
    return String(query == null ? '' : query)
      .toLowerCase()
      .split(/\s+/)
      .map(function (w) { return w.replace(/^#+/, '').trim(); })
      .filter(function (w) { return w.length > 0; });
  }

  function hlMatches(entry, query) {
    var tokens = hlTokens(query);
    if (!tokens.length) return true;
    var hay = hlHaystack(entry);
    var flat = hay.replace(/\s+/g, '');
    return tokens.every(function (w) {
      return hay.indexOf(w) > -1 || flat.indexOf(w.replace(/\s+/g, '')) > -1;
    });
  }

  function videoItemHTML(entry) {
    var v = entry.v;
    var champs = videoChamps(entry);
    var champTags = champs.map(function (key) {
      return '<span class="vc-tag is-champ">' + esc(tagText(key)) + '</span>';
    }).join('');
    var team = v.team
      ? '<span class="vc-team' + (v.team === 'DK' ? ' is-now' : '') + '">' + esc(v.team) + '</span>'
      : '';
    var who = whoText(entry);
    var champLine = champs.map(tagText).join(' · ');
    var title = L(v.point) || L(v.match);
    var on = isFav(v.id);
    var inMine = inTargetFolder(v.id);
    return '<li class="vc-row">' +
      '<button class="vc-item" type="button" data-play="' + esc(v.id) + '" data-title="' + esc(title) + '">' +
        '<span class="vc-thumb"><img loading="lazy" src="' + ytThumb(v.id) + '" alt="" width="168" height="94">' +
          '<i class="vc-play" aria-hidden="true">▶</i>' + (v.len ? '<i class="vc-len">' + esc(v.len) + '</i>' : '') + '</span>' +
        '<span class="vc-body">' +
          '<span class="vc-who' + (entry.p ? '' : ' is-team') + '">' + esc(who) +
            (entry.p ? '<i>' + esc(entry.p.pos) + '</i>' : '<i>OFFICIAL</i>') +
            (champLine ? '<b class="vc-champ">' + esc(champLine) + '</b>' : '') + '</span>' +
          '<b class="vc-title">' + esc(title) + '</b>' +
          '<span class="vc-meta">' + esc(L(v.match)) + ' · ' + esc(L(v.event)) + '</span>' +
          '<span class="vc-tags"><span class="vc-cat vc-cat-' + esc(videoCat(entry)) + '">' + esc(catText(videoCat(entry))) + '</span>' +
            champTags + team + '<span class="vc-yr">' + esc(v.year) + '</span></span>' +
        '</span>' +
      '</button>' +
      '<button class="vc-add' + (inMine ? ' is-on' : '') + '" type="button" data-add="' + esc(v.id) + '"' +
        ' aria-pressed="' + inMine + '" aria-label="' + esc(T(inMine ? 'mine.added' : 'mine.add')) + '">' +
        '<i aria-hidden="true">' + (inMine ? '✓' : '＋') + '</i>' + esc(T(inMine ? 'mine.added' : 'mine.add')) + '</button>' +
      '<button class="vc-fav' + (on ? ' is-on' : '') + '" type="button" data-fav="' + esc(v.id) + '"' +
        ' aria-pressed="' + on + '" aria-label="' + esc(T(on ? 'video.favRemove' : 'video.favAdd')) + '"' +
        ' title="' + esc(T(on ? 'video.favRemove' : 'video.favAdd')) + '">' + (on ? '★' : '☆') + '</button>' +
    '</li>';
  }

  /* 묶음 머리: 선수 · 지난 소속 → DK 2027 · 편수 */
  function hlGroupHead(p, n) {
    var teams = [];
    (p.highlights || []).forEach(function (h) {
      if (h.team && h.team !== 'DK' && teams.indexOf(h.team) < 0) teams.push(h.team);
    });
    var arc = teams.length ? teams.join(' · ') + ' → DK 2027' : 'DK 2027';
    return '<li class="hl-group">' +
      '<span class="hl-g-name">' + pName(p) + '<i>' + p.pos + '</i></span>' +
      '<span class="hl-g-arc">' + esc(arc) + '</span>' +
      '<span class="hl-g-n">' + esc(T('video.count', { n: n })) + '</span>' +
    '</li>';
  }

  function dkGroupHead(n) {
    return '<li class="hl-group">' +
      '<span class="hl-g-name">' + esc(T('video.teamName')) + '<i>OFFICIAL</i></span>' +
      '<span class="hl-g-arc">' + esc(T('video.teamGroupNote')) + '</span>' +
      '<span class="hl-g-n">' + esc(T('video.count', { n: n })) + '</span>' +
    '</li>';
  }

  function mineGroupHead(n) {
    return '<li class="hl-group">' +
      '<span class="hl-g-name">' + esc(T('mine.srcLabel')) + '<i>MY LINK</i></span>' +
      '<span class="hl-g-arc">' + esc(T('mine.title')) + '</span>' +
      '<span class="hl-g-n">' + esc(T('video.count', { n: n })) + '</span>' +
    '</li>';
  }

  function byYearSort(a, b) { return b.v.year - a.v.year; }
  function playerRank(e) {
    var order = PLAYERS.map(function (p) { return p.key; }).concat(['dk']);
    var i = order.indexOf(videoWhoKey(e));
    return i < 0 ? order.length : i;
  }

  /* 지금 고른 필터·검색을 그대로 적용한 목록 — 화면과 연속 재생 대기열이 같은 순서를 씁니다. */
  function videoListEntries() {
    var list = archiveItems();
    /* 나만의 재생목록 폴더를 보고 있으면 그 폴더 순서대로 */
    var folderView = mine.active !== 'all';
    if (folderView) {
      var ids = playlistIds();
      var rank = {};
      ids.forEach(function (id, i) { rank[id] = i; });
      list = list.filter(function (e) { return ids.indexOf(e.v.id) > -1; })
        .sort(function (a, b) { return rank[a.v.id] - rank[b.v.id]; });
    }
    if (state.videoPlayer !== 'all') {
      list = list.filter(function (e) { return videoWhoKey(e) === state.videoPlayer; });
    }
    if (state.videoCat === 'fav') {
      /* 찜 목록은 찜한 순서 그대로 */
      var rank = {};
      favs.forEach(function (id, i) { rank[id] = i; });
      list = list.filter(function (e) { return isFav(e.v.id); })
        .sort(function (a, b) { return rank[a.v.id] - rank[b.v.id]; });
    } else if (state.videoCat !== 'all') {
      list = list.filter(function (e) { return videoCat(e) === state.videoCat; });
    }
    if (state.videoChamp !== 'all') {
      list = list.filter(function (e) { return videoChamps(e).indexOf(state.videoChamp) > -1; });
    }
    var q = state.videoQuery;
    if (q) list = list.filter(function (e) { return hlMatches(e, q); });
    return list;
  }

  function renderVideoList() {
    var host = $('#videoList');
    if (!host) return;
    var list = videoListEntries();
    var q = state.videoQuery;
    var html = '';

    if (state.videoCat === 'fav') {
      /* 찜 목록은 묶음 없이 찜한 순서대로 */
      html = list.map(videoItemHTML).join('');
    } else if (mine.active !== 'all') {
      /* 나만의 재생목록 폴더: 담은 순서 그대로 한 줄기로 */
      html = list.map(videoItemHTML).join('');
    } else if (state.videoSort === 'recent') {
      list = list.slice().sort(function (a, b) {
        if (b.v.year !== a.v.year) return b.v.year - a.v.year;
        return playerRank(a) - playerRank(b);
      });
      html = list.map(videoItemHTML).join('');
    } else if (state.videoPlayer !== 'all') {
      /* 선수를 고르면 그 선수 영상만 한 묶음으로 보여 줍니다 (팀 영상 포함). */
      var one = player(state.videoPlayer);
      list = list.slice().sort(byYearSort);
      html = (list.length ? hlGroupHead(one, list.length) : '') + list.map(videoItemHTML).join('');
    } else {
      PLAYERS.forEach(function (p) {
        var rows = list.filter(function (e) { return e.p && e.p.key === p.key; }).sort(byYearSort);
        if (!rows.length) return;
        html += hlGroupHead(p, rows.length) + rows.map(videoItemHTML).join('');
      });
      var mineRows = list.filter(function (e) { return e.v.mine; });
      if (mineRows.length) html += mineGroupHead(mineRows.length) + mineRows.map(videoItemHTML).join('');
      var dkRows = list.filter(function (e) { return !e.p && !e.v.mine; }).sort(byYearSort);
      if (dkRows.length) html += dkGroupHead(dkRows.length) + dkRows.map(videoItemHTML).join('');
    }

    if (!list.length) {
      var empty = state.videoCat === 'fav' ? T('video.favEmpty')
        : (mine.active !== 'all' ? T('mine.emptyTitle') + ' ' + T('mine.emptyBody')
        : (q ? T('video.searchEmpty', { q: q }) : T('video.empty')));
      html = '<li class="vc-empty">' + esc(empty) + '</li>';
    }
    host.innerHTML = html;
    var count = $('#videoCount');
    if (count) count.textContent = T('video.count', { n: list.length });
    var clear = $('#videoSearchClear');
    if (clear) clear.hidden = !q;
    $$('[data-video-sort]').forEach(function (b) {
      var on = b.getAttribute('data-video-sort') === state.videoSort;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    renderFavBar();
    renderYtSearch();
  }

  function renderFavBar() {
    var bar = $('#favBar');
    if (!bar) return;
    bar.hidden = favs.length === 0;
    var sub = $('#favBarSub');
    if (sub) sub.textContent = T('video.favBarSub', { n: favs.length });
  }

  /* 검색어가 있으면 유튜브에서도 바로 찾아볼 수 있게 링크를 답니다. */
  function renderYtSearch() {
    var a = $('#videoYtSearch');
    if (!a) return;
    var q = String(state.videoQuery || '').trim();
    a.hidden = !q;
    if (!q) { a.href = '#'; a.textContent = ''; return; }
    a.href = ytSearch(q);
    a.textContent = T('video.ytSearch', { q: q }) + ' ↗';
  }

  /* 찜한 영상만 같은 순서로 (플레이어 MY LIST 대기열) */
  function favEntries() {
    var map = {};
    archiveItems().forEach(function (e) { map[e.v.id] = e; });
    return favs.map(function (id) { return map[id]; }).filter(Boolean);
  }

  /* ---------- 디플러스 기아 공식 재생목록 ---------- */
  function renderPlaylists() {
    var host = $('#plGrid');
    if (!host) return;
    var lists = typeof DK_PLAYLISTS !== 'undefined' ? DK_PLAYLISTS : [];
    host.innerHTML = lists.map(function (pl) {
      var name = L(pl.title);
      return '<button class="pl-item" type="button" data-playlist="' + esc(pl.id) + '" data-title="' + esc(name) + '">' +
        '<span class="pl-thumb"><img loading="lazy" src="' + ytThumb(pl.thumb) + '" alt="" width="320" height="180">' +
          '<i class="pl-play" aria-hidden="true">▶</i>' +
          (pl.n ? '<i class="pl-n">' + esc(T('video.plCount', { n: pl.n })) + '</i>' : '') + '</span>' +
        '<b class="pl-title">' + esc(name) + '</b>' +
      '</button>';
    }).join('');
  }

  /* =====================================================================
     v3.12 · 나만의 재생목록 레일 · 내 링크 추가 · 오늘 요약 카드 · 투표 팝업
     ===================================================================== */

  /* ---------- 나만의 재생목록 레일 ---------- */
  function renderMineRow() {
    var host = $('#mineChips');
    if (!host) return;
    var seen = {};
    var total = 0;
    mine.folders.forEach(function (f) {
      f.ids.forEach(function (id) { if (!seen[id]) { seen[id] = 1; total++; } });
    });
    var html = '<button class="mine-chip' + (mine.active === 'all' ? ' is-on' : '') + '" type="button"' +
      ' data-mine="all" aria-pressed="' + (mine.active === 'all') + '">' +
      esc(T('mine.all')) + ' <b>' + total + '</b></button>';
    mine.folders.forEach(function (f) {
      var on = mine.active === f.id;
      html += '<button class="mine-chip' + (on ? ' is-on' : '') + '" type="button" data-mine="' + esc(f.id) + '"' +
        ' aria-pressed="' + on + '">' + esc(folderName(f)) + ' <b>' + f.ids.length + '</b>' +
        (f.name ? '<i class="mx" data-mine-del="' + esc(f.id) + '" aria-hidden="true">✕</i>' : '') +
        '</button>';
    });
    if (mine.folders.length < 6) {
      html += '<button class="mine-chip is-new" type="button" data-mine-new="1">' + esc(T('mine.newFolder')) + '</button>';
    }
    host.innerHTML = html;
    var play = $('#minePlay');
    if (play) play.hidden = playlistIds().length === 0;
    var newBtn = $('#mineNew');
    if (newBtn) newBtn.hidden = mine.folders.length >= 6;
    var hint = $('#mineHint');
    if (hint) {
      if (mine.active === 'all') {
        hint.hidden = false;
        hint.textContent = T('mine.hint', { name: folderName(targetFolder()) });
      } else {
        hint.hidden = true;
      }
    }
  }

  function openFolderForm() {
    var form = $('#mineForm');
    if (!form) return;
    form.hidden = false;
    var input = $('#mineFolderName');
    if (input) { input.value = ''; try { input.focus(); } catch (e) {} }
  }
  function closeFolderForm() {
    var form = $('#mineForm');
    if (form) form.hidden = true;
  }

  function addFolder(name) {
    var nm = String(name || '').trim().slice(0, 20);
    if (!nm) return null;
    var f = { id: uid('f-'), name: nm, ids: [] };
    mine.folders.push(f);
    /* 새 폴더는 '담기는 곳'이 되고, 화면은 전체 영상 보기로 돌아가 바로 담을 수 있게 합니다. */
    mine.active = 'all';
    mine.target = f.id;
    saveMine();
    renderMineRow();
    renderVideoList();
    toast(T('mine.folderMade', { name: nm }));
    return f;
  }

  function removeFolder(id) {
    var f = folderById(id);
    if (!f) return;
    mine.folders = mine.folders.filter(function (x) { return x.id !== id; });
    if (!mine.folders.length) mine.folders.push({ id: DEFAULT_FOLDER, name: '', ids: [] });
    if (mine.active === id) mine.active = 'all';
    if (mine.target === id) mine.target = mine.folders[0].id;
    saveMine();
    renderMineRow();
    renderVideoList();
    toast(T('mine.folderGone', { name: folderName(f) }));
  }

  function playMine() {
    var ids = playlistIds();
    var queue = [];
    ids.forEach(function (id) {
      var e = archiveById(id);
      if (e) queue.push(e);
    });
    if (!queue.length) { toast(T('mine.emptyTitle')); return; }
    openPlayer('video', queue[0].v.id, '', queue, 0);
  }

  /* ---------- 내 링크 추가 ---------- */
  var linkLookupTimer = null;

  /* 유튜브 주소에서 videoId 추출 (watch·youtu.be·shorts·embed·live) */
  function parseVideoId(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    var m = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/|\/v\/)([A-Za-z0-9_-]{11})/.exec(s);
    return m ? m[1] : '';
  }

  function fetchLinkTitle(id) {
    var watch = ytWatch(id);
    var primary = 'https://www.youtube.com/oembed?url=' + encodeURIComponent(watch) + '&format=json';
    var backup = 'https://noembed.com/embed?url=' + encodeURIComponent(watch);
    function grab(url) {
      return fetch(url, { cache: 'no-store' }).then(function (r) {
        return r.ok ? r.json() : Promise.reject(new Error('http'));
      }).then(function (j) {
        return (j && (j.title || j.title_name)) || '';
      });
    }
    return grab(primary).catch(function () { return grab(backup); }).catch(function () { return ''; });
  }

  function openAddLink() {
    var modal = $('#addLinkModal');
    if (!modal) return;
    var url = $('#addLinkUrl'), title = $('#addLinkTitle'), err = $('#addLinkErr'), pv = $('#addLinkPreview');
    if (url) url.value = '';
    if (title) title.value = '';
    if (err) err.textContent = '';
    if (pv) pv.hidden = true;
    modal.hidden = false;
    try { if (url) url.focus(); } catch (e) {}
  }
  function closeAddLink() {
    var modal = $('#addLinkModal');
    if (modal) modal.hidden = true;
  }

  function updateLinkPreview() {
    var url = $('#addLinkUrl'), pv = $('#addLinkPreview'), thumb = $('#addLinkThumb');
    var idBox = $('#addLinkId'), err = $('#addLinkErr'), title = $('#addLinkTitle');
    if (!url) return '';
    var raw = url.value;
    var id = parseVideoId(raw);
    if (!raw.trim()) {
      if (pv) pv.hidden = true;
      if (err) err.textContent = '';
      return '';
    }
    if (!id) {
      if (pv) pv.hidden = true;
      if (err) err.textContent = T('addLink.bad');
      return '';
    }
    if (err) err.textContent = '';
    if (pv) pv.hidden = false;
    if (thumb) thumb.src = ytThumb(id);
    if (idBox) idBox.textContent = 'youtu.be/' + id;
    /* 제목이 비어 있으면 oEmbed 로 채워 봅니다 (0.6초 멈춤 뒤 한 번만) */
    if (title && !title.value.trim()) {
      clearTimeout(linkLookupTimer);
      var note = $('#addLinkPvNote');
      if (note) note.textContent = T('addLink.titleLoading');
      linkLookupTimer = setTimeout(function () {
        if (parseVideoId(url.value) !== id) return;
        fetchLinkTitle(id).then(function (name) {
          if (parseVideoId(url.value) !== id) return;
          if (name && title && !title.value.trim()) title.value = name.slice(0, 120);
          var n2 = $('#addLinkPvNote');
          if (n2) n2.textContent = name ? T('addLink.found') : T('addLink.titleFail');
        });
      }, 600);
    }
    return id;
  }

  function submitAddLink() {
    var url = $('#addLinkUrl'), title = $('#addLinkTitle'), err = $('#addLinkErr');
    if (!url) return;
    var id = parseVideoId(url.value);
    if (!id) { if (err) err.textContent = T('addLink.bad'); return; }
    if (links.some(function (l) { return l.id === id; })) {
      if (err) err.textContent = T('addLink.dup');
      return;
    }
    var name = (title && title.value.trim()) || '';
    function finish(finalTitle) {
      links.unshift({ id: id, title: finalTitle, added: Date.now() });
      saveLinks();
      renderVideoCats();
      renderVideoList();
      closeAddLink();
      var e = archiveById(id);
      toast(T('addLink.ok'));
      if (e && mine.active !== 'all') toggleMineVideo(id);
    }
    if (name) { finish(name.slice(0, 120)); return; }
    var saveBtn = $('#addLinkSave');
    if (saveBtn) saveBtn.disabled = true;
    fetchLinkTitle(id).then(function (t) {
      if (saveBtn) saveBtn.disabled = false;
      finish((t || ('YouTube · ' + id)).slice(0, 120));
    });
  }

  /* ---------- 오늘의 DK 요약 카드 (1080×1350 PNG) ---------- */
  var scImage = null;

  function loadImage(src) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = src;
    });
  }

  function ensureFont() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return document.fonts.load('800 40px Pretendard')
      .then(function () { return document.fonts.ready; })
      .catch(function () {});
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function fitText(ctx, txt, max, size, weight) {
    var s = String(txt == null ? '' : txt);
    ctx.font = (weight || 700) + ' ' + size + 'px ' + SC_FONT;
    if (ctx.measureText(s).width <= max) return s;
    var out = s;
    while (out.length > 1 && ctx.measureText(out + '…').width > max) out = out.slice(0, -1);
    return out + '…';
  }

  var SC_FONT = 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

  function scFont(size, weight) { return (weight || 700) + ' ' + size + 'px ' + SC_FONT; }

  function summaryData() {
    var rows = PLAYERS.map(function (p) {
      var list = recent(p, 5);
      return { p: p, m: list, t: tally(list) };
    });
    var w = 0, l = 0;
    rows.forEach(function (r) { w += r.t.w; l += r.t.l; });
    var next = LIVE.official && LIVE.official.ok ? LIVE.official.next : null;
    var nextMain = '', nextSub = '';
    if (next) {
      var opp = next.opponent || {};
      nextMain = 'DK vs ' + (opp.code || opp.name || 'TBD');
      nextSub = [eventDate(next), next.time || '', leagueName(next.league), blockText(next.block)]
        .filter(Boolean).join(' · ');
    } else {
      nextMain = T('summary.nextTbd');
      nextSub = T('summary.nextOff');
    }
    var notices = calNotices().slice().sort(function (a, b) {
      return String(b.posted || b.date || '').localeCompare(String(a.posted || a.date || ''));
    });
    var notice = notices.length ? (notices[0].title ? L(notices[0].title) : (notices[0].titleName || '')) : '';
    return { rows: rows, w: w, l: l, nextMain: nextMain, nextSub: nextSub, notice: notice };
  }

  function drawSummaryCard(logo) {
    var W = 1080, H = 1350;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var d = summaryData();
    var now = new Date();
    var C = {
      ink: '#EAF6F3', ink2: '#A9C3BD', muted: '#78938D', dim: '#5A736D',
      mint: '#00F5C4', mint2: '#00C49A', red: '#FF6B7A', line: 'rgba(255,255,255,.09)'
    };

    /* 배경 */
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#04120F'); bg.addColorStop(.42, '#061A1A'); bg.addColorStop(1, '#03251F');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(960, 40, 20, 960, 40, 620);
    glow.addColorStop(0, 'rgba(0,245,196,.20)'); glow.addColorStop(1, 'rgba(0,245,196,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    var glow2 = ctx.createRadialGradient(80, 1240, 20, 80, 1240, 520);
    glow2.addColorStop(0, 'rgba(0,196,154,.10)'); glow2.addColorStop(1, 'rgba(0,196,154,0)');
    ctx.fillStyle = glow2; ctx.fillRect(0, 0, W, H);

    /* 머리: 로고 · 워드마크 · DAILY REPORT */
    if (logo) {
      ctx.save();
      try { ctx.filter = 'brightness(0) invert(1)'; } catch (e) {}
      ctx.drawImage(logo, 64, 56, 124, 72);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      roundRect(ctx, 64, 56, 124, 72, 14); ctx.fill();
      ctx.fillStyle = C.ink; ctx.font = scFont(34, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('DK', 126, 92);
      ctx.textAlign = 'left';
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.ink; ctx.font = scFont(32, 900);
    ctx.fillText('DK', 212, 96);
    var dkW = ctx.measureText('DK ').width;
    ctx.fillStyle = C.mint; ctx.fillText('SIGNAL', 212 + dkW, 96);
    ctx.fillStyle = C.muted; ctx.font = scFont(18, 600);
    ctx.fillText(T('brand.sub'), 213, 124);

    ctx.textAlign = 'right';
    ctx.fillStyle = C.mint; ctx.font = scFont(17, 800);
    ctx.fillText('●  ' + T('summary.kicker'), 1016, 78);
    ctx.fillStyle = C.ink; ctx.font = scFont(26, 800);
    ctx.fillText(window.I18N.feedDate(now), 1016, 116);
    ctx.textAlign = 'left';

    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(64, 168); ctx.lineTo(1016, 168); ctx.stroke();

    /* 제목 */
    var title = T('summary.title');
    var parts = title.split('DK');
    ctx.font = scFont(62, 900);
    var tx = 64;
    if (parts.length > 1) {
      ctx.fillStyle = C.ink; ctx.fillText(parts[0], tx, 262);
      tx += ctx.measureText(parts[0]).width;
      ctx.fillStyle = C.mint; ctx.fillText('DK', tx, 262);
      tx += ctx.measureText('DK').width;
      ctx.fillStyle = C.ink; ctx.fillText(parts.slice(1).join('DK'), tx, 262);
    } else {
      ctx.fillStyle = C.ink; ctx.fillText(title, tx, 262);
    }
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.font = scFont(21, 600);
    ctx.fillText(T('summary.sub', { w: d.w, l: d.l }), 1016, 256);
    ctx.textAlign = 'left';

    /* 5인 패널 */
    var px = 64, pw = 952, py = 306, rh = 168, gap = 8;
    var ph = rh * 5 + gap * 2;
    var panelGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
    panelGrad.addColorStop(0, 'rgba(9,38,34,.84)'); panelGrad.addColorStop(1, 'rgba(5,22,22,.80)');
    ctx.fillStyle = panelGrad;
    roundRect(ctx, px, py, pw, ph, 30); ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,196,.20)'; ctx.lineWidth = 1.6;
    roundRect(ctx, px, py, pw, ph, 30); ctx.stroke();

    d.rows.forEach(function (row, i) {
      var y = py + 8 + i * rh;
      var p = row.p, t = row.t;
      if (i) {
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(px + 22, y - 4); ctx.lineTo(px + pw - 22, y - 4); ctx.stroke();
      }
      var cy = y + 76;
      /* 아바타 */
      var ring = ctx.createLinearGradient(96, cy - 46, 184, cy + 46);
      ring.addColorStop(0, 'rgba(0,245,196,.55)'); ring.addColorStop(1, 'rgba(0,245,196,.12)');
      ctx.beginPath(); ctx.arc(140, cy, 44, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,245,196,.10)'; ctx.fill();
      ctx.strokeStyle = ring; ctx.lineWidth = 2.4; ctx.stroke();
      var initial = (p.nameKo || p.nameEn || '?').slice(0, 1);
      ctx.fillStyle = C.mint; ctx.font = scFont(40, 900);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(initial, 140, cy + 2);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'center'; ctx.fillStyle = C.dim; ctx.font = scFont(14, 800);
      ctx.fillText(p.pos || '', 140, y + 152);
      ctx.textAlign = 'left';

      /* 이름 + MY PICK */
      ctx.fillStyle = C.ink; ctx.font = scFont(40, 900);
      ctx.fillText(pName(p), 210, y + 58);
      var nameW = ctx.measureText(pName(p)).width;
      if (p.key === myPick) {
        var cw = 118, chh = 30, cx = 210 + nameW + 14, cyy = y + 32;
        ctx.fillStyle = 'rgba(0,245,196,.16)';
        roundRect(ctx, cx, cyy, cw, chh, 15); ctx.fill();
        ctx.strokeStyle = 'rgba(0,245,196,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = C.mint; ctx.font = scFont(15, 900);
        ctx.fillText('★ MY PICK', cx + 13, cyy + 21);
      }

      ctx.fillStyle = C.muted; ctx.font = scFont(21, 600);
      ctx.fillText(pReal(p) + ' · ' + T('pos.' + (p.pos || 'TOP')), 210, y + 94);

      ctx.fillStyle = C.ink2; ctx.font = scFont(23, 700);
      ctx.fillText(tierText(p), 210, y + 132);
      var tw = ctx.measureText(tierText(p)).width;
      ctx.fillStyle = C.mint; ctx.font = scFont(23, 800);
      ctx.fillText(lpText(p), 210 + tw + 14, y + 132);
      var lw = ctx.measureText(lpText(p)).width;
      ctx.fillStyle = C.dim; ctx.font = scFont(19, 600);
      ctx.fillText('· ' + winRateText(p), 210 + tw + 14 + lw + 12, y + 132);

      /* 최근 5경기 막대 (막대 = 관여도, 최신 →) */
      ctx.fillStyle = C.dim; ctx.font = scFont(15, 700);
      ctx.fillText(T('summary.recent'), 510, y + 36);
      var bw = 34, bgap = 12, baseY = y + 112;
      var bars = row.m.slice().reverse();
      bars.forEach(function (m, bi) {
        var bx = 510 + bi * (bw + bgap);
        var hgt = barHeight(m) * 4.6;
        var grd = ctx.createLinearGradient(bx, baseY - hgt, bx, baseY);
        if (m.win) { grd.addColorStop(0, '#00F5C4'); grd.addColorStop(1, '#00A783'); }
        else { grd.addColorStop(0, '#FF8C97'); grd.addColorStop(1, '#C44756'); }
        ctx.fillStyle = grd;
        roundRect(ctx, bx, baseY - hgt, bw, hgt, 7); ctx.fill();
        ctx.fillStyle = C.dim; ctx.font = scFont(12, 600);
        ctx.textAlign = 'center';
        ctx.fillText(String(m.kda || ''), bx + bw / 2, y + 136);
        ctx.textAlign = 'left';
      });

      /* 승·패 */
      var full = T('summary.winLose', { w: t.w, l: t.l });
      ctx.font = scFont(36, 900);
      var fm = full.match(/^(.*?\d+\D+?)(\d+\D*)$/);
      if (fm) {
        var w1 = ctx.measureText(fm[1]).width, w2 = ctx.measureText(fm[2]).width;
        var sx = 992 - (w1 + w2);
        ctx.fillStyle = t.w >= t.l ? C.mint : C.ink;
        ctx.fillText(fm[1], sx, y + 66);
        ctx.fillStyle = t.l > t.w ? C.red : C.ink2;
        ctx.fillText(fm[2], sx + w1, y + 66);
      } else {
        ctx.textAlign = 'right'; ctx.fillStyle = C.ink;
        ctx.fillText(full, 992, y + 66); ctx.textAlign = 'left';
      }
      var lastM = row.m[0];
      var lastD = '';
      if (lastM && lastM.date) {
        var pm = /(\d{4})-(\d{2})-(\d{2})/.exec(String(lastM.date));
        if (pm) lastD = pm[2] + '.' + pm[3];
      }
      ctx.textAlign = 'right'; ctx.fillStyle = C.dim; ctx.font = scFont(16, 600);
      ctx.fillText(lastD ? T('summary.lastGame', { date: lastD }) : '', 992, y + 104);
      ctx.textAlign = 'left';
    });

    /* 꼬리: 다음 경기 · 최신 공지 · 주소 */
    var fy = 1206;
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    roundRect(ctx, 64, fy, 730, 104, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,196,.22)'; ctx.lineWidth = 1.4;
    roundRect(ctx, 64, fy, 730, 104, 20); ctx.stroke();
    ctx.fillStyle = C.mint; ctx.font = scFont(13, 800);
    ctx.fillText(T('summary.next'), 92, fy + 32);
    ctx.fillStyle = C.ink; ctx.font = scFont(25, 800);
    ctx.fillText(fitText(ctx, d.nextMain, 310, 25, 800), 92, fy + 64);
    ctx.fillStyle = C.dim; ctx.font = scFont(14, 600);
    ctx.fillText(fitText(ctx, d.nextSub, 310, 14, 600), 92, fy + 88);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(430, fy + 18); ctx.lineTo(430, fy + 86); ctx.stroke();
    ctx.fillStyle = C.mint; ctx.font = scFont(13, 800);
    ctx.fillText(T('summary.notice'), 456, fy + 32);
    ctx.fillStyle = C.ink2; ctx.font = scFont(20, 700);
    ctx.fillText(fitText(ctx, d.notice || T('summary.noticeNone'), 300, 20, 700), 456, fy + 66);

    ctx.textAlign = 'right';
    ctx.fillStyle = C.mint; ctx.font = scFont(18, 800);
    ctx.fillText('dk-signal.vercel.app', 1016, fy + 36);
    ctx.fillStyle = C.dim; ctx.font = scFont(12, 600);
    ctx.fillText(T('summary.basis', { time: pad(now.getHours()) + ':' + pad(now.getMinutes()) }), 1016, fy + 62);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.font = scFont(11, 600);
    ctx.fillText('DK SIGNAL · ' + window.I18N.feedDate(now), 64, fy + 132);

    return canvas;
  }

  /* ---------- 카드 3종: 경기 없는 날 · 경기 전 · 경기 결과(세트별) ---------- */
  var scState = { mode: 'solo', matchId: '', sets: [], idx: 0, loading: false, failed: '' };

  function kstTodayKey() {
    var n = new Date();
    return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate());
  }
  function summaryMatch() {
    var today = kstTodayKey();
    var list = mtList();
    for (var i = 0; i < list.length; i++) {
      var iso = String(list[i].startIso || '');
      if (iso.slice(0, 10) === today) return list[i];
    }
    return null;
  }
  function summarySet() {
    if (!scState.sets.length) return null;
    var idx = Math.max(0, Math.min(scState.sets.length - 1, scState.idx));
    return scState.sets[idx];
  }

  /* 챔피언 아이콘은 Data Dragon 이 CORS 를 허용해 캔버스에 그릴 수 있습니다. */
  var SC_IMG_CACHE = {};
  function loadImageCors(src) {
    if (!src) return Promise.resolve(null);
    if (SC_IMG_CACHE[src]) return Promise.resolve(SC_IMG_CACHE[src]);
    return new Promise(function (resolve) {
      var im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = function () { SC_IMG_CACHE[src] = im; resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = src;
    });
  }
  function loadChampIcons(names) {
    var uniq = {};
    (names || []).forEach(function (n) { if (n) uniq[n] = true; });
    var keys = Object.keys(uniq);
    return Promise.all(keys.map(function (n) { return loadImageCors(champImg(champKey(n))); })).then(function (list) {
      var map = {};
      keys.forEach(function (n, i) { map[n] = list[i]; });
      return map;
    });
  }

  function scBg(ctx, W, H) {
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#04120F'); bg.addColorStop(.42, '#061A1A'); bg.addColorStop(1, '#03251F');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(960, 40, 20, 960, 40, 620);
    glow.addColorStop(0, 'rgba(0,245,196,.20)'); glow.addColorStop(1, 'rgba(0,245,196,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    var glow2 = ctx.createRadialGradient(80, 1240, 20, 80, 1240, 520);
    glow2.addColorStop(0, 'rgba(0,196,154,.10)'); glow2.addColorStop(1, 'rgba(0,196,154,0)');
    ctx.fillStyle = glow2; ctx.fillRect(0, 0, W, H);
  }
  function scColors() {
    return {
      ink: '#EAF6F3', ink2: '#A9C3BD', muted: '#78938D', dim: '#5A736D',
      mint: '#00F5C4', mint2: '#00C49A', red: '#FF6B7A', line: 'rgba(255,255,255,.09)'
    };
  }
  function scHeader(ctx, logo, C, kicker, dateStr) {
    var W = 1080;
    if (logo) {
      ctx.save();
      try { ctx.filter = 'brightness(0) invert(1)'; } catch (e) {}
      ctx.drawImage(logo, 64, 56, 124, 72);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      roundRect(ctx, 64, 56, 124, 72, 14); ctx.fill();
      ctx.fillStyle = C.ink; ctx.font = scFont(34, 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('DK', 126, 92);
      ctx.textAlign = 'left';
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.ink; ctx.font = scFont(32, 900);
    ctx.fillText('DK', 212, 96);
    var dkW = ctx.measureText('DK ').width;
    ctx.fillStyle = C.mint; ctx.fillText('SIGNAL', 212 + dkW, 96);
    ctx.fillStyle = C.muted; ctx.font = scFont(18, 600);
    ctx.fillText(T('brand.sub'), 213, 124);

    ctx.textAlign = 'right';
    ctx.fillStyle = C.mint; ctx.font = scFont(17, 800);
    ctx.fillText('●  ' + kicker, 1016, 78);
    ctx.fillStyle = C.ink; ctx.font = scFont(26, 800);
    ctx.fillText(dateStr, 1016, 116);
    ctx.textAlign = 'left';

    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(64, 168); ctx.lineTo(1016, 168); ctx.stroke();
    void W;
  }
  /* 상대팀은 이미지 CORS 가 막혀 있어 팀 코드 배지로 그립니다. */
  function scTeamBadge(ctx, C, label, x, y, w, h, accent) {
    ctx.fillStyle = accent ? 'rgba(255,107,122,.12)' : 'rgba(0,245,196,.10)';
    roundRect(ctx, x, y, w, h, Math.min(18, h / 2)); ctx.fill();
    ctx.strokeStyle = accent ? 'rgba(255,107,122,.42)' : 'rgba(0,245,196,.42)';
    ctx.lineWidth = 1.6;
    roundRect(ctx, x, y, w, h, Math.min(18, h / 2)); ctx.stroke();
    ctx.fillStyle = accent ? C.red : C.mint;
    ctx.font = scFont(Math.min(46, h * 0.5), 900);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(label || '').toUpperCase(), x + w / 2, y + h / 2 + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  /* 경기 있는 날(경기 전): D-DAY · 시간 · 상대팀 + 오늘의 5인 솔랭 요약 */
  function drawMatchDayCard(logo, m, d) {
    var W = 1080, H = 1350;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var C = scColors();
    var now = new Date();
    scBg(ctx, W, H);
    scHeader(ctx, logo, C, T('summary.mkicker'), window.I18N.feedDate(now));

    /* TODAY'S MATCH 패널 */
    var px = 64, pw = 952, py = 186, ph = 212;
    var g = ctx.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, 'rgba(0,245,196,.10)'); g.addColorStop(.5, 'rgba(9,32,30,.92)'); g.addColorStop(1, 'rgba(6,20,20,.96)');
    ctx.fillStyle = g;
    roundRect(ctx, px, py, pw, ph, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,196,.32)'; ctx.lineWidth = 1.8;
    roundRect(ctx, px, py, pw, ph, 28); ctx.stroke();

    ctx.fillStyle = C.mint; ctx.font = scFont(15, 900);
    ctx.fillText('●  ' + T('summary.todayMatch'), px + 30, py + 36);
    var league = [leagueName(m.league), blockText(m.block)].filter(Boolean).join(' · ');
    if (league) {
      ctx.font = scFont(17, 800);
      var lw = ctx.measureText(league).width;
      ctx.fillStyle = 'rgba(0,245,196,.10)';
      roundRect(ctx, px + pw - 30 - lw - 30, py + 16, lw + 30, 34, 17); ctx.fill();
      ctx.strokeStyle = 'rgba(0,245,196,.34)'; ctx.lineWidth = 1.4;
      roundRect(ctx, px + pw - 30 - lw - 30, py + 16, lw + 30, 34, 17); ctx.stroke();
      ctx.fillStyle = C.mint; ctx.textAlign = 'center';
      ctx.fillText(league, px + pw - 30 - lw / 2 - 15, py + 39);
      ctx.textAlign = 'left';
    }

    /* 왼쪽 DK */
    if (logo) {
      ctx.save();
      try { ctx.filter = 'brightness(0) invert(1)'; } catch (e) {}
      ctx.drawImage(logo, px + 66, py + 46, 138, 80);
      ctx.restore();
    }
    ctx.fillStyle = C.ink2; ctx.font = scFont(16, 800); ctx.textAlign = 'center';
    ctx.fillText((m.dk && m.dk.name) || 'DPLUS KIA', px + 137, py + 150);
    ctx.textAlign = 'left';

    /* 가운데 시간 */
    var cx = px + pw / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = C.mint; ctx.font = scFont(16, 900);
    ctx.fillText('V S', cx, py + 58);
    ctx.fillStyle = C.ink; ctx.font = scFont(74, 900);
    ctx.fillText(m.time || 'TBD', cx, py + 126);
    ctx.fillStyle = C.muted; ctx.font = scFont(17, 800);
    ctx.fillText([m.bo ? T('mt.bo', { n: m.bo }) : '', m.weekday ? '(' + m.weekday + ')' : ''].filter(Boolean).join('  '), cx, py + 154);
    ctx.textAlign = 'left';

    /* 오른쪽 상대 */
    var opp = m.opponent || {};
    var oppLabel = opp.code || opp.name || 'TBD';
    scTeamBadge(ctx, C, oppLabel, px + pw - 212, py + 46, 150, 84, true);
    ctx.fillStyle = C.ink2; ctx.font = scFont(16, 800); ctx.textAlign = 'center';
    ctx.fillText(String(opp.name || oppLabel), px + pw - 137, py + 150);
    ctx.textAlign = 'left';

    /* 아래줄: WATCH + 시작까지 */
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px + 24, py + ph - 42); ctx.lineTo(px + pw - 24, py + ph - 42); ctx.stroke();
    ctx.fillStyle = C.mint; ctx.font = scFont(13, 900);
    ctx.fillText(T('summary.watch'), px + 30, py + ph - 16);
    ctx.fillStyle = C.muted; ctx.font = scFont(15, 700);
    ctx.fillText(T('summary.watchLine'), px + 118, py + ph - 16);
    var left = m.startIso ? Date.parse(m.startIso) - Date.now() : NaN;
    var countdown = T('summary.startsSoon');
    if (Number.isFinite(left) && left > 0) {
      var hh = Math.floor(left / 3600000), mm = Math.round((left % 3600000) / 60000);
      countdown = hh > 0 ? T('summary.startsIn', { h: hh, m: mm }) : T('summary.startsSoon');
    } else if (Number.isFinite(left)) {
      countdown = T('summary.liveNow');
    }
    ctx.font = scFont(16, 900);
    var cw2 = ctx.measureText(countdown).width;
    ctx.fillStyle = 'rgba(0,245,196,.12)';
    roundRect(ctx, px + pw - 30 - cw2 - 32, py + ph - 40, cw2 + 32, 32, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,196,.44)'; ctx.lineWidth = 1.4;
    roundRect(ctx, px + pw - 30 - cw2 - 32, py + ph - 40, cw2 + 32, 32, 16); ctx.stroke();
    ctx.fillStyle = C.mint; ctx.textAlign = 'center';
    ctx.fillText(countdown, px + pw - 30 - cw2 / 2 - 16, py + ph - 19);
    ctx.textAlign = 'left';

    /* 오늘의 DK 요약 */
    var ty = 452;
    ctx.font = scFont(52, 900);
    ctx.fillStyle = C.ink;
    var base = T('summary.title');
    var parts = base.split('DK');
    var tx = 64;
    if (parts.length > 1) {
      ctx.fillStyle = C.ink; ctx.fillText(parts[0], tx, ty);
      tx += ctx.measureText(parts[0]).width;
      ctx.fillStyle = C.mint; ctx.fillText('DK', tx, ty);
      tx += ctx.measureText('DK').width;
      ctx.fillStyle = C.ink; ctx.fillText(parts.slice(1).join('DK'), tx, ty);
    } else {
      ctx.fillStyle = C.ink; ctx.fillText(base, tx, ty);
    }
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.font = scFont(20, 700);
    ctx.fillText(T('summary.sub', { w: d.w, l: d.l }), 1016, ty - 4);
    ctx.textAlign = 'left';

    scPlayerRows(ctx, C, d, 64, 488, 952, 148, 6);
    scFoot(ctx, C, d, 1252, true, m);
    return canvas;
  }

  /* 5인 솔로랭크 요약줄 (두 카드가 같이 씀) */
  function scPlayerRows(ctx, C, d, px, py, pw, rh, gap) {
    var ph = rh * 5 + gap * 2;
    var panelGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
    panelGrad.addColorStop(0, 'rgba(9,38,34,.84)'); panelGrad.addColorStop(1, 'rgba(5,22,22,.80)');
    ctx.fillStyle = panelGrad;
    roundRect(ctx, px, py, pw, ph, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,196,.20)'; ctx.lineWidth = 1.6;
    roundRect(ctx, px, py, pw, ph, 28); ctx.stroke();

    var k = rh / 168;
    d.rows.forEach(function (row, i) {
      var y = py + 7 + i * rh;
      var p = row.p, t = row.t;
      if (i) {
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(px + 22, y - 4); ctx.lineTo(px + pw - 22, y - 4); ctx.stroke();
      }
      var cy = y + 76 * k;
      var ring = ctx.createLinearGradient(96, cy - 46, 184, cy + 46);
      ring.addColorStop(0, 'rgba(0,245,196,.55)'); ring.addColorStop(1, 'rgba(0,245,196,.12)');
      ctx.beginPath(); ctx.arc(140, cy, 44 * k, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,245,196,.10)'; ctx.fill();
      ctx.strokeStyle = ring; ctx.lineWidth = 2.4; ctx.stroke();
      var initial = (p.nameKo || p.nameEn || '?').slice(0, 1);
      ctx.fillStyle = C.mint; ctx.font = scFont(40 * k, 900);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(initial, 140, cy + 2);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'center'; ctx.fillStyle = C.dim; ctx.font = scFont(14, 800);
      ctx.fillText(p.pos || '', 140, y + 152 * k);
      ctx.textAlign = 'left';

      ctx.fillStyle = C.ink; ctx.font = scFont(40 * k, 900);
      ctx.fillText(pName(p), 210, y + 58 * k);
      var nameW = ctx.measureText(pName(p)).width;
      if (p.key === myPick) {
        var cw = 118, chh = 30, cx = 210 + nameW + 14, cyy = y + 32 * k;
        ctx.fillStyle = 'rgba(0,245,196,.16)';
        roundRect(ctx, cx, cyy, cw, chh, 15); ctx.fill();
        ctx.strokeStyle = 'rgba(0,245,196,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = C.mint; ctx.font = scFont(15, 900);
        ctx.fillText('★ MY PICK', cx + 13, cyy + 21);
      }

      ctx.fillStyle = C.muted; ctx.font = scFont(21 * k, 600);
      ctx.fillText(pReal(p) + ' · ' + T('pos.' + (p.pos || 'TOP')), 210, y + 94 * k);
      ctx.fillStyle = C.ink2; ctx.font = scFont(23 * k, 700);
      ctx.fillText(tierText(p), 210, y + 132 * k);
      var tw = ctx.measureText(tierText(p)).width;
      ctx.fillStyle = C.mint; ctx.font = scFont(23 * k, 800);
      ctx.fillText(lpText(p), 210 + tw + 14, y + 132 * k);
      var lw = ctx.measureText(lpText(p)).width;
      ctx.fillStyle = C.dim; ctx.font = scFont(19 * k, 600);
      ctx.fillText('· ' + winRateText(p), 210 + tw + 14 + lw + 12, y + 132 * k);

      ctx.fillStyle = C.dim; ctx.font = scFont(15, 700);
      ctx.fillText(T('summary.recent'), 510, y + 36 * k);
      var bw = 34, bgap = 12, baseY = y + 112 * k;
      row.m.slice().reverse().forEach(function (mg, bi) {
        var bx = 510 + bi * (bw + bgap);
        var hgt = barHeight(mg) * 4.6 * k;
        var grd = ctx.createLinearGradient(bx, baseY - hgt, bx, baseY);
        if (mg.win) { grd.addColorStop(0, '#00F5C4'); grd.addColorStop(1, '#00A783'); }
        else { grd.addColorStop(0, '#FF8C97'); grd.addColorStop(1, '#C44756'); }
        ctx.fillStyle = grd;
        roundRect(ctx, bx, baseY - hgt, bw, hgt, 7); ctx.fill();
        ctx.fillStyle = C.dim; ctx.font = scFont(12, 600);
        ctx.textAlign = 'center';
        ctx.fillText(String(mg.kda || ''), bx + bw / 2, y + 136 * k);
        ctx.textAlign = 'left';
      });

      var full = T('summary.winLose', { w: t.w, l: t.l });
      ctx.font = scFont(36 * k, 900);
      var fm = full.match(/^(.*?\d+\D+?)(\d+\D*)$/);
      if (fm) {
        var w1 = ctx.measureText(fm[1]).width, w2 = ctx.measureText(fm[2]).width;
        var sx = 992 - (w1 + w2);
        ctx.fillStyle = t.w >= t.l ? C.mint : C.ink;
        ctx.fillText(fm[1], sx, y + 66 * k);
        ctx.fillStyle = t.l > t.w ? C.red : C.ink2;
        ctx.fillText(fm[2], sx + w1, y + 66 * k);
      } else {
        ctx.textAlign = 'right'; ctx.fillStyle = C.ink;
        ctx.fillText(full, 992, y + 66 * k); ctx.textAlign = 'left';
      }
      var lastM = row.m[0];
      var lastD = '';
      if (lastM && lastM.date) {
        var pm = /(\d{4})-(\d{2})-(\d{2})/.exec(String(lastM.date));
        if (pm) lastD = pm[2] + '.' + pm[3];
      }
      ctx.textAlign = 'right'; ctx.fillStyle = C.dim; ctx.font = scFont(16, 600);
      ctx.fillText(lastD ? T('summary.lastGame', { date: lastD }) : '', 992, y + 104 * k);
      ctx.textAlign = 'left';
    });
  }

  function scFoot(ctx, C, d, fy, withAlert, m) {
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    roundRect(ctx, 64, fy, 730, 78, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,196,.22)'; ctx.lineWidth = 1.4;
    roundRect(ctx, 64, fy, 730, 78, 20); ctx.stroke();
    ctx.fillStyle = C.mint; ctx.font = scFont(12, 900);
    ctx.fillText(withAlert ? T('summary.matchAlert') : T('summary.next'), 92, fy + 28);
    ctx.fillStyle = C.ink; ctx.font = scFont(21, 800);
    if (withAlert && m) {
      ctx.fillText(fitText(ctx, 'DK vs ' + ((m.opponent && (m.opponent.code || m.opponent.name)) || 'TBD') + ' · ' + (m.time || 'TBD'), 320, 21, 800), 92, fy + 58);
    } else {
      ctx.fillText(fitText(ctx, d.nextMain, 320, 21, 800), 92, fy + 56);
      ctx.fillStyle = C.dim; ctx.font = scFont(13, 600);
      ctx.fillText(fitText(ctx, d.nextSub, 320, 13, 600), 92, fy + 74);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(430, fy + 14); ctx.lineTo(430, fy + 64); ctx.stroke();
    ctx.fillStyle = C.mint; ctx.font = scFont(12, 900);
    ctx.fillText(T('summary.noticeTitle') || T('summary.notice'), 456, fy + 28);
    ctx.fillStyle = C.ink2; ctx.font = scFont(18, 700);
    ctx.fillText(fitText(ctx, d.notice || T('summary.noticeNone'), 300, 18, 700), 456, fy + 58);

    ctx.textAlign = 'right';
    ctx.fillStyle = C.mint; ctx.font = scFont(17, 800);
    ctx.fillText('dk-signal.vercel.app', 1016, fy + 32);
    ctx.fillStyle = C.dim; ctx.font = scFont(12, 600);
    var now = new Date();
    ctx.fillText(T('summary.basis', { time: pad(now.getHours()) + ':' + pad(now.getMinutes()) }), 1016, fy + 56);
    ctx.textAlign = 'left';
  }

  /* 경기 결과(세트 선택): 진영 · 양 팀 밴 · DK 5인 픽 · K/D/A · 팀 내 딜 비중 */
  function drawMatchResultCard(logo, m, d, set, icons) {
    var W = 1080, H = 1350;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var C = scColors();
    var now = new Date();
    scBg(ctx, W, H);
    scHeader(ctx, logo, C, T('summary.rkicker'), window.I18N.feedDate(now));

    var px = 64, pw = 952;
    var dkWins = d.dk && d.dk.wins != null ? d.dk.wins : (m.dk && m.dk.gameWins);
    var opWins = d.opponent && d.opponent.wins != null ? d.opponent.wins : (m.opponent && m.opponent.gameWins);
    var outcome = d.win != null ? d.win : m.win;

    /* FINAL 패널 */
    var py = 182, ph = 212;
    var g = ctx.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, 'rgba(0,245,196,.10)'); g.addColorStop(.5, 'rgba(9,32,30,.92)'); g.addColorStop(1, 'rgba(6,20,20,.96)');
    ctx.fillStyle = g;
    roundRect(ctx, px, py, pw, ph, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,196,.32)'; ctx.lineWidth = 1.8;
    roundRect(ctx, px, py, pw, ph, 28); ctx.stroke();

    ctx.fillStyle = C.mint; ctx.font = scFont(15, 900);
    ctx.fillText('●  ' + T('summary.finalTag'), px + 30, py + 36);
    var league = [leagueName(m.league), blockText(m.block), m.bo ? T('mt.bo', { n: m.bo }) : ''].filter(Boolean).join(' · ');
    if (league) {
      ctx.font = scFont(16, 800);
      var lw = ctx.measureText(league).width;
      ctx.fillStyle = 'rgba(0,245,196,.10)';
      roundRect(ctx, px + pw - 30 - lw - 30, py + 16, lw + 30, 32, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(0,245,196,.34)'; ctx.lineWidth = 1.4;
      roundRect(ctx, px + pw - 30 - lw - 30, py + 16, lw + 30, 32, 16); ctx.stroke();
      ctx.fillStyle = C.mint; ctx.textAlign = 'center';
      ctx.fillText(league, px + pw - 30 - lw / 2 - 15, py + 38);
      ctx.textAlign = 'left';
    }

    if (logo) {
      ctx.save();
      try { ctx.filter = 'brightness(0) invert(1)'; } catch (e) {}
      ctx.drawImage(logo, px + 66, py + 44, 138, 80);
      ctx.restore();
    }
    ctx.fillStyle = C.ink2; ctx.font = scFont(16, 800); ctx.textAlign = 'center';
    ctx.fillText((m.dk && m.dk.name) || 'DPLUS KIA', px + 137, py + 150);
    ctx.textAlign = 'left';

    var cx = px + pw / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = C.dim; ctx.font = scFont(13, 900);
    ctx.fillText(T('summary.finalScore'), cx, py + 48);
    ctx.fillStyle = C.ink; ctx.font = scFont(66, 900);
    ctx.fillText((dkWins == null ? '-' : dkWins) + ' : ' + (opWins == null ? '-' : opWins), cx - 26, py + 114);
    if (outcome != null) {
      ctx.font = scFont(16, 900);
      var wtxt = T(outcome ? 'mt.dkWin' : 'mt.dkLoss');
      var ww = ctx.measureText(wtxt).width;
      ctx.fillStyle = outcome ? C.mint : C.red;
      roundRect(ctx, cx + 52, py + 88, ww + 22, 28, 14); ctx.fill();
      ctx.fillStyle = '#04120F'; ctx.textAlign = 'left';
      ctx.fillText(wtxt, cx + 63, py + 108);
      ctx.textAlign = 'center';
    }
    ctx.fillStyle = C.muted; ctx.font = scFont(15, 700);
    var subline = [m.bo ? T('mt.bo', { n: m.bo }) : '', set ? T('mt.setN', { n: set.number }) + ' · ' + mtDur(set.duration || 0) : ''].filter(Boolean).join(' · ');
    ctx.fillText(subline, cx, py + 142);
    ctx.textAlign = 'left';

    var opp = m.opponent || {};
    scTeamBadge(ctx, C, opp.code || opp.name || 'TBD', px + pw - 212, py + 44, 150, 84, true);
    ctx.fillStyle = C.ink2; ctx.font = scFont(16, 800); ctx.textAlign = 'center';
    ctx.fillText(String(opp.name || opp.code || ''), px + pw - 137, py + 150);
    ctx.textAlign = 'left';

    /* KILL / GOLD / 시간 */
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px + 24, py + ph - 40); ctx.lineTo(px + pw - 24, py + ph - 40); ctx.stroke();
    ctx.fillStyle = C.mint; ctx.font = scFont(12, 900);
    ctx.fillText('VOD', px + 30, py + ph - 15);
    ctx.fillStyle = C.muted; ctx.font = scFont(14, 700);
    ctx.fillText(T('summary.watchLine'), px + 78, py + ph - 15);
    ctx.textAlign = 'right'; ctx.fillStyle = C.ink2; ctx.font = scFont(13, 800);
    var t = set && set.team && set.team.dk ? set.team.dk : null;
    var o = set && set.team && set.team.opp ? set.team.opp : null;
    var objLine = t ? ('K ' + t.kills + ' : ' + (o ? o.kills : '-') + '   GOLD ' + (t.gold / 1000).toFixed(1) + 'k : ' + (o ? (o.gold / 1000).toFixed(1) + 'k' : '-')) : '';
    ctx.fillText(objLine + (m.time ? '   ·   ' + m.time + ' ' + T('mt.kst') : ''), px + pw - 30, py + ph - 15);
    ctx.textAlign = 'left';

    /* BAN / PICK 패널 (밴 기록이 없으면 한 줄짜리 안내로 줄입니다) */
    var hasBans = !!(set && set.bans && ((set.bans.dk && set.bans.dk.length) || (set.bans.opp && set.bans.opp.length)));
    var by = py + ph + 14, bh = hasBans ? 190 : 118;
    ctx.fillStyle = 'rgba(13,22,33,.62)';
    roundRect(ctx, px, by, pw, bh, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.075)'; ctx.lineWidth = 1.4;
    roundRect(ctx, px, by, pw, bh, 24); ctx.stroke();

    ctx.fillStyle = C.mint; ctx.font = scFont(14, 900);
    ctx.fillText('BAN / PICK', px + 26, by + 32);
    ctx.fillStyle = C.ink; ctx.font = scFont(20, 900);
    var banTitle = T('mt.banTitle', { n: set ? set.number : 1 });
    ctx.fillText(banTitle, px + 138, by + 33);
    ctx.fillStyle = C.dim; ctx.font = scFont(13, 700);
    ctx.fillText(T('mt.banSub') + (set && set.dkSide ? ' · ' + (set.dkSide === 'blue' ? '🔵 ' + T('mt.blue') : '🔴 ' + T('mt.red')) : ''), px + 26 + 138 + ctx.measureText(banTitle).width + 16, by + 33);

    /* 오른쪽 세트 탭 */
    var tabs = d.sets || [];
    var tabW = 86, tabH = 32, gapT = 6;
    var tx0 = px + pw - 26 - (tabs.length * (tabW + gapT) - gapT);
    tabs.forEach(function (s, i) {
      var on = set && Number(s.number) === Number(set.number);
      var x = tx0 + i * (tabW + gapT);
      ctx.fillStyle = on ? 'rgba(0,245,196,.22)' : 'rgba(255,255,255,.04)';
      roundRect(ctx, x, by + 14, tabW, tabH, 9); ctx.fill();
      ctx.strokeStyle = on ? 'rgba(0,245,196,.5)' : 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.2;
      roundRect(ctx, x, by + 14, tabW, tabH, 9); ctx.stroke();
      ctx.fillStyle = on ? C.ink : C.muted; ctx.font = scFont(12, 800); ctx.textAlign = 'center';
      var label = T('mt.setN', { n: s.number }) + (s.win == null ? '' : ' ' + T(s.win ? 'mt.shortWin' : 'mt.shortLose'));
      ctx.fillText(label, x + tabW / 2, by + 34);
      ctx.textAlign = 'left';
    });

    /* 밴 5:5 */
    var rowY = by + 64;
    if (hasBans) {
      scBanRow(ctx, C, (d.dk && (d.dk.code || 'DK')) || 'DK', px + 26, rowY, set.bans.dk, icons, false);
      scBanRow(ctx, C, opp.code || opp.name || 'TBD', px + 26, rowY + 62, set.bans.opp, icons, true);
    } else {
      ctx.fillStyle = C.dim; ctx.font = scFont(16, 600);
      ctx.fillText(T('mt.banNone'), px + 26, rowY + 4);
    }

    /* 5인 경기 스탯 */
    var ty = by + bh + 44;
    ctx.font = scFont(38, 900);
    ctx.fillStyle = C.ink; ctx.fillText('5 ', 64, ty);
    ctx.fillStyle = C.mint; ctx.fillText(T('mt.statsTitle'), 64 + ctx.measureText('5 ').width, ty);
    ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.font = scFont(15, 700);
    ctx.fillText(T('mt.statsSub', { n: set ? set.number : 1 }), 1016, ty);
    ctx.textAlign = 'left';

    var ry0 = ty + 16, rh = 112, gap2 = 5;
    var ph2 = rh * 5 + gap2 * 2;
    var grad = ctx.createLinearGradient(64, ry0, 1016, ry0 + ph2);
    grad.addColorStop(0, 'rgba(9,38,34,.84)'); grad.addColorStop(1, 'rgba(5,22,22,.80)');
    ctx.fillStyle = grad;
    roundRect(ctx, 64, ry0, 952, ph2, 26); ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,196,.20)'; ctx.lineWidth = 1.6;
    roundRect(ctx, 64, ry0, 952, ph2, 26); ctx.stroke();

    (set && set.players ? set.players : []).forEach(function (p, i) {
      var y = ry0 + 6 + i * rh;
      if (i) {
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(86, y - 3); ctx.lineTo(994, y - 3); ctx.stroke();
      }
      var isPick = p.key && p.key === myPick;
      if (isPick) {
        ctx.fillStyle = 'rgba(0,245,196,.10)';
        roundRect(ctx, 70, y + 2, 940, rh - 6, 14); ctx.fill();
      }
      var ix = 90, iy = y + 16, isz = 66;
      var icon = icons && p.champion ? icons[p.champion] : null;
      if (icon) {
        ctx.save();
        roundRect(ctx, ix, iy, isz, isz, 14); ctx.clip();
        ctx.drawImage(icon, ix, iy, isz, isz);
        ctx.restore();
        ctx.strokeStyle = isPick ? 'rgba(0,245,196,.7)' : 'rgba(0,245,196,.34)'; ctx.lineWidth = 1.6;
        roundRect(ctx, ix, iy, isz, isz, 14); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.06)';
        roundRect(ctx, ix, iy, isz, isz, 14); ctx.fill();
      }
      var app = p.key ? calPlayer(p.key) : null;
      var nm = app ? pName(app) : p.player;
      ctx.fillStyle = C.ink; ctx.font = scFont(30, 900);
      ctx.fillText(nm, 186, y + 50);
      var nw = ctx.measureText(nm).width;
      if (isPick) {
        ctx.fillStyle = 'rgba(0,245,196,.16)';
        roundRect(ctx, 186 + nw + 12, y + 28, 104, 26, 13); ctx.fill();
        ctx.strokeStyle = 'rgba(0,245,196,.5)'; ctx.lineWidth = 1.2;
        roundRect(ctx, 186 + nw + 12, y + 28, 104, 26, 13); ctx.stroke();
        ctx.fillStyle = C.mint; ctx.font = scFont(13, 900);
        ctx.fillText('★ MY PICK', 186 + nw + 21, y + 46);
      }
      ctx.fillStyle = C.muted; ctx.font = scFont(17, 600);
      ctx.fillText(champText(p.champion) + ' · ' + roleText(p.role), 186, y + 76);
      if (app) {
        ctx.fillStyle = C.dim; ctx.font = scFont(13, 800);
        ctx.fillText(pReal(app), 186, y + 100);
      }

      /* K/D/A */
      ctx.textAlign = 'center';
      var kx = 634;
      ctx.font = scFont(30, 900);
      var kstr = String(p.k) + ' / ' + String(p.d) + ' / ' + String(p.a);
      var kParts = [[String(p.k), C.ink], [' / ', C.dim], [String(p.d), C.red], [' / ', C.dim], [String(p.a), C.ink]];
      ctx.font = scFont(30, 900);
      var total = 0;
      kParts.forEach(function (pp) { total += ctx.measureText(pp[0]).width; });
      var kx0 = kx - total / 2;
      kParts.forEach(function (pp) {
        ctx.fillStyle = pp[1]; ctx.textAlign = 'left';
        ctx.fillText(pp[0], kx0, y + 60);
        kx0 += ctx.measureText(pp[0]).width;
      });
      ctx.textAlign = 'center'; ctx.fillStyle = C.dim; ctx.font = scFont(11, 800);
      ctx.fillText('K D A', kx, y + 84);

      /* 딜 비중 */
      var sx = 716, sw = 268;
      ctx.textAlign = 'left';
      ctx.fillStyle = C.mint; ctx.font = scFont(26, 900);
      ctx.fillText(p.damageShare == null ? '–' : p.damageShare + '%', sx, y + 56);
      ctx.fillStyle = C.dim; ctx.font = scFont(11, 800);
      ctx.textAlign = 'right';
      ctx.fillText(T('mt.share'), sx + sw, y + 50);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      roundRect(ctx, sx, y + 70, sw, 7, 4); ctx.fill();
      if (p.damageShare != null) {
        var wpx = Math.max(4, Math.min(sw, sw * (p.damageShare / 34)));
        var bg2 = ctx.createLinearGradient(sx, 0, sx + wpx, 0);
        bg2.addColorStop(0, '#00C49A'); bg2.addColorStop(1, '#00F5C4');
        ctx.fillStyle = bg2;
        roundRect(ctx, sx, y + 70, wpx, 7, 4); ctx.fill();
      }
      void kstr;
    });

    /* 꼬리 */
    var fy = Math.min(1240, ry0 + ph2 + 18);
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    roundRect(ctx, 64, fy, 730, 62, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,196,.22)'; ctx.lineWidth = 1.4;
    roundRect(ctx, 64, fy, 730, 62, 18); ctx.stroke();
    ctx.fillStyle = C.mint; ctx.font = scFont(12, 900);
    ctx.fillText('SET MVP', 92, fy + 24);
    var mvp = null;
    (set && set.players ? set.players : []).forEach(function (p) {
      if (mvp == null || (p.damageShare || 0) > (mvp.damageShare || 0)) mvp = p;
    });
    ctx.fillStyle = C.ink; ctx.font = scFont(19, 800);
    var mvpApp = mvp && mvp.key ? calPlayer(mvp.key) : null;
    ctx.fillText(fitText(ctx, mvp ? (mvpApp ? pName(mvpApp) : mvp.player) + ' · ' + champText(mvp.champion) + ' ' + mvp.k + '/' + mvp.d + '/' + mvp.a : '–', 320, 19, 800), 92, fy + 48);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(430, fy + 12); ctx.lineTo(430, fy + 50); ctx.stroke();
    ctx.fillStyle = C.mint; ctx.font = scFont(12, 900);
    ctx.fillText(T('summary.matchAlert'), 456, fy + 24);
    ctx.fillStyle = C.ink2; ctx.font = scFont(16, 700);
    ctx.fillText(fitText(ctx, T('summary.alertBody'), 300, 16, 700), 456, fy + 48);

    ctx.textAlign = 'right';
    ctx.fillStyle = C.mint; ctx.font = scFont(17, 800);
    ctx.fillText('dk-signal.vercel.app', 1016, fy + 24);
    ctx.fillStyle = C.dim; ctx.font = scFont(12, 600);
    ctx.fillText(T('summary.basis', { time: pad(now.getHours()) + ':' + pad(now.getMinutes()) }), 1016, fy + 48);
    ctx.textAlign = 'left';
    return canvas;
  }

  /* 밴 한 줄: 팀 코드 + 5개 챔피언 (흑백 + 붉은 사선) */
  function scBanRow(ctx, C, team, x, y, bans, icons, isOpp) {
    ctx.fillStyle = C.mint; ctx.font = scFont(12, 900);
    ctx.fillText(String(team || '').toUpperCase(), x, y + 12);
    ctx.fillStyle = C.dim; ctx.font = scFont(10, 800);
    ctx.fillText('BAN', x, y + 28);
    var bx = x + 74, size = 52, gap = 10;
    var list = bans || [];
    if (!list.length) {
      ctx.fillStyle = C.dim; ctx.font = scFont(14, 700);
      ctx.fillText(T('mt.banEmpty'), bx, y + 16);
      return;
    }
    list.slice(0, 5).forEach(function (b, i) {
      var ix = bx + i * (size + gap);
      var icon = icons && b ? icons[b] : null;
      if (icon) {
        ctx.save();
        roundRect(ctx, ix, y - 18, size, size, 11); ctx.clip();
        try { ctx.filter = 'grayscale(.85) brightness(.9)'; } catch (e) {}
        ctx.drawImage(icon, ix, y - 18, size, size);
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.06)';
        roundRect(ctx, ix, y - 18, size, size, 11); ctx.fill();
      }
      ctx.strokeStyle = isOpp ? 'rgba(255,107,122,.32)' : 'rgba(0,245,196,.28)'; ctx.lineWidth = 1.2;
      roundRect(ctx, ix, y - 18, size, size, 11); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,107,122,.85)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ix + 8, y - 18 + size - 8);
      ctx.lineTo(ix + size - 8, y - 18 + 8);
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = scFont(11, 600); ctx.textAlign = 'center';
      ctx.fillText(fitText(ctx, champText(b), size, 11, 600), ix + size / 2, y + 48);
      ctx.textAlign = 'left';
    });
  }

  function renderSummaryPreview() {
    var stage = $('#scStage'), img = $('#scImg'), loading = $('#scLoading');
    if (!stage) return;
    if (loading) loading.hidden = false;
    if (img) img.hidden = true;

    var m = summaryMatch();
    scState.failed = '';
    if (!m) {
      scState.mode = 'solo';
      scState.sets = [];
      drawSoloPreview();
      return;
    }
    if (m.state !== 'completed') {
      scState.mode = 'matchday';
      scState.sets = [];
      drawMatchDayPreview(m);
      return;
    }
    scState.mode = 'result';
    var hit = mtCache[m.id];
    if (hit) {
      scState.sets = (hit.sets || []).filter(function (s) { return s.state === 'completed'; });
      scState.idx = Math.min(scState.idx, Math.max(0, scState.sets.length - 1));
      drawResultPreview(m, hit);
      return;
    }
    if (scState.loading) return;
    scState.loading = true;
    apiGet('./api/match?id=' + encodeURIComponent(m.id) + '&lang=' + lang()).then(function (d) {
      scState.loading = false;
      if (d && d.ok) {
        mtCache[m.id] = d;
        scState.sets = (d.sets || []).filter(function (s) { return s.state === 'completed'; });
        scState.idx = 0;
        renderSummaryPreview();
      } else {
        scState.failed = T('mt.loadFail');
        drawMatchDayPreview(m);
      }
    }).catch(function () {
      scState.loading = false;
      scState.failed = T('mt.loadFail');
      drawMatchDayPreview(m);
    });
  }

  function finishPreview(canvas) {
    var img = $('#scImg'), loading = $('#scLoading');
    var url = canvas.toDataURL('image/png');
    scImage = { canvas: canvas, url: url };
    if (loading) loading.hidden = true;
    if (img) { img.src = url; img.hidden = false; }
    var open = $('#scOpen');
    if (open) { open.href = url; open.hidden = false; }
    var save = $('#scSave');
    if (save) save.disabled = false;
    renderScSets();
  }

  function drawSoloPreview() {
    Promise.all([ensureFont(), loadImage('./logo/dpluskia.svg')]).then(function (res) {
      var canvas;
      try {
        canvas = drawSummaryCard(res[1]);
      } catch (e) {
        var loading = $('#scLoading');
        if (loading) { loading.textContent = T('summary.saveFail'); loading.hidden = false; }
        return;
      }
      finishPreview(canvas);
    });
  }

  function drawMatchDayPreview(m) {
    Promise.all([ensureFont(), loadImage('./logo/dpluskia.svg')]).then(function (res) {
      var canvas;
      try {
        canvas = drawMatchDayCard(res[1], m, summaryData());
      } catch (e) {
        var loading = $('#scLoading');
        if (loading) { loading.textContent = T('summary.saveFail'); loading.hidden = false; }
        return;
      }
      finishPreview(canvas);
    });
  }

  function drawResultPreview(m, d) {
    var set = summarySet();
    if (!set) { drawMatchDayPreview(m); return; }
    var names = [];
    (d.sets || []).forEach(function (s) {
      (s.players || []).forEach(function (p) { if (p.champion) names.push(p.champion); });
      if (s.bans) { s.bans.dk.forEach(function (b) { names.push(b); }); s.bans.opp.forEach(function (b) { names.push(b); }); }
    });
    Promise.all([ensureFont(), loadImage('./logo/dpluskia.svg'), loadChampIcons(names)]).then(function (res) {
      var canvas;
      try {
        canvas = drawMatchResultCard(res[1], m, d, set, res[2]);
      } catch (e) {
        var loading = $('#scLoading');
        if (loading) { loading.textContent = T('summary.saveFail'); loading.hidden = false; }
        return;
      }
      finishPreview(canvas);
    });
  }

  function renderScSets() {
    var host = $('#scSets');
    var note = $('#scNote');
    if (!host) return;
    var show = scState.mode === 'result' && scState.sets.length > 0;
    host.hidden = !show;
    if (note) {
      note.textContent = scState.failed || (show ? T('summary.cardHint') : T('summary.note'));
    }
    if (!show) { host.innerHTML = ''; return; }
    host.innerHTML = scState.sets.map(function (s, i) {
      var on = i === scState.idx;
      return '<button class="sc-set' + (on ? ' is-on' : '') + '" type="button" role="tab" aria-selected="' + on + '" data-sc-set="' + i + '">' +
        T('summary.setCard', { n: s.number }) +
        (s.win == null ? '' : '<em class="' + (s.win ? 'is-w' : 'is-l') + '">' + esc(T(s.win ? 'mt.win' : 'mt.lose')) + '</em>') +
      '</button>';
    }).join('');
  }

  function openSummary() {
    var modal = $('#summaryModal');
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('is-sheet');
    renderSummaryPreview();
    var sheet = modal.querySelector('.lg-sheet');
    if (sheet) { try { sheet.focus({ preventScroll: true }); } catch (e) {} }
  }
  function closeSummary() {
    var modal = $('#summaryModal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('is-sheet');
  }

  function summaryFileName() {
    var d = new Date();
    var base = 'dk-signal-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    if (scState.mode === 'result') {
      var s = summarySet();
      if (s) base += '-s' + s.number;
    } else if (scState.mode === 'matchday') {
      base += '-matchday';
    }
    return base + '.png';
  }

  function saveSummary() {
    if (!scImage) return;
    var canvas = scImage.canvas;
    try {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (!blob) { toast(T('summary.saveFail')); return; }
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = summaryFileName();
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
          toast(T('summary.saved'));
        }, 'image/png');
        return;
      }
      var a2 = document.createElement('a');
      a2.href = scImage.url; a2.download = summaryFileName();
      document.body.appendChild(a2); a2.click(); a2.remove();
      toast(T('summary.saved'));
    } catch (e) { toast(T('summary.saveFail')); }
  }

  function shareSummary() {
    if (!scImage) return;
    var canvas = scImage.canvas;
    function fallback() { toast(T('summary.shareNo')); }
    if (!canvas.toBlob || !navigator.canShare) { fallback(); return; }
    canvas.toBlob(function (blob) {
      if (!blob) { fallback(); return; }
      try {
        var file = new File([blob], summaryFileName(), { type: 'image/png' });
        if (!navigator.canShare({ files: [file] })) { fallback(); return; }
        navigator.share({ files: [file], title: T('summary.title') }).catch(function () {});
      } catch (e) { fallback(); }
    }, 'image/png');
  }

  /* ---------- 진행 중인 투표 팝업 ---------- */
  var VOTE_POP_KEY = 'dk.signal.votePop.hide';

  function votePopMd(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '';
    var l = lang();
    if (l === 'vi' || l === 'th' || l === 'id' || l === 'es' || l === 'pt') return m[3] + '/' + m[2];
    if (l === 'en') return m[2] + '/' + m[3];
    return m[2] + '.' + m[3];
  }

  function votePopItemHTML(v) {
    var start = votePopMd(v.start) || votePopMd(v.deadline);
    var end = votePopMd(v.deadline);
    var period = T('votePop.period', { start: start, end: end });
    var dday = ddayText(daysUntil(v.deadline));
    return '<li class="vp-item">' +
      '<span class="vp-top"><span class="vp-event">' + esc(L(v.event)) + '</span>' +
        '<span class="vp-dday">' + esc(dday) + '</span></span>' +
      '<span class="vp-name">' + esc(L(v.title)) + '</span>' +
      '<span class="vp-cand">' + (v.dk ? '<em class="vote-dk">DK</em>' : '') + esc(L(v.candidate)) +
        (L(v.candidateNote) ? '<i>' + esc(L(v.candidateNote)) + '</i>' : '') + '</span>' +
      '<span class="vp-when">' + esc(period) + '</span>' +
      '<a class="vp-go" href="' + esc(v.url) + '" target="_blank" rel="noopener">' + esc(T('votePop.cta')) + '</a>' +
    '</li>';
  }

  function renderVotePop() {
    var list = $('#votePopList');
    var sub = $('#votePopSub');
    var open = openVotes();
    if (list) list.innerHTML = open.map(votePopItemHTML).join('');
    if (sub) sub.textContent = T('votePop.sub', { n: open.length });
  }

  function openVotePop() {
    if (!openVotes().length) return;
    var modal = $('#votePop');
    if (!modal) return;
    renderVotePop();
    modal.hidden = false;
    document.body.classList.add('is-sheet');
    var sheet = modal.querySelector('.lg-sheet');
    if (sheet) { try { sheet.focus({ preventScroll: true }); } catch (e) {} }
  }
  function closeVotePop() {
    var modal = $('#votePop');
    if (modal) modal.hidden = true;
    document.body.classList.remove('is-sheet');
  }
  function hideVotePopToday() {
    var d = new Date();
    store.set(VOTE_POP_KEY, d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
    closeVotePop();
  }
  function initVotePop() {
    if (!openVotes().length) return;
    var d = new Date();
    var today = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    if (store.get(VOTE_POP_KEY, '') === today) return;
    setTimeout(function () {
      var modal = $('#votePop');
      if (!modal || !modal.hidden) return;
      if (document.hidden) return;
      openVotePop();
    }, 900);
  }

  /* ---------- 인앱 유튜브 플레이어 (찜 목록 연속 재생 · 다음 영상 · MY LIST) ---------- */
  var vpLastFocus = null;
  var vp = { kind: 'video', id: '', title: '', queue: [], index: 0 };

  function vpSrc(kind, id) {
    var base = kind === 'list'
      ? 'https://www.youtube.com/embed/videoseries?list=' + encodeURIComponent(id) + '&'
      : 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?';
    var origin = '';
    try {
      if (location.origin && location.origin.indexOf('http') === 0) origin = '&origin=' + encodeURIComponent(location.origin);
    } catch (e) {}
    return base + 'autoplay=1&rel=0&playsinline=1&modestbranding=1&enablejsapi=1' + origin;
  }

  function vpCurrent() {
    return vp.queue.length ? vp.queue[vp.index] : null;
  }
  function vpCurrentId() {
    var cur = vpCurrent();
    return cur ? cur.v.id : (vp.kind === 'video' ? vp.id : '');
  }
  function vpCurrentTitle() {
    var cur = vpCurrent();
    return cur ? (L(cur.v.point) || L(cur.v.match)) : vp.title;
  }

  function openPlayer(kind, id, title, entries, index) {
    var modal = $('#vpModal');
    if (!modal || !id) return;
    vpLastFocus = document.activeElement;
    vp = { kind: kind, id: id, title: title || '', queue: [], index: 0 };
    if (kind === 'video' && Array.isArray(entries) && entries.length) {
      var at = typeof index === 'number' ? index : -1;
      if (at < 0) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i] && entries[i].v && entries[i].v.id === id) { at = i; break; }
        }
      }
      if (at > -1) { vp.queue = entries.slice(); vp.index = at; }
    }
    modal.hidden = false;
    document.body.classList.add('vp-locked');
    playCurrent();
    var close = $('#vpClose');
    if (close) { try { close.focus(); } catch (e) {} }
  }

  /* 대기열의 현재 영상을 틀고 플레이어 주변(제목·다음·MY LIST)을 다시 그립니다. */
  function playCurrent() {
    var frame = $('#vpFrame');
    if (frame) {
      if (vp.kind === 'list') {
        frame.title = vp.title || T('video.playerTitle');
        frame.src = vpSrc('list', vp.id);
      } else {
        var id = vpCurrentId();
        frame.title = vpCurrentTitle() || T('video.playerTitle');
        frame.src = id ? vpSrc('video', id) : 'about:blank';
      }
    }
    renderPlayerChrome();
  }

  function vpMove(delta) {
    if (!vp.queue.length) return;
    var i = vp.index + delta;
    if (i < 0 || i >= vp.queue.length) return;
    vp.index = i;
    playCurrent();
  }

  /* 찜 목록 전체를 대기열로 (현재 영상이 찜 안에 있으면 그 자리부터) */
  function playQueueFrom(entries, id) {
    if (!entries || !entries.length) return;
    var at = 0;
    for (var i = 0; i < entries.length; i++) if (entries[i].v.id === id) { at = i; break; }
    openPlayer('video', entries[at].v.id, '', entries, at);
  }

  function renderPlayerChrome() {
    var cur = vpCurrent();
    var id = vpCurrentId();
    var mode = $('#vpModeText');
    if (mode) {
      mode.textContent = T(vp.queue.length ? 'video.playing' : (vp.kind === 'list' ? 'video.playlistMode' : 'video.videoMode'));
    }
    var pos = $('#vpPos');
    if (pos) {
      pos.hidden = !vp.queue.length;
      pos.textContent = vp.queue.length ? ((vp.index + 1) + ' / ' + vp.queue.length) : '';
    }
    var head = $('#vpTitle');
    if (head) head.textContent = vpCurrentTitle() || '';

    var meta = $('#vpMeta');
    var tags = $('#vpTags');
    if (!cur) {
      if (meta) meta.textContent = vp.kind === 'list' ? T('video.playlistMode') : '';
      if (tags) tags.innerHTML = '';
    } else {
      var v = cur.v;
      if (meta) {
        meta.textContent = [whoText(cur), v.channel, v.year].filter(Boolean).join(' · ');
      }
      if (tags) {
        tags.innerHTML =
          '<span class="vc-cat vc-cat-' + esc(videoCat(cur)) + '">' + esc(catText(videoCat(cur))) + '</span>' +
          videoChamps(cur).map(function (key) { return '<span class="vc-tag is-champ">' + esc(tagText(key)) + '</span>'; }).join('') +
          (v.team ? '<span class="vc-team' + (v.team === 'DK' ? ' is-now' : '') + '">' + esc(v.team) + '</span>' : '') +
          '<span class="vc-yr">' + esc(v.year) + '</span>' +
          (isFav(v.id) && favs.length > 1
            ? '<button class="vc-tag vp-use-queue" type="button" id="vpUseQueue" style="font-family:inherit;cursor:pointer">' +
              esc(T('video.myList')) + ' ▶</button>' : '');
      }
    }

    var star = $('#vpStar');
    var on = isFav(id);
    if (star) {
      star.classList.toggle('is-on', on);
      star.setAttribute('aria-pressed', on ? 'true' : 'false');
      star.textContent = T(on ? 'video.favDone' : 'video.favAdd');
      star.hidden = !id;
    }

    var open = $('#vpOpen');
    if (open) {
      open.href = vp.kind === 'list'
        ? ('https://www.youtube.com/playlist?list=' + encodeURIComponent(vp.id))
        : ytWatch(id || vp.id);
    }

    /* 다음 영상 미리보기 */
    var nextBox = $('#vpNext');
    if (nextBox) {
      var next = vp.queue.length && vp.index + 1 < vp.queue.length ? vp.queue[vp.index + 1] : null;
      var showNext = !!vp.queue.length;
      nextBox.hidden = !showNext;
      if (showNext) {
        var nt = $('#vpNextThumb'), ntB = $('#vpNextTitle'), ntM = $('#vpNextMeta'), nBtn = $('#vpNextBtn');
        if (next) {
          if (nt) { nt.src = ytThumb(next.v.id); nt.parentNode.hidden = false; }
          if (ntB) ntB.textContent = L(next.v.point) || L(next.v.match);
          if (ntM) ntM.textContent = [whoText(next), next.v.len].filter(Boolean).join(' · ');
          if (nBtn) nBtn.hidden = false;
        } else {
          if (nt) { nt.parentNode.hidden = true; nt.removeAttribute('src'); }
          if (ntB) ntB.textContent = T('video.lastOne');
          if (ntM) ntM.textContent = (vp.index + 1) + ' / ' + vp.queue.length;
          if (nBtn) nBtn.hidden = true;
        }
      }
    }

    /* MY LIST · 찜 목록 */
    var qBox = $('#vpQueue');
    var qList = $('#vpQueueList');
    var qCount = $('#vpQueueCount');
    var list = favEntries();
    if (qBox) qBox.hidden = list.length === 0;
    if (qCount) qCount.textContent = list.length ? T('video.count', { n: list.length }) : '';
    if (qList) {
      qList.innerHTML = list.map(function (e, i) {
        var now = e.v.id === id;
        return '<li><button class="vp-qitem' + (now ? ' is-now' : '') + '" type="button" data-queue-play="' + esc(e.v.id) + '"' +
            ' aria-current="' + (now ? 'true' : 'false') + '">' +
          '<span class="vp-qn">' + (i + 1) + '</span>' +
          '<span class="vp-qthumb"><img loading="lazy" src="' + ytThumb(e.v.id) + '" alt=""></span>' +
          '<span class="vp-qbody"><b>' + esc(L(e.v.point) || L(e.v.match)) + '</b>' +
            '<span>' + esc([whoText(e), videoChamps(e).map(tagText).join(' · '), e.v.team].filter(Boolean).join(' · ')) + '</span></span>' +
          '<span class="vp-qend">' + (now
            ? '<span class="vp-qlive" aria-hidden="true"><i></i><i></i><i></i></span>'
            : '<span class="vp-qstar" aria-hidden="true">★</span>') +
            '<span class="vp-qlen">' + esc(e.v.len) + '</span></span>' +
        '</button></li>';
      }).join('');
    }
    var note = $('#vpNote');
    if (note) note.textContent = T('video.embedNote');
  }

  /* 닫을 때 iframe src 를 비워 소리가 이어지지 않게 합니다. */
  function closePlayer() {
    var modal = $('#vpModal');
    if (!modal || modal.hidden) return;
    var frame = $('#vpFrame');
    if (frame) frame.src = 'about:blank';
    modal.hidden = true;
    document.body.classList.remove('vp-locked');
    vp = { kind: 'video', id: '', title: '', queue: [], index: 0 };
    if (vpLastFocus && vpLastFocus.focus) { try { vpLastFocus.focus(); } catch (e) {} }
    vpLastFocus = null;
  }

  /* YouTube iframe 이 보내는 "재생 끝" 신호로 다음 영상을 자동 재생합니다. */
  (function watchVpEnd() {
    window.addEventListener('message', function (ev) {
      var host = '';
      try { host = new URL(ev.origin).hostname; } catch (e) { return; }
      if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return;
      var data = ev.data;
      try { if (typeof data === 'string') data = JSON.parse(data); } catch (e) { return; }
      if (!data || data.event !== 'infoDelivery' || !data.info) return;
      if (Number(data.info.playerState) === 0) vpMove(1);
    });
    var frame = $('#vpFrame');
    if (frame) {
      frame.addEventListener('load', function () {
        try {
          frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
        } catch (e) {}
      });
    }
  })();

  /* ---------- 디플러스 기아 공식 유튜브 최신 영상 (/api/dk-youtube) ---------- */
  function dkDate(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return '';
    var y = d.getFullYear(), mo = d.getMonth() + 1, da = d.getDate();
    if (lang() === 'en') return window.I18N.shortDate(d) + ', ' + y;
    if (lang() === 'ja' || lang() === 'zh' || lang() === 'tw') return y + '年' + mo + '月' + da + '日';
    return y + '. ' + mo + '. ' + da + '.';
  }

  function compactViews(n) {
    var v = Number(n) || 0;
    if (lang() === 'ko' || lang() === 'ja') {
      if (v >= 10000) return (Math.round(v / 1000) / 10) + (lang() === 'ko' ? '만' : '万');
    } else if (v >= 1000000) {
      return (Math.round(v / 100000) / 10) + 'M';
    } else if (v >= 1000) {
      return (Math.round(v / 100) / 10) + 'K';
    }
    return String(v);
  }

  function renderDkYoutube() {
    var host = $('#dkYtGrid');
    if (!host) return;
    var data = LIVE.dkYt;
    var note = $('#dkYtNote');
    var count = $('#dkYtCount');
    var list = data && Array.isArray(data.videos) ? data.videos : [];

    if (!list.length) {
      var msg = (LIVE.offline || !canUseApi() || (data && data.ok === false)) ? 'video.dkFallback' : 'video.dkEmpty';
      host.innerHTML = '<p class="dy-empty">' + esc(T(msg)) + '</p>';
      if (count) count.textContent = '';
      if (note) note.textContent = '';
      return;
    }

    host.innerHTML = list.slice(0, 10).map(function (v) {
      return '<button class="dy-item" type="button" data-play="' + esc(v.id) + '" data-title="' + esc(v.title) + '"' +
          ' aria-label="' + esc(v.title) + '">' +
        '<span class="dy-thumb"><img loading="lazy" src="' + esc(v.thumb) + '" alt="" width="320" height="180">' +
          '<i class="dy-play" aria-hidden="true">▶</i></span>' +
        '<b class="dy-title">' + esc(v.title) + '</b>' +
        '<span class="dy-meta"><span class="dy-date">' + esc(dkDate(v.published)) + '</span>' +
          (v.views ? '<span class="dy-views">' + esc(T('video.dkViews', { n: compactViews(v.views) })) + '</span>' : '') + '</span>' +
      '</button>';
    }).join('');

    if (count) count.textContent = T('video.count', { n: Math.min(list.length, 10) });
    if (note) {
      if (data.stale || data.source === 'snapshot') note.textContent = T('video.dkFallback');
      else if (data.fetchedAt) note.textContent = T('video.dkNote', { time: window.I18N.stamp(new Date(data.fetchedAt)) });
      else note.textContent = '';
    }
  }

  /* 최근 공식 경기 다시보기: /api/official recent + 풀영상 VOD·하이라이트 */
  function renderVideoVod() {
    var host = $('#videoVodList');
    if (!host) return;
    var data = LIVE.official;
    var rows = data && data.ok && Array.isArray(data.recent) ? data.recent : [];
    var note = $('#videoVodNote');
    var hint = $('#videoVodHint');

    if (!rows.length) {
      /* 서버 연결 전: 저장해 둔 2026 월즈 여정에 유튜브 검색 링크만 붙입니다. */
      host.innerHTML = DK_PATH.map(function (g) {
        var q = [T('video.worldsQuery'), 'DK vs ' + g.opp, L(g.date), T('video.highlight')].join(' ');
        return '<li class="path-row has-vid">' +
          '<div class="p-line">' +
            '<span class="p-round">' + L(g.round) + '</span>' +
            '<span class="p-teams">DK <b class="' + (g.win ? 'w' : 'l') + '">' + esc(g.score) + '</b> ' + esc(g.opp) + '</span>' +
            '<span class="p-res ' + (g.win ? 'w' : 'l') + '">' + (g.win ? T('result.win') : T('result.lose')) + ' · ' + L(g.date) + '</span>' +
          '</div>' +
          '<div class="p-vid"><a class="vid-chip is-hl" href="' + ytSearch(q) + '" target="_blank" rel="noopener">' + T('video.highlight') + ' ↗</a></div>' +
        '</li>';
      }).join('');
      if (note) note.textContent = T('video.vodFallbackNote');
      if (hint) hint.hidden = true;
      return;
    }

    host.innerHTML = rows.slice(0, 6).map(function (g) {
      var opp = g.opponent || {};
      var win = g.win === true ? 'w' : (g.win === false ? 'l' : '');
      var res = g.win === true ? T('result.win') : (g.win === false ? T('result.lose') : '');
      return '<li class="path-row has-vid">' +
        '<div class="p-line">' +
          '<span class="p-round">' + esc(blockText(g.block) || leagueName(g.league) || '') + '</span>' +
          '<span class="p-teams">DK <b class="' + win + '">' + esc(g.score || '-') + '</b> ' + esc(opp.code || opp.name || '') + '</span>' +
          '<span class="p-res ' + win + '">' + (res ? res + ' · ' : '') + esc(eventDate(g)) + '</span>' +
        '</div>' +
        '<div class="p-vid">' + matchVideosHTML(g) + '</div>' +
      '</li>';
    }).join('');
    if (note) {
      note.textContent = T('video.vodNote', { time: data.fetchedAt ? clockOf(new Date(data.fetchedAt)) : '?' });
    }
    if (hint) {
      hint.hidden = false;
      hint.textContent = T('video.searchNote');
    }
  }

  function renderVideoPanel() {
    var more = $('#videoMore');
    if (more) more.href = CHANNELS.dkYoutube;
    var search = $('#videoSearch');
    if (search && search.value !== state.videoQuery) search.value = state.videoQuery;
    renderLiveHero();
    renderVideoChannels();
    renderVideoStations();
    renderDkYoutube();
    renderPlaylists();
    renderVideoChamps();
    renderVideoCats();
    renderVideoFilters();
    renderMineRow();
    renderVideoList();
    renderVideoVod();
    var hint = $('#videoArchiveHint');
    if (hint) hint.textContent = T('video.archiveHint');
    var note = $('#vpNote');
    if (note) note.textContent = T('video.embedNote');
    var close = $('#vpClose');
    if (close) close.setAttribute('aria-label', T('video.close'));
    if (!$('#vpModal').hidden) renderPlayerChrome();
  }

  /* ---------- 한 줄 응원 ---------- */
  function getCheers() {
    try {
      var raw = localStorage.getItem(CHEER_KEY + state.player);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function setCheers(list) {
    store.set(CHEER_KEY + state.player, JSON.stringify(list.slice(0, 5)));
  }
  function renderCheer() {
    var p = current();
    var input = $('#cheerInput');
    if (input) input.placeholder = T('cheer.placeholder', { name: pName(p) });
    var list = getCheers();
    var host = $('#cheerList');
    var empty = $('#cheerEmpty');
    var count = $('#cheerCount');
    if (count) {
      count.textContent = lang() === 'en'
        ? (list.length === 1 ? '1 line' : list.length + ' lines')
        : T('cheer.count', { n: list.length });
    }
    if (empty) {
      empty.hidden = list.length > 0;
      empty.textContent = T('cheer.empty');
    }
    if (!host) return;
    host.innerHTML = '';
    list.forEach(function (ch, i) {
      var li = document.createElement('li');
      li.className = 'cheer-item';
      var b = document.createElement('span');
      b.className = 'cb';
      b.textContent = pAvatar(p);
      var txt = document.createElement('span');
      txt.className = 'ct';
      txt.textContent = ch.text;
      var when = document.createElement('span');
      when.className = 'cd';
      when.textContent = relTime(ch.t || Date.now());
      var del = document.createElement('button');
      del.className = 'cx';
      del.type = 'button';
      del.setAttribute('data-cheer', String(i));
      del.setAttribute('aria-label', T('cheer.delete'));
      del.textContent = '×';
      li.appendChild(b); li.appendChild(txt); li.appendChild(when); li.appendChild(del);
      host.appendChild(li);
    });
  }
  function addCheer(text) {
    var list = getCheers();
    list.unshift({ t: Date.now(), text: text });
    setCheers(list);
    renderCheer();
  }

  /* ---------- 알림 설정 ---------- */
  function renderNotify() {
    var host = $('#soloNotifyList');
    if (host) {
      host.innerHTML = PLAYERS.map(function (p) {
        var t = tally(recent(p, 5));
        var on = isSoloOn(p.key);
        return '<li class="nr">' +
          '<span class="nr-av">' + pAvatar(p) + '</span>' +
          '<span class="nr-text"><b>' + pName(p) + '<em>' + p.pos + '</em></b><span>' + T('notify.soloRow', { w: t.w, l: t.l }) + '</span></span>' +
          '<button class="toggle sm" type="button" data-solo-toggle="' + p.key + '" role="switch" aria-checked="' + on + '"' +
            ' aria-label="' + T(on ? 'notify.toggleOn' : 'notify.toggleOff', { name: pName(p) }) + '"><span></span></button>' +
        '</li>';
      }).join('');
    }
    $$('[data-official-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-checked', String(officialOn));
      btn.setAttribute('aria-label', T(officialOn ? 'notify.officialToggleOn' : 'notify.officialToggleOff'));
    });
    $$('[data-live-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-checked', String(liveAlerts));
      btn.setAttribute('aria-label', T(liveAlerts ? 'notify.liveToggleOn' : 'notify.liveToggleOff'));
    });
    $$('[data-notice-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-checked', String(noticeAlerts));
      btn.setAttribute('aria-label', T(noticeAlerts ? 'notify.noticeToggleOn' : 'notify.noticeToggleOff'));
    });
    var sum = $('#notifySummary');
    if (sum) {
      var n = PLAYERS.filter(function (p) { return isSoloOn(p.key); }).length + (officialOn ? 1 : 0) + (liveAlerts ? 1 : 0) + (noticeAlerts ? 1 : 0);
      sum.textContent = n ? T('notify.summaryOn', { n: n }) : T('notify.summaryOff');
    }
    setNote('');
  }

  function notifyStatusText() {
    var p = current();
    if (isSoloOn(p.key) && officialOn && liveAlerts) return T('notify.statusBoth', { name: pName(p) }) + ' · ' + T('notify.statusLive');
    if (isSoloOn(p.key) && (officialOn || liveAlerts)) return T('notify.statusBoth', { name: pName(p) });
    if (isSoloOn(p.key)) return T('notify.statusSolo', { name: pName(p) });
    if (officialOn) return T('notify.statusOfficial');
    if (liveAlerts) return T('notify.statusLive');
    return T('notify.statusNone');
  }

  /* ---------- 솔로랭크 카드 ---------- */
  function metaText(p) {
    var r = recent(p, 5);
    var t = tally(r);
    var src = LIVE.soloSource === 'riot' ? T('solo.srcRiot') : T('solo.srcSnapshot');
    return T('solo.meta', {
      riotId: p.riotId, n: r.length, w: t.w, l: t.l,
      stamp: window.I18N.stamp(state.checked), src: src
    });
  }

  function tierHTML(p) {
    return '<span class="tier-chip"><span class="tier-dot"></span>' + tierText(p) + '<span class="tc-sep">·</span>' + lpText(p) + '</span>' +
      '<span class="tier-meta">' + recordText(p) + '</span>';
  }

  function tableHTML(p, filter) {
    var rows = p.matches.filter(function (m) {
      return filter === 'all' || (filter === 'win' ? m.win : !m.win);
    });
    if (!rows.length) return '<p class="empty">' + T('solo.empty') + '</p>';
    var body = rows.map(function (m) {
      return '<tr>' +
        '<td class="c-when">' + matchDate(m.d) + ' ' + m.t + (m.srv ? '<span class="srv">' + m.srv + '</span>' : '') + '</td>' +
        '<td class="c-champ">' + champText(m.champ) + matchTagsHTML(m.matchId) + '</td>' +
        '<td class="c-role">' + roleText(m.role) + '</td>' +
        '<td class="c-res"><span class="badge ' + (m.win ? 'win' : 'lose') + '">' + T(m.win ? 'result.win' : 'result.lose') + '</span></td>' +
        '<td class="c-kda">' + m.kda + (m.perfect ? '<span class="perfect" title="' + T('solo.perfect') + '">P</span>' : '') + '</td>' +
        '<td class="c-dur">' + m.dur + '</td>' +
      '</tr>';
    }).join('');
    return '<table class="matches"><thead><tr>' +
      '<th class="c-when">' + T('solo.thWhen') + '</th><th class="c-champ">' + T('solo.thChamp') + '</th><th class="c-role">' + T('solo.thRole') + '</th>' +
      '<th class="c-res">' + T('solo.thResult') + '</th><th class="c-kda">' + T('solo.thKda') + '</th><th class="c-dur">' + T('solo.thDur') + '</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderSolo() {
    var p = current();
    var moreLabel = p.key === 'delight' ? T('solo.moreUgg') : T('solo.moreOpgg');
    $('#soloMeta').textContent = metaText(p);
    $('#tierRow').innerHTML = tierHTML(p);
    $('#soloTable').innerHTML = tableHTML(p, 'all');
    $('#soloOpgg').textContent = p.statsLabel;
    $('#soloOpgg').href = p.opgg;
    $('#soloMore').href = p.opgg;
    $('#soloMore').textContent = moreLabel;
    $('#soloNoteFeed').textContent = L(p.note) || '';

    var links = $('#soloLinks');
    if (links) links.innerHTML = streamLinksHTML(p);

    var meta2 = $('#soloMeta2');
    if (meta2) {
      meta2.textContent = metaText(p);
      $('#soloTable2').innerHTML = tableHTML(p, state.filter);
      $('#soloOpgg2').textContent = p.statsLabel;
      $('#soloOpgg2').href = p.opgg;
      $('#soloMore2').href = p.opgg;
      $('#soloMore2').textContent = moreLabel;
      $('#soloNote').textContent = L(p.note) || '';
      $('#soloPanelMeta').textContent = T('solo.panelMeta', { name: pName(p), n: p.matches.length });
    }
    var title = $('#soloTitle');
    if (title) title.textContent = T('solo.title');
  }

  /* ================= 경기로그: 솔로랭크 | 공식 경기 ================= */
  var MT_VIEW_KEY = 'dk.signal.matchView';
  var MT_ID_KEY = 'dk.signal.matchId';
  var mtCache = {};
  var mtState = {
    view: store.get(MT_VIEW_KEY, 'solo') === 'official' ? 'official' : 'solo',
    id: store.get(MT_ID_KEY, ''),
    set: 0,
    loading: false,
    error: '',
    tried: {}
  };

  function mtOfficial() { return LIVE.official && LIVE.official.ok ? LIVE.official : null; }

  /* 최근 공식 경기(최신순) + 아직 안 끝난 다음 경기 */
  function mtList() {
    var off = mtOfficial();
    if (!off) return [];
    var out = [];
    var seen = {};
    function add(g) {
      if (!g || !g.id || seen[g.id]) return;
      seen[g.id] = true;
      out.push(g);
    }
    if (off.next) add(off.next);
    (off.recent || []).forEach(add);
    return out;
  }
  function mtFind(id) {
    var list = mtList();
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return null;
  }
  function mtDefaultId() {
    var list = mtList();
    if (!list.length) return '';
    var done = list.filter(function (g) { return g.state === 'completed'; });
    return (done[0] || list[0]).id;
  }
  function mtCurrentId() {
    if (mtState.id && mtFind(mtState.id)) return mtState.id;
    return mtDefaultId();
  }
  function mtCurrent() { return mtFind(mtCurrentId()); }
  function mtDetail() { return mtCache[mtCurrentId()] || null; }

  function mtTeamLabel(code, name) { return code || name || 'TBD'; }
  function mtHttps(url) { return String(url || '').replace(/^http:\/\//, 'https://'); }
  function mtLogo(t, cls) {
    if (!t) return '';
    var label = mtTeamLabel(t.code, t.name);
    var img = t.image ? '<img class="' + cls + '" src="' + esc(mtHttps(t.image)) + '" alt="' + esc(label) + '" loading="lazy">' : '';
    return '<span class="om-team' + (img ? ' has-img' : '') + '"><span class="om-code">' + esc(label) + '</span>' + img + '</span>';
  }
  function mtSetWin(set) {
    if (!set || set.win == null) return '';
    return '<span class="om-wl ' + (set.win ? 'is-w' : 'is-l') + '">' + esc(T(set.win ? 'mt.win' : 'mt.lose')) + '</span>';
  }

  function mtPoolHTML() {
    var list = mtList();
    if (!list.length) return '';
    var cur = mtCurrentId();
    var head = '<div class="om-pool-hd"><b>' + esc(T('mt.poolTitle')) + '</b><span>' + esc(T('mt.poolCount', { n: list.length })) + '</span></div>';
    var cards = list.map(function (g) {
      var opp = g.opponent || {};
      var oppLabel = mtTeamLabel(opp.code, opp.name);
      var done = g.state === 'completed';
      var score = done ? String(g.score || '').replace(/\s*:\s*/, ' : ') : T('mt.vsShort');
      var sub = [g.date, g.weekday ? '(' + g.weekday + ')' : ''].filter(Boolean).join(' ');
      var tag = g.block || (done ? T('mt.doneTag') : T('mt.nextTag'));
      return '<button class="om-mc' + (String(g.id) === String(cur) ? ' is-on' : '') + '" type="button" role="tab" aria-selected="' + (String(g.id) === String(cur)) + '" data-om-match="' + esc(g.id) + '">' +
        '<span class="om-mc-top"><span>' + esc(leagueName(g.league) || 'LCK') + '</span><em>' + esc(tag) + '</em></span>' +
        '<span class="om-mc-mid"><b class="om-mc-dk">DK</b><b class="om-mc-sc">' + esc(score) + '</b><b class="om-mc-op">' + esc(oppLabel) + '</b></span>' +
        '<span class="om-mc-bot">' + esc(sub) + '</span>' +
      '</button>';
    }).join('');
    return '<section class="card om-pool-card">' + head + '<div class="om-pool" role="tablist" data-i18n-attr="aria-label:mt.poolAria" aria-label="' + esc(T('mt.poolAria')) + '">' + cards + '</div></section>';
  }

  function mtBarHTML() {
    var m = mtCurrent();
    var d = mtDetail();
    if (!m) return '';
    var opp = m.opponent || {};
    var caption = [leagueName(m.league), blockText(m.block), m.bo ? T('mt.bo', { n: m.bo }) : ''].filter(Boolean).join(' · ');
    var mid;
    if (m.state === 'completed' || (d && d.state === 'completed')) {
      var dkWins = (d && d.dk && d.dk.wins != null) ? d.dk.wins : (m.dk && m.dk.gameWins);
      var opWins = (d && d.opponent && d.opponent.wins != null) ? d.opponent.wins : (opp.gameWins);
      var outcome = (d && d.win != null) ? d.win : m.win;
      var chip = outcome == null ? '' : '<em class="' + (outcome ? 'is-w' : 'is-l') + '">' + esc(T(outcome ? 'mt.dkWin' : 'mt.dkLoss')) + '</em>';
      mid = '<div class="om-score"><b>' + esc(dkWins == null ? '-' : dkWins) + '</b><i>:</i><b>' + esc(opWins == null ? '-' : opWins) + '</b>' + chip + '</div>';
    } else {
      mid = '<div class="om-score is-vs"><b>' + esc(m.time || 'TBD') + '</b><em class="is-live">' + esc(T('mt.kst')) + '</em></div>';
    }
    return '<section class="card om-bar-card">' +
      '<div class="om-bar">' +
        '<div class="om-side">' + mtLogo(m.dk || { code: 'DK' }, 'om-logo') + '<b>DK</b></div>' +
        '<div class="om-mid">' + mid + '<div class="om-cap">' + esc(caption || '') + '</div></div>' +
        '<div class="om-side is-r"><b>' + esc(mtTeamLabel(opp.code, opp.name)) + '</b>' + mtLogo(opp, 'om-logo') + '</div>' +
      '</div>' +
    '</section>';
  }

  function mtSetsHTML() {
    var d = mtDetail();
    if (!d || !d.sets || !d.sets.length) return '';
    var cur = Number(mtState.set) || (d.sets[d.sets.length - 1] || {}).number;
    return '<div class="om-sets" role="tablist" data-i18n-attr="aria-label:mt.setAria" aria-label="' + esc(T('mt.setAria')) + '">' + d.sets.map(function (s) {
      var on = Number(s.number) === Number(cur);
      var side = s.dkSide === 'blue' ? '<span class="om-side-b is-blue">🔵 ' + esc(T('mt.blue')) + '</span>'
        : (s.dkSide === 'red' ? '<span class="om-side-b is-red">🔴 ' + esc(T('mt.red')) + '</span>' : '');
      return '<button class="om-set' + (on ? ' is-on' : '') + '" type="button" role="tab" aria-selected="' + on + '" data-om-set="' + esc(s.number) + '">' +
        '<span class="om-set-l"><b>' + esc(T('mt.setN', { n: s.number })) + '</b>' + mtSetWin(s) + '</span>' +
        '<span class="om-set-s">' + side + (s.duration ? '<span class="om-dur">' + esc(mtDur(s.duration)) + '</span>' : '') + '</span>' +
      '</button>';
    }).join('') + '</div>';
  }

  function mtDur(sec) {
    var m = Math.floor(Number(sec) / 60), s = Math.round(Number(sec) % 60);
    if (!Number.isFinite(m)) return '';
    return T('mt.duration', { m: m, s: (s < 10 ? '0' : '') + s });
  }

  function mtBanRow(team, side, bans, cls) {
    var items = (bans || []).map(function (b) {
      var key = champKey(b);
      return '<span class="om-ban"><img class="om-ban-img" src="' + esc(champImg(key)) + '" alt="' + esc(champText(b)) + '" loading="lazy"><i class="om-sl"></i><em>' + esc(champText(b)) + '</em></span>';
    }).join('');
    if (!items) items = '<span class="om-ban-empty">' + esc(T('mt.banEmpty')) + '</span>';
    return '<div class="om-ban-row ' + (cls || '') + '">' +
      '<span class="om-who">' + mtLogo(team, 'om-mini') + '<b>' + esc(mtTeamLabel(team && team.code, team && team.name)) + '</b><em>' + esc(T('mt.ban')) + '</em></span>' +
      '<span class="om-bans">' + items + '</span>' +
    '</div>';
  }

  function mtBanHTML() {
    var d = mtDetail();
    if (!d) return '';
    var m = mtCurrent() || {};
    var s = mtSetOf(d);
    if (!s) return '';
    var head = '<div class="om-ban-hd"><span class="om-eyebrow">BAN</span><b>' + esc(T('mt.banTitle', { n: s.number })) + '</b><span class="om-ban-sub">' + esc(T('mt.banSub')) + '</span></div>';
    var body = s.bans
      ? mtBanRow(d.dk || m.dk, 'dk', s.bans.dk, 'is-dk') + mtBanRow(d.opponent || m.opponent, 'opp', s.bans.opp, 'is-opp')
      : '<p class="om-note">' + esc(T('mt.banNone')) + '</p>';
    var foot = s.bans ? '<p class="om-src">' + esc(T('mt.banFrom')) + '</p>' : '';
    return '<section class="card om-ban-card">' + head + body + foot + '</section>';
  }

  function mtSetOf(d) {
    if (!d || !d.sets || !d.sets.length) return null;
    var cur = Number(mtState.set);
    for (var i = 0; i < d.sets.length; i++) if (Number(d.sets[i].number) === cur) return d.sets[i];
    return d.sets[d.sets.length - 1];
  }

  function mtBoardHTML() {
    var d = mtDetail();
    if (!d) return '';
    var s = mtSetOf(d);
    if (!s) return '';
    var m = mtCurrent() || {};
    var rows = (s.players || []).map(function (p) {
      var app = p.key ? calPlayer(p.key) : null;
      var name = app ? pName(app) : p.player;
      var chip = (p.key && p.key === myPick) ? '<span class="om-chip">★ MY PICK</span>' : '';
      var share = p.damageShare == null ? null : p.damageShare;
      var bar = share == null ? '' : '<span class="om-dbar"><i style="width:' + Math.max(2, Math.min(100, share * 2.94)) + '%"></i></span>';
      return '<div class="om-row' + (p.key && p.key === myPick ? ' is-pick' : '') + '">' +
        '<span class="om-champ"><img src="' + esc(champImg(champKey(p.champion))) + '" alt="' + esc(champText(p.champion)) + '" loading="lazy"></span>' +
        '<span class="om-id"><span class="om-nm">' + esc(name) + chip + '</span>' +
          '<span class="om-sub">' + esc(champText(p.champion)) + ' · ' + esc(roleText(p.role)) + '</span></span>' +
        '<span class="om-kda"><b>' + esc(p.k) + '</b><i>/</i><b class="d">' + esc(p.d) + '</b><i>/</i><b>' + esc(p.a) + '</b></span>' +
        '<span class="om-dmg"><b>' + (share == null ? '–' : esc(share) + '%') + '</b><span class="om-dmg-l">' + esc(T('mt.share')) + '</span>' + bar + '</span>' +
        '<span class="om-extra"><b>KDA ' + esc(p.kda) + '</b><span>' + esc(T('mt.kp', { p: p.kp == null ? '–' : p.kp })) + '</span><span>' + esc(T('mt.csGold', { cs: p.cs, g: (p.gold / 1000).toFixed(1) + 'k' })) + '</span></span>' +
      '</div>';
    }).join('');
    var note = (s.players || []).some(function (p) { return !p.key; }) ? '<p class="om-note">' + esc(T('mt.rosterNote')) + '</p>' : '';
    var bhead = '<div class="om-bhead" aria-hidden="true"><span></span><span>' + esc(T('mt.colWho')) + '</span><span>' + esc(T('mt.colExtra')) + '</span><span>' + esc(T('mt.kdaLabel')) + '</span><span>' + esc(T('mt.colShare')) + '</span></div>';
    return '<section class="card om-board-card">' +
      '<div class="om-board-hd"><b>5 <em>' + esc(T('mt.statsTitle')) + '</em></b><span>' + esc(T('mt.statsSub', { n: s.number })) + '</span></div>' +
      '<div class="om-board">' + bhead + (rows || '<p class="om-note">' + esc(T('mt.noStats')) + '</p>') + '</div>' + note +
    '</section>';
  }

  function mtStripHTML() {
    var d = mtDetail();
    var s = d ? mtSetOf(d) : null;
    if (!s || !s.team || !s.team.dk) return '';
    var cells = [
      { k: T('mt.oKill'), a: s.team.dk.kills, b: s.team.opp ? s.team.opp.kills : null },
      { k: T('mt.oGold'), a: (s.team.dk.gold / 1000).toFixed(1) + 'k', b: s.team.opp ? (s.team.opp.gold / 1000).toFixed(1) + 'k' : null },
      { k: T('mt.oDragon'), a: s.team.dk.dragons, b: s.team.opp ? s.team.opp.dragons : null },
      { k: T('mt.oBaron'), a: s.team.dk.barons, b: s.team.opp ? s.team.opp.barons : null }
    ];
    return '<div class="om-strip">' + cells.map(function (c) {
      return '<span class="om-cell"><em>' + esc(c.k) + '</em><b>' + esc(c.a) + '<i>:</i>' + esc(c.b == null ? '-' : c.b) + '</b></span>';
    }).join('') + '</div>';
  }

  function mtVodHTML() {
    var d = mtDetail();
    if (!d || !d.vod || !d.vod.url) return '';
    return '<a class="om-vod" href="' + esc(d.vod.url) + '" target="_blank" rel="noopener">' + esc(T('mt.vod')) + ' ↗</a>';
  }

  function renderOfficialPane() {
    var host = $('#officialPane');
    if (!host) return;
    if (mtState.view !== 'official') return;
    var list = mtList();
    if (!LIVE.official) {
      host.innerHTML = '<section class="card om-empty"><p>' + esc(T('mt.loading')) + '</p></section>';
      return;
    }
    if (!list.length) {
      host.innerHTML = '<section class="card om-empty"><div class="eyebrow">OFFICIAL MATCH</div><h3 class="card-title">' + esc(T('mt.emptyTitle')) + '</h3>' +
        '<p class="om-note">' + esc(T('mt.emptyNote')) + '</p>' +
        '<a class="ghost-btn om-empty-go" href="https://lolesports.com/ko-KR/schedule" target="_blank" rel="noopener">' + esc(T('mt.emptyCta')) + ' ↗</a></section>';
      return;
    }
    var cur = mtCurrent();
    var need = mtCurrentId();
    /* 아직 불러오지 않은 경기면 한 번 부릅니다 (renderOfficialPane → loadMatch 는 다시 그리지 않음) */
    if (need && !mtCache[need] && !mtState.loading && !mtState.tried[need]) {
      mtState.tried[need] = true;
      mtState.loading = true;
      apiGet('./api/match?id=' + encodeURIComponent(need) + '&lang=' + lang()).then(function (d) {
        mtState.loading = false;
        if (d && d.ok) mtCache[need] = d;
        else mtState.error = (d && d.error) || T('mt.loadFail');
        if (mtCache[need]) mtState.set = (mtCache[need].sets[mtCache[need].sets.length - 1] || {}).number || 0;
        if (mtState.view === 'official') renderOfficialPane();
      }).catch(function () {
        mtState.loading = false;
        mtState.error = T('mt.loadFail');
        if (mtState.view === 'official') renderOfficialPane();
      });
    }
    var d = mtDetail();
    /* 왼쪽 = 경기 목록 · 스코어 · 밴 / 오른쪽 = 세트 · 5인 스탯 (데스크톱 2열) */
    var left = mtPoolHTML() + mtBarHTML();
    var right = '';
    if (mtState.loading && !d) {
      right = '<section class="card om-empty"><p>' + esc(T('mt.loading')) + '</p></section>';
    } else if (mtState.error && !d) {
      right = '<section class="card om-empty"><p>' + esc(mtState.error) + '</p><button class="ghost-btn" type="button" data-om-retry="1">' + esc(T('mt.retry')) + '</button></section>';
    } else if (d) {
      if (d.sets && d.sets.length) {
        right = mtSetsHTML() + mtBoardHTML() + mtStripHTML();
        left += mtBanHTML();
      } else {
        right = '<section class="card om-empty"><p>' + esc(T('mt.beforeNote')) + '</p>' + mtVodHTML() + '</section>';
      }
    }
    var html = '<div class="om-feed"><div class="om-col-a">' + left + '</div><div class="om-col-b">' + right + '</div></div>';
    if (d && d.vod) html += '<div class="om-vod-row">' + mtVodHTML() + '</div>';
    if (d) html += '<p class="om-src om-src-foot">' + esc(T('mt.source')) + '</p>';
    host.innerHTML = html;
  }

  function renderMatchLog() {
    var sw = $('#matchSwitch');
    var solo = $('#soloPane');
    var off = $('#officialPane');
    var meta = $('#soloPanelMeta');
    if (sw) {
      $$('#matchSwitch [data-match-view]').forEach(function (b) {
        var on = b.getAttribute('data-match-view') === mtState.view;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', String(on));
      });
    }
    if (meta) meta.textContent = mtState.view === 'official' ? T('mt.panelSub') : T('solo.panelMeta', { name: pName(current()), n: current().matches.length });
    if (solo) solo.hidden = mtState.view !== 'solo';
    if (off) off.hidden = mtState.view !== 'official';
    if (mtState.view === 'official') renderOfficialPane();
  }

  function mtSetView(view) {
    mtState.view = view === 'official' ? 'official' : 'solo';
    store.set(MT_VIEW_KEY, mtState.view);
    renderMatchLog();
  }

  function mtSelect(id, opts) {
    if (!id) return;
    mtState.id = id;
    store.set(MT_ID_KEY, id);
    mtState.error = '';
    mtState.set = 0;
    var hit = mtCache[id];
    if (hit) mtState.set = (hit.sets[hit.sets.length - 1] || {}).number || 0;
    if (opts && opts.view !== false) mtSetView('official');
    renderMatchLog();
  }

  function renderRoster() {
    var host = $('#rosterList');
    if (!host) return;
    host.innerHTML = PLAYERS.map(function (p) {
      return '<li><button class="roster-row' + (p.key === state.player ? ' is-active' : '') + '" type="button" data-player="' + p.key + '">' +
        '<span class="r-pos">' + p.pos + '</span>' +
        '<span class="r-name">' + pName(p) + ' <em>' + pReal(p) + '</em></span>' +
        '<span class="r-note">' + (ROSTER_NOTES[p.key] || '') + '</span></button></li>';
    }).join('');
  }

  /* ---------- 공식일정 탭 ---------- */
  function renderSeason() {
    var host = $('#seasonPath');
    if (!host) return;
    host.innerHTML = SEASON_2027.map(function (s) {
      return '<li class="season-row">' +
        '<span class="s-no">' + s.no + '</span>' +
        '<span class="s-body"><b>' + L(s.name) + '</b><span>' + L(s.note) + '</span></span>' +
        '<span class="s-side">' + L(s.host) + '</span>' +
      '</li>';
    }).join('');
  }

  function renderOfficial() {
    renderSeason();
    renderNextCard();
    renderOfficialRecent();
    var list = $('#officialList');
    if (list) {
      list.innerHTML = PLAYERS.map(function (p) {
        return '<li><button class="official-row" type="button" data-player="' + p.key + '">' +
          '<span class="of-name">' + pName(p) + '<em>' + p.pos + '</em></span>' +
          '<span class="of-match">' + p.official.team + ' <b>' + p.official.score + '</b> ' + p.official.opp + '</span>' +
          '<span class="of-stage">' + L(p.official.stage) + ' · ' + L(p.official.date) + '</span>' +
        '</button></li>';
      }).join('');
    }
  }

  /* ---------- 기록실 탭 ---------- */
  /* ---------- 기록실: 선수 기본 정보(생일·데뷔일) ---------- */
  function ageOf(iso) {
    var b = isoDate(iso);
    if (!b) return null;
    var now = new Date();
    var age = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
    return age;
  }
  function daysSince(iso) {
    var t = isoDate(iso);
    if (!t) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((today - t) / 86400000) + 1;
  }
  function fmtDays(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function recordsProfileHTML(p) {
    var rows = '';
    var age = ageOf(p.birthday);
    var b = nextBirthday(p.birthday);
    if (p.birthday) {
      rows += '<li class="rec-pf">' +
        '<span class="pf-ico" aria-hidden="true">🎂</span>' +
        '<span class="pf-body"><b>' + esc(T('records.birthday')) + '</b>' +
          '<span>' + esc(T('records.birthdayValue', { date: p.birthday, age: age })) + '</span></span>' +
        '<span class="pf-tag">' + ddayText(b ? b.days : 0) + '</span>' +
      '</li>';
    }
    if (p.debut) {
      var days = daysSince(p.debut);
      var a = nextAnniversary(p.debut);
      var tag = '';
      if (a && a.years > 0) {
        tag = a.days === 0
          ? T('records.debutToday', { n: a.years })
          : T('records.debutUpcoming', { n: a.years, d: a.days });
      }
      rows += '<li class="rec-pf is-debut">' +
        '<span class="pf-ico" aria-hidden="true">🎉</span>' +
        '<span class="pf-body"><b>' + esc(T('records.debut')) + '</b>' +
          '<span>' + esc(T('records.debutValue', { date: p.debut, days: fmtDays(days) })) + '</span>' +
          '<i class="pf-note">' + esc(L(p.debutNote)) + '</i></span>' +
        (tag ? '<span class="pf-tag is-years">' + esc(tag) + '</span>' : '') +
      '</li>';
    }
    return rows;
  }

  function renderRecords() {
    var p = current();
    var who = $('#recordsWho');
    if (who) who.textContent = T('records.who', { name: pName(p) });
    var profile = $('#recordsProfile');
    if (profile) profile.innerHTML = recordsProfileHTML(p);
    var list = $('#recordsList');
    if (list) {
      list.innerHTML = p.records.map(function (r) {
        return '<li class="rec-row' + (r.key ? ' is-key' : '') + '">' +
          '<span class="rec-event">' + L(r.event) + '</span>' +
          (r.result ? '<span class="rec-result">' + T('records.result.' + r.result) + '</span>' : '<span class="rec-result is-empty"></span>') +
          '<span class="rec-set">' + T('records.set', { w: r.set.w, l: r.set.l }) + '</span>' +
        '</li>';
      }).join('');
    }
    var links = $('#recordsLinks');
    if (links) links.innerHTML = streamLinksHTML(p);
    var worlds = $('#worldsList');
    if (worlds) {
      worlds.innerHTML = PLAYERS.map(function (p2) {
        return '<li class="worlds-row">' +
          '<span class="w-name">' + pName(p2) + '</span>' +
          '<span class="w-stage">' + T('records.result.' + p2.worlds.stageKey) + '</span>' +
          '<span class="w-line">' + L(p2.worlds.line) + ' · ' + L(p2.worlds.date) + '</span>' +
        '</li>';
      }).join('');
    }
  }

  /* ---------- 서버 실시간 연동 (공식 일정 · 솔로랭크 · 웹 푸시) ---------- */
  var LIVE = {
    config: null,
    official: null,
    solo: null,
    live: null,
    dkYt: null,
    notices: null,
    soloSource: 'snapshot',
    offline: false,
    lastSync: 0,
    push: { supported: false, sub: null, state: 'idle' }
  };
  var LIVE_INTERVAL = 90000;
  LIVE.push.supported = ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function canUseApi() {
    if (window.__DK_PREVIEW__) return false;
    return /^https?:$/.test(location.protocol);
  }

  function apiGet(path) {
    if (LIVE.offline || !canUseApi()) return Promise.resolve(null);
    return fetch(path, { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function clockOf(d) { return window.I18N.clock(d); }

  /* 라운드 표기: 1라운드 / 第1ラウンド / 第1轮 / 第 1 輪 / Round 1 */
  function roundText(n) {
    var l = lang();
    if (l === 'ko') return n + '라운드';
    if (l === 'ja') return '第' + n + 'ラウンド';
    if (l === 'zh') return '第' + n + '轮';
    if (l === 'tw') return '第 ' + n + ' 輪';
    return 'Round ' + n;
  }

  /* 리그 이름: 서버가 준 언어와 무관하게 슬러그로 다시 표기 */
  var LEAGUE_NAME = {
    worlds: { ko: '월드 챔피언십', en: 'Worlds', ja: 'Worlds' },
    msi: { ko: 'MSI', en: 'MSI', ja: 'MSI' },
    lck: { ko: 'LCK', en: 'LCK', ja: 'LCK' },
    first_stand: { ko: 'First Stand', en: 'First Stand', ja: 'First Stand' },
    lck_challengers_league: { ko: 'LCK CL', en: 'LCK CL', ja: 'LCK CL' },
    emea_masters: { ko: 'EMEA Masters', en: 'EMEA Masters', ja: 'EMEA Masters' }
  };
  /* 스테이지 이름(스위스·8강 …)은 서버 언어와 무관하게 다시 표기합니다. */
  var BLOCKS = [
    { ko: '플레이-인', en: 'Play-In', ja: 'プレイイン' },
    { ko: '스위스', en: 'Swiss', ja: 'スイス' },
    { ko: '녹아웃', en: 'Knockout', ja: 'ノックアウト' },
    { ko: '8강', en: 'Quarterfinals', ja: 'ベスト8' },
    { ko: '4강', en: 'Semifinals', ja: 'ベスト4' },
    { ko: '결승', en: 'Final', ja: '決勝' }
  ];
  function normBlock(s) {
    return String(s || '').toLowerCase()
      .replace(/\s*(stage|스테이지|ステージ)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/s$/, '');
  }
  function blockText(str) {
    if (!str) return '';
    var s = String(str).trim();
    var n = normBlock(s);
    for (var i = 0; i < BLOCKS.length; i++) {
      if (BLOCKS[i].ko === s || BLOCKS[i].ja === s || normBlock(BLOCKS[i].en) === n || normBlock(BLOCKS[i].ko) === n) return L(BLOCKS[i]);
    }
    var m = /^(\d+)라운드$/.exec(s);
    if (m) return roundText(m[1]);
    m = /^Round\s*(\d+)$/i.exec(s);
    if (m) return roundText(m[1]);
    return s;
  }

  function leagueName(league) {
    if (!league) return '';
    var hit = LEAGUE_NAME[league.slug];
    if (hit) return L(hit);
    return league.name || '';
  }

  /* 'M. D.' → 언어별 날짜 (서버 dateLabel 대신 startIso 사용) */
  function eventDate(next) {
    if (next && next.startIso) {
      var d = new Date(next.startIso);
      if (!isNaN(d.getTime())) return window.I18N.shortDate(d);
    }
    return window.I18N.matchDate(next && next.dateLabel ? next.dateLabel : '');
  }

  function renderNextCard() {
    var body = $('#nextBody');
    if (!body) return;
    var data = LIVE.official;
    var next = data && data.ok ? data.next : null;

    if (next) {
      var opp = next.opponent || {};
      var oppName = opp.code || opp.name || 'TBD';
      var sub = [leagueName(next.league), blockText(next.block), next.bo ? 'Bo' + next.bo : '', next.relative]
        .filter(Boolean).join(' · ');
      $('#nextDate').textContent = eventDate(next) + ' ' + (next.time || '');
      body.innerHTML =
        '<h3 class="next-title">DK <span class="vs-inline">vs</span> ' + esc(oppName) + '</h3>' +
        '<p class="next-sub">' + esc(sub) + '</p>' +
        '<div class="next-teams"><span class="team dk">DK</span><span class="vs">VS</span><span class="team">' + esc(oppName) + '</span></div>';
      return;
    }

    $('#nextDate').textContent = T('official.nextDateFallback');
    var note = '';
    if (data && data.ok && data.status === 'no_upcoming') note = '<span class="next-empty">' + T('official.nextNoUpcoming') + '</span>';
    else if (data && data.ok === false) note = '<span class="next-empty">' + T('official.nextError') + '</span>';
    body.innerHTML =
      '<h3 class="next-title">' + T('official.nextTitleFallback') + '</h3>' +
      '<p class="next-sub">' + T('official.nextSubFallback') + ' ' + note + '</p>' +
      '<div class="next-teams"><span class="team dk">DK</span><span class="vs">VS</span><span class="team">TBD</span></div>';
  }

  /* 생중계 채널은 영상 탭(#videoChannels)이 맡습니다. 공식일정 카드에서는 영상 탭으로 이동만 합니다. */

  /* 종료된 경기: 공식 VOD(있으면) · 유튜브 하이라이트 검색 */
  function ytSearch(q) { return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q); }

  function matchQuery(row) {
    var opp = (row.opponent && (row.opponent.code || row.opponent.name)) || '';
    var league = leagueName(row.league) || '';
    var date = eventDate(row);
    var tail = lang() === 'ko' ? '하이라이트' : (lang() === 'ja' ? 'ハイライト' : (lang() === 'zh' ? '集锦' : (lang() === 'tw' ? '精華' : 'highlights')));
    return [league, 'DK vs ' + opp, date, tail].filter(Boolean).join(' ');
  }

  function vodFor(row) {
    if (!row || !row.vod) return null;
    return pickLang(row.vod) || null;
  }

  function matchVideosHTML(row) {
    var out = '';
    var vod = vodFor(row);
    if (vod && vod.url) {
      out += '<a class="vid-chip is-vod" href="' + esc(vod.url) + '" target="_blank" rel="noopener">▶ ' + T('video.vod') + '</a>';
    }
    out += '<a class="vid-chip is-hl" href="' + ytSearch(matchQuery(row)) + '" target="_blank" rel="noopener">' + T('video.highlight') + ' ↗</a>';
    return out;
  }

  function renderOfficialRecent() {
    var card = $('#officialRecentCard');
    var host = $('#officialRecent');
    if (!card || !host) return;
    var data = LIVE.official;
    var rows = data && data.ok && Array.isArray(data.recent) ? data.recent : [];
    var note = $('#officialRecentNote');
    var vodNote = $('#officialVodNote');

    if (!rows.length) {
      /* 서버 연결 전에는 저장해 둔 월즈 2026 여정을 대신 보여줍니다. */
      card.hidden = false;
      host.innerHTML = DK_PATH.map(function (g) {
        return '<li class="path-row">' +
          '<span class="p-round">' + L(g.round) + '</span>' +
          '<span class="p-teams">DK <b class="' + (g.win ? 'w' : 'l') + '">' + g.score + '</b> ' + g.opp + '</span>' +
          '<span class="p-res ' + (g.win ? 'w' : 'l') + '">' + T(g.win ? 'result.win' : 'result.lose') + ' · ' + L(g.date) + '</span>' +
        '</li>';
      }).join('');
      if (note) note.textContent = T('official.recentFallbackNote');
      if (vodNote) vodNote.hidden = true;
      return;
    }

    card.hidden = false;
    host.innerHTML = rows.slice(0, 5).map(function (g) {
      var opp = g.opponent || {};
      var win = g.win === true ? 'w' : (g.win === false ? 'l' : '');
      var res = g.win === true ? T('result.win') : (g.win === false ? T('result.lose') : '');
      var dateLabel = eventDate(g);
      return '<li class="path-row has-vid">' +
        '<div class="p-line">' +
          '<span class="p-round">' + esc(blockText(g.block) || leagueName(g.league) || '') + '</span>' +
          '<span class="p-teams">DK <b class="' + win + '">' + esc(g.score || '-') + '</b> ' + esc(opp.code || opp.name || '') + '</span>' +
          '<span class="p-res ' + win + '">' + (res ? res + ' · ' : '') + esc(dateLabel) + '</span>' +
        '</div>' +
        '<div class="p-vid">' + matchVideosHTML(g) +
          '<button class="p-om" type="button" data-om-open="' + esc(g.id) + '">' + esc(T('cal.watchMatch')) + ' ›</button>' +
        '</div>' +
      '</li>';
    }).join('');
    if (note) {
      note.textContent = T('official.recentNote', {
        time: data.fetchedAt ? clockOf(new Date(data.fetchedAt)) : '?'
      });
    }
    if (vodNote) {
      vodNote.hidden = false;
      vodNote.textContent = T('video.searchNote');
    }
  }

  function applyLiveStatus() {
    var data = LIVE.official;
    var okOfficial = !!(data && data.ok);
    var liveChip = $('#liveChip');
    if (liveChip) {
      liveChip.hidden = !(okOfficial || LIVE.soloSource === 'riot');
      liveChip.textContent = T('live');
    }
    var officialChip = $('#officialChip');
    if (officialChip) {
      officialChip.hidden = !okOfficial;
      officialChip.textContent = T('autoUpdate');
    }
    var videoChip = $('#videoLiveChip');
    if (videoChip) {
      videoChip.hidden = !okOfficial;
      videoChip.textContent = T('autoUpdate');
    }

    var sync = $('#nextSync');
    if (sync) {
      if (window.__DK_PREVIEW__) sync.textContent = T('official.syncPreview');
      else if (LIVE.offline) sync.textContent = T('official.syncOffline');
      else if (okOfficial) sync.textContent = T('official.syncOk', {
        time: clockOf(new Date(data.fetchedAt)),
        next: data.next ? T('official.syncOkNext') : T('official.syncOkNoNext')
      });
      else if (data) sync.textContent = T('official.syncFail');
      else sync.textContent = T('official.syncLoading');
    }

    var board = $('#boardNote');
    if (board) {
      if (LIVE.soloSource === 'riot' && LIVE.solo && LIVE.solo.fetchedAt) {
        board.textContent = T('board.note.riot', { stamp: window.I18N.stamp(new Date(LIVE.solo.fetchedAt)) });
      } else if (LIVE.offline) {
        board.textContent = T('board.note.offline');
      } else {
        board.textContent = T('board.note.pending');
      }
    }

    var checked = $('#checkedAt');
    if (checked) {
      if (LIVE.soloSource === 'riot' && LIVE.solo && LIVE.solo.fetchedAt) {
        checked.textContent = T('updatedAt', { time: clockOf(new Date(LIVE.solo.fetchedAt)) });
      } else {
        checked.textContent = T('checkedAt', { time: clockOf(state.checked) });
      }
    }

    var feedDate = $('#feedDate');
    if (feedDate) feedDate.textContent = window.I18N.feedDate(new Date());

    var feedNames = $('#feedNames');
    if (feedNames) feedNames.textContent = PLAYERS.map(pName).join(' · ');

    var soloLive = $('#soloLive');
    if (soloLive) {
      var msg = '';
      if (LIVE.solo && LIVE.solo.status && LIVE.solo.status !== 'live' && LIVE.solo.source === 'riot') {
        msg = LIVE.solo.status === 'rate_limited' ? T('solo.msgRateLimited')
          : (LIVE.solo.status === 'partial' ? T('solo.msgPartial') : T('solo.msgError'));
      }
      soloLive.textContent = msg;
    }

    var foot = $('#soloFooter');
    if (foot) {
      foot.textContent = LIVE.soloSource === 'riot'
        ? T('solo.footerLive', { time: (LIVE.solo && LIVE.solo.fetchedAt ? clockOf(new Date(LIVE.solo.fetchedAt)) : '') })
        : T('solo.footerSnapshot');
    }

    var pushStatus = $('#pushStatus');
    if (pushStatus) {
      var cfg = LIVE.config;
      if (window.__DK_PREVIEW__) pushStatus.textContent = T('notify.pushPreview');
      else if (!canUseApi() || LIVE.offline) pushStatus.textContent = T('notify.pushOffline');
      else if (!cfg) pushStatus.textContent = T('notify.pushChecking');
      else if (!cfg.push || !cfg.push.ready) pushStatus.textContent = T('notify.pushNoVapid');
      else if (!cfg.store || !cfg.store.durable) pushStatus.textContent = T('notify.pushNoStore');
      else if (LIVE.push.state === 'denied') pushStatus.textContent = T('notify.pushDenied');
      else if (LIVE.push.state === 'subscribed') pushStatus.textContent = T('notify.pushSubscribed');
      else if (LIVE.push.state === 'unsubscribed') pushStatus.textContent = T('notify.pushUnsubscribed');
      else pushStatus.textContent = T('notify.pushIdle');
    }

    var notifyNote = $('#notifyNote');
    if (notifyNote) {
      var pushOn = LIVE.config && LIVE.config.push && LIVE.config.push.ready && LIVE.config.store && LIVE.config.store.durable;
      notifyNote.textContent = pushOn ? T('notify.noteOn') : T('notify.noteOff');
    }
  }

  function mergeSolo(data) {
    if (!data || !Array.isArray(data.players)) return;
    /* 전적·티어는 Riot 실시간일 때만 덮어씁니다. 인게임·매치업 배지는 응답에 있으면 그대로 씁니다. */
    var isRiot = data.source === 'riot';
    data.players.forEach(function (sp) {
      var p = null;
      for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].key === sp.key) p = PLAYERS[i];
      if (!p) return;
      if (isRiot) {
        if (sp.tierKey) p.tierKey = sp.tierKey;
        if (sp.tierRank != null) p.tierRank = sp.tierRank;
        if (sp.tier) p.tier = sp.tier;
        if (sp.lpValue != null) p.lpValue = sp.lpValue;
        if (sp.lp) p.lp = sp.lp;
        if (sp.wins != null) p.wins = sp.wins;
        if (sp.losses != null) p.losses = sp.losses;
        if (sp.record) p.record = sp.record;
      }
      p.inGame = !!sp.inGame;
      if (sp.liveGame) p.liveChamp = sp.liveGame.champion || '';
      p.tag = sp.tag || null;
      if (isRiot && Array.isArray(sp.matches) && sp.matches.length) {
        var seen = {};
        sp.matches.forEach(function (m) { seen[m.d + m.t + m.champ] = true; });
        var extra = p.matches.filter(function (m) { return !seen[m.d + m.t + m.champ]; });
        p.matches = sp.matches.concat(extra).slice(0, 15);
      } else if (Array.isArray(sp.matches) && sp.matches.length) {
        /* 스냅샷 모드에서도 서버가 준 matchId 를 붙여 두면 매치업 배지를 표에 쓸 수 있습니다. */
        var bySig = {};
        sp.matches.forEach(function (m) { if (m.matchId) bySig[m.d + m.t + m.champ] = m.matchId; });
        p.matches.forEach(function (m) { var hit = bySig[m.d + m.t + m.champ]; if (hit) m.matchId = hit; });
      }
    });
    if (isRiot && data.fetchedAt) state.checked = new Date(data.fetchedAt);
  }

  function refreshLive() {
    if (!canUseApi()) {
      LIVE.offline = true;
      applyLiveStatus();
      return Promise.resolve();
    }
    return Promise.all([
      LIVE.config ? Promise.resolve(LIVE.config) : apiGet('./api/config'),
      apiGet('./api/official?lang=' + lang()),
      apiGet('./api/solo'),
      apiGet('./api/live'),
      apiGet('./api/dk-youtube'),
      apiGet('./api/notices')
    ]).then(function (res) {
      var cfg = res[0], off = res[1], solo = res[2], live = res[3], dkYt = res[4], notes = res[5];
      if (cfg && cfg.ok) LIVE.config = cfg;
      if (!cfg && !off && !solo) {
        LIVE.offline = true;
        applyLiveStatus();
        return;
      }
      if (off) { LIVE.official = off; invalidateCalendar(); }
      if (live && live.ok) LIVE.live = live;
      if (dkYt) LIVE.dkYt = dkYt;
      if (notes && notes.ok && Array.isArray(notes.notices)) { LIVE.notices = notes.notices; invalidateCalendar(); }
      if (solo) { LIVE.solo = solo; if (solo.source) LIVE.soloSource = solo.source; mergeSolo(solo); }
      LIVE.lastSync = Date.now();
      renderAll();
      applyLiveStatus();
      scheduleLivePoll();
      if (LIVE.config && LIVE.config.push && LIVE.config.push.ready) syncPush(false);
    });
  }

  /* LIVE NOW 카드는 방송 중이면 1분, 전원 오프라인이면 5분마다 확인합니다. */
  var livePollTimer = null;
  function scheduleLivePoll() {
    if (livePollTimer) clearTimeout(livePollTimer);
    livePollTimer = null;
    if (!canUseApi() || LIVE.offline) return;
    var liveNow = LIVE.live && LIVE.live.liveCount > 0;
    livePollTimer = setTimeout(function () {
      if (document.hidden) { scheduleLivePoll(); return; }
      apiGet('./api/live').then(function (d) {
        if (d && d.ok) {
          var was = LIVE.live && LIVE.live.liveCount;
          LIVE.live = d;
          renderLiveHero();
          if (was !== d.liveCount) { renderTiles(); renderVideoStations(); }
        }
        scheduleLivePoll();
      });
    }, liveNow ? 60000 : 300000);
  }

  /* ---------- 웹 푸시 구독 ---------- */
  function urlB64(base64) {
    var pad = new Array(((4 - base64.length % 4) % 4) + 1).join('=');
    var b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function prefsPayload() {
    return {
      solo: PLAYERS.filter(function (p) { return isSoloOn(p.key); }).map(function (p) { return p.key; }),
      official: officialOn,
      live: liveAlerts,
      notice: noticeAlerts
    };
  }

  function postSubscription() {
    if (!LIVE.push.sub) return Promise.resolve(false);
    return fetch('./api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: LIVE.push.sub.toJSON(), prefs: prefsPayload(), lang: lang(), ua: navigator.userAgent })
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  function removeSubscription() {
    if (!LIVE.push.sub) return Promise.resolve(false);
    return fetch('./api/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: LIVE.push.sub.endpoint })
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  function syncPush(interactive) {
    var cfg = LIVE.config;
    if (!LIVE.push.supported || !cfg || !cfg.push || !cfg.push.ready || !cfg.store || !cfg.store.durable) return Promise.resolve(false);
    var any = prefsPayload().solo.length > 0 || officialOn || liveAlerts || noticeAlerts;
    var perm = ('Notification' in window) ? Notification.permission : 'denied';

    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (existing) {
        if (existing) return existing;
        if (!any) return null;
        if (perm !== 'granted' && !(interactive && perm === 'default')) return null;
        var ask = (perm === 'default' && interactive)
          ? Promise.resolve(Notification.requestPermission()).catch(function () { return 'denied'; })
          : Promise.resolve(perm);
        return ask.then(function (p) {
          if (p !== 'granted') { LIVE.push.state = (p === 'denied') ? 'denied' : LIVE.push.state; return null; }
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(cfg.push.publicKey) });
        });
      }).then(function (sub) {
        LIVE.push.sub = sub;
        if (!sub) { applyLiveStatus(); return false; }
        if (!any) {
          return removeSubscription().then(function () {
            LIVE.push.state = 'unsubscribed';
            applyLiveStatus();
            return true;
          });
        }
        LIVE.push.state = 'subscribed';
        return postSubscription().then(function (ok) {
          if (!ok) LIVE.push.state = 'error';
          applyLiveStatus();
          return ok;
        });
      });
    }).catch(function () { return false; });
  }

  /* ---------- 전체 렌더 ---------- */
  /* ---------- 운영자 한 줄 공지 (/api/config → banner) ---------- */
  function renderLineNotice() {
    var host = $('#lineNotice');
    var textEl = $('#lineNoticeText');
    if (!host || !textEl) return;
    var b = LIVE.config && LIVE.config.banner;
    var text = b && b.enabled && b.text ? String(b.text).trim() : '';
    if (!text) {
      host.hidden = true;
      textEl.textContent = '';
      return;
    }
    textEl.textContent = text;
    host.title = text;
    host.hidden = false;
  }

  function renderAll() {
    renderLineNotice();
    renderPills();
    renderEvents();
    renderVotes();
    renderPick();
    renderTiles();
    renderHighlight();
    renderVideoPanel();
    renderCheer();
    renderSolo();
    renderMatchLog();
    renderRoster();
    renderOfficial();
    renderOfficialView();
    renderRecords();
    renderNotify();
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click', function (e) {
    /* 인게임 배지·칩을 누르면 양 팀 챔피언 시트를 엽니다 (타일 선택보다 먼저) */
    var liveHit = e.target.closest('[data-live]');
    if (liveHit) {
      e.preventDefault();
      e.stopPropagation();
      openLive(liveHit.getAttribute('data-live'));
      return;
    }
    var lgDone = e.target.closest('#lgClose, #lgVeil');
    if (lgDone) { closeLive(); return; }
    /* 일정&투표: 리스트 | 캘린더 전환 · 필터 · 달 이동 · 날짜 선택 */
    var viewBtn = e.target.closest('[data-official-view]');
    if (viewBtn) {
      calState.view = officialViewName(viewBtn.getAttribute('data-official-view'));
      store.set(OFFICIAL_VIEW_KEY, calState.view);
      renderOfficialView();
      return;
    }
    var calCat = e.target.closest('[data-cal-cat]');
    if (calCat) {
      calState.cat = calCat.getAttribute('data-cal-cat');
      $$('#calFilters .cal-chip').forEach(function (c) {
        c.classList.toggle('is-on', c === calCat);
        c.setAttribute('aria-pressed', String(c === calCat));
      });
      renderCalendar();
      return;
    }
    if (e.target.closest('#calPrev') || e.target.closest('#calNext')) {
      var step = e.target.closest('#calNext') ? 1 : -1;
      var stepDate = new Date(calState.year, calState.month + step, 1);
      calState.year = stepDate.getFullYear();
      calState.month = stepDate.getMonth();
      renderCalendar();
      return;
    }
    if (e.target.closest('#calToday')) {
      var nowDay = new Date();
      calState.year = nowDay.getFullYear();
      calState.month = nowDay.getMonth();
      calState.sel = ymd(nowDay);
      renderCalendar();
      return;
    }
    if (e.target.closest('#calToList')) {
      calState.view = 'list';
      store.set(OFFICIAL_VIEW_KEY, 'list');
      renderOfficialView();
      return;
    }
    var calDayBtn = e.target.closest('[data-cal-day]');
    if (calDayBtn) {
      var picked = dateOf(calDayBtn.getAttribute('data-cal-day'));
      if (!picked) return;
      calState.sel = ymd(picked);
      if (picked.getFullYear() !== calState.year || picked.getMonth() !== calState.month) {
        calState.year = picked.getFullYear();
        calState.month = picked.getMonth();
      }
      renderCalendar();
      return;
    }
    var langBtn = e.target.closest('[data-lang]');
    if (langBtn) {
      var code = langBtn.getAttribute('data-lang');
      if (code !== lang()) {
        window.I18N.setLang(code);
      }
      return;
    }
    /* ---------- v3.12: 나만의 재생목록 · 내 링크 · 요약 카드 · 투표 팝업 ---------- */
    var mineDel = e.target.closest('[data-mine-del]');
    if (mineDel) { removeFolder(mineDel.getAttribute('data-mine-del')); return; }
    if (e.target.closest('[data-mine-new]')) { openFolderForm(); return; }
    var mineChip = e.target.closest('[data-mine]');
    if (mineChip) {
      var mid = mineChip.getAttribute('data-mine');
      mine.active = mid === 'all' ? 'all' : (folderById(mid) ? mid : 'all');
      if (mine.active !== 'all') mine.target = mine.active;
      state.videoPlayer = 'all';
      state.videoCat = 'all';
      state.videoChamp = 'all';
      saveMine();
      renderMineRow();
      renderVideoFilters();
      renderVideoCats();
      renderVideoChamps();
      renderVideoList();
      return;
    }
    if (e.target.closest('#mineNew')) { openFolderForm(); return; }
    if (e.target.closest('#mineFormCancel')) { closeFolderForm(); return; }
    if (e.target.closest('#minePlay')) { playMine(); return; }
    if (e.target.closest('#mineAddLink') || e.target.closest('#mineAddLink2')) { openAddLink(); return; }
    var addMine = e.target.closest('[data-add]');
    if (addMine) { toggleMineVideo(addMine.getAttribute('data-add')); return; }
    if (e.target.closest('#addLinkClose') || e.target.closest('#addLinkCancel') || e.target.closest('#addLinkVeil')) {
      closeAddLink(); return;
    }
    if (e.target.closest('#summaryBtn')) { openSummary(); return; }
    if (e.target.closest('#summaryBtn2')) { openSummary(); return; }
    /* 경기로그: 솔로랭크 | 공식 경기 · 경기 선택 · 세트 선택 */
    var mvBtn = e.target.closest('[data-match-view]');
    if (mvBtn) { mtSetView(mvBtn.getAttribute('data-match-view')); return; }
    var omPick = e.target.closest('[data-om-match]');
    if (omPick) { mtSelect(omPick.getAttribute('data-om-match')); return; }
    var omSet = e.target.closest('[data-om-set]');
    if (omSet) {
      mtState.set = Number(omSet.getAttribute('data-om-set')) || 0;
      renderOfficialPane();
      return;
    }
    if (e.target.closest('[data-om-retry]')) {
      var rid = mtCurrentId();
      delete mtState.tried[rid];
      delete mtCache[rid];
      mtState.error = '';
      renderOfficialPane();
      return;
    }
    var omOpen = e.target.closest('[data-om-open]');
    if (omOpen) {
      var oid = omOpen.getAttribute('data-om-open');
      switchTab('solo');
      delete mtState.tried[oid];
      mtSelect(oid);
      return;
    }
    var scSet = e.target.closest('[data-sc-set]');
    if (scSet) {
      scState.idx = Number(scSet.getAttribute('data-sc-set')) || 0;
      renderSummaryPreview();
      return;
    }
    if (e.target.closest('#summaryClose') || e.target.closest('#summaryVeil')) { closeSummary(); return; }
    if (e.target.closest('#scSave')) { saveSummary(); return; }
    if (e.target.closest('#scShare')) { shareSummary(); return; }
    if (e.target.closest('#votePopClose') || e.target.closest('#votePopDone') || e.target.closest('#votePopVeil')) {
      closeVotePop(); return;
    }
    if (e.target.closest('#votePopHide')) { hideVotePopToday(); return; }

    var cheerDel = e.target.closest('[data-cheer]');
    if (cheerDel) {
      var list = getCheers();
      list.splice(Number(cheerDel.getAttribute('data-cheer')), 1);
      setCheers(list);
      renderCheer();
      return;
    }
    var pin = e.target.closest('[data-pin]');
    if (pin) { pinPlayer(state.player); return; }
    var soloT = e.target.closest('[data-solo-toggle]');
    if (soloT) {
      var key = soloT.getAttribute('data-solo-toggle');
      store.set(soloKey(key), isSoloOn(key) ? '0' : '1');
      renderNotify();
      renderPick();
      syncPush(true);
      return;
    }
    var offT = e.target.closest('[data-official-toggle]');
    if (offT) {
      officialOn = !officialOn;
      store.set(OFFICIAL_KEY, officialOn ? '1' : '0');
      renderNotify();
      syncPush(true);
      return;
    }
    var liveT = e.target.closest('[data-live-toggle]');
    if (liveT) {
      liveAlerts = !liveAlerts;
      store.set(LIVE_KEY, liveAlerts ? '1' : '0');
      renderNotify();
      syncPush(true);
      return;
    }
    var noticeT = e.target.closest('[data-notice-toggle]');
    if (noticeT) {
      noticeAlerts = !noticeAlerts;
      store.set(NOTICE_KEY, noticeAlerts ? '1' : '0');
      renderNotify();
      syncPush(true);
      return;
    }
    var who = e.target.closest('[data-player]');
    if (who) {
      selectPlayer(who.getAttribute('data-player'));
      if (who.classList.contains('official-row')) switchTab('feed');
      return;
    }
    var chip = e.target.closest('[data-filter]');
    if (chip) {
      state.filter = chip.getAttribute('data-filter');
      $$('#filterRow .chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
      $('#soloTable2').innerHTML = tableHTML(current(), state.filter);
      return;
    }
    var vidChip = e.target.closest('[data-video-filter]');
    if (vidChip) {
      state.videoPlayer = vidChip.getAttribute('data-video-filter');
      renderVideoFilters();
      renderVideoList();
      return;
    }
    var catChip = e.target.closest('[data-video-cat]');
    if (catChip) {
      state.videoCat = catChip.getAttribute('data-video-cat');
      renderVideoCats();
      renderVideoList();
      return;
    }
    var champChip = e.target.closest('[data-video-champ]');
    if (champChip) {
      var key = champChip.getAttribute('data-video-champ');
      state.videoChamp = state.videoChamp === key ? 'all' : key;
      renderVideoChamps();
      renderVideoList();
      return;
    }
    var sortBtn = e.target.closest('[data-video-sort]');
    if (sortBtn) {
      state.videoSort = sortBtn.getAttribute('data-video-sort');
      renderVideoList();
      return;
    }
    if (e.target.closest('#videoSearchClear')) {
      state.videoQuery = '';
      var box = $('#videoSearch');
      if (box) { box.value = ''; box.focus(); }
      renderVideoList();
      return;
    }
    /* 찜(★) 토글 — 카드 위 별을 누르면 이 기기에만 저장/해제 */
    var favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      var fid = favBtn.getAttribute('data-fav');
      var added = toggleFav(fid);
      favBtn.classList.toggle('is-on', added);
      favBtn.textContent = added ? '★' : '☆';
      favBtn.setAttribute('aria-pressed', added ? 'true' : 'false');
      favBtn.setAttribute('aria-label', T(added ? 'video.favRemove' : 'video.favAdd'));
      renderVideoCats();
      renderFavBar();
      if (!$('#vpModal').hidden) renderPlayerChrome();
      if (state.videoCat === 'fav') renderVideoList();
      return;
    }

    /* 찜 목록 연속 재생 */
    if (e.target.closest('#favPlay')) {
      var favQueue = favEntries();
      if (favQueue.length) openPlayer('video', favQueue[0].v.id, '', favQueue, 0);
      return;
    }

    /* 인앱 플레이어: 카드·재생목록·최신 영상을 누르면 앱 안에서 재생 (보고 있던 목록이 대기열) */
    var playBtn = e.target.closest('[data-play]');
    if (playBtn) {
      var pid = playBtn.getAttribute('data-play');
      var queue = videoListEntries();
      var inQueue = queue.some(function (en) { return en.v.id === pid; });
      var only = archiveItems().filter(function (en) { return en.v.id === pid; });
      openPlayer('video', pid, playBtn.getAttribute('data-title'),
        inQueue ? queue : (only.length ? only : null));
      return;
    }
    var plBtn = e.target.closest('[data-playlist]');
    if (plBtn) {
      openPlayer('list', plBtn.getAttribute('data-playlist'), plBtn.getAttribute('data-title'));
      return;
    }

    /* 플레이어: 찜 토글 · 다음 · MY LIST에서 이어 재생 */
    if (e.target.closest('#vpStar')) {
      var sid = vpCurrentId();
      if (sid) {
        toggleFav(sid);
        renderVideoCats();
        renderFavBar();
        renderPlayerChrome();
        if (state.videoCat === 'fav') renderVideoList();
      }
      return;
    }
    if (e.target.closest('#vpNextBtn')) { vpMove(1); return; }
    if (e.target.closest('#vpUseQueue')) {
      var favNow = favEntries();
      if (favNow.length) playQueueFrom(favNow, vpCurrentId());
      return;
    }
    var qPlay = e.target.closest('[data-queue-play]');
    if (qPlay) {
      var qid = qPlay.getAttribute('data-queue-play');
      playQueueFrom(favEntries(), qid);
      return;
    }
    if (e.target.closest('#vpClose') || e.target.closest('#vpVeil')) {
      closePlayer();
      return;
    }
    var tab = e.target.closest('[data-tab]');
    if (tab) { switchTab(tab.getAttribute('data-tab')); return; }
  });

  /* 한국어 IME: 조합 중에는 다시 그리지 않고, 조합이 끝나면 한 번만 그립니다. */
  var searchComposing = false;
  document.addEventListener('compositionstart', function (e) {
    if (e.target && e.target.id === 'videoSearch') searchComposing = true;
  });
  document.addEventListener('compositionend', function (e) {
    if (!e.target || e.target.id !== 'videoSearch') return;
    searchComposing = false;
    state.videoQuery = e.target.value || '';
    renderVideoList();
  });
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'videoSearch') return;
    if (searchComposing) return;
    state.videoQuery = e.target.value || '';
    renderVideoList();
  });

  /* 새 폴더 폼 · 내 링크 폼 */
  var mineForm = $('#mineForm');
  if (mineForm) mineForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('#mineFolderName');
    var f = addFolder(input ? input.value : '');
    if (f) closeFolderForm();
  });
  var addLinkUrl = $('#addLinkUrl');
  if (addLinkUrl) {
    addLinkUrl.addEventListener('input', updateLinkPreview);
    addLinkUrl.addEventListener('change', updateLinkPreview);
  }
  var addLinkTitle = $('#addLinkTitle');
  if (addLinkTitle) addLinkTitle.addEventListener('input', function () {
    var note = $('#addLinkPvNote');
    if (note) note.textContent = T('addLink.found');
  });
  var addLinkForm = $('#addLinkForm');
  if (addLinkForm) addLinkForm.addEventListener('submit', function (e) {
    e.preventDefault();
    submitAddLink();
  });

  /* ESC 로 플레이어를 닫습니다. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') closePlayer();
  });

  function selectPlayer(key) {
    state.player = key;
    renderAll();
    setTimeout(function () {
      $$('.pills').forEach(function (row) {
        var active = row.querySelector('.pill.is-active');
        if (!active) return;
        try { active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (err) {}
      });
    }, 30);
  }

  function switchTab(name) {
    state.tab = name;
    $$('.tab').forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    $$('.panel').forEach(function (p) {
      var on = p.id === 'panel-' + name;
      p.classList.toggle('is-active', on);
      p.hidden = !on;
    });
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
  }

  var themeBtn = $('#themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  var cheerForm = $('#cheerForm');
  if (cheerForm) {
    cheerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#cheerInput');
      var text = (input.value || '').trim();
      if (!text) { input.focus(); return; }
      addCheer(text);
      input.value = '';
      input.focus();
    });
  }

  /* ---------- 알림 ---------- */
  function setNote(msg, err) {
    var el = $('#testNote');
    if (!el) return;
    el.textContent = msg || notifyStatusText();
    el.classList.toggle('is-err', !!err);
  }

  function alertTarget() {
    var p = current();
    if (isSoloOn(p.key)) {
      return {
        kind: 'solo',
        title: T('banner.testTitle', { name: pName(p) }),
        body: T('banner.testSoloBody', { name: pName(p) }),
        done: T('banner.soloDone', { name: pName(p) })
      };
    }
    if (liveAlerts) {
      return {
        kind: 'live',
        title: T('banner.testLiveTitle', { name: pName(p) }),
        body: T('banner.testLiveBody', { name: pName(p) }),
        done: T('banner.liveDone')
      };
    }
    if (officialOn) {
      return {
        kind: 'official',
        title: T('banner.testOfficial'),
        body: T('banner.testOfficialBody'),
        done: T('banner.officialDone')
      };
    }
    return null;
  }

  function notifyOptions(body) {
    return {
      body: body,
      icon: './icons/icon-192.png',
      badge: './icons/badge-96.png',
      tag: 'dk-signal-test',
      renotify: true,
      lang: lang(),
      data: { url: './' }
    };
  }

  /* 서버에 테스트 알림을 부탁합니다. 서버는 3초 뒤 이 기기 구독 1건으로만 보냅니다.
     아이폰은 앱을 보고 있으면 배너가 묻히기 때문에, 3초 동안 홈·잠금화면으로 나갈 수 있게 합니다. */
  function serverTestPush(target, sub) {
    var payload = {
      action: 'test',
      subscription: sub.toJSON(),
      title: target.title,
      body: target.body,
      lang: lang(),
      delayMs: 3000
    };
    setNote(T('banner.serverTestNote'));
    showBanner(T('banner.serverTestTitle'), T('banner.serverTestNote'));
    return fetch('./api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (d) {
        if (d && d.ok) return d;
        setNote((d && d.message) || T('banner.serverTestFail'), true);
        return null;
      })
      .catch(function () {
        setNote(T('banner.serverTestFail'), true);
        return null;
      });
  }

  /* 이미 있는 구독을 가져옵니다 (없으면 null). */
  function currentSubscription() {
    if (LIVE.push.sub) return Promise.resolve(LIVE.push.sub);
    if (!LIVE.push.supported || !('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager ? reg.pushManager.getSubscription() : null;
    }).then(function (sub) {
      LIVE.push.sub = sub || null;
      return sub;
    }).catch(function () { return null; });
  }

  function sendTest() {
    var target = alertTarget();
    if (!target) {
      showBanner(T('banner.noneTitle'), T('banner.noneBody'));
      setNote(T('banner.noneNote'), true);
      return;
    }
    var env = envInfo();
    var opts = notifyOptions(target.body);

    var fallback = function () {
      showBanner(target.title, opts.body);
      setNote(T('banner.fallbackNote'), true);
    };

    if (!('Notification' in window)) {
      fallback();
      return;
    }

    var proceed = function (granted) {
      if (!granted) return fallback();
      var finish = function (reg) {
        try {
          if (reg && reg.showNotification) {
            reg.showNotification(target.title, opts).then(function () {
              setNote(target.done + T('banner.doneSuffix'));
            }).catch(fallback);
          } else {
            new Notification(target.title, opts);
            setNote(target.done);
          }
        } catch (err) { fallback(); }
      };
      if (swReg) return finish(swReg);
      if (!window.__DK_PREVIEW__ && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
        navigator.serviceWorker.getRegistration().then(function (r) {
          if (r) { swReg = r; return finish(r); }
          navigator.serviceWorker.register('./sw.js').then(function (nr) { swReg = nr; finish(nr); })
            .catch(function () { finish(null); });
        }).catch(function () { finish(null); });
        return;
      }
      finish(null);
    };

    /* 1) 아이폰에서 Safari 탭·인앱 브라우저로 열었을 때는 알림 자체가 오지 않습니다 */
    if (env.ios && !isStandalone()) {
      setNote(T('banner.iosInstallNote'), true);
      showBanner(T('banner.iosInstallTitle'), T('banner.iosInstallBody'));
      if (typeof openInstall === 'function') openInstall();
      return;
    }

    /* 2) 서버가 준비돼 있으면(아이폰 홈 화면 앱 · 갤럭시 공통) 서버 경유 3초 지연 테스트 */
    var serverReady = canUseApi() && !!(LIVE.config && LIVE.config.push && LIVE.config.push.ready);
    if (serverReady) {
      currentSubscription().then(function (sub) {
        if (sub) return serverTestPush(target, sub);
        /* 아직 구독 전이면 권한 요청 → 구독 → 테스트까지 이어서 */
        return syncPush(true).then(function () {
          if (LIVE.push.sub) return serverTestPush(target, LIVE.push.sub);
          var perm = Notification.permission;
          if (perm === 'default') {
            return Promise.resolve(Notification.requestPermission()).catch(function () { return 'denied'; })
              .then(function (v) { proceed(v === 'granted'); });
          }
          proceed(perm === 'granted');
          return null;
        });
      }).catch(function () { proceed(Notification.permission === 'granted'); });
      return;
    }

    /* 3) 서버가 없거나 미리보기·오프라인일 때는 기존처럼 기기 안 알림 */
    var perm = Notification.permission;
    if (perm === 'default') {
      try {
        Notification.requestPermission().then(function (v) { proceed(v === 'granted'); });
      } catch (e) { fallback(); }
      return;
    }
    proceed(perm === 'granted');
  }

  var testBtn = $('#testBtn');
  if (testBtn) testBtn.addEventListener('click', sendTest);

  /* ---------- PWA 설치 가이드 ----------
   * beforeinstallprompt 는 크롬 계열 안드로이드에서만 옵니다.
   * 아이폰 Safari·카톡/X/인스타 인앱 브라우저에서는 아예 발생하지 않아서,
   * 예전에는 버튼이 영영 숨겨졌습니다. 이제는 설치된 상태(스탠드얼론)가 아니면 항상 보여주고,
   * 누르면 지금 환경에 맞는 순서로 따라하기 안내를 띄웁니다. */
  var installPrompt = null;
  var INSTALL_HIDE_KEY = 'dk.signal.install.hide';

  function isStandalone() {
    try {
      if (window.matchMedia) {
        if (window.matchMedia('(display-mode: standalone)').matches) return true;
        if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
        if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
      }
    } catch (e) {}
    try { if (navigator.standalone === true) return true; } catch (e) {}
    return false;
  }

  function envInfo() {
    var ua = navigator.userAgent || '';
    var ios = /iPhone|iPad|iPod/i.test(ua);
    var android = /Android/i.test(ua);
    /* 카카오톡·X(트위터)·인스타·페북·라인·네이버 앱 안에서 열린 경우 */
    var inapp = /KAKAOTALK|KakaoTalk|NAVER\(|NAVER\/|DaumApps|Daum|Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|X-Client|everytime/i.test(ua);
    return { ios: ios, android: android, desktop: !ios && !android, inapp: inapp };
  }

  function deviceLabel(env) {
    if (env.ios) return T('install.deviceIos');
    if (env.android) return T('install.deviceAndroid');
    return T('install.deviceDesktop');
  }

  function syncInstallUI() {
    var standalone = isStandalone();
    var btn = $('#installBtn');
    if (btn) {
      btn.hidden = standalone;
      btn.setAttribute('aria-label', T(standalone ? 'install.already' : 'install.installAria'));
    }
    var card = $('#installCard');
    if (card) card.hidden = standalone || store.get(INSTALL_HIDE_KEY, '0') === '1';
    var cta = $('#installCta');
    if (cta) cta.hidden = !installPrompt;
    var done = $('#installDone');
    if (done) done.hidden = !standalone;
  }

  function renderInstallGuide() {
    var env = envInfo();
    var dev = $('#installDevice');
    if (dev) dev.textContent = T('install.detected', { device: deviceLabel(env) });

    var inapp = $('#installInapp');
    if (inapp) inapp.hidden = !env.inapp;

    /* 지금 쓰는 기기의 안내를 맨 위로 올립니다 (인앱 브라우저 주의 → 기기별 순서 → 나머지). */
    var iosSec = $('#installIos');
    var andSec = $('#installAndroid');
    var deskSec = $('#installDesktop');
    var manual = $('#installManualTitle');
    if (deskSec) deskSec.hidden = !env.desktop;
    if (iosSec && andSec) {
      var first = env.ios ? iosSec : andSec;
      var second = env.ios ? andSec : iosSec;
      if (env.desktop) {
        first = iosSec; second = andSec;
        iosSec.style.order = '8'; andSec.style.order = '9';
        iosSec.classList.remove('is-here'); andSec.classList.remove('is-here');
        if (deskSec) { deskSec.style.order = '7'; deskSec.classList.add('is-here'); }
      } else {
        first.style.order = '7';
        second.style.order = '8';
        first.classList.add('is-here');
        second.classList.remove('is-here');
      }
    }
    if (manual) manual.style.order = '6';
    if (inapp) inapp.style.order = '5';
    var cta = $('#installCta');
    if (cta) cta.style.order = '3';
    var done = $('#installDone');
    if (done) done.style.order = '4';
    var head = $('.in-sheet .lg-head');
    if (head) head.style.order = '0';
    var lead = $('.in-lead');
    if (lead) lead.style.order = '1';
    if (dev) dev.style.order = '2';
  }

  function openInstall() {
    var modal = $('#installModal');
    if (!modal) return;
    syncInstallUI();
    renderInstallGuide();
    modal.hidden = false;
  }
  function closeInstall() {
    var modal = $('#installModal');
    if (modal) modal.hidden = true;
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installPrompt = e;
    syncInstallUI();
    if ($('#installModal') && !$('#installModal').hidden) renderInstallGuide();
  });
  window.addEventListener('appinstalled', function () {
    installPrompt = null;
    store.set(INSTALL_HIDE_KEY, '1');
    syncInstallUI();
    closeInstall();
    showBanner(T('install.doneTitle'), T('install.doneBody'));
  });

  var installBtn = $('#installBtn');
  if (installBtn) installBtn.addEventListener('click', openInstall);
  var installCardBtn = $('#installCardBtn');
  if (installCardBtn) installCardBtn.addEventListener('click', openInstall);
  var installCardX = $('#installCardX');
  if (installCardX) installCardX.addEventListener('click', function () {
    store.set(INSTALL_HIDE_KEY, '1');
    syncInstallUI();
  });
  var installClose = $('#installClose');
  if (installClose) installClose.addEventListener('click', closeInstall);
  var installVeil = $('#installVeil');
  if (installVeil) installVeil.addEventListener('click', closeInstall);
  var promptBtn = $('#installPromptBtn');
  if (promptBtn) promptBtn.addEventListener('click', function () {
    if (!installPrompt) {
      closeInstall();
      showBanner(T('banner.installTitle'), T('banner.installBody'));
      return;
    }
    installPrompt.prompt();
    installPrompt.userChoice.then(function () {
      installPrompt = null;
      syncInstallUI();
      renderInstallGuide();
    }).catch(function () {});
  });

  if (!window.__DK_PREVIEW__ && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').then(function (reg) {
        swReg = reg;
      }).catch(function () {});
      navigator.serviceWorker.ready.then(function (reg) { swReg = reg; }).catch(function () {});
    });
  }

  window.addEventListener('online', function () { setNote(T('banner.online')); });

  /* 인게임 시트·설치 안내: Esc 로 닫기 */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var install = $('#installModal');
    if (install && !install.hidden) { closeInstall(); return; }
    var summary = $('#summaryModal');
    if (summary && !summary.hidden) { closeSummary(); return; }
    var addLink = $('#addLinkModal');
    if (addLink && !addLink.hidden) { closeAddLink(); return; }
    var votePop = $('#votePop');
    if (votePop && !votePop.hidden) { closeVotePop(); return; }
    if (lgOpenKey) closeLive();
  });

  /* ---------- 언어 변경 ---------- */
  window.I18N.onChange(function () {
    /* ?lang= 로 들어온 경우, 사용자가 바꾼 언어를 주소에도 반영해 새로고침 때 되돌아가지 않게 합니다. */
    try {
      var sp = new URLSearchParams(location.search);
      if (sp.get('lang')) {
        sp.set('lang', lang());
        history.replaceState(null, '', location.pathname + '?' + sp.toString() + location.hash);
      }
    } catch (e) {}
    applyStatic();
    renderLangSwitch();
    updateThemeUI();
    syncInstallUI();
    if ($('#installModal') && !$('#installModal').hidden) renderInstallGuide();
    if (lgOpenKey) closeLive();
    renderAll();
    applyLiveStatus();
    if ($('#votePop') && !$('#votePop').hidden) renderVotePop();
    if (canUseApi() && !LIVE.offline) refreshLive();
  });

  /* ---------- 시작 ---------- */
  window.I18N.setLang(window.I18N.lang, { silent: true });
  applyStatic();
  renderLangSwitch();
  updateThemeUI();
  syncInstallUI();
  renderAll();
  applyLiveStatus();
  refreshLive();
  scheduleLivePoll();
  initVotePop();
  setInterval(function () {
    if (!document.hidden && !LIVE.offline) refreshLive();
  }, LIVE_INTERVAL);
  /* 방송 경과 시간은 서버 호출 없이 10초마다 다시 계산합니다. */
  setInterval(function () {
    var el = $('#lhElapsed');
    if (!el) return;
    var txt = elapsedText(el.getAttribute('data-start'));
    if (txt && el.textContent !== txt) el.textContent = txt;
  }, 10000);
  /* 인게임 경과 시간은 1분 단위로 다시 그립니다(서버 호출 없이 로컬 계산). */
  setInterval(function () {
    if (LIVE.solo && LIVE.solo.liveGames && LIVE.solo.liveGames.length) {
      renderPick();
      renderTiles();
      if (lgOpenKey) openLive(lgOpenKey);
    }
  }, 30000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - LIVE.lastSync > LIVE_INTERVAL) refreshLive();
    if (!document.hidden && !livePollTimer) scheduleLivePoll();
  });

  try {
    var params = new URLSearchParams(location.search);
    var initial = params.get('tab');
    if (initial && ['feed', 'official', 'video', 'solo', 'records'].indexOf(initial) > -1) switchTab(initial);
    var startWho = params.get('player');
    if (startWho) {
      for (var pi = 0; pi < PLAYERS.length; pi++) {
        if (PLAYERS[pi].key === startWho) { selectPlayer(startWho); break; }
      }
    }
    var langParam = params.get('lang');
    if (langParam && window.I18N.LANGS.some(function (l) { return l.code === langParam; }) && langParam !== lang()) {
      window.I18N.setLang(langParam);
    }
  } catch (e) {}
})();
