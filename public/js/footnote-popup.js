// MediaWiki-style footnote popups: hover/focus on a footnote reference
// to preview the note inline without scrolling. No-ops on pages with no
// footnote refs.
(function () {
  const refs = document.querySelectorAll(
    ".footnote-ref a[href^='#footnote']",
  );
  if (!refs.length) return;

  let popup = null;
  let hideTimer = null;

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (popup) popup.classList.remove("visible");
    }, 200);
  }

  function ensurePopup() {
    if (popup) return popup;
    popup = document.createElement("div");
    popup.className = "footnote-popup";
    popup.setAttribute("role", "tooltip");
    popup.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    popup.addEventListener("mouseleave", scheduleHide);
    document.body.appendChild(popup);
    return popup;
  }

  function show(ref) {
    clearTimeout(hideTimer);
    const id = ref.getAttribute("href").slice(1);
    const note = document.getElementById(id);
    if (!note) return;
    const p = ensurePopup();
    p.innerHTML = note.innerHTML;
    p.classList.add("visible");

    const rect = ref.getBoundingClientRect();
    const popupWidth = Math.min(360, window.innerWidth - 20);
    p.style.width = popupWidth + "px";

    const refCenter = rect.left + window.scrollX + rect.width / 2;
    let left = refCenter - 20;
    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }
    if (left < 10) left = 10;

    p.style.left = left + "px";
    p.style.top = rect.bottom + window.scrollY + 5 + "px";

    const arrowLeft = Math.max(
      6,
      Math.min(refCenter - left - 6, popupWidth - 18),
    );
    p.style.setProperty("--arrow-left", arrowLeft + "px");
  }

  for (const ref of refs) {
    ref.addEventListener("mouseenter", () => show(ref));
    ref.addEventListener("mouseleave", scheduleHide);
    ref.addEventListener("focus", () => show(ref));
    ref.addEventListener("blur", scheduleHide);
  }
})();
