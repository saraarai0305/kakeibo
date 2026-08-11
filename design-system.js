/*
 * くらしのしるし / Design System v1
 *
 * 生活データ（mainichi.v1）とは完全に分離した、見た目だけの設定です。
 * 値は design-studio.html から変更し、CSS カスタムプロパティとして全画面に反映します。
 */
(() => {
  "use strict";

  const STORAGE_KEY = "kurashi-no-shirushi.design-tokens.v1";
  const EVENT_NAME = "kurashi:design-change";
  const FONT_PRESETS = {
    ui: {
      "標準ゴシック": '"Noto Sans JP", "BIZ UDPGothic", "Yu Gothic UI", "Hiragino Sans", sans-serif',
      "やわらかいゴシック": '"Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif',
      "読みやすいUD": '"BIZ UDPGothic", "Noto Sans JP", sans-serif'
    },
    expression: {
      "明朝": '"Noto Serif JP", "BIZ UDPMincho", "Yu Mincho", "Hiragino Mincho ProN", serif',
      "ゴシック": '"Noto Sans JP", "BIZ UDPGothic", "Yu Gothic UI", sans-serif',
      "UD明朝": '"BIZ UDPMincho", "Noto Serif JP", "Yu Mincho", serif'
    },
    number: {
      "数字ゴシック": '"Noto Sans JP", "BIZ UDPGothic", "Yu Gothic UI", sans-serif',
      "等幅ゴシック": 'ui-monospace, "SFMono-Regular", "Cascadia Mono", "BIZ UDPGothic", monospace',
      "明朝": '"Noto Serif JP", "BIZ UDPMincho", "Yu Mincho", serif'
    }
  };

  const DEFAULTS = {
    schema: 2,
    preset: "paper-retro",
    palette: {
      paper: "#f6efe1",
      surface: "#fffaf0",
      ink: "#1f3430",
      muted: "#6d786e",
      line: "#c9b99c",
      blue: "#4f83b4",
      green: "#4e9d72",
      coral: "#d27667",
      violet: "#7864ad",
      yellow: "#d9a73b"
    },
    type: {
      ui: "標準ゴシック",
      expression: "明朝",
      number: "数字ゴシック",
      uiScale: 1,
      expressionScale: 1,
      tracking: 0
    },
    layout: {
      pagePadding: 24,
      sectionGap: 24,
      controlHeight: 52,
      iconSize: 26,
      iconFrame: 48,
      radius: 20,
      cardRadius: 24
    },
    motion: {
      enabled: true,
      duration: 180,
      intensity: 0.8
    }
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
  };
  const hex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
  const choose = (collection, key, fallback) => Object.prototype.hasOwnProperty.call(collection, key) ? key : fallback;

  function sanitize(input) {
    const safe = clone(DEFAULTS);
    const source = input && typeof input === "object" ? input : {};
    const palette = source.palette || {};
    const type = source.type || {};
    const layout = source.layout || {};
    const motion = source.motion || {};

    Object.keys(safe.palette).forEach(key => { safe.palette[key] = hex(palette[key], safe.palette[key]); });
    safe.type.ui = choose(FONT_PRESETS.ui, type.ui, safe.type.ui);
    // v1 の display は「操作画面の見出し」にも漏れていました。
    // 既存ユーザーの選択を expression に移し、以後は自由表現だけに限定します。
    safe.type.expression = choose(FONT_PRESETS.expression, type.expression ?? type.display, safe.type.expression);
    safe.type.number = choose(FONT_PRESETS.number, type.number, safe.type.number);
    safe.type.uiScale = clamp(type.uiScale, 0.85, 1.2, safe.type.uiScale);
    safe.type.expressionScale = clamp(type.expressionScale ?? type.displayScale, 0.8, 1.2, safe.type.expressionScale);
    safe.type.tracking = clamp(type.tracking, -0.04, 0.12, safe.type.tracking);
    safe.layout.pagePadding = clamp(layout.pagePadding, 16, 40, safe.layout.pagePadding);
    safe.layout.sectionGap = clamp(layout.sectionGap, 12, 40, safe.layout.sectionGap);
    safe.layout.controlHeight = clamp(layout.controlHeight, 44, 72, safe.layout.controlHeight);
    safe.layout.iconSize = clamp(layout.iconSize, 18, 40, safe.layout.iconSize);
    safe.layout.iconFrame = clamp(layout.iconFrame, 36, 72, safe.layout.iconFrame);
    safe.layout.radius = clamp(layout.radius, 8, 32, safe.layout.radius);
    safe.layout.cardRadius = clamp(layout.cardRadius, 12, 40, safe.layout.cardRadius);
    safe.motion.enabled = motion.enabled !== false;
    safe.motion.duration = clamp(motion.duration, 0, 500, safe.motion.duration);
    safe.motion.intensity = clamp(motion.intensity, 0, 1, safe.motion.intensity);
    return safe;
  }

  function get() {
    try { return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch (_) { return clone(DEFAULTS); }
  }

  function css(root, name, value) { root.style.setProperty(name, String(value)); }

  function apply(tokens = get()) {
    const safe = sanitize(tokens);
    const root = document.documentElement;
    const palette = safe.palette;
    css(root, "--ds-paper", palette.paper);
    css(root, "--ds-surface", palette.surface);
    css(root, "--ds-ink", palette.ink);
    css(root, "--ds-muted", palette.muted);
    css(root, "--ds-line", palette.line);
    css(root, "--ds-blue", palette.blue);
    css(root, "--ds-green", palette.green);
    css(root, "--ds-coral", palette.coral);
    css(root, "--ds-violet", palette.violet);
    css(root, "--ds-yellow", palette.yellow);
    css(root, "--ds-font-functional", FONT_PRESETS.ui[safe.type.ui]);
    css(root, "--ds-font-expression", FONT_PRESETS.expression[safe.type.expression]);
    // 旧紙面トークンの安全な移行先。既存の操作画面に明朝が混ざらないよう、
    // display は機能用書体へ固定し、自由表現は expression を明示した箇所だけで使います。
    css(root, "--ds-font-ui", FONT_PRESETS.ui[safe.type.ui]);
    css(root, "--ds-font-display", FONT_PRESETS.ui[safe.type.ui]);
    css(root, "--ds-font-number", FONT_PRESETS.number[safe.type.number]);
    css(root, "--ds-ui-scale", safe.type.uiScale);
    css(root, "--ds-expression-scale", safe.type.expressionScale);
    css(root, "--ds-display-scale", safe.type.uiScale);
    css(root, "--ds-tracking", `${safe.type.tracking}em`);
    css(root, "--ds-page-padding", `${safe.layout.pagePadding}px`);
    css(root, "--ds-section-gap", `${safe.layout.sectionGap}px`);
    css(root, "--ds-control-height", `${safe.layout.controlHeight}px`);
    css(root, "--ds-icon-size", `${safe.layout.iconSize}px`);
    css(root, "--ds-icon-frame", `${safe.layout.iconFrame}px`);
    css(root, "--ds-radius", `${safe.layout.radius}px`);
    css(root, "--ds-card-radius", `${safe.layout.cardRadius}px`);
    css(root, "--ds-motion-duration", `${safe.motion.duration}ms`);
    css(root, "--ds-motion-intensity", safe.motion.intensity);
    root.dataset.designSystem = "paper-v1";
    root.dataset.reduceMotion = safe.motion.enabled ? "false" : "true";
    return safe;
  }

  function set(next) {
    const safe = sanitize(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    apply(safe);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: safe }));
    return safe;
  }

  function update(path, value) {
    const next = get();
    const parts = String(path).split(".");
    let cursor = next;
    for (let index = 0; index < parts.length - 1; index += 1) cursor = cursor[parts[index]];
    cursor[parts[parts.length - 1]] = value;
    return set(next);
  }

  function reset() { return set(clone(DEFAULTS)); }

  window.KurashiDesign = Object.freeze({
    STORAGE_KEY,
    EVENT_NAME,
    DEFAULTS: clone(DEFAULTS),
    FONT_PRESETS,
    get,
    set,
    update,
    apply,
    reset,
    sanitize
  });

  apply();
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) apply();
  });
})();
