/* 딮기 관리자 · DK Admin — 4자리 PIN 잠금 + 운영 대시보드
 *
 *  · 잠금: 입력한 PIN 을 SHA-256 으로 해시해 상수와 비교합니다. 원문은 코드에 두지 않습니다.
 *  · 해제 상태는 localStorage(dk.admin.auth.v1) 에 저장 — 앱을 다시 열면 바로 대시보드.
 *  · 값은 /api/config 하나에서 옵니다(구독자·7일 추이·선수 인기·언어 비율·발송 기록·공지).
 *  · 관리자 동작(점검 실행·공지 저장·전체 알림)은 PIN 해시를 X-Admin-Pin 헤더로 보내고
 *    서버(api/config.js)가 다시 확인한 뒤에만 실행합니다.
 */
(function () {
  'use strict';

  /* sha256('dk-signal-admin:v1:' + PIN) — PIN 원문은 저장소에 남기지 않습니다.
   * 서버도 같은 해시를 X-Admin-Pin 으로 받아 확인합니다. */
  var PIN_HASH = '98cbd8bfd02876a7aabefc23e9cf760528b125688f06290512bef47d40c1fc45';
  var PIN_SALT = 'dk-signal-admin:v1:';
  var AUTH_KEY = 'dk.admin.auth.v1';
  var GUARD_KEY = 'dk.admin.guard.v1';
  var MAX_TRIES = 6;
  var COOLDOWN_MS = 30 * 1000;
  var AUTO_MS = 60 * 1000;
  var STALE_GREEN_MS = 15 * 60 * 1000;
  var TOAST_MS = 2600;

  var PLAYERS = [
    { key: 'doran', name: '도란', pos: '탑', notice: true },
    { key: 'kanavi', name: '카나비', pos: '정글', notice: false },
    { key: 'showmaker', name: '쇼메이커', pos: '미드', notice: true },
    { key: 'smash', name: '스매쉬', pos: '원딜', notice: true },
    { key: 'delight', name: '딜라이트', pos: '서폿', notice: false }
  ];

  var LANGS = [
    { code: 'ko', label: 'KO', name: '한국어', color: 'var(--l-ko)' },
    { code: 'en', label: 'EN', name: 'English', color: 'var(--l-en)' },
    { code: 'ja', label: 'JA', name: '日本語', color: 'var(--l-ja)' },
    { code: 'zh', label: 'ZH', name: '中文', color: 'var(--l-zh)' },
    { code: 'vi', label: 'VI', name: 'Tiếng Việt', color: 'var(--l-vi)' },
    { code: 'unknown', label: '?', name: '미기록', color: 'var(--l-unknown)' }
  ];

  var TYPE_LABEL = {
    official: '공식', solo: '솔랭', live: '방송', ingame: '인게임',
    notice: '공지', broadcast: '전체', test: '테스트', etc: '기타'
  };

  var $ = function (id) { return document.getElementById(id); };
  var lockEl = $('lock');
  var dashEl = $('dash');
  var dots = $('pinDots') ? $('pinDots').children : [];
  var lockMsg = $('lockMsg');
  var keypad = $('keypad');
  var lockCard = document.querySelector('.lock-card');
  var syncLine = $('syncLine');
  var refreshBtn = $('refreshBtn');
  var lockBtn = $('lockBtn');
  var installHint = $('installHint');
  var playersList = $('playersList');
  var runBtn = $('runCheckBtn');
  var runNote = $('runNote');
  var broadcastBtn = $('broadcastBtn');
  var bannerSave = $('bannerSave');
  var bannerText = $('bannerText');
  var bannerOn = $('bannerOn');
  var modal = $('confirmModal');
  var confirmSend = $('confirmSend');
  var confirmCancel = $('confirmCancel');
  var toastEl = $('toast');

  var pin = '';
  var data = null;
  var lastFetch = 0;
  var busy = false;
  var guardTimer = null;
  var bannerDirty = false;
  var toastTimer = null;
  var sending = false;

  /* ───────────── 시간·숫자 ───────────── */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function kstParts(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    var f = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul', hourCycle: 'h23', year: 'numeric',
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var o = {};
    f.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return o;
  }

  function kstShort(iso) {
    var p = kstParts(iso);
    return p ? p.month + '.' + p.day + ' ' + p.hour + ':' + p.minute : '–';
  }

  function kstFull(iso) {
    var p = kstParts(iso);
    return p ? p.month + '.' + p.day + ' ' + p.hour + ':' + p.minute + ':' + p.second : '–';
  }

  function clockOf(ts) {
    var p = kstParts(new Date(ts).toISOString());
    return p ? p.hour + ':' + p.minute + ':' + p.second : '–';
  }

  function todayKst() {
    var p = kstParts(new Date().toISOString());
    return p ? p.year + '-' + p.month + '-' + p.day : '';
  }

  function ago(iso) {
    var t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return '방금 전';
    var m = Math.round(s / 60);
    if (m < 60) return m + '분 전';
    var h = Math.round(m / 60);
    if (h < 24) return h + '시간 전';
    return Math.round(h / 24) + '일 전';
  }

  function num(n) {
    if (n === null || n === undefined || n === '') return '–';
    var v = Number(n);
    if (isNaN(v)) return '–';
    return v.toLocaleString('ko-KR');
  }

  function weekdayOf(dateStr) {
    var p = String(dateStr || '').split('-').map(Number);
    if (p.length !== 3 || !p[0]) return '';
    return ['일', '월', '화', '수', '목', '금', '토'][new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()];
  }

  /* ───────────── 잠금 ───────────── */

  function sha256Hex(text) {
    if (!window.crypto || !window.crypto.subtle) return Promise.reject(new Error('no_subtle'));
    var buf = new TextEncoder().encode(text);
    return window.crypto.subtle.digest('SHA-256', buf).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (b) {
        return pad(b.toString(16));
      }).join('');
    });
  }

  function hasAuth() {
    try { return localStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return false; }
  }

  function setAuth(on) {
    try {
      if (on) localStorage.setItem(AUTH_KEY, '1');
      else localStorage.removeItem(AUTH_KEY);
    } catch (e) { /* 저장이 막혀 있으면 이번 실행에서만 열립니다 */ }
  }

  function readGuard() {
    try {
      var g = JSON.parse(localStorage.getItem(GUARD_KEY) || '{}');
      return g && typeof g === 'object' ? g : {};
    } catch (e) { return {}; }
  }

  function writeGuard(g) {
    try { localStorage.setItem(GUARD_KEY, JSON.stringify(g)); } catch (e) {}
  }

  function guardLeft() {
    var g = readGuard();
    var until = Number(g.until || 0);
    return until > Date.now() ? until - Date.now() : 0;
  }

  function paintDots() {
    for (var i = 0; i < dots.length; i++) {
      if (i < pin.length) dots[i].classList.add('on');
      else dots[i].classList.remove('on');
    }
  }

  function say(msg, kind) {
    if (!lockMsg) return;
    lockMsg.textContent = msg || '';
    lockMsg.className = 'lock-msg' + (kind ? ' ' + kind : '');
  }

  function startGuardCountdown() {
    if (guardTimer) clearInterval(guardTimer);
    var tick = function () {
      var left = guardLeft();
      if (left > 0) {
        say('잠시 후 다시 시도해 주세요 · ' + Math.ceil(left / 1000) + '초', 'idle');
      } else {
        clearInterval(guardTimer);
        guardTimer = null;
        say('PIN을 다시 입력해 주세요.', 'idle');
      }
    };
    tick();
    guardTimer = setInterval(tick, 500);
  }

  function fail(msg) {
    pin = '';
    paintDots();
    if (lockCard) {
      lockCard.classList.remove('shake');
      void lockCard.offsetWidth;
      lockCard.classList.add('shake');
    }
    say(msg, '');
  }

  function submitPin() {
    if (pin.length !== 4) return;
    if (guardLeft() > 0) { startGuardCountdown(); return; }
    sha256Hex(PIN_SALT + pin).then(function (hex) {
      if (hex === PIN_HASH) {
        writeGuard({ tries: 0, until: 0 });
        setAuth(true);
        say('확인했어요. 잠금을 풀고 있어요…', 'ok');
        setTimeout(openDash, 180);
        return;
      }
      var g = readGuard();
      var tries = Number(g.tries || 0) + 1;
      if (tries >= MAX_TRIES) {
        writeGuard({ tries: 0, until: Date.now() + COOLDOWN_MS });
        fail('PIN을 ' + MAX_TRIES + '번 틀렸어요. 30초 뒤에 다시 시도해 주세요.');
        startGuardCountdown();
        return;
      }
      writeGuard({ tries: tries, until: 0 });
      fail('PIN이 맞지 않아요. ' + (MAX_TRIES - tries) + '번 더 시도할 수 있어요.');
    }).catch(function () {
      say('이 주소에서는 잠금을 풀 수 없어요. https 주소로 열어 주세요.', '');
    });
  }

  function press(key) {
    if (guardLeft() > 0) { startGuardCountdown(); return; }
    if (key === 'back') {
      pin = pin.slice(0, -1);
      paintDots();
      return;
    }
    if (!/^[0-9]$/.test(key)) return;
    if (pin.length >= 4) return;
    pin += key;
    paintDots();
    if (lockMsg && lockMsg.textContent && !lockMsg.classList.contains('idle')) say('', 'idle');
    if (pin.length === 4) {
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
      submitPin();
    }
  }

  if (keypad) {
    keypad.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-key]') : null;
      if (!btn) return;
      press(btn.getAttribute('data-key'));
    });
  }

  document.addEventListener('keydown', function (e) {
    if (dashEl && !dashEl.hidden) return;
    if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { press('back'); e.preventDefault(); }
  });

  /* ───────────── 화면 전환 ───────────── */

  function setInstallHint() {
    var standalone = false;
    try {
      standalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.navigator.standalone === true;
    } catch (e) {}
    if (installHint) installHint.hidden = !!standalone;
  }

  function openDash() {
    if (lockEl) lockEl.hidden = true;
    if (dashEl) dashEl.hidden = false;
    setInstallHint();
    load(true);
  }

  function lockNow() {
    setAuth(false);
    data = null;
    pin = '';
    paintDots();
    say('잠갔어요. PIN을 입력해 주세요.', 'idle');
    if (dashEl) dashEl.hidden = true;
    if (lockEl) lockEl.hidden = false;
    if (lockCard) lockCard.classList.remove('shake');
    closeModal();
    if (guardLeft() > 0) startGuardCountdown();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  if (lockBtn) lockBtn.addEventListener('click', lockNow);
  if (refreshBtn) refreshBtn.addEventListener('click', function () { load(false); });

  /* ───────────── 토스트 ───────────── */

  function toast(msg, kind) {
    if (!toastEl) return;
    toastEl.textContent = msg || '';
    toastEl.className = 'toast' + (kind ? ' ' + kind : '');
    toastEl.hidden = false;
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
      setTimeout(function () { toastEl.hidden = true; }, 220);
    }, TOAST_MS);
  }

  /* ───────────── 관리자 동작 (PIN 해시 헤더) ───────────── */

  function postAction(body) {
    return fetch('/api/config', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': PIN_HASH },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (res.status === 401) {
          var err = new Error((json && json.message) || 'PIN 확인이 필요해요.');
          err.unauthorized = true;
          throw err;
        }
        if (!res.ok || !json || json.ok === false) {
          throw new Error((json && json.message) || ('요청을 처리하지 못했어요 (HTTP ' + res.status + ')'));
        }
        return json;
      });
    });
  }

  function handleActionError(e) {
    var msg = (e && e.message) || '요청을 처리하지 못했어요.';
    toast(msg, 'bad');
    if (e && e.unauthorized) {
      setTimeout(lockNow, 900);
    }
  }

  /* ───────────── 시스템 줄 ───────────── */

  function mapStore(store) {
    var b = store && store.backend;
    if (b === 'redis') return { text: 'Redis (Upstash)', cls: 'good', sub: store.durable ? '영구 저장' : '임시 저장' };
    if (b === 'memory') return { text: '메모리 (임시)', cls: 'warn', sub: '재시작하면 사라져요' };
    if (b === 'file') return { text: '파일 저장', cls: '', sub: store.durable ? '영구 저장' : '' };
    return { text: b || '–', cls: '', sub: '' };
  }

  function mapRiot(solo) {
    var s = solo && solo.source;
    if (s === 'riot') return { text: '연결됨', cls: 'good', sub: 'Riot API 실시간 조회' };
    if (s === 'snapshot') return { text: '스냅샷', cls: 'warn', sub: '저장된 데이터 사용 중' };
    return { text: s || '–', cls: '', sub: '' };
  }

  function mapOfficial(official) {
    if (!official || !official.status) return { text: '–', cls: '', sub: '' };
    var st = official.status;
    var labels = {
      'no_upcoming': '다음 경기 없음', 'upcoming': '다음 경기 있음', 'ok': '정상',
      'checked': '정상', 'unavailable': '응답 없음', 'error': '오류',
      'rate_limited': '요청 제한', 'skipped': '건너뜀'
    };
    var cls = (st === 'unavailable' || st === 'error') ? 'bad'
      : (st === 'rate_limited' ? 'warn' : (st === 'no_upcoming' || st === 'skipped' ? '' : 'good'));
    var sub = '';
    if (official.next && official.next.start) {
      sub = '다음 경기 ' + kstShort(official.next.start) + (official.next.opponent ? ' · vs ' + official.next.opponent : '');
    }
    return { text: labels[st] || st, cls: cls, sub: sub };
  }

  function setDD(el, info) {
    if (!el) return;
    el.textContent = '';
    var main = document.createElement('span');
    main.textContent = info.text;
    el.appendChild(main);
    if (info.sub) {
      var small = document.createElement('small');
      small.textContent = info.sub;
      el.appendChild(small);
    }
    el.className = info.cls || '';
  }

  function byKey(list) {
    var map = {};
    (list || []).forEach(function (row) { if (row && row.key) map[row.key] = row; });
    return map;
  }

  function badge(text, cls) {
    var s = document.createElement('span');
    s.className = 'badge ' + cls;
    s.textContent = text;
    return s;
  }

  /* ───────────── 구독자·증감 ───────────── */

  function renderSubs(cfg) {
    var last = (cfg && cfg.check && cfg.check.lastRun) || null;
    var stale = (last && last.targets) || {};
    var cur = (cfg && cfg.subs) || {};
    var total = cfg && cfg.subsTotal != null ? cfg.subsTotal : (cur.total != null ? cur.total : stale.total);

    $('subTotal').textContent = num(total);
    $('subOfficial').textContent = num(cur.official != null ? cur.official : stale.official);
    $('subLive').textContent = num(cur.live != null ? cur.live : stale.live);
    $('subNotice').textContent = num(cur.notice != null ? cur.notice : stale.notice);
    $('subSolo').textContent = num(cur.solo != null ? cur.solo : stale.solo);
    $('subsTag').textContent = last && last.dry ? '테스트 실행' : '전체 기기';

    var daily = (cfg && cfg.daily) || null;
    var delta = daily && typeof daily.delta === 'number' ? daily.delta : (cfg ? cfg.dailyDelta : null);
    var badgeEl = $('subDelta');
    var noteEl = $('dailyNote');
    if (!total || delta === null || delta === undefined) {
      badgeEl.hidden = true;
      noteEl.textContent = '솔랭 선택은 한 기기가 여러 선수를 켤 수 있어 구독자 수와 달라요.';
    } else {
      badgeEl.hidden = false;
      badgeEl.textContent = delta > 0 ? '오늘 +' + num(delta) + '명'
        : (delta < 0 ? '오늘 -' + num(Math.abs(delta)) + '명' : '오늘 ±0명');
      badgeEl.className = 'delta' + (delta < 0 ? ' down' : (delta === 0 ? ' flat' : ''));
      badgeEl.title = '오늘 처음 집계한 구독자 ' + num(daily.baseline) + '명 기준';
      noteEl.textContent = '오늘 처음 ' + num(daily.baseline) + '명 → 지금 ' + num(daily.current) +
        '명 · 솔랭 선택은 한 기기가 여러 선수를 켤 수 있어 구독자 수와 달라요.';
    }

    var dot = $('sysDot');
    if (!last || !last.at) {
      dot.className = 'dot-live';
    } else {
      var age = Date.now() - new Date(last.at).getTime();
      dot.className = 'dot-live ' + (age <= STALE_GREEN_MS ? 'on' : 'off');
    }
  }

  /* ───────────── 최근 7일 그래프 ───────────── */

  function renderWeek(cfg) {
    var host = $('dailyChart');
    var noteEl = $('weekNote');
    host.textContent = '';
    var hist = Array.isArray(cfg && cfg.dailyHistory) ? cfg.dailyHistory.slice(-7) : [];
    var today = (cfg && cfg.daily && cfg.daily.date) || todayKst();

    if (!hist.length) {
      var empty = document.createElement('p');
      empty.className = 'note';
      empty.textContent = '오늘부터 하루 한 번씩 쌓여요. 내일부터 그래프가 보여요.';
      host.appendChild(empty);
      return;
    }

    var known = hist.filter(function (r) { return r && r.total != null; }).map(function (r) { return r.total; });
    var hi = known.length ? Math.max.apply(null, known) : 0;
    var lo = known.length ? Math.min.apply(null, known) : 0;
    var span = Math.max(6, hi - lo);
    var floor = Math.max(0, lo - span * 0.35);

    if (noteEl) {
      if (known.length <= 1) {
        noteEl.hidden = false;
        noteEl.textContent = '오늘부터 하루 한 번씩 쌓여요. 내일부터 이전 날짜와 비교할 수 있어요.';
      } else {
        noteEl.hidden = true;
      }
    }

    hist.forEach(function (row) {
      var col = document.createElement('div');
      col.className = 'c7-col';

      var val = document.createElement('span');
      val.className = 'c7-val';
      var has = row && row.total != null;
      val.textContent = has ? num(row.total) : '–';

      var bar = document.createElement('i');
      bar.className = 'c7-bar' + (has ? '' : ' none') + (row && row.date === today ? ' today' : '');
      if (has && hi <= 0) {
        bar.style.height = '10%';
      } else if (has) {
        var pct = hi > floor ? ((row.total - floor) / (hi - floor)) * 100 : 100;
        bar.style.height = Math.max(10, Math.min(100, pct)) + '%';
      } else {
        bar.style.height = '6px';
      }

      var day = document.createElement('span');
      day.className = 'c7-day' + (row && row.date === today ? ' today' : '');
      day.textContent = row && row.date ? weekdayOf(row.date) : '–';

      col.title = row && row.date ? row.date + (has ? ' · ' + num(row.total) + '명' : ' · 기록 없음') : '';
      col.appendChild(val);
      col.appendChild(bar);
      col.appendChild(day);
      host.appendChild(col);
    });
  }

  /* ───────────── 선수별 인기 ───────────── */

  function renderRank(cfg) {
    var host = $('rankList');
    host.textContent = '';
    var list = Array.isArray(cfg && cfg.playerStats) ? cfg.playerStats.slice() : [];
    var noteEl = $('rankNote');
    var totalPicks = list.reduce(function (n, p) { return n + (Number(p.solo) || 0); }, 0);
    $('rankTag').textContent = totalPicks ? '솔랭 알림 ' + num(totalPicks) + '픽' : '솔랭 알림';

    if (!list.length || !totalPicks) {
      var empty = document.createElement('p');
      empty.className = 'note';
      empty.textContent = '아직 집계된 솔랭 알림 선택이 없어요. 기기가 알림을 켜면 여기에 순위가 쌓여요.';
      host.appendChild(empty);
      noteEl.hidden = true;
      return;
    }
    noteEl.hidden = false;

    list.sort(function (a, b) {
      var d = (Number(b.solo) || 0) - (Number(a.solo) || 0);
      if (d) return d;
      return (Number(b.ingame) || 0) - (Number(a.ingame) || 0);
    });
    var top = Number(list[0].solo) || 1;

    list.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'rk-row';

      var no = document.createElement('span');
      no.className = 'rk-no';
      no.textContent = String(i + 1);

      var name = document.createElement('span');
      name.className = 'rk-name';
      name.textContent = p.name || p.key;
      if (p.pos) {
        var pos = document.createElement('span');
        pos.className = 'pos';
        pos.textContent = p.pos;
        name.appendChild(pos);
      }

      var value = document.createElement('span');
      value.className = 'rk-num';
      value.textContent = num(p.solo);
      var share = totalPicks ? Math.round(((Number(p.solo) || 0) / totalPicks) * 100) : 0;
      var small = document.createElement('small');
      small.textContent = share + '%';
      value.appendChild(small);

      var bar = document.createElement('span');
      bar.className = 'rk-bar';
      var fill = document.createElement('i');
      fill.style.width = Math.max(2, Math.round(((Number(p.solo) || 0) / top) * 100)) + '%';
      bar.appendChild(fill);

      li.title = (p.name || p.key) + ' · 솔랭 알림 ' + num(p.solo) + '기기' +
        ((p.ingame) ? ' · 인게임 ' + num(p.ingame) + '기기' : '');
      li.appendChild(no);
      li.appendChild(name);
      li.appendChild(value);
      li.appendChild(bar);
      host.appendChild(li);
    });
  }

  /* ───────────── 언어별 ───────────── */

  function renderLangs(cfg) {
    var st = (cfg && cfg.langStats) || null;
    var counts = (st && st.counts) || {};
    var total = st && typeof st.total === 'number' ? st.total : 0;
    var barHost = $('langBar');
    var listHost = $('langList');
    barHost.textContent = '';
    listHost.textContent = '';

    LANGS.forEach(function (l) {
      var n = Number(counts[l.code]) || 0;
      var pct = total ? (n / total) * 100 : 0;

      if (n > 0) {
        var seg = document.createElement('i');
        seg.style.width = pct + '%';
        seg.style.background = l.color;
        seg.title = l.name + ' ' + num(n) + '명 (' + pct.toFixed(1) + '%)';
        barHost.appendChild(seg);
      }

      var li = document.createElement('li');
      if (!n) li.className = 'is-empty';
      var sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = l.color;
      var code = document.createElement('span');
      code.className = 'lc';
      code.textContent = l.label;
      var name = document.createElement('span');
      name.className = 'ln2';
      name.textContent = l.name;
      var v = document.createElement('span');
      v.className = 'lv';
      v.textContent = num(n);
      var s = document.createElement('small');
      s.textContent = total ? Math.round(pct) + '%' : '0%';
      v.appendChild(s);

      li.title = l.name + ' · ' + num(n) + '명' + (total ? ' (' + pct.toFixed(1) + '%)' : '');
      li.appendChild(sw);
      li.appendChild(code);
      li.appendChild(name);
      li.appendChild(v);
      listHost.appendChild(li);
    });

    $('langTag').textContent = total ? num(total) + '기기' : '집계 전';
  }

  /* ───────────── 발송 기록 ───────────── */

  function renderPushLog(cfg) {
    var rows = Array.isArray(cfg && cfg.pushLog) ? cfg.pushLog : [];
    var host = $('pushLog');
    var empty = $('pushLogEmpty');
    host.textContent = '';
    $('logTag').textContent = rows.length ? '최근 ' + rows.length + '건' : '최근 10건';

    if (!rows.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    var today = todayKst();
    rows.forEach(function (row) {
      var li = document.createElement('li');
      li.className = 'plog-row';

      var t = document.createElement('span');
      t.className = 'plog-time';
      var p = kstParts(row.at);
      var sameDay = p && (p.year + '-' + p.month + '-' + p.day) === today;
      t.textContent = p ? (sameDay ? p.hour + ':' + p.minute : p.month + '.' + p.day) : '–';
      t.title = kstFull(row.at) + ' KST';

      var type = document.createElement('span');
      var kind = String(row.type || 'etc');
      type.className = 'ptype ' + kind;
      type.textContent = TYPE_LABEL[kind] || kind;

      var title = document.createElement('span');
      title.className = 'ptitle';
      title.textContent = row.title || '(제목 없음)';
      title.title = row.title || '';

      var sent = document.createElement('span');
      sent.className = 'plog-num';
      sent.textContent = num(row.sent);
      var s = document.createElement('small');
      s.textContent = '건';
      sent.appendChild(s);
      sent.title = '대상 ' + num(row.targets) + '기기 중 ' + num(row.sent) + '건 발송';

      li.appendChild(t);
      li.appendChild(type);
      li.appendChild(title);
      li.appendChild(sent);
      host.appendChild(li);
    });
  }

  /* ───────────── 공지 ───────────── */

  function renderBanner(cfg) {
    var b = (cfg && cfg.banner) || { enabled: false, text: '' };
    var tag = $('bannerState');
    tag.textContent = b.enabled ? '표시 중' : '꺼짐';
    tag.className = 'tag' + (b.enabled ? ' on' : '');
    if (!bannerDirty) {
      bannerText.value = b.text || '';
      bannerOn.checked = !!b.enabled;
    }
  }

  /* ───────────── 선수 행 ───────────── */

  function playerRow(p, live, ingame, solo, notice) {
    var row = document.createElement('div');
    row.className = 'prow';

    var head = document.createElement('div');
    head.className = 'phead';
    var name = document.createElement('b');
    name.textContent = p.name;
    var pos = document.createElement('span');
    pos.className = 'pos';
    pos.textContent = p.pos;
    head.appendChild(name);
    head.appendChild(pos);

    var isLive = !!(live && live.live);
    var isGame = !!(ingame && ingame.inGame);
    head.appendChild(badge(isLive ? 'LIVE' : '오프라인', isLive ? 'live' : 'off'));
    if (isGame) head.appendChild(badge('인게임', 'game'));
    row.appendChild(head);

    var meta = document.createElement('div');
    meta.className = 'pmeta';
    var k = document.createElement('span');
    k.className = 'k';
    k.textContent = '최신 솔랭';
    var v = document.createElement('span');
    v.className = 'v';
    if (solo && solo.latestId) {
      v.textContent = solo.latestId;
      v.title = '눌러서 복사';
      v.style.cursor = 'pointer';
      v.addEventListener('click', function () {
        var id = solo.latestId;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(id).then(function () {
            var old = v.textContent;
            v.textContent = '복사했어요';
            setTimeout(function () { v.textContent = old; }, 1100);
          }).catch(function () {});
        }
      });
    } else {
      v.className = 'v none';
      v.textContent = '기록 없음';
    }
    meta.appendChild(k);
    meta.appendChild(v);
    if (solo && solo.status && solo.status !== 'ok') {
      var st = document.createElement('span');
      st.className = 'k';
      st.textContent = solo.status === 'rate_limited' ? '· 요청 제한' : '· ' + solo.status;
      meta.appendChild(st);
    }
    row.appendChild(meta);

    if (p.notice) {
      var n = document.createElement('div');
      n.className = 'pnotice' + (notice && notice.title ? '' : ' empty');
      var ico = document.createElement('span');
      ico.className = 'ico';
      ico.textContent = '📢';
      var txt = document.createElement('span');
      txt.className = 'txt';
      txt.textContent = notice && notice.title ? notice.title : '최신 공지 없음';
      n.appendChild(ico);
      n.appendChild(txt);
      row.appendChild(n);
    }
    return row;
  }

  /* ───────────── 전체 렌더 ───────────── */

  function render(cfg) {
    var last = (cfg && cfg.check && cfg.check.lastRun) || null;

    renderSubs(cfg);
    renderWeek(cfg);
    renderRank(cfg);
    renderLangs(cfg);
    renderPushLog(cfg);
    renderBanner(cfg);

    if (last && last.at) {
      var dd = $('sysLast');
      dd.textContent = '';
      var m = document.createElement('span');
      m.textContent = kstShort(last.at) + ' (' + ago(last.at) + ')';
      var s = document.createElement('small');
      s.textContent = kstFull(last.at) + ' KST';
      dd.appendChild(m);
      dd.appendChild(s);
    } else {
      setDD($('sysLast'), { text: '기록 없음', cls: 'warn', sub: '아직 자동 점검이 저장되지 않았어요' });
    }

    setDD($('sysTook'), last && last.tookMs != null
      ? { text: (last.tookMs / 1000).toFixed(1) + '초', cls: '', sub: '' }
      : { text: '–', cls: '', sub: '' });

    setDD($('sysPushed'), last && last.pushed != null
      ? { text: (last.pushed === 0 ? '발송 없음' : num(last.pushed) + '건'), cls: last.pushed > 0 ? 'good' : '', sub: last.pruned ? '구독 정리 ' + num(last.pruned) + '건' : '' }
      : { text: '–', cls: '', sub: '' });

    setDD($('sysStore'), mapStore(cfg && cfg.store));
    setDD($('sysRiot'), mapRiot(cfg && cfg.solo));
    setDD($('sysOfficial'), mapOfficial(last && last.official));
    setDD($('sysVersion'), { text: cfg && cfg.version ? 'v' + cfg.version : '–', cls: '', sub: (cfg && cfg.push && cfg.push.ready) ? '푸시 발송 준비됨' : '푸시 키 없음' });

    var live = byKey(last && last.live && last.live.players);
    var ingame = byKey(last && last.ingame && last.ingame.players);
    var solo = byKey(last && last.solo && last.solo.players);
    var notices = byKey(last && last.notices && last.notices.players);

    playersList.textContent = '';
    PLAYERS.forEach(function (p) {
      playersList.appendChild(playerRow(p, live[p.key], ingame[p.key], solo[p.key], notices[p.key]));
    });

    var total = cfg && cfg.subsTotal;
    if ($('sendTag')) $('sendTag').textContent = total ? '구독자 ' + num(total) + '기기' : '전체 구독자';

    var serverMs = cfg && cfg.serverTime ? new Date(cfg.serverTime).getTime() : Date.now();
    var drift = Math.abs(Date.now() - serverMs);
    syncLine.className = 'sync';
    syncLine.textContent = '실시간 상태 · ' + clockOf(serverMs) + ' KST 갱신' +
      (drift > 60000 ? ' · 기기 ' + clockOf(Date.now()) : '');
  }

  function load(showLoading) {
    if (busy || !dashEl || dashEl.hidden) return;
    busy = true;
    if (refreshBtn) refreshBtn.classList.add('is-busy');
    if (showLoading || !data) {
      syncLine.className = 'sync';
      syncLine.textContent = '실시간 상태를 불러오는 중…';
    }
    fetch('/api/config?_=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        data = json;
        lastFetch = Date.now();
        render(json);
      })
      .catch(function () {
        syncLine.className = 'sync err';
        syncLine.textContent = data
          ? '새 값을 받지 못했어요 · 아래는 ' + clockOf(lastFetch) + ' 기준 값이에요'
          : '실시간 상태를 불러오지 못했어요 · 네트워크를 확인하고 새로고침해 주세요';
      })
      .then(function () {
        busy = false;
        if (refreshBtn) refreshBtn.classList.remove('is-busy');
      });
  }

  /* ───────────── 공지 저장 ───────────── */

  if (bannerText) {
    bannerText.addEventListener('input', function () { bannerDirty = true; });
  }
  if (bannerOn) {
    bannerOn.addEventListener('change', function () { bannerDirty = true; });
  }
  if (bannerSave) {
    bannerSave.addEventListener('click', function () {
      var text = (bannerText.value || '').trim();
      var enabled = !!bannerOn.checked && !!text;
      if (bannerOn.checked && !text) {
        toast('공지 문구를 입력해 주세요.', 'bad');
        bannerText.focus();
        return;
      }
      bannerSave.disabled = true;
      postAction({ action: 'setBanner', text: text, enabled: enabled })
        .then(function (json) {
          bannerDirty = false;
          if (data) data.banner = json.banner;
          renderBanner(data || { banner: json.banner });
          toast(json.banner && json.banner.enabled ? '한 줄 공지를 켰어요.' : '한 줄 공지를 껐어요.');
          load(false);
        })
        .catch(handleActionError)
        .then(function () { bannerSave.disabled = false; });
    });
  }

  /* ───────────── 지금 바로 점검 ───────────── */

  function setRunNote(msg, kind) {
    if (!runNote) return;
    if (!msg) { runNote.hidden = true; runNote.textContent = ''; return; }
    runNote.hidden = false;
    runNote.textContent = msg;
    runNote.className = 'run-note' + (kind ? ' ' + kind : '');
  }

  if (runBtn) {
    runBtn.addEventListener('click', function () {
      if (runBtn.disabled) return;
      runBtn.disabled = true;
      runBtn.textContent = '점검 중…';
      setRunNote('점검을 실행하고 있어요…', '');
      postAction({ action: 'runCheck' })
        .then(function (json) {
          var s = json.summary || {};
          var took = s.tookMs != null ? (s.tookMs / 1000).toFixed(1) + '초' : '';
          var msg = '점검 완료' + (took ? ' · ' + took : '') + ' · 발송 ' + num(s.pushed || 0) + '건' +
            (s.dry ? ' (미리보기)' : '');
          setRunNote(msg, 'ok');
          toast(msg);
          return load(true);
        })
        .catch(function (e) {
          setRunNote((e && e.message) || '점검을 실행하지 못했어요.', 'bad');
          handleActionError(e);
        })
        .then(function () {
          runBtn.disabled = false;
          runBtn.textContent = '지금 바로 점검';
        });
    });
  }

  /* ───────────── 전체 알림 (확인 팝업) ───────────── */

  function closeModal() {
    if (modal) modal.hidden = true;
    sending = false;
    if (confirmSend) { confirmSend.disabled = false; confirmSend.textContent = '보내기'; }
  }

  function openBroadcast() {
    var title = ($('pushTitle').value || '').trim();
    var body = ($('pushBody').value || '').trim();
    if (!title || !body) {
      toast('제목과 내용을 모두 입력해 주세요.', 'bad');
      ($('pushTitle').value ? $('pushBody') : $('pushTitle')).focus();
      return;
    }
    var total = data && data.subsTotal != null ? data.subsTotal : null;
    $('confirmText').textContent = '정말 전체 구독자 ' + (total != null ? num(total) + '명' : '전원') +
      '에게 알림을 보낼까요? 보내면 되돌릴 수 없어요.';
    $('confirmPreviewTitle').textContent = title;
    $('confirmPreviewBody').textContent = body;
    $('confirmPreview').hidden = false;
    modal.hidden = false;
  }

  if (broadcastBtn) broadcastBtn.addEventListener('click', openBroadcast);
  if (confirmCancel) confirmCancel.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  if (confirmSend) {
    confirmSend.addEventListener('click', function () {
      if (sending) return;
      sending = true;
      confirmSend.disabled = true;
      confirmSend.textContent = '보내는 중…';
      var title = ($('pushTitle').value || '').trim();
      var body = ($('pushBody').value || '').trim();
      postAction({ action: 'broadcast', title: title, body: body })
        .then(function (json) {
          closeModal();
          if (json.dryRun) {
            toast('미리보기 모드라 실제로 보내지 않았어요 · 대상 ' + num(json.targets) + '기기');
          } else {
            toast('전체 알림 발송 완료 · ' + num(json.sent) + '건');
            $('pushTitle').value = '';
            $('pushBody').value = '';
          }
          load(true);
        })
        .catch(function (e) {
          closeModal();
          handleActionError(e);
        });
    });
  }

  /* 60초마다 자동 갱신 · 앱을 다시 열면 바로 갱신 */
  setInterval(function () {
    if (document.hidden || !dashEl || dashEl.hidden) return;
    load(false);
  }, AUTO_MS);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden || !dashEl || dashEl.hidden) return;
    if (Date.now() - lastFetch > 30 * 1000) load(false);
  });

  /* 관리자 페이지는 별도 PWA 가 아니라 '홈 화면 바로가기'입니다.
   * 예전 버전은 /admin 범위 서비스 워커(admin-sw.js)를 등록했는데, manifest 와 함께 쓰이면
   * 같은 오리진의 메인 앱 WebAPK 를 '딮기 관리자'로 덮어썼습니다.
   * 이미 방문한 기기에 남은 등록·캐시를 여기서 정리합니다. */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      (regs || []).forEach(function (reg) {
        var sw = reg.active || reg.installing || reg.waiting;
        var scriptURL = (sw && sw.scriptURL) || '';
        if (scriptURL.indexOf('/admin-sw.js') > -1) {
          reg.unregister().catch(function () {});
        }
      });
    }).catch(function () {});

    if (window.caches && caches.keys) {
      caches.keys().then(function (keys) {
        (keys || []).forEach(function (k) {
          if (k.indexOf('dk-admin-') === 0) caches.delete(k).catch(function () {});
        });
      }).catch(function () {});
    }
  }

  /* ───────────── 시작 ───────────── */
  if (hasAuth()) {
    openDash();
  } else {
    if (dashEl) dashEl.hidden = true;
    if (lockEl) lockEl.hidden = false;
    if (guardLeft() > 0) startGuardCountdown();
    else say('', 'idle');
    paintDots();
  }
})();
