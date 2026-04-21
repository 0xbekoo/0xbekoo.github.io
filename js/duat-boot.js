(function () {
  var STORAGE_KEY = "duat_boot_seen";
  var BOOT_LINES = [
    { kind: "system", text: "PHOENIX 80386DX / RITUAL ROM V3.10" },
    { kind: "system", text: "BASE MEMORY ............ 640K WEIGHED" },
    { kind: "ok", text: "EXTENDED MEMORY ....... 16384K INSCRIBED" },
    { kind: "ok", text: "RED SAND TABLE ........ ETCHED" },
    { kind: "warn", text: "WESTERN HORIZON ....... SEALED" },
    { kind: "warn", text: "AMDUAT ROUTE .......... INDEXED" },
    { kind: "warn", text: "GATE OF AKER .......... BREACHED" },
    { kind: "fault", text: "ENTERING PROTECTED MODE" },
    { kind: "omen", text: "DESCENT INTO DUAT" }
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
    var artPath = window._386 && window._386.duatBootImage ? window._386.duatBootImage : "";
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
      '<div class="duat-boot__art" aria-hidden="true"><div class="duat-boot__art-noise"></div></div>',
      '<div class="duat-boot__panel">',
      '  <div class="duat-boot__badge">80386 DESCENT / DUAT INVOCATION</div>',
      '  <div class="duat-boot__mythband">RED SANDS / WESTERN HORIZON / HIDDEN GATES / LAKE OF FIRE</div>',
      '  <div class="duat-boot__terminal" data-ui="duat-terminal"></div>',
      '  <div class="duat-boot__meter"><span class="duat-boot__meter-bar" data-ui="duat-meter"></span></div>',
      '  <div class="duat-boot__status" data-ui="duat-status">ETCHING RED SANDS INTO LOW MEMORY</div>',
      "</div>"
    ].join("");

    if (typeof artPath === "string") {
      artPath = artPath.replace(/^['"]+|['"]+$/g, "");
    }

    if (artPath) {
      overlay.classList.add("duat-boot--has-art");
      overlay.style.setProperty("--duat-boot-art", 'url("' + artPath + '")');
    }

    panel = overlay.querySelector(".duat-boot__panel");
    terminal = overlay.querySelector("[data-ui='duat-terminal']");
    meterBar = overlay.querySelector("[data-ui='duat-meter']");
    status = overlay.querySelector("[data-ui='duat-status']");

    return {
      overlay: overlay,
      artPath: artPath,
      panel: panel,
      terminal: terminal,
      meterBar: meterBar,
      status: status
    };
  }

  function appendLine(terminal, line) {
    var row = document.createElement("div");
    var prefix = document.createElement("span");
    var text = document.createElement("span");

    row.className = "duat-boot__line duat-boot__line--" + line.kind;
    prefix.className = "duat-boot__line-prefix";
    prefix.textContent = ">";
    text.textContent = line.text;

    row.appendChild(prefix);
    row.appendChild(text);
    terminal.appendChild(row);
  }

  function preloadArt(ui) {
    var image;

    if (!ui.artPath) {
      return;
    }

    image = new window.Image();
    image.onload = function () {
      if (!ui.overlay || !ui.overlay.parentNode) {
        return;
      }

      ui.overlay.classList.add("duat-boot--art-ready");

      if (ui.overlay.classList.contains("duat-boot--protected")) {
        ui.overlay.classList.add("duat-boot--art-echo");
      }
    };
    image.onerror = function () {
      if (!ui.overlay || !ui.overlay.parentNode) {
        return;
      }

      ui.overlay.classList.add("duat-boot--art-ready");
    };
    image.src = ui.artPath;
  }

  function runBootSequence(ui) {
    var lineIndex = 0;

    function stepLines() {
      var progress;
      var wait;

      if (lineIndex >= BOOT_LINES.length) {
        ui.status.textContent = "PROTECTED MODE LATCHED / DUAT GATE UNSEALED";
        ui.overlay.classList.add("duat-boot--protected");

        if (ui.overlay.classList.contains("duat-boot--art-ready")) {
          ui.overlay.classList.add("duat-boot--art-echo");
        }

        window.setTimeout(function () {
          ui.status.textContent = "SIGNAL COLLAPSE / DESCENT THROUGH WESTERN HORIZON";
          ui.overlay.classList.add("duat-boot--rupturing");
        }, 360);

        window.setTimeout(function () {
          ui.status.textContent = "THE GATES OF DUAT ARE OPEN";
          ui.overlay.classList.add("duat-boot--revealing");
        }, 1480);

        window.setTimeout(function () {
          setSeenFlag();
          revealBody();
          if (ui.overlay.parentNode) {
            ui.overlay.parentNode.removeChild(ui.overlay);
          }
        }, 2620);

        return;
      }

      appendLine(ui.terminal, BOOT_LINES[lineIndex]);

      progress = Math.round(((lineIndex + 1) / BOOT_LINES.length) * 100);
      ui.meterBar.style.width = progress + "%";

      if (lineIndex < 2) {
        ui.status.textContent = "WEIGHING MEMORY AGAINST THE RED SANDS";
      } else if (lineIndex < 5) {
        ui.status.textContent = "INSCRIBING THE AMDUAT INTO LOW MEMORY";
      } else if (lineIndex < 7) {
        ui.status.textContent = "UNSEALING THE GATES OF THE WESTERN HORIZON";
      } else {
        ui.status.textContent = "DESCENDING BELOW THE HORIZON OF RA";
      }

      wait = lineIndex < 2 ? 240 : 180;
      if (lineIndex >= 2 && lineIndex < 6) {
        wait = 170;
      }
      if (lineIndex >= 6) {
        wait = 240;
      }

      lineIndex += 1;
      window.setTimeout(stepLines, wait);
    }

    window.setTimeout(stepLines, 560);
  }

  function initDuatBoot() {
    var ui;

    if (!document.body) {
      return;
    }

    if (supportsReducedMotion() || getSeenFlag()) {
      revealBody();
      return;
    }

    document.body.classList.add("duat-boot-lock");
    ui = buildOverlay();
    document.body.appendChild(ui.overlay);
    preloadArt(ui);
    revealBody();
    runBootSequence(ui);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDuatBoot);
  } else {
    initDuatBoot();
  }
})();
