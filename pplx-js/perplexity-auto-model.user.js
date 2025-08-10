// ==UserScript==
// @name         Perplexity Auto Model Selector
// @namespace    ppx-auto-model
// @version      0.1.0
// @description  Auto open model menu and select target model (e.g., GPT-5)
// @match        https://www.perplexity.ai/*
// @match        https://perplexity.ai/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // 可配置：按优先级从左到右匹配。支持如 'Claude-sonnet-4.0'、'o3' 等写法（连字符与空格视为等价）。
  // 示例：const PREFERRED_MODELS = ['Claude', 'GPT', 'Gemini'];
  const PREFERRED_MODELS = ['GPT'];
  // 可选：排除包含以下关键词的候选项（用于规避例如 Thinking/Reasoning 版本）
  // 示例：const EXCLUDE_SUBSTRINGS = ['thinking', 'reasoning'];
  const EXCLUDE_SUBSTRINGS = [];

  const TRY_LIMIT = 6;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // 归一化：大小写不敏感；将连字符/下划线当作空格；压缩空白
  const norm = (s) => (s || '')
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const prefList = Array.isArray(PREFERRED_MODELS) ? PREFERRED_MODELS : [String(PREFERRED_MODELS)];

  // 自动切换“时效性”：仅在窗口期内强制选中，超时后不再干预，便于手动选择
  // 例如设置为 8000ms 表示页面/路由变化后的 8 秒内会自动选择，之后停止干预
  const ENFORCE_DURATION_MS = 8000;
  const STOP_ON_USER_INTERACTION = true; // 用户手动点过模型菜单后立即停止本次强制

  let enforceUntilTs = 0;
  let userInteracted = false;
  let lastUrl = location.href;

  function openEnforcementWindow() {
    enforceUntilTs = Date.now() + ENFORCE_DURATION_MS;
    userInteracted = false;
  }

  function withinWindow() {
    return Date.now() <= enforceUntilTs && (!STOP_ON_USER_INTERACTION || !userInteracted);
  }

  function getModelButton() {
    return document.querySelector('button[aria-label="Choose a model"], button[aria-label="选择一个模型"]');
  }

  function currentModelText() {
    const btn = getModelButton();
    return norm(btn ? btn.textContent : '');
  }

  function isCurrentOneOfPreferences() {
    const cur = currentModelText();
    return prefList.some((p) => cur.includes(norm(p)));
  }

  async function openMenu() {
    const btn = getModelButton();
    if (!btn) return false;
    // 某些组件要求 pointer 事件触发样式与状态
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    btn.click();

    // 等待弹层出现（不同实现可能使用不同的 role / data-state）
    for (let i = 0; i < 15; i++) {
      if (document.querySelector('[role="menu"],[role="listbox"],[data-state="open"]')) return true;
      await sleep(80);
    }
    return true;
  }

  function getVisibleItems() {
    const menus = [...document.querySelectorAll('[role="menu"],[role="listbox"],[data-state="open"]')];
    const menu = menus.find((m) => m.offsetParent !== null) || document.body;
    return [...menu.querySelectorAll('[role="menuitem"],[role="menuitemradio"],button,li')].filter(
      (el) => el.offsetParent !== null && /\S/.test(el.textContent)
    );
  }

  function clickItemByText(text) {
    const items = getVisibleItems();
    const target = items.find((el) => norm(el.textContent).includes(norm(text)));
    if (!target) return false;

    const clickable =
      target.closest('button,[role="menuitemradio"],[role="menuitem"],[role="option"],a,[data-model]') || target;

    // 滚动到视口并计算点击坐标
    clickable.scrollIntoView({ block: 'center', inline: 'center' });
    const r = clickable.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    // 主点击序列（带坐标）
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      clickable.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: cx,
          clientY: cy,
          button: 0,
          buttons: 1,
        })
      );
    });

    // 回退：如果顶层元素不是同一个，再触发一次 click
    const topEl = document.elementFromPoint(cx, cy);
    if (topEl && topEl !== clickable) topEl.click();
    return true;
  }

  function pickBestByPreference(prefKeyword) {
    const items = getVisibleItems();
    const pref = norm(prefKeyword);
    const excludes = EXCLUDE_SUBSTRINGS.map(norm);

    let best = null;
    let bestScore = -Infinity;

    for (const el of items) {
      const t = norm(el.textContent);
      if (!t.includes(pref)) continue;

      let score = 100;
      if (t.startsWith(pref)) score += 50;             // 品牌开头优先
      for (const ex of excludes) if (ex && t.includes(ex)) score -= 40; // 命中排除词降权
      if (/\bnew\b/.test(t)) score += 3;

      if (score > bestScore) { best = el; bestScore = score; }
    }

    if (!best) return false;
    const clickable =
      best.closest('button,[role="menuitemradio"],[role="menuitem"],[role="option"],a,[data-model]') || best;

    clickable.scrollIntoView({ block: 'center', inline: 'center' });
    const r = clickable.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      clickable.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: cx,
          clientY: cy,
          button: 0,
          buttons: 1,
        })
      );
    });
    const topEl = document.elementFromPoint(cx, cy);
    if (topEl && topEl !== clickable) topEl.click();
    return true;
  }

  function clickBestByPreferences() {
    for (const p of prefList) {
      if (pickBestByPreference(p)) return true;
    }
    return false;
  }

  async function ensureModel() {
    if (!withinWindow()) return true; // 超出窗口期，不再干预
    if (isCurrentOneOfPreferences()) return true;
    await openMenu();
    await sleep(120);
    clickBestByPreferences();
    await sleep(220);
    return isCurrentOneOfPreferences();
  }

  function boot() {
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      for (let i = 0; i < TRY_LIMIT; i++) {
        try {
          if (await ensureModel()) break;
        } catch (e) {
          // 忽略单次错误，继续重试
        }
        await sleep(400);
      }
      running = false;
    };

    // 初次执行：开启窗口并尝试
    openEnforcementWindow();
    run();

    // 监听 SPA 路由/DOM 变化（Perplexity 是单页应用）
    const mo = new MutationObserver(() => {
      // URL 变化视为路由变化，重新开启窗口
      if (lastUrl !== location.href) {
        lastUrl = location.href;
        openEnforcementWindow();
      }
      if (withinWindow() && !isCurrentOneOfPreferences()) run();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    // 若用户主动点过模型菜单或菜单项，立即停止本次强制（直到路由变化）
    if (STOP_ON_USER_INTERACTION) {
      const stop = () => { userInteracted = true; };
      document.addEventListener('pointerdown', (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        if (t.closest('button[aria-label="Choose a model"], button[aria-label="选择一个模型"], [role="menu"], [role="menuitem"], [role="menuitemradio"]')) {
          stop();
        }
      }, true);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    boot();
  } else {
    window.addEventListener('DOMContentLoaded', boot, { once: true });
  }
})();


