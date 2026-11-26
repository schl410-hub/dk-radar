/* DK 레이더 · v1 앱 로직 (프레임워크 없이 동작) */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var state = {
    player: 'doran',
    tab: 'feed',
    filter: 'all',
    checked: new Date(LAST_CHECKED)
  };

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('dk.' + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('dk.' + k, v); } catch (e) {} }
  };

  var notifyOn = store.get('notify', '0') === '1';
  var swReg = null;

  function player(key) {
    for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].key === key) return PLAYERS[i];
    return PLAYERS[0];
  }
  function current() { return player(state.player); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d) {
    return (d.getMonth() + 1) + '. ' + d.getDate() + '. ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function summary(p) {
    var w = 0, l = 0;
    p.matches.forEach(function (m) { m.win ? w++ : l++; });
    return { g: p.matches.length, w: w, l: l };
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
      if (swReg && navigator.serviceWorker) return;
      window.open(current().opgg, '_blank');
    });
    $('#pbClose').addEventListener('click', function (e) { e.stopPropagation(); hideBanner(); });
  }

  /* ---------- 공통 뷰 ---------- */
  function pillsHTML() {
    return PLAYERS.map(function (p) {
      return '<button class="pill' + (p.key === state.player ? ' is-active' : '') + '" role="tab" aria-selected="' +
        (p.key === state.player) + '" data-player="' + p.key + '">' + p.nameKo +
        '<span class="pos">' + p.pos + '</span></button>';
    }).join('');
  }

  function renderPills() {
    ['#pills', '#pillsSolo', '#pillsRecords'].forEach(function (sel) {
      var host = $(sel);
      if (host) host.innerHTML = pillsHTML();
    });
  }

  function ringsSVG() {
    return '<svg viewBox="0 0 240 240" aria-hidden="true">' +
      '<g fill="none" stroke="#0AC8A2" stroke-opacity=".16" stroke-width="1.1">' +
      '<circle cx="120" cy="120" r="30"/><circle cx="120" cy="120" r="58"/>' +
      '<circle cx="120" cy="120" r="88"/><circle cx="120" cy="120" r="118"/></g>' +
      '<circle cx="120" cy="120" r="2.6" fill="#0AC8A2" fill-opacity=".55"/>' +
      '<path d="M120 120 L120 2 A118 118 0 0 1 205 60 Z" fill="#0AC8A2" fill-opacity=".06"/></svg>';
  }

  function renderHero() {
    var p = current();
    var second = p.key === 'doran'
      ? { label: '선수 프로필', url: p.profile }
      : { label: p.statsLabel.replace(' ↗', ''), url: p.opgg };
    $('#hero').innerHTML =
      '<div class="hero-rings">' + ringsSVG() + '</div>' +
      '<div class="eyebrow">LEAGUE OF LEGENDS · ' + p.pos + '</div>' +
      '<h1 class="hero-name">' + p.nameEn + '</h1>' +
      '<div class="hero-sub">' + p.real + ' · 디플러스 기아</div>' +
      '<div class="hero-links">' +
        '<a class="hero-link" href="' + p.heroLink.url + '" target="_blank" rel="noopener">' + p.heroLink.label + ' <span class="arw">↗</span></a>' +
        '<a class="hero-link secondary" href="' + second.url + '" target="_blank" rel="noopener">' + second.label + ' <span class="arw">↗</span></a>' +
      '</div>';
    $('#wsName').textContent = p.nameEn;
  }

  function renderStatus() {
    var p = current();
    var last = p.matches[0];
    var live = '마지막 게임 ' + last.d + ' ' + last.t;
    $('#statusGrid').innerHTML =
      '<article class="s-card">' +
        '<div class="s-label">다음 공식 경기</div>' +
        '<div class="s-value">일정 확인 필요</div>' +
        '<div class="s-small">2027 LCK 스프링</div>' +
        '<a class="s-link" href="https://lolesports.com/ko-KR/schedule" target="_blank" rel="noopener">LoL Esports 일정 ↗</a>' +
      '</article>' +
      '<article class="s-card">' +
        '<div class="s-label">최근 공식 경기</div>' +
        '<div class="s-value">' + p.official.team + ' ' + p.official.score.replace(' : ', ' : ') + ' ' + p.official.opp + '</div>' +
        '<div class="s-small">' + p.official.stage + '</div>' +
        '<a class="s-link" href="' + p.profile + '" target="_blank" rel="noopener">세트별 경기 기록 ↗</a>' +
      '</article>' +
      '<article class="s-card">' +
        '<div class="s-label">솔로랭크 시작 · KR</div>' +
        '<div class="s-value">진행 중 경기 없음</div>' +
        '<div class="s-live"><span class="dot"></span>' + live + '</div>' +
        '<a class="s-link" href="https://op.gg/ko/lol/spectate/list/pro-gamer" target="_blank" rel="noopener">OP.GG 관전·전적 ↗</a>' +
        '<div class="s-actions">' +
          '<button class="btn-mini' + (notifyOn ? ' is-on' : '') + '" id="notifyBtn">솔랭 알림 ' + (notifyOn ? '끄기' : '켜기') + '</button>' +
          '<button class="btn-mini is-mint" id="testBtn">테스트</button>' +
        '</div>' +
        '<div class="s-note" id="testNote">' + (notifyOn ? '알림 켜짐 · 앱을 열어둘 때만 확인해요' : '') + '</div>' +
      '</article>';
    $('#testBtn').addEventListener('click', sendTest);
    $('#notifyBtn').addEventListener('click', toggleNotify);
  }

  function setNote(msg, err) {
    var el = $('#testNote');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('is-err', !!err);
  }

  /* ---------- 솔로랭크 카드 ---------- */
  function metaText(p) {
    var s = summary(p);
    return p.riotId + ' · 최근 ' + s.g + '경기 ' + s.w + '승 ' + s.l + '패 · ' + stamp(state.checked) + ' 확인';
  }

  function tierHTML(p) {
    return '<span class="tier-chip"><span class="tier-dot"></span>' + p.tier + ' ' + p.lp + '</span>' +
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
    $('#soloMeta').textContent = metaText(p);
    $('#tierRow').innerHTML = tierHTML(p);
    $('#soloTable').innerHTML = tableHTML(p, 'all');
    $('#soloOpgg').textContent = p.statsLabel;
    $('#soloOpgg').href = p.opgg;
    $('#soloMore').href = p.opgg;
    $('#soloMore').textContent = (p.key === 'delight' ? 'u.gg에서 전체 전적 보기 ↗' : 'OP.GG에서 전체 전적 보기 ↗');

    // 경기 기록 탭
    var p2 = $('#soloMeta2');
    if (p2) {
      p2.textContent = metaText(p);
      $('#soloTable2').innerHTML = tableHTML(p, state.filter);
      $('#soloOpgg2').textContent = p.statsLabel;
      $('#soloOpgg2').href = p.opgg;
      $('#soloMore2').href = p.opgg;
      $('#soloMore2').textContent = (p.key === 'delight' ? 'u.gg에서 전체 전적 보기 ↗' : 'OP.GG에서 전체 전적 보기 ↗');
      $('#soloPanelMeta').textContent = p.nameKo + ' 선수의 최근 ' + p.matches.length + '경기예요. 탭해서 승패만 골라 볼 수 있어요.';
    }
    ['#soloNote', '#soloNoteFeed'].forEach(function (sel) {
      var noteEl = $(sel);
      if (noteEl) noteEl.textContent = p.note || '';
    });
  }

  function renderRoster() {
    var host = $('#rosterList');
    if (!host) return;
    host.innerHTML = PLAYERS.map(function (p) {
      return '<li><button class="roster-row' + (p.key === state.player ? ' is-active' : '') + '" data-player="' + p.key + '">' +
        '<span class="r-pos">' + p.pos + '</span>' +
        '<span class="r-name">' + p.nameKo + ' <em>' + p.real + '</em></span>' +
        '<span class="r-note">' + (ROSTER_NOTES[p.key] || '') + '</span></button></li>';
    }).join('');
  }

  /* ---------- 공식 경기 탭 ---------- */
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
        return '<li><button class="official-row" data-player="' + p.key + '">' +
          '<span class="of-name">' + p.nameKo + '<em>' + p.pos + '</em></span>' +
          '<span class="of-match">' + p.official.team + ' <b>' + p.official.score + '</b> ' + p.official.opp + '</span>' +
          '<span class="of-stage">' + p.official.stage + ' · ' + p.official.date + '</span>' +
        '</button></li>';
      }).join('');
    }
  }

  /* ---------- 대회 기록 탭 ---------- */
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
    renderHero();
    renderStatus();
    renderSolo();
    renderRoster();
    renderOfficial();
    renderRecords();
    $('#checkedAt').textContent = '최근 확인 ' + stamp(state.checked);
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click', function (e) {
    var pill = e.target.closest('[data-player]');
    if (pill) {
      state.player = pill.getAttribute('data-player');
      renderAll();
      if (pill.classList.contains('official-row')) switchTab('feed');
      if (pill.classList.contains('pill')) {
        setTimeout(function () {
          $$('.pills').forEach(function (row) {
            var active = row.querySelector('.pill.is-active');
            if (!active) return;
            try { active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch (err) {}
          });
        }, 30);
      }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  var refreshBtn = $('#refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      refreshBtn.classList.remove('spin');
      void refreshBtn.offsetWidth;
      refreshBtn.classList.add('spin');
      state.checked = new Date();
      $('#checkedAt').textContent = '최근 확인 ' + stamp(state.checked);
      $('#soloMeta').textContent = metaText(current());
      if ($('#soloMeta2')) $('#soloMeta2').textContent = metaText(current());
    });
  }

  /* ---------- 알림 ---------- */
  function updateNotifyBtn() {
    var btn = $('#notifyBtn');
    if (!btn) return;
    btn.textContent = '솔랭 알림 ' + (notifyOn ? '끄기' : '켜기');
    btn.classList.toggle('is-on', notifyOn);
  }

  async function toggleNotify() {
    if (notifyOn) {
      notifyOn = false;
      store.set('notify', '0');
      updateNotifyBtn();
      setNote('솔랭 알림을 껐어요.');
      return;
    }
    notifyOn = true;
    store.set('notify', '1');
    updateNotifyBtn();
    if (!('Notification' in window)) {
      setNote('이 브라우저는 알림을 지원하지 않아요.', true);
      return;
    }
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) {}
    }
    if (Notification.permission === 'denied') {
      setNote('브라우저에서 알림이 차단되어 있어요.', true);
    } else if (Notification.permission === 'granted') {
      setNote('알림 켜짐 · v2에서 실시간으로 알려드릴게요.');
    } else {
      setNote('알림 켜짐 · 권한을 허용하면 잠금화면에서도 와요.');
    }
  }

  function notifyOptions() {
    return {
      body: '이 기기로 푸시를 받을 수 있어요. 실시간 솔랭 알림도 이렇게 도착해요.',
      icon: './icons/icon-192.png',
      badge: './icons/badge-96.png',
      tag: 'dk-radar-test',
      renotify: true,
      lang: 'ko',
      data: { url: './' }
    };
  }

  async function sendTest() {
    var p = current();
    var title = p.nameKo + ' 레이더 테스트 알림';
    var opts = notifyOptions();

    if (!('Notification' in window)) {
      showBanner(title, opts.body + ' (이 브라우저는 알림 미지원)');
      setNote('앱 안 알림으로 대신 보여드렸어요.', true);
      return;
    }
    var perm = Notification.permission;
    if (perm === 'default') {
      try { perm = await Notification.requestPermission(); } catch (e) {}
    }
    if (perm === 'granted') {
      try {
        var reg = swReg;
        if (!reg && 'serviceWorker' in navigator) {
          reg = await navigator.serviceWorker.getRegistration();
          if (!reg) reg = await navigator.serviceWorker.register('./sw.js');
          swReg = reg;
        }
        if (reg && reg.showNotification) {
          await reg.showNotification(title, opts);
        } else {
          new Notification(title, opts);
        }
        setNote('테스트 푸시를 보냈어요.');
      } catch (err) {
        showBanner(title, opts.body);
        setNote('앱 안 알림으로 대신 보여드렸어요.', true);
      }
    } else {
      showBanner(title, opts.body);
      setNote(perm === 'denied'
        ? '브라우저 알림이 차단되어 앱 안에서만 보여드렸어요.'
        : '알림 권한을 허용하면 잠금화면에서도 받을 수 있어요.', true);
    }
  }

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
    installBtn.addEventListener('click', async function () {
      if (!installPrompt) { showBanner('홈 화면에 추가', '브라우저 메뉴의 "홈 화면에 추가"를 눌러도 설치할 수 있어요.'); return; }
      installPrompt.prompt();
      try { await installPrompt.userChoice; } catch (e) {}
      installPrompt = null;
      installBtn.hidden = true;
    });
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').then(function (reg) {
        swReg = reg;
        reg.addEventListener('updatefound', function () {});
      }).catch(function () {});
      navigator.serviceWorker.ready.then(function (reg) { swReg = reg; }).catch(function () {});
    });
  }

  window.addEventListener('online', function () { setNote('다시 연결됐어요.'); });

  /* ---------- 시작 ---------- */
  renderAll();

  try {
    var initial = new URLSearchParams(location.search).get('tab');
    if (initial && ['feed', 'official', 'solo', 'records'].indexOf(initial) > -1) switchTab(initial);
  } catch (e) {}
})();
