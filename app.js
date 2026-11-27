/* 딮기 시그널 · DK SIGNAL 앱 로직 (프레임워크 없이 동작)
 * KO · EN · JA 다국어, 테마, 5인 보드, 공식 일정(생중계·VOD·하이라이트), 선수 방송국·전적, 대표 하이라이트
 */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var T = function (key, vars) { return window.I18N.t(key, vars); };
  var lang = function () { return window.I18N.lang; };

  /* { ko, en, ja } 묶음에서 현재 언어 값을 꺼냅니다. */
  function L(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value[lang()] != null ? value[lang()] : (value.ko || '');
  }

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
    return p.nameIntl || p.nameEn || p.nameKo;
  }
  function pReal(p) {
    if (lang() === 'ko') return p.real;
    if (lang() === 'ja') return p.realJa || p.realEn || p.real;
    if (lang() === 'zh') return p.realZh || p.realEn || p.real;
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

  /* 챔피언 이름: 데이터는 한국어, Riot API 는 영어로 줍니다. 표에서 세 언어를 찾아 바꿉니다. */
  var CHAMP_INDEX = null;
  function normChamp(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function champIndex() {
    if (CHAMP_INDEX) return CHAMP_INDEX;
    CHAMP_INDEX = { ko: {}, en: {}, ja: {}, zh: {}, vi: {} };
    Object.keys(CHAMPIONS || {}).forEach(function (id) {
      var row = CHAMPIONS[id];
      if (!row || !row.length) return;
      CHAMP_INDEX.ko[row[0]] = row;
      CHAMP_INDEX.en[normChamp(row[1])] = row;
      CHAMP_INDEX.ja[row[2]] = row;
      if (row[3]) CHAMP_INDEX.zh[row[3]] = row;
      if (row[4]) CHAMP_INDEX.vi[row[4]] = row;
    });
    return CHAMP_INDEX;
  }
  function champText(name) {
    if (name == null) return '';
    var idx = champIndex();
    var row = idx.ko[name] || idx.en[normChamp(name)] || idx.ja[name] || idx.zh[name] || idx.vi[name];
    if (!row) return name;
    if (lang() === 'ko') return row[0];
    if (lang() === 'ja') return row[2];
    if (lang() === 'zh') return row[3] || row[0];
    if (lang() === 'vi') return row[4] || row[1];
    return row[1];
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

  /* ---------- 언어 전환 컨트롤 ---------- */
  function renderLangSwitch() {
    var host = $('#langSwitch');
    if (!host) return;
    host.innerHTML = window.I18N.LANGS.map(function (l) {
      var on = l.code === lang();
      return '<button class="lang-btn' + (on ? ' is-active' : '') + '" type="button" data-lang="' + l.code + '"' +
        ' aria-pressed="' + on + '" lang="' + l.htmlLang + '" title="' + l.name + '">' + l.label + '</button>';
    }).join('');
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
    var icon = ev.kind === 'awards' ? '🏆' : '📅';
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
    if (best) cards.push({ days: best.b.days, html: birthdayCardHTML(best.p, best.b) });

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
    var show = cards.slice(0, 5);
    host.innerHTML = show.map(function (c) { return c.html; }).join('');
    host.hidden = !show.length;
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
  function spellImg(name) {
    if (!name) return '';
    var file = (typeof SPELL_IMG !== 'undefined' && SPELL_IMG[name]) ? SPELL_IMG[name] : name;
    var label = (typeof SPELLS !== 'undefined' && SPELLS[name]) ? (SPELLS[name][lang() === 'ko' ? 0 : (lang() === 'ja' ? 2 : (lang() === 'zh' ? 3 : 1))] || name) : name;
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
    var loc = lang() === 'ko' ? 'ko-KR' : (lang() === 'ja' ? 'ja-JP' : (lang() === 'zh' ? 'zh-CN' : 'en-US'));
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
    return t[lang()] || t.ko || key;
  }
  function catText(key) {
    var c = typeof HL_CATS !== 'undefined' ? HL_CATS[key] : null;
    if (!c) return key;
    return c[lang()] || c.ko || key;
  }
  function whoText(entry) {
    if (entry.p) return pName(entry.p);
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
    host.innerHTML = all + fav + cats.map(function (key) {
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
    return '<li class="vc-row">' +
      '<button class="vc-item" type="button" data-play="' + esc(v.id) + '" data-title="' + esc(title) + '">' +
        '<span class="vc-thumb"><img loading="lazy" src="' + ytThumb(v.id) + '" alt="" width="168" height="94">' +
          '<i class="vc-play" aria-hidden="true">▶</i><i class="vc-len">' + esc(v.len) + '</i></span>' +
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

  function byYearSort(a, b) { return b.v.year - a.v.year; }
  function playerRank(e) {
    var order = PLAYERS.map(function (p) { return p.key; }).concat(['dk']);
    var i = order.indexOf(videoWhoKey(e));
    return i < 0 ? order.length : i;
  }

  /* 지금 고른 필터·검색을 그대로 적용한 목록 — 화면과 연속 재생 대기열이 같은 순서를 씁니다. */
  function videoListEntries() {
    var list = archiveItems();
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
      var dkRows = list.filter(function (e) { return !e.p; }).sort(byYearSort);
      if (dkRows.length) html += dkGroupHead(dkRows.length) + dkRows.map(videoItemHTML).join('');
    }

    if (!list.length) {
      var empty = state.videoCat === 'fav' ? T('video.favEmpty') : (q ? T('video.searchEmpty', { q: q }) : T('video.empty'));
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
    if (lang() === 'ja' || lang() === 'zh') return y + '年' + mo + '月' + da + '日';
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
    var sum = $('#notifySummary');
    if (sum) {
      var n = PLAYERS.filter(function (p) { return isSoloOn(p.key); }).length + (officialOn ? 1 : 0) + (liveAlerts ? 1 : 0);
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
    if (m) return lang() === 'ko' ? s : (lang() === 'ja' ? '第' + m[1] + 'ラウンド' : (lang() === 'zh' ? '第' + m[1] + '轮' : 'Round ' + m[1]));
    m = /^Round\s*(\d+)$/i.exec(s);
    if (m) return lang() === 'ko' ? m[1] + '라운드' : (lang() === 'ja' ? '第' + m[1] + 'ラウンド' : (lang() === 'zh' ? '第' + m[1] + '轮' : 'Round ' + m[1]));
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
    var tail = lang() === 'ko' ? '하이라이트' : (lang() === 'ja' ? 'ハイライト' : (lang() === 'zh' ? '集锦' : 'highlights'));
    return [league, 'DK vs ' + opp, date, tail].filter(Boolean).join(' ');
  }

  function vodFor(row) {
    if (!row || !row.vod) return null;
    return row.vod[lang()] || row.vod.ko || row.vod.en || null;
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
        '<div class="p-vid">' + matchVideosHTML(g) + '</div>' +
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
      apiGet('./api/dk-youtube')
    ]).then(function (res) {
      var cfg = res[0], off = res[1], solo = res[2], live = res[3], dkYt = res[4];
      if (cfg && cfg.ok) LIVE.config = cfg;
      if (!cfg && !off && !solo) {
        LIVE.offline = true;
        applyLiveStatus();
        return;
      }
      if (off) LIVE.official = off;
      if (live && live.ok) LIVE.live = live;
      if (dkYt) LIVE.dkYt = dkYt;
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
      live: liveAlerts
    };
  }

  function postSubscription() {
    if (!LIVE.push.sub) return Promise.resolve(false);
    return fetch('./api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: LIVE.push.sub.toJSON(), prefs: prefsPayload(), ua: navigator.userAgent })
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
    var any = prefsPayload().solo.length > 0 || officialOn;
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
  function renderAll() {
    renderPills();
    renderEvents();
    renderPick();
    renderTiles();
    renderHighlight();
    renderVideoPanel();
    renderCheer();
    renderSolo();
    renderRoster();
    renderOfficial();
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
    var langBtn = e.target.closest('[data-lang]');
    if (langBtn) {
      var code = langBtn.getAttribute('data-lang');
      if (code !== lang()) {
        window.I18N.setLang(code);
      }
      return;
    }
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

  function sendTest() {
    var target = alertTarget();
    if (!target) {
      showBanner(T('banner.noneTitle'), T('banner.noneBody'));
      setNote(T('banner.noneNote'), true);
      return;
    }
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
    var manual = $('#installManualTitle');
    if (iosSec && andSec) {
      var first = env.ios ? iosSec : andSec;
      var second = env.ios ? andSec : iosSec;
      if (env.desktop) { first = iosSec; second = andSec; }
      first.style.order = '7';
      second.style.order = '8';
      first.classList.add('is-here');
      second.classList.remove('is-here');
      if (env.desktop) {
        iosSec.classList.remove('is-here');
        andSec.classList.remove('is-here');
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
    if (langParam && ['ko', 'en', 'ja', 'zh', 'vi'].indexOf(langParam) > -1 && langParam !== lang()) {
      window.I18N.setLang(langParam);
    }
  } catch (e) {}
})();
