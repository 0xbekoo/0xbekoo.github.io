(function () {
  var STORAGE_KEY = "duat_boot_seen";
  var BOOT_LINES = [
    { kind: "system", text: "INFERNAL BIOS V6.6.6 / HELLFIRE SYSTEMS INC." },
    { kind: "system", text: "SOUL COUNT ............ 666 INDEXED" },
    { kind: "ok",     text: "ETERNAL FIRE .......... BURNING" },
    { kind: "ok",     text: "DAMNATION TABLE ....... LOADED" },
    { kind: "warn",   text: "GATE OF HELL .......... FORCED OPEN" },
    { kind: "warn",   text: "PURGATORY DRIVER ...... BYPASSED" },
    { kind: "fault",  text: "INFERNO.SYS ........... IGNITED" },
    { kind: "omen",   text: "ENTERING ETERNAL DARKNESS" }
  ];

  function revealBody() {
    document.body.style.visibility = "visible";
    document.body.classList.remove("duat-boot-lock");
  }

  function supportsReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getSeenFlag() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function setSeenFlag() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (error) {
      return;
    }
  }

  function buildOverlay() {
    var overlay = document.createElement("div");
    var panel;
    var terminal;
    var meterBar;
    var status;

    overlay.className = "duat-boot";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = [
      '<div class="duat-boot__scan"></div>',
      '<div class="duat-boot__rupture"></div>',
      '<div class="duat-boot__flash"></div>',
      '<div class="duat-boot__panel">',
      '  <div class="duat-boot__badge">INFERNAL BIOS V6.6.6 / HELLFIRE SYSTEMS INC.</div>',
      '  <div class="duat-boot__terminal" data-ui="duat-terminal"></div>',
      '  <div class="duat-boot__meter"><span class="duat-boot__meter-bar" data-ui="duat-meter"></span></div>',
      '  <div class="duat-boot__status" data-ui="duat-status">COUNTING CONDEMNED SOULS...</div>',
      "</div>"
    ].join("");

    panel    = overlay.querySelector(".duat-boot__panel");
    terminal = overlay.querySelector("[data-ui='duat-terminal']");
    meterBar = overlay.querySelector("[data-ui='duat-meter']");
    status   = overlay.querySelector("[data-ui='duat-status']");

    return { overlay: overlay, panel: panel, terminal: terminal, meterBar: meterBar, status: status };
  }

  function appendLine(terminal, line) {
    var row    = document.createElement("div");
    var prefix = document.createElement("span");
    var text   = document.createElement("span");

    row.className    = "duat-boot__line duat-boot__line--" + line.kind;
    prefix.className = "duat-boot__line-prefix";
    prefix.textContent = ">";
    text.textContent   = line.text;

    row.appendChild(prefix);
    row.appendChild(text);
    terminal.appendChild(row);
  }

  function runBootSequence(ui) {
    var lineIndex = 0;

    function stepLines() {
      var progress;
      var wait;

      if (lineIndex >= BOOT_LINES.length) {
        ui.status.textContent = "ALL HOPE ABANDONED";
        ui.overlay.classList.add("duat-boot--protected");

        window.setTimeout(function () {
          ui.overlay.classList.add("duat-boot--rupturing");
        }, 280);

        window.setTimeout(function () {
          ui.overlay.classList.add("duat-boot--revealing");
        }, 980);

        window.setTimeout(function () {
          setSeenFlag();
          revealBody();
          if (ui.overlay.parentNode) {
            ui.overlay.parentNode.removeChild(ui.overlay);
          }
        }, 1820);

        return;
      }

      appendLine(ui.terminal, BOOT_LINES[lineIndex]);

      progress = Math.round(((lineIndex + 1) / BOOT_LINES.length) * 100);
      ui.meterBar.style.width = progress + "%";

      if (lineIndex < 2) {
        ui.status.textContent = "COUNTING CONDEMNED SOULS...";
      } else if (lineIndex < 5) {
        ui.status.textContent = "IGNITING FIRE PITS...";
      } else if (lineIndex < 7) {
        ui.status.textContent = "SEALING THE GATES...";
      } else {
        ui.status.textContent = "ALL HOPE ABANDONED";
      }

      wait = lineIndex < 2 ? 200 : 150;
      if (lineIndex >= 5) { wait = 210; }

      lineIndex += 1;
      window.setTimeout(stepLines, wait);
    }

    window.setTimeout(stepLines, 440);
  }

  function initDuatBoot() {
    var ui;

    if (!document.body) { return; }

    if (supportsReducedMotion() || getSeenFlag()) {
      revealBody();
      return;
    }

    document.body.classList.add("duat-boot-lock");
    ui = buildOverlay();
    document.body.appendChild(ui.overlay);
    revealBody();
    runBootSequence(ui);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDuatBoot);
  } else {
    initDuatBoot();
  }
})();
