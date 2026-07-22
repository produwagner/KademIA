export function applyAccentColorToDOM(hexColor) {
  if (!hexColor) return;
  const cleanHex = hexColor.replace("#", "").trim();
  if (cleanHex.length !== 6) return;

  // Persist to independent localStorage key to protect against sync wipes & ensure instant load
  try {
    localStorage.setItem("kademia_secondary_color", hexColor);
  } catch (e) {}

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Hover color: 85% brightness
  const hoverR = Math.max(0, Math.floor(r * 0.85));
  const hoverG = Math.max(0, Math.floor(g * 0.85));
  const hoverB = Math.max(0, Math.floor(b * 0.85));
  const hoverHex = `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;

  // Active color: 75% brightness
  const activeR = Math.max(0, Math.floor(r * 0.75));
  const activeG = Math.max(0, Math.floor(g * 0.75));
  const activeB = Math.max(0, Math.floor(b * 0.75));
  const activeHex = `#${activeR.toString(16).padStart(2, '0')}${activeG.toString(16).padStart(2, '0')}${activeB.toString(16).padStart(2, '0')}`;

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const onAccent = luminance > 0.55 ? "#071200" : "#ffffff";

  // Dynamic style injection guarantees precedence over CSS class declarations
  let styleEl = document.getElementById("theme-accent-override");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "theme-accent-override";
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    :root, body, body.dark-theme {
      --accent-purple: ${hexColor} !important;
      --accent-lime: ${hexColor} !important;
      --accent-secondary: ${hexColor} !important;
      --border-focus: ${hexColor} !important;
      --status-success: ${hexColor} !important;
      --clay-bg-primary: ${hexColor} !important;
      --accent-hover: ${hoverHex} !important;
      --accent-active-color: ${activeHex} !important;
      --accent-purple-glow: rgba(${r}, ${g}, ${b}, 0.15) !important;
      --accent-lime-glow: rgba(${r}, ${g}, ${b}, 0.2) !important;
      --accent-secondary-glow: rgba(${r}, ${g}, ${b}, 0.2) !important;
      --border-hover: rgba(${r}, ${g}, ${b}, 0.3) !important;
      --accent-active: rgba(${r}, ${g}, ${b}, 0.25) !important;
      --glass-border-hover: rgba(${r}, ${g}, ${b}, 0.4) !important;
      --pulsing-shadow: rgba(${r}, ${g}, ${b}, 0.4) !important;
      --pulsing-shadow-start: rgba(${r}, ${g}, ${b}, 0.7) !important;
      --color-on-accent: ${onAccent} !important;
    }
  `;

  const targets = [document.body, document.documentElement];
  targets.forEach((target) => {
    if (!target) return;
    target.style.setProperty("--accent-purple", hexColor);
    target.style.setProperty("--accent-lime", hexColor);
    target.style.setProperty("--accent-secondary", hexColor);
    target.style.setProperty("--border-focus", hexColor);
    target.style.setProperty("--status-success", hexColor);
    target.style.setProperty("--clay-bg-primary", hexColor);
    target.style.setProperty("--accent-hover", hoverHex);
    target.style.setProperty("--accent-active-color", activeHex);
    target.style.setProperty("--accent-purple-glow", `rgba(${r}, ${g}, ${b}, 0.15)`);
    target.style.setProperty("--accent-lime-glow", `rgba(${r}, ${g}, ${b}, 0.2)`);
    target.style.setProperty("--accent-secondary-glow", `rgba(${r}, ${g}, ${b}, 0.2)`);
    target.style.setProperty("--border-hover", `rgba(${r}, ${g}, ${b}, 0.3)`);
    target.style.setProperty("--accent-active", `rgba(${r}, ${g}, ${b}, 0.25)`);
    target.style.setProperty("--glass-border-hover", `rgba(${r}, ${g}, ${b}, 0.4)`);
    target.style.setProperty("--pulsing-shadow", `rgba(${r}, ${g}, ${b}, 0.4)`);
    target.style.setProperty("--pulsing-shadow-start", `rgba(${r}, ${g}, ${b}, 0.7)`);
    target.style.setProperty("--color-on-accent", onAccent);
  });
}
