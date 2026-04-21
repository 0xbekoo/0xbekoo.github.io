(function () {
  function initContentToc() {
    var tocBlocks = document.querySelectorAll("[data-ui='toc']");

    Array.prototype.forEach.call(tocBlocks, function (toc) {
      var button = toc.querySelector(".single-shell__toc-toggle");
      var status = toc.querySelector(".single-shell__toc-status");

      if (!button || !status) {
        return;
      }

      function syncState(isOpen) {
        toc.classList.toggle("is-open", isOpen);
        button.setAttribute("aria-expanded", isOpen ? "true" : "false");
        status.textContent = isOpen ? "[-]" : "[+]";
      }

      syncState(toc.classList.contains("is-open"));

      button.addEventListener("click", function () {
        syncState(!toc.classList.contains("is-open"));
      });
    });
  }

  function isMobileViewport() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  function createLightbox() {
    var overlay = document.createElement("div");
    overlay.className = "mobile-image-lightbox";
    overlay.setAttribute("aria-hidden", "true");

    var image = document.createElement("img");
    image.className = "mobile-image-lightbox__image";
    image.alt = "";

    var hint = document.createElement("p");
    hint.className = "mobile-image-lightbox__hint";
    hint.textContent = "Tap outside to close";

    overlay.appendChild(image);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    return {
      overlay: overlay,
      image: image
    };
  }

  function initMobileImageLightbox() {
    var selector = ".single-shell--blogs .single-shell__content img";
    var lightbox = createLightbox();
    var overlay = lightbox.overlay;
    var overlayImage = lightbox.image;

    function closeLightbox() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("mobile-image-lightbox-open");
      window.setTimeout(function () {
        if (!overlay.classList.contains("is-open")) {
          overlayImage.removeAttribute("src");
          overlayImage.alt = "";
        }
      }, 160);
    }

    function openLightbox(sourceImage) {
      overlayImage.src = sourceImage.currentSrc || sourceImage.src;
      overlayImage.alt = sourceImage.alt || "";
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("mobile-image-lightbox-open");
    }

    document.addEventListener("click", function (event) {
      var sourceImage = event.target.closest(selector);

      if (sourceImage && isMobileViewport()) {
        event.preventDefault();
        openLightbox(sourceImage);
        return;
      }

      if (event.target === overlay) {
        closeLightbox();
      }
    });

    document.addEventListener("keyup", function (event) {
      if (event.key === "Escape" && overlay.classList.contains("is-open")) {
        closeLightbox();
      }
    });

    window.addEventListener("resize", function () {
      if (!isMobileViewport() && overlay.classList.contains("is-open")) {
        closeLightbox();
      }
    });
  }

  function initMobileScrollTop() {
    var button = document.querySelector("[data-ui='scroll-top']");

    if (!button) {
      return;
    }

    function syncVisibility() {
      var shouldShow = isMobileViewport() && window.scrollY > 260;

      button.classList.toggle("is-visible", shouldShow);
      button.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }

    button.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });

    window.addEventListener("scroll", syncVisibility, { passive: true });
    window.addEventListener("resize", syncVisibility);

    syncVisibility();
  }

  function initSingleShellUi() {
    initContentToc();
    initMobileImageLightbox();
    initMobileScrollTop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSingleShellUi);
  } else {
    initSingleShellUi();
  }
})();
