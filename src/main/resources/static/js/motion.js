"use strict";

// 01. Uma camada de movimento independente das regras e dos valores financeiros.
const dashboardMotion = (() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const activeAnimations = new Set();
  const previousMoney = new WeakMap();
  const moneyAnimations = new WeakMap();
  const chartSignatures = new WeakMap();
  const toastAnimations = new WeakMap();
  const ease = "cubic-bezier(.22, 1, .36, 1)";
  let userEnabled = true;
  let themeTransition = null;
  let pointerFrame = null;
  let lastPointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let pointerClientX = 0;
  let pointerClientY = 0;
  let hoveredPanel = null;

  try {
    userEnabled = localStorage.getItem("financeflow-motion") !== "off";
  } catch {
    /* A preferência é opcional. */
  }
  const enabled = () => userEnabled && !reduceMotion.matches;
  const canAnimate = () => enabled() && !document.hidden;

  // Web Animations API: cancelamentos são esperados em interações rápidas.
  function animate(element, keyframes, options = {}) {
    if (!element?.animate || !canAnimate()) return null;
    const animation = element.animate(keyframes, {
      duration: 360,
      easing: ease,
      ...options,
    });
    activeAnimations.add(animation);
    animation.finished.then(
      () => activeAnimations.delete(animation),
      () => activeAnimations.delete(animation),
    );
    return animation;
  }

  function updatePreference() {
    root.dataset.motion = enabled() ? "full" : "reduced";
    const button = document.getElementById("motion-toggle");
    if (button) {
      const paused = !enabled();
      const label = reduceMotion.matches
        ? "Movimento reduzido conforme a preferência do sistema"
        : paused
          ? "Ativar animações"
          : "Pausar animações";
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-pressed", String(paused));
      button.title = label;
      button.disabled = reduceMotion.matches;
      button
        .querySelector("use")
        .setAttribute("href", paused ? "#i-play" : "#i-pause");
    }
    if (!enabled()) {
      root.dataset.motionReady = "true";
      settle();
    }
  }

  function settle() {
    for (const animation of activeAnimations) {
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    }
    themeTransition?.skipTransition();
    if (pointerFrame !== null) cancelAnimationFrame(pointerFrame);
    pointerFrame = null;
    lastPointerFrame = 0;
    pointerX = pointerY = targetX = targetY = 0;
    const ambient = document.querySelector(".ambient");
    ambient?.style.setProperty("--ambient-x", "0px");
    ambient?.style.setProperty("--ambient-y", "0px");
    hoveredPanel?.classList.remove("is-pointer-inside");
    hoveredPanel = null;
  }

  // 02. O número mostrado é sempre o valor final, mesmo durante a transição.
  function money(element, text, instant = false) {
    if (!element) return;
    const previous = previousMoney.get(element);
    previousMoney.set(element, text);
    if (previous === text && element.textContent === text) return;
    moneyAnimations.get(element)?.cancel();
    element.textContent = text;
    if (instant || previous?.includes("••") || !canAnimate()) return;
    const animation = animate(
      element,
      [
        { opacity: 0.35, transform: "translateY(5px)", filter: "blur(1px)" },
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
      ],
      { duration: 460 },
    );
    if (animation) moneyAnimations.set(element, animation);
  }

  // 03. FLIP: comparamos as posições antes/depois, sem animar o layout em si.
  function captureRows(list) {
    if (!canAnimate()) return null;
    return new Map(
      [...list.children].map((row) => [
        row.dataset.id,
        row.getBoundingClientRect(),
      ]),
    );
  }

  function rows(list, previous) {
    if (!canAnimate() || !previous) return;
    const positions = [...list.children].map((row) => ({
      row,
      rect: row.getBoundingClientRect(),
      before: previous.get(row.dataset.id),
    }));
    positions.forEach(({ row, rect, before }, index) => {
      if (before) {
        const x = before.left - rect.left;
        const y = before.top - rect.top;
        if (Math.abs(x) + Math.abs(y) > 1)
          animate(
            row,
            [
              { transform: `translate(${x}px, ${y}px)` },
              { transform: "translate(0, 0)" },
            ],
            { duration: 420 },
          );
      } else {
        animate(
          row,
          [
            { opacity: 0, transform: "translateY(10px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 360, delay: Math.min(index, 5) * 28, fill: "backwards" },
        );
      }
    });
  }

  // 04. O traço percorre o caminho real do gráfico; os pontos não são inventados.
  function chart(svg, signature) {
    const previous = chartSignatures.get(svg);
    chartSignatures.set(svg, signature);
    if (!canAnimate() || previous === signature) return;
    const path = svg.querySelector(".chart-line");
    if (!path) return;
    const length = path.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) return;
    animate(
      path,
      [
        { strokeDasharray: `${length} ${length}`, strokeDashoffset: length },
        { strokeDasharray: `${length} ${length}`, strokeDashoffset: 0 },
      ],
      { duration: 850 },
    );
    const area = svg.querySelector(".chart-area");
    if (area)
      animate(area, [{ opacity: 0 }, { opacity: 1 }], { duration: 720 });
    const point = svg.querySelector(".chart-point");
    if (point)
      animate(point, [{ opacity: 0 }, { opacity: 1 }], {
        duration: 300,
        delay: 400,
        fill: "backwards",
      });
  }

  function toast(element, opening) {
    toastAnimations.get(element)?.cancel();
    const animation = animate(
      element,
      opening
        ? [
            { opacity: 0, translate: "0 9px" },
            { opacity: 1, translate: "0 0" },
          ]
        : [
            { opacity: 1, translate: "0 0" },
            { opacity: 0, translate: "0 7px" },
          ],
      { duration: opening ? 300 : 180 },
    );
    if (animation) toastAnimations.set(element, animation);
    return animation;
  }

  // View Transitions é uma melhoria progressiva: o tema funciona sem essa API.
  function applyTheme(update) {
    root.classList.add("is-theme-switching");
    update();
    // Evita misturar a cor nova do texto com a cor antiga dos botões.
    root.getBoundingClientRect();
    requestAnimationFrame(() => root.classList.remove("is-theme-switching"));
  }

  function theme(update) {
    if (!canAnimate() || typeof document.startViewTransition !== "function") {
      update();
      return;
    }
    themeTransition?.skipTransition();
    const transition = document.startViewTransition(update);
    themeTransition = transition;
    transition.finished
      .catch(() => {})
      .finally(() => {
        if (themeTransition === transition) themeTransition = null;
      });
  }

  function privacy() {
    themeTransition?.skipTransition();
  }

  // 05. Profundidade do fundo e luz dos cards: um único requestAnimationFrame.
  const ambient = document.querySelector(".ambient");
  for (const panel of document.querySelectorAll(".panel")) {
    const sheen = document.createElement("span");
    sheen.className = "panel-sheen";
    sheen.setAttribute("aria-hidden", "true");
    panel.append(sheen);
  }

  function movePointer(timestamp) {
    pointerFrame = null;
    if (!canAnimate() || !finePointer.matches) return;
    const elapsed = lastPointerFrame ? timestamp - lastPointerFrame : 16.7;
    lastPointerFrame = timestamp;
    const smoothing = 1 - Math.exp(-elapsed / 150);
    pointerX += (targetX - pointerX) * smoothing;
    pointerY += (targetY - pointerY) * smoothing;
    const rect = hoveredPanel?.getBoundingClientRect();
    ambient?.style.setProperty("--ambient-x", `${pointerX.toFixed(2)}px`);
    ambient?.style.setProperty("--ambient-y", `${pointerY.toFixed(2)}px`);
    if (rect) {
      hoveredPanel.style.setProperty(
        "--light-x",
        `${pointerClientX - rect.left}px`,
      );
      hoveredPanel.style.setProperty(
        "--light-y",
        `${pointerClientY - rect.top}px`,
      );
    }
    if (Math.abs(targetX - pointerX) + Math.abs(targetY - pointerY) > 0.05)
      pointerFrame = requestAnimationFrame(movePointer);
    else lastPointerFrame = 0;
  }

  function schedulePointer() {
    if (pointerFrame === null)
      pointerFrame = requestAnimationFrame(movePointer);
  }

  document.addEventListener(
    "pointermove",
    (event) => {
      if (
        !canAnimate() ||
        !finePointer.matches ||
        event.pointerType === "touch" ||
        document.querySelector("dialog[open]")
      )
        return;
      targetX = (event.clientX / innerWidth - 0.5) * 16;
      targetY = (event.clientY / innerHeight - 0.5) * 12;
      pointerClientX = event.clientX;
      pointerClientY = event.clientY;
      const panel = event.target.closest(".panel");
      if (panel !== hoveredPanel) {
        hoveredPanel?.classList.remove("is-pointer-inside");
        hoveredPanel = panel;
        hoveredPanel?.classList.add("is-pointer-inside");
      }
      schedulePointer();
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () => {
    targetX = targetY = 0;
    hoveredPanel?.classList.remove("is-pointer-inside");
    hoveredPanel = null;
    schedulePointer();
  });
  finePointer.addEventListener("change", () => {
    if (!finePointer.matches) settle();
  });
  document.addEventListener("visibilitychange", () => {
    root.dataset.pageHidden = String(document.hidden);
    if (document.hidden) settle();
  });
  reduceMotion.addEventListener("change", updatePreference);
  document.getElementById("motion-toggle")?.addEventListener("click", () => {
    userEnabled = !userEnabled;
    try {
      localStorage.setItem("financeflow-motion", userEnabled ? "on" : "off");
    } catch {
      /* Preferência opcional. */
    }
    updatePreference();
  });

  const tabs = document.querySelector(".filter-tabs");
  if (tabs) {
    const syncTab = () =>
      tabs.style.setProperty(
        "--active-tab",
        Math.max(
          0,
          [...tabs.querySelectorAll("button")].findIndex(
            (button) => button.getAttribute("aria-pressed") === "true",
          ),
        ),
      );
    new MutationObserver(syncTab).observe(tabs, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-pressed"],
    });
    syncTab();
  }
  updatePreference();
  // As entradas da página executam uma vez, sem reaparecer ao pausar/retomar.
  setTimeout(() => {
    root.dataset.motionReady = "true";
  }, 1100);
  return {
    money,
    captureRows,
    rows,
    chart,
    toast,
    theme,
    applyTheme,
    privacy,
    enabled,
  };
})();
