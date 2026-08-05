/*
 * C2KOR - page bootstrap
 * Include after site-content-data.js, i18n.js, components.js and
 * content-render.js on every page.
 */
(function () {
  function renderMain() {
    var main = document.querySelector("main");
    if (!main) return;
    var pageId = main.getAttribute("data-page");
    if (pageId === "static") {
      return; // e.g. pages/qr.html — outside the multi-language content system.
    }
    if (!pageId || pageId === "home") {
      window.SFWContentRender.renderHome(main);
    } else {
      window.SFWContentRender.renderPage(main, pageId);
    }
  }

  function wireSaveImageButton() {
    var saveBtn = document.getElementById("sfw-save-image-btn");
    if (saveBtn && window.SFWSaveImage) {
      saveBtn.addEventListener("click", function () {
        window.SFWSaveImage.capture({ slug: saveBtn.getAttribute("data-slug") || "page" });
      });
    }
  }

  // Adds a "Search on Google" link under every rendered section, built from
  // that section's heading — gives every item a link and a search keyword
  // shown in whichever language is on screen, without needing bespoke
  // per-language keyword content.
  function injectItemSearchLinks() {
    var suffixByLang = { en: "Korea", ko: "한국" };
    var lang = window.SFWi18n.getLang();
    var suffix = suffixByLang[lang] || "Korea";
    var labelByLang = { en: "Search on Google", ko: "구글에서 검색해보기" };
    var label = labelByLang[lang] || "Search on Google";

    document.querySelectorAll("main > .section-block:not(.link-section)").forEach(function (block) {
      var h2 = block.querySelector(":scope > h2");
      if (!h2) return;
      var query = h2.textContent.trim() + " " + suffix;
      var url = "https://www.google.com/search?q=" + encodeURIComponent(query);

      var box = block.querySelector(":scope > .item-search");
      if (!box) {
        box = document.createElement("div");
        box.className = "item-search";
        box.innerHTML = '<a target="_blank" rel="noopener noreferrer"><span aria-hidden="true">🔍</span> <span class="item-search__label"></span></a>';
        block.appendChild(box);
      }
      box.querySelector("a").href = url;
      box.querySelector(".item-search__label").textContent = label + ": “" + query + "”";
    });
  }

  function renderAll() {
    window.SFWComponents.mountHeader();
    window.SFWComponents.mountEmergencyFab();
    renderMain();
    wireSaveImageButton();
    injectItemSearchLinks();
  }

  document.addEventListener("sfw:lang-changed", renderAll);

  document.addEventListener("DOMContentLoaded", function () {
    window.SFWi18n.init();
  });
})();
