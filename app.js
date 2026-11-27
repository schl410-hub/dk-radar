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

  /* 알림 설정: 선수별 솔랭 알림 + DK 공식 경기 알림 (각각 localStorage 저장) */
  var OFFICIAL_KEY = 'dk.signal.official';
  var SOLO_KEY = 'dk.signal.solo.';
  function soloKey(k) { return SOLO_KEY + k; }
  function isSoloOn(k) {
    var def = k === 'doran' ? '1' : '0';
    return store.get(soloKey(k), def) === '1';
  }
  var officialOn = store.get(OFFICIAL_KEY, '1') === '1';

  /* ---------- 데이터 헬퍼 ---------- */
  function player(key) {
    for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].key === key) return PLAYERS[i];
    return PLAYERS[0];
  }
  function current() { return player(state.player); }

  function pName(p) {
    if (lang() === 'ko') return p.nameKo;
    if (lang() === 'ja') return p.nameJa || p.nameIntl || p.nameKo;
    return p.nameIntl || p.nameEn || p.nameKo;
  }
  function pReal(p) {
    if (lang() === 'ko') return p.real;
    if (lang() === 'ja') return p.realJa || p.realEn || p.real;
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
    CHAMP_INDEX = { ko: {}, en: {}, ja: {} };
    Object.keys(CHAMPIONS || {}).forEach(function (id) {
      var row = CHAMPIONS[id];
      if (!row || !row.length) return;
      CHAMP_INDEX.ko[row[0]] = row;
      CHAMP_INDEX.en[normChamp(row[1])] = row;
      CHAMP_INDEX.ja[row[2]] = row;
    });
    return CHAMP_INDEX;
  }
  function champText(name) {
    if (name == null) return '';
    var idx = champIndex();
    var row = idx.ko[name] || idx.en[normChamp(name)] || idx.ja[name];
    if (!row) return name;
    if (lang() === 'ko') return row[0];
    if (lang() === 'ja') return row[2];
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
          '<div class="pick-name">' + pName(p) + '<em>' + pReal(p) + '</em></div>' +
          '<div class="pick-tier">' + tierText(p) + '<span class="sep">·</span><span class="lp">' + lpText(p) + '</span><span class="sep">·</span>' + winRateText(p) + '</div>' +
        '</div>' +
        '<div class="pick-form">' +
          '<span class="lb">' + T('pick.recent5') + '</span>' +
          '<span class="dots">' + dotsHTML(r) + '</span>' +
          '<span class="rec">' + wl(t.w, t.l) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="pick-foot">' +
        '<span class="riot">' + p.riotId + (p.inGame ? '<span class="live-in"><i></i>' + T('pick.inGame') + '</span>' : '') + '</span>' +
        '<span class="rec">' + T('pick.lastGame', { d: matchDate(last.d), t: last.t, champ: champText(last.champ), kda: last.kda, result: T(last.win ? 'result.win' : 'result.lose') }) + '</span>' +
      '</div>' +
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
        '<span class="t-tier">' + tierShort(p) + '<span class="t-dot">·</span><b>' + lpText(p) + '</b></span>' +
        (p.inGame ? '<span class="t-live"><i></i>' + T('pick.inGame') + '</span>' : '') +
        '<span class="bars">' + bars + '</span>' +
        (active ? '<span class="t-foot"><span class="chipk">' + T('pick.recent5') + ' <b>' + wl(t.w, t.l) + '</b></span><span class="chipk">KDA <b>' + t.kda + '</b></span>' +
          (p.key === myPick ? '<span class="chipk chipk-fav">' + STAR_ON + T('pick.pinned') + '</span>' : '') + '</span>' : '') +
      '</button>';
    }).join('');
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

  /* ---------- 선수 대표 하이라이트 (유튜브) ---------- */
  function ytWatch(id) { return 'https://www.youtube.com/watch?v=' + id; }
  function ytThumb(id) { return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; }

  function videoCardHTML(p) {
    var list = (p.highlights || []).map(function (v) {
      return '<li>' +
        '<a class="vc-item" href="' + ytWatch(v.id) + '" target="_blank" rel="noopener" data-video="' + v.id + '">' +
          '<span class="vc-thumb"><img loading="lazy" src="' + ytThumb(v.id) + '" alt="" width="168" height="94"><i class="vc-len">' + v.len + '</i></span>' +
          '<span class="vc-body">' +
            '<b class="vc-title">' + L(v.match) + '</b>' +
            '<span class="vc-meta">' + L(v.event) + '</span>' +
            '<span class="vc-tags"><span class="vc-badge">' + T('video.badge') + '</span>' +
              '<span class="vc-len-txt">' + T('video.len', { len: v.len }) + '</span></span>' +
          '</span>' +
        '</a>' +
      '</li>';
    }).join('');
    return '<div class="card-head">' +
        '<div>' +
          '<div class="eyebrow">HIGHLIGHTS · YOUTUBE</div>' +
          '<h3 class="card-title">' + T('video.title') + '</h3>' +
        '</div>' +
        '<a class="ghost-btn" href="' + CHANNELS.dkYoutube + '" target="_blank" rel="noopener">' + T('video.more') + '</a>' +
      '</div>' +
      '<p class="vc-sub">' + T('video.sub', { name: pName(p) }) + '</p>' +
      (list ? '<ul class="vc-list">' + list + '</ul>' : '<p class="vc-sub">' + T('video.empty') + '</p>');
  }

  function renderVideoCards() {
    var p = current();
    ['#videoCard', '#videoCardRecords'].forEach(function (sel) {
      var host = $(sel);
      if (host) host.innerHTML = videoCardHTML(p);
    });
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
    var sum = $('#notifySummary');
    if (sum) {
      var n = PLAYERS.filter(function (p) { return isSoloOn(p.key); }).length + (officialOn ? 1 : 0);
      sum.textContent = n ? T('notify.summaryOn', { n: n }) : T('notify.summaryOff');
    }
    setNote('');
  }

  function notifyStatusText() {
    var p = current();
    if (isSoloOn(p.key) && officialOn) return T('notify.statusBoth', { name: pName(p) });
    if (isSoloOn(p.key)) return T('notify.statusSolo', { name: pName(p) });
    if (officialOn) return T('notify.statusOfficial');
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
        '<td class="c-champ">' + champText(m.champ) + '</td>' +
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
    renderNextWatch();
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
  function renderRecords() {
    var p = current();
    var who = $('#recordsWho');
    if (who) who.textContent = T('records.who', { name: pName(p) });
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
  function blockText(str) {
    if (!str) return '';
    var s = String(str).trim();
    for (var i = 0; i < BLOCKS.length; i++) {
      if (BLOCKS[i].ko === s || BLOCKS[i].ja === s || BLOCKS[i].en.toLowerCase() === s.toLowerCase()) return L(BLOCKS[i]);
    }
    var m = /^(\d+)라운드$/.exec(s);
    if (m) return lang() === 'ko' ? s : (lang() === 'ja' ? '第' + m[1] + 'ラウンド' : 'Round ' + m[1]);
    m = /^Round\s*(\d+)$/i.exec(s);
    if (m) return lang() === 'ko' ? m[1] + '라운드' : (lang() === 'ja' ? '第' + m[1] + 'ラウンド' : 'Round ' + m[1]);
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

  /* 다음 경기가 있을 때 바로 볼 수 있는 공식 생중계 채널 (공식일정 카드 + 홈 스트립) */
  function watchButtonsHTML(withLabel) {
    var em = withLabel === false ? '' : '<em>' + T('video.liveNow') + '</em>';
    return '<a class="watch-btn is-chzzk" href="' + CHANNELS.lckChzzk + '" target="_blank" rel="noopener" aria-label="' + T('video.chzzkAria') + '">' +
        '<i class="dot"></i>' + T('video.chzzk') + em + '</a>' +
      '<a class="watch-btn is-soop" href="' + CHANNELS.lckSoop + '" target="_blank" rel="noopener" aria-label="' + T('video.soopAria') + '">' +
        '<i class="dot"></i>' + T('video.soop') + em + '</a>' +
      '<a class="watch-btn is-youtube" href="' + CHANNELS.lckYoutube + '" target="_blank" rel="noopener" aria-label="' + T('video.youtubeAria') + '">' +
        '<i class="dot"></i>YouTube' + em + '</a>';
  }

  function renderNextWatch() {
    var host = $('#nextWatch');
    var note = $('#nextWatchNote');
    if (host) host.innerHTML = watchButtonsHTML();
    if (note) note.textContent = T('video.liveNote');

    var home = $('#homeWatch');
    if (!home) return;
    var data = LIVE.official;
    var next = data && data.ok ? data.next : null;
    var label = next
      ? '<b>' + T('official.next') + '</b> DK vs ' + esc((next.opponent && (next.opponent.code || next.opponent.name)) || 'TBD') +
        ' <span>' + esc(eventDate(next)) + ' ' + esc(next.time || '') + '</span>'
      : '<b>' + T('video.liveTitle') + '</b> <span>' + T('video.liveNow') + '</span>';
    home.innerHTML =
      '<div class="hw-head">' + label + '</div>' +
      '<div class="watch-row">' + watchButtonsHTML(false) + '</div>';
  }

  /* 종료된 경기: 공식 VOD(있으면) · 유튜브 하이라이트 검색 */
  function ytSearch(q) { return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q); }

  function matchQuery(row) {
    var opp = (row.opponent && (row.opponent.code || row.opponent.name)) || '';
    var league = leagueName(row.league) || '';
    var date = eventDate(row);
    var tail = lang() === 'ko' ? '하이라이트' : (lang() === 'ja' ? 'ハイライト' : 'highlights');
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
    if (!data || !Array.isArray(data.players) || data.source !== 'riot') return;
    data.players.forEach(function (sp) {
      var p = null;
      for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].key === sp.key) p = PLAYERS[i];
      if (!p) return;
      if (sp.tierKey) p.tierKey = sp.tierKey;
      if (sp.tierRank != null) p.tierRank = sp.tierRank;
      if (sp.tier) p.tier = sp.tier;
      if (sp.lpValue != null) p.lpValue = sp.lpValue;
      if (sp.lp) p.lp = sp.lp;
      if (sp.wins != null) p.wins = sp.wins;
      if (sp.losses != null) p.losses = sp.losses;
      if (sp.record) p.record = sp.record;
      p.inGame = !!sp.inGame;
      if (Array.isArray(sp.matches) && sp.matches.length) {
        var seen = {};
        sp.matches.forEach(function (m) { seen[m.d + m.t + m.champ] = true; });
        var extra = p.matches.filter(function (m) { return !seen[m.d + m.t + m.champ]; });
        p.matches = sp.matches.concat(extra).slice(0, 15);
      }
    });
    if (data.fetchedAt) state.checked = new Date(data.fetchedAt);
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
      apiGet('./api/solo')
    ]).then(function (res) {
      var cfg = res[0], off = res[1], solo = res[2];
      if (cfg && cfg.ok) LIVE.config = cfg;
      if (!cfg && !off && !solo) {
        LIVE.offline = true;
        applyLiveStatus();
        return;
      }
      if (off) LIVE.official = off;
      if (solo) { LIVE.solo = solo; if (solo.source) LIVE.soloSource = solo.source; mergeSolo(solo); }
      LIVE.lastSync = Date.now();
      renderAll();
      applyLiveStatus();
      if (LIVE.config && LIVE.config.push && LIVE.config.push.ready) syncPush(false);
    });
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
      official: officialOn
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
    renderPick();
    renderTiles();
    renderHighlight();
    renderVideoCards();
    renderCheer();
    renderSolo();
    renderRoster();
    renderOfficial();
    renderRecords();
    renderNotify();
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click', function (e) {
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
    var tab = e.target.closest('[data-tab]');
    if (tab) { switchTab(tab.getAttribute('data-tab')); return; }
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

  /* ---------- PWA ---------- */
  var installPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installPrompt = e;
    var btn = $('#installBtn');
    if (btn) btn.hidden = false;
  });
  var installBtn = $('#installBtn');
  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (!installPrompt) {
        showBanner(T('banner.installTitle'), T('banner.installBody'));
        return;
      }
      installPrompt.prompt();
      installPrompt.userChoice.then(function () {
        installPrompt = null;
        installBtn.hidden = true;
      }).catch(function () {});
    });
  }

  if (!window.__DK_PREVIEW__ && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').then(function (reg) {
        swReg = reg;
      }).catch(function () {});
      navigator.serviceWorker.ready.then(function (reg) { swReg = reg; }).catch(function () {});
    });
  }

  window.addEventListener('online', function () { setNote(T('banner.online')); });

  /* ---------- 언어 변경 ---------- */
  window.I18N.onChange(function () {
    applyStatic();
    renderLangSwitch();
    updateThemeUI();
    renderAll();
    applyLiveStatus();
    if (canUseApi() && !LIVE.offline) refreshLive();
  });

  /* ---------- 시작 ---------- */
  window.I18N.setLang(window.I18N.lang, { silent: true });
  applyStatic();
  renderLangSwitch();
  updateThemeUI();
  renderAll();
  applyLiveStatus();
  refreshLive();
  setInterval(function () {
    if (!document.hidden && !LIVE.offline) refreshLive();
  }, LIVE_INTERVAL);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - LIVE.lastSync > LIVE_INTERVAL) refreshLive();
  });

  try {
    var params = new URLSearchParams(location.search);
    var initial = params.get('tab');
    if (initial && ['feed', 'official', 'solo', 'records'].indexOf(initial) > -1) switchTab(initial);
    var startWho = params.get('player');
    if (startWho) {
      for (var pi = 0; pi < PLAYERS.length; pi++) {
        if (PLAYERS[pi].key === startWho) { selectPlayer(startWho); break; }
      }
    }
    var langParam = params.get('lang');
    if (langParam && ['ko', 'en', 'ja'].indexOf(langParam) > -1 && langParam !== lang()) {
      window.I18N.setLang(langParam);
    }
  } catch (e) {}
})();
