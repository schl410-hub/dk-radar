/* 딮기 시그널 · DK SIGNAL 앱 로직 (프레임워크 없이 동작) */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

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
  state.player = myPick; /* 새로고침·다시 열어도 저장된 최애가 첫 화면에 뜨도록 */

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

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d) {
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function parseMatchDate(str) {
    var m = /^\s*(\d{1,2})\.\s*(\d{1,2})\.\s*$/.exec(str || '');
    if (!m) return null;
    var d = new Date(state.checked.getFullYear(), Number(m[1]) - 1, Number(m[2]));
    return d;
  }
  function relDay(str) {
    var d = parseMatchDate(str);
    if (!d) return '';
    var base = new Date(2026, 10, 26);
    var diff = Math.round((base - d) / 86400000);
    if (diff <= 0) return '오늘';
    if (diff === 1) return '어제';
    if (diff <= 7) return diff + '일 전';
    return str.replace(/\s+/g, '');
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
  function barHeight(m) {
    var parts = m.kda.split('/').map(Number);
    var involvement = (parts[0] || 0) + (parts[2] || 0);
    return Math.max(4, Math.min(14, 4 + Math.round(involvement / 4)));
  }
  function relTime(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return '방금';
    if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '시간 전';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '일 전';
    return '이전';
  }

  /* ---------- 테마 ---------- */
  function updateThemeUI() {
    var mint = theme === 'mint';
    document.documentElement.setAttribute('data-theme', theme);
    var btn = $('#themeBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', String(mint));
      btn.setAttribute('aria-label', mint ? '다크 네온 민트 테마로 전환' : '소프트 민트 테마로 전환');
    }
    var txt = $('#themeTxt');
    if (txt) txt.textContent = mint ? '소프트' : '다크';
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
        (p.key === state.player) + '" data-player="' + p.key + '">' + p.nameKo +
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
      ' role="switch" aria-checked="' + on + '" aria-label="' + p.nameKo + ' 솔로랭크 알림 ' + (on ? '끄기' : '켜기') + '">' +
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
    return '<div class="pick-switch" role="tablist" aria-label="MY PICK 선수 빠른 선택">' +
      PLAYERS.map(function (pp) {
        var on = pp.key === state.player;
        var fav = pp.key === myPick;
        return '<button class="psw' + (on ? ' is-active' : '') + (fav ? ' is-fav' : '') + '" type="button" role="tab"' +
          ' aria-selected="' + on + '" data-player="' + pp.key + '"' +
          ' aria-label="' + pp.nameKo + ' 보기' + (fav ? ' (내 최애)' : '') + '">' +
          (fav ? STAR_ON : '') + '<span>' + pp.nameKo + '</span></button>';
      }).join('') +
    '</div>';
  }

  function pinBtnHTML(pinned) {
    return '<button class="pin-btn' + (pinned ? ' is-on' : '') + '" type="button" data-pin="1"' +
      ' aria-pressed="' + pinned + '"' +
      ' aria-label="' + (pinned ? '내 최애로 고정됨' : '이 선수를 내 최애로 고정') + '"' +
      ' title="' + (pinned ? '내 최애로 고정됨' : '이 선수를 내 최애로 고정') + '">' +
      (pinned ? STAR_ON : STAR_OFF) + '<span>' + (pinned ? '내 최애' : '최애 고정') + '</span></button>';
  }

  /* 선택한 선수를 내 최애로 고정 (localStorage 저장) */
  function pinPlayer(key) {
    var p = player(key);
    if (key === myPick) {
      toast('★ ' + p.nameKo + topicParticle(p.nameKo) + ' 이미 내 최애로 고정돼 있어요.');
      return;
    }
    myPick = key;
    store.set(MYPICK_KEY, key);
    state.player = key;
    renderAll();
    toast('★ ' + p.nameKo + objParticle(p.nameKo) + ' 내 최애(MY PICK)로 고정했어요.');
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
          ? '<span class="mypick">' + STAR_ON + 'MY PICK · 오늘의 ' + p.nameKo + '</span>'
          : '<span class="mypick is-preview"><i></i>미리보기 · ' + p.nameKo + '</span>') +
        '<div class="pick-tools">' +
          pinBtnHTML(pinned) +
          bellBtn(p.key) +
          '<a class="pick-opgg" href="' + p.opgg + '" target="_blank" rel="noopener">' + p.statsLabel + '</a>' +
        '</div>' +
      '</div>' +
      pickSwitchHTML() +
      '<div class="pick-main">' +
        '<div class="pav">' + p.nameKo.charAt(0) + '<span class="badge-pos">' + p.posKo + '</span></div>' +
        '<div class="pick-id">' +
          '<div class="pick-name">' + p.nameKo + '<em>' + p.real + '</em></div>' +
          '<div class="pick-tier">' + p.tier + '<span class="sep">·</span><span class="lp">' + p.lp + '</span><span class="sep">·</span>' + (p.record.split('·')[1] || '').trim() + '</div>' +
        '</div>' +
        '<div class="pick-form">' +
          '<span class="lb">최근 5경기</span>' +
          '<span class="dots">' + dotsHTML(r) + '</span>' +
          '<span class="rec">' + t.w + '승 ' + t.l + '패</span>' +
        '</div>' +
      '</div>' +
      '<div class="pick-foot">' +
        '<span class="riot">' + p.riotId + '</span>' +
        '<span class="rec">' + last.d + ' ' + last.t + ' <b>' + last.champ + '</b> ' + last.kda + ' · ' + (last.win ? '승' : '패') + '</span>' +
      '</div>';
    if (!pinned) {
      var hint = document.createElement('p');
      hint.className = 'pick-hint';
      hint.innerHTML = '내 최애는 <b>' + fav.nameKo + '</b> · 별을 누르면 <b>' + p.nameKo + '</b>' + objParticle(p.nameKo) + ' 최애로 고정해요';
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
        ' aria-pressed="' + active + '" aria-label="' + p.nameKo + ' 선수 전적 보기' + (p.key === myPick ? ' (내 최애)' : '') + '">' +
        '<span class="t-head">' +
          '<span class="t-pos">' + p.pos + (p.key === myPick ? '<span class="t-fav">' + STAR_ON + '내 최애</span>' : '') + '</span>' +
          '<span class="t-st"><i class="' + (last.win ? 'w' : 'l') + '"></i>' + relDay(last.d) + '</span>' +
        '</span>' +
        '<span class="t-name">' + p.nameKo + '<em>' + p.real + '</em></span>' +
        '<span class="t-tier">' + p.tier.replace('다이아몬드', '다이아') + '<span class="t-dot">·</span><b>' + p.lp + '</b></span>' +
        '<span class="bars">' + bars + '</span>' +
        (active ? '<span class="t-foot"><span class="chipk">최근 5경기 <b>' + t.w + '승 ' + t.l + '패</b></span><span class="chipk">KDA <b>' + t.kda + '</b></span>' +
          (p.key === myPick ? '<span class="chipk chipk-fav">' + STAR_ON + '내 최애</span>' : '') + '</span>' : '') +
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
        '<div class="gc">' + m.champ + '</div>' +
        '<div class="gk">' + m.kda + '</div>' +
        '<div class="gr">' + (m.win ? 'WIN' : 'LOSS') + '</div>' +
      '</div>';
    }).join('');
    var first = r[r.length - 1];
    var last = r[0];
    host.innerHTML =
      '<div class="hl-head">' +
        '<span class="hl-who">' + p.nameKo + '<em>' + p.real + ' · ' + p.posKo + '</em></span>' +
        '<span class="hl-tag">' + t.w + 'W ' + t.l + 'L</span>' +
      '</div>' +
      '<div class="hl-row">' +
        '<div class="big"><span class="w">' + t.w + '</span><span class="dash">–</span><span class="l">' + t.l + '</span></div>' +
        '<div class="hl-brate"><div class="n">' + t.rate + '<small>%</small></div><div class="t">최근 5경기 승률</div></div>' +
      '</div>' +
      '<div class="hl-kda">' +
        '<span class="k"><b>' + t.kda + '</b> KDA</span>' +
        '<span class="k">' + t.k + ' / ' + t.d + ' / ' + t.a + '</span>' +
        '<span class="k">' + r.length + '경기 합계</span>' +
      '</div>' +
      '<div class="games">' + games + '</div>' +
      '<div class="hl-foot"><span>' + first.d + ' ~ ' + last.d + ' · ' + p.riotId + '</span>' +
        '<a href="' + p.opgg + '" target="_blank" rel="noopener">전체 전적 ↗</a></div>';
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
    if (input) input.placeholder = p.nameKo + '에게 한 줄 응원을 남겨보세요';
    var list = getCheers();
    var host = $('#cheerList');
    var empty = $('#cheerEmpty');
    var count = $('#cheerCount');
    if (count) count.textContent = list.length + '줄';
    if (empty) empty.hidden = list.length > 0;
    if (!host) return;
    host.innerHTML = '';
    list.forEach(function (ch, i) {
      var li = document.createElement('li');
      li.className = 'cheer-item';
      var b = document.createElement('span');
      b.className = 'cb';
      b.textContent = p.nameKo.charAt(0);
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
      del.setAttribute('aria-label', '응원 삭제');
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
          '<span class="nr-av">' + p.nameKo.charAt(0) + '</span>' +
          '<span class="nr-text"><b>' + p.nameKo + '<em>' + p.pos + '</em></b><span>최근 5경기 ' + t.w + '승 ' + t.l + '패</span></span>' +
          '<button class="toggle sm" type="button" data-solo-toggle="' + p.key + '" role="switch" aria-checked="' + on + '"' +
            ' aria-label="' + p.nameKo + ' 솔로랭크 알림 ' + (on ? '끄기' : '켜기') + '"><span></span></button>' +
        '</li>';
      }).join('');
    }
    $$('[data-official-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-checked', String(officialOn));
      btn.setAttribute('aria-label', 'DK 공식 경기 알림 ' + (officialOn ? '끄기' : '켜기'));
    });
    var sum = $('#notifySummary');
    if (sum) {
      var n = PLAYERS.filter(function (p) { return isSoloOn(p.key); }).length + (officialOn ? 1 : 0);
      sum.textContent = n ? n + '개 켜짐' : '모두 꺼짐';
    }
    setNote('');
  }

  function notifyStatusText() {
    var p = current();
    if (isSoloOn(p.key) && officialOn) return p.nameKo + ' 솔랭 · 경기 알림 켜짐';
    if (isSoloOn(p.key)) return p.nameKo + ' 솔랭 알림만 켜짐';
    if (officialOn) return '경기 알림만 켜짐';
    return '켜진 알림이 없어요';
  }

  /* ---------- 솔로랭크 카드 ---------- */
  function metaText(p) {
    var r = recent(p, 5);
    return p.riotId + ' · 최근 ' + r.length + '경기 ' + tally(r).w + '승 ' + tally(r).l + '패 · ' + stamp(state.checked).replace(' ', ' · ') + ' 확인';
  }

  function tierHTML(p) {
    return '<span class="tier-chip"><span class="tier-dot"></span>' + p.tier + '<span class="tc-sep">·</span>' + p.lp + '</span>' +
      '<span class="tier-meta">' + p.record + '</span>';
  }

  function tableHTML(p, filter) {
    var rows = p.matches.filter(function (m) {
      return filter === 'all' || (filter === 'win' ? m.win : !m.win);
    });
    if (!rows.length) return '<p class="empty">해당하는 경기가 없어요.</p>';
    var body = rows.map(function (m) {
      return '<tr>' +
        '<td class="c-when">' + m.d + ' ' + m.t + (m.srv ? '<span class="srv">' + m.srv + '</span>' : '') + '</td>' +
        '<td class="c-champ">' + m.champ + '</td>' +
        '<td class="c-role">' + m.role + '</td>' +
        '<td class="c-res"><span class="badge ' + (m.win ? 'win' : 'lose') + '">' + (m.win ? '승' : '패') + '</span></td>' +
        '<td class="c-kda">' + m.kda + (m.perfect ? '<span class="perfect" title="퍼펙트 게임">P</span>' : '') + '</td>' +
        '<td class="c-dur">' + m.dur + '</td>' +
      '</tr>';
    }).join('');
    return '<table class="matches"><thead><tr>' +
      '<th class="c-when">시각 (KST)</th><th class="c-champ">챔피언</th><th class="c-role">포지션</th>' +
      '<th class="c-res">결과</th><th class="c-kda">K / D / A</th><th class="c-dur">시간</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderSolo() {
    var p = current();
    var moreLabel = p.key === 'delight' ? 'u.gg에서 전체 전적 보기 ↗' : 'OP.GG에서 전체 전적 보기 ↗';
    $('#soloMeta').textContent = metaText(p);
    $('#tierRow').innerHTML = tierHTML(p);
    $('#soloTable').innerHTML = tableHTML(p, 'all');
    $('#soloOpgg').textContent = p.statsLabel;
    $('#soloOpgg').href = p.opgg;
    $('#soloMore').href = p.opgg;
    $('#soloMore').textContent = moreLabel;
    $('#soloNoteFeed').textContent = p.note || '';

    var meta2 = $('#soloMeta2');
    if (meta2) {
      meta2.textContent = metaText(p);
      $('#soloTable2').innerHTML = tableHTML(p, state.filter);
      $('#soloOpgg2').textContent = p.statsLabel;
      $('#soloOpgg2').href = p.opgg;
      $('#soloMore2').href = p.opgg;
      $('#soloMore2').textContent = moreLabel;
      $('#soloNote').textContent = p.note || '';
      $('#soloPanelMeta').textContent = p.nameKo + ' 선수의 최근 ' + p.matches.length + '경기예요. 승·패만 골라 볼 수 있어요.';
    }
  }

  function renderRoster() {
    var host = $('#rosterList');
    if (!host) return;
    host.innerHTML = PLAYERS.map(function (p) {
      return '<li><button class="roster-row' + (p.key === state.player ? ' is-active' : '') + '" type="button" data-player="' + p.key + '">' +
        '<span class="r-pos">' + p.pos + '</span>' +
        '<span class="r-name">' + p.nameKo + ' <em>' + p.real + '</em></span>' +
        '<span class="r-note">' + (ROSTER_NOTES[p.key] || '') + '</span></button></li>';
    }).join('');
  }

  /* ---------- 공식일정 탭 ---------- */
  function renderOfficial() {
    var path = $('#dkPath');
    if (path) {
      path.innerHTML = DK_PATH.map(function (g) {
        return '<li class="path-row">' +
          '<span class="p-round">' + g.round + '</span>' +
          '<span class="p-teams">DK <b class="' + (g.win ? 'w' : 'l') + '">' + g.score + '</b> ' + g.opp + '</span>' +
          '<span class="p-res ' + (g.win ? 'w' : 'l') + '">' + (g.win ? '승' : '패') + ' · ' + g.date + '</span>' +
        '</li>';
      }).join('');
    }
    var list = $('#officialList');
    if (list) {
      list.innerHTML = PLAYERS.map(function (p) {
        return '<li><button class="official-row" type="button" data-player="' + p.key + '">' +
          '<span class="of-name">' + p.nameKo + '<em>' + p.pos + '</em></span>' +
          '<span class="of-match">' + p.official.team + ' <b>' + p.official.score + '</b> ' + p.official.opp + '</span>' +
          '<span class="of-stage">' + p.official.stage + ' · ' + p.official.date + '</span>' +
        '</button></li>';
      }).join('');
    }
  }

  /* ---------- 기록실 탭 ---------- */
  function renderRecords() {
    var p = current();
    var who = $('#recordsWho');
    if (who) who.textContent = p.nameKo + ' · 2026 시즌';
    var list = $('#recordsList');
    if (list) {
      list.innerHTML = p.records.map(function (r) {
        return '<li class="rec-row' + (r.key ? ' is-key' : '') + '">' +
          '<span class="rec-event">' + r.event + '</span>' +
          (r.result ? '<span class="rec-result">' + r.result + '</span>' : '<span class="rec-result is-empty"></span>') +
          '<span class="rec-set">' + r.set + '</span>' +
        '</li>';
      }).join('');
    }
    var worlds = $('#worldsList');
    if (worlds) {
      worlds.innerHTML = PLAYERS.map(function (p2) {
        return '<li class="worlds-row">' +
          '<span class="w-name">' + p2.nameKo + '</span>' +
          '<span class="w-stage">' + p2.worlds.stage + '</span>' +
          '<span class="w-line">' + p2.worlds.line + ' · ' + p2.worlds.date + '</span>' +
        '</li>';
      }).join('');
    }
  }

  /* ---------- 전체 렌더 ---------- */
  function renderAll() {
    renderPills();
    renderPick();
    renderTiles();
    renderHighlight();
    renderCheer();
    renderSolo();
    renderRoster();
    renderOfficial();
    renderRecords();
    renderNotify();
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click', function (e) {
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
      return;
    }
    var offT = e.target.closest('[data-official-toggle]');
    if (offT) {
      officialOn = !officialOn;
      store.set(OFFICIAL_KEY, officialOn ? '1' : '0');
      renderNotify();
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
        title: p.nameKo + ' · 딮기 시그널',
        body: '테스트 알림이에요. ' + p.nameKo + ' 새 솔로랭크 경기가 잡히면 이렇게 도착해요.',
        done: p.nameKo + ' 솔랭 알림으로 테스트를 보냈어요.'
      };
    }
    if (officialOn) {
      return {
        kind: 'official',
        title: 'DK 공식 경기 · 딮기 시그널',
        body: '테스트 알림이에요. DK 다음 공식 경기 일정이 잡히면 이렇게 도착해요.',
        done: '경기 알림으로 테스트를 보냈어요.'
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
      lang: 'ko',
      data: { url: './' }
    };
  }

  function sendTest() {
    var target = alertTarget();
    if (!target) {
      showBanner('딮기 시그널', '켜진 알림이 없어요. 알림 설정에서 켜고 테스트해 보세요.');
      setNote('켜진 알림이 없어요. 먼저 알림을 켜 주세요.', true);
      return;
    }
    var opts = notifyOptions(target.body);

    var fallback = function () {
      showBanner(target.title, opts.body);
      setNote('앱 안 알림으로 대신 보여드렸어요.', true);
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
              setNote(target.done + ' 잠금화면에서 확인해 보세요.');
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
        showBanner('홈 화면에 추가', '브라우저 메뉴의 "홈 화면에 추가"를 눌러도 설치할 수 있어요.');
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

  window.addEventListener('online', function () { setNote('다시 연결됐어요.'); });

  /* ---------- 시작 ---------- */
  updateThemeUI();
  renderAll();

  try {
    var initial = new URLSearchParams(location.search).get('tab');
    if (initial && ['feed', 'official', 'solo', 'records'].indexOf(initial) > -1) switchTab(initial);
  } catch (e) {}
})();
