(function () {
  var STORAGE_KEY = "workspace_slide_transition";
  var DESKTOP_MEDIA = "(min-width: 980px)";

  function normalizePath(pathname) {
    var normalized = pathname || "/";

    normalized = normalized.replace(/index\.html$/, "");
    if (!normalized.endsWith("/")) {
      normalized += "/";
    }

    return normalized;
  }

  function getWorkspace(pathname) {
    var normalized = normalizePath(pathname);

    if (normalized === "/") {
      return { name: "home", index: 0 };
    }
    if (normalized.indexOf("/docs/") === 0) {
      return { name: "docs", index: 1 };
    }
    if (normalized.indexOf("/blogs/") === 0) {
      return { name: "blogs", index: 2 };
    }

    return null;
  }

  function isDesktop() {
    return window.matchMedia && window.matchMedia(DESKTOP_MEDIA).matches;
  }

  function enableTransitions() {
    if (!document.body) {
      return;
    }

    document.body.classList.add("page-workspace-ready");
  }

  function readTransition() {
    try {
      return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function writeTransition(data) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      return;
    }
  }

  function clearTransition() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      return;
    }
  }

  function applyEnterTransition() {
    var transition = readTransition();
    var currentWorkspace = getWorkspace(window.location.pathname);

    enableTransitions();

    if (!transition || !currentWorkspace || !isDesktop()) {
      clearTransition();
      return;
    }

    if (Date.now() - transition.at > 4000 || transition.target !== currentWorkspace.name) {
      clearTransition();
      return;
    }

    document.body.classList.add("page-workspace-enter--" + transition.direction);

    window.setTimeout(function () {
      document.body.classList.remove("page-workspace-enter--forward", "page-workspace-enter--backward");
      clearTransition();
    }, 520);
  }

  function shouldHandleLink(anchor, event) {
    var currentWorkspace;
    var targetWorkspace;
    var url;

    if (!anchor || !anchor.href || !isDesktop()) {
      return false;
    }

    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }

    if (anchor.target && anchor.target !== "_self") {
      return false;
    }

    if (anchor.hasAttribute("download")) {
      return false;
    }

    url = new window.URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return false;
    }

    currentWorkspace = getWorkspace(window.location.pathname);
    targetWorkspace = getWorkspace(url.pathname);

    return Boolean(currentWorkspace && targetWorkspace && currentWorkspace.name !== targetWorkspace.name);
  }

  function onClick(event) {
    var anchor = event.target.closest("a");
    var currentWorkspace;
    var targetWorkspace;
    var direction;
    var targetUrl;

    if (!shouldHandleLink(anchor, event)) {
      return;
    }

    targetUrl = new window.URL(anchor.href, window.location.href);
    currentWorkspace = getWorkspace(window.location.pathname);
    targetWorkspace = getWorkspace(targetUrl.pathname);
    direction = targetWorkspace.index > currentWorkspace.index ? "forward" : "backward";

    event.preventDefault();
    enableTransitions();

    writeTransition({
      at: Date.now(),
      direction: direction,
      target: targetWorkspace.name
    });

    document.body.classList.add("page-workspace-leave--" + direction);

    window.setTimeout(function () {
      window.location.href = anchor.href;
    }, 360);
  }

  function initWorkspaceSlide() {
    applyEnterTransition();
    document.addEventListener("click", onClick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWorkspaceSlide);
  } else {
    initWorkspaceSlide();
  }
})();
