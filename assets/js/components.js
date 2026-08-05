/*
 * C2KOR - shared header component
 * Usage: <div id="sfw-header" data-active="safety-at-sea"></div>
 * Then call SFWComponents.mountHeader() after DOM ready (before SFWi18n.init()).
 * Language list is NOT hardcoded here — it's read from
 * SFW_SITE_CONTENT.meta.languageOrder / meta.languages at render time.
 */
(function (global) {
  // Taegeuk (태극) mark: red on top, blue on bottom, no dots. Exported so
  // content-render.js can reuse it for the home page hero.
  var TAEGEUK_SVG = '<svg viewBox="0 0 100 100" width="26" height="26" focusable="false">' +
    '<circle cx="50" cy="50" r="50" fill="#0047A0"/>' +
    '<path d="M50 0a50 50 0 000 100 25 25 0 000-50 25 25 0 010-50z" fill="#CD2E3A" transform="rotate(90 50 50)"/>' +
    '</svg>';

  function pathPrefix() {
    var inPagesDir = /\/pages\//.test(location.pathname) || /^pages\//.test(location.pathname);
    return inPagesDir ? "../" : "";
  }

  function buildLangOptions(current) {
    var meta = global.SFWi18n.getMeta();
    return (meta.languageOrder || [])
      .filter(function (code) { return global.SFWi18n.isComplete(code); })
      .map(function (code) {
        var entry = meta.languages[code];
        var sel = code === current ? " selected" : "";
        return '<option value="' + code + '"' + sel + ">" + entry.nativeName + "</option>";
      }).join("");
  }

  function subnavLinks(prefix) {
    var meta = global.SFWi18n.getMeta();
    var lang = global.SFWi18n.getLang();
    return (meta.pageOrder || []).map(function (pageId) {
      var page = global.SFWi18n.getPageData(lang, pageId);
      return {
        href: prefix + "pages/" + pageId + ".html",
        label: page ? page.navTitle : pageId,
        slug: pageId
      };
    });
  }

  function mountHeader() {
    var mount = document.getElementById("sfw-header");
    if (!mount) return;
    var active = mount.getAttribute("data-active") || "";
    var prefix = pathPrefix();
    var current = global.SFWi18n.getLang();

    var links = subnavLinks(prefix);
    var linksHtml = links.map(function (l) {
      var cls = l.slug === active ? " active" : "";
      return '<a href="' + l.href + '" class="' + cls.trim() + '">' + l.label + "</a>";
    }).join("");

    var brandName = "Welcome to Korean Ports!";

    mount.innerHTML =
      '<header class="sfw-header">' +
      '  <div class="sfw-header__bar">' +
      '    <a href="' + prefix + 'index.html" class="sfw-header__brand"><span class="flag" aria-hidden="true">' + TAEGEUK_SVG + '</span> <span>' + brandName + '</span></a>' +
      '    <div class="sfw-header__controls">' +
      '      <select class="sfw-lang-select" id="sfw-lang-select" aria-label="Language">' +
      buildLangOptions(current) +
      "      </select>" +
      "    </div>" +
      "  </div>" +
      '  <nav class="sfw-header__subnav">' + linksHtml + "</nav>" +
      "</header>";

    var select = document.getElementById("sfw-lang-select");
    select.addEventListener("change", function () {
      global.SFWi18n.setLang(select.value);
    });

    // Keep the horizontally-scrolling subnav positioned so the active page
    // link is visible, instead of always showing the start of the list.
    var activeLink = mount.querySelector(".sfw-header__subnav a.active");
    if (activeLink) {
      activeLink.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }

  function mountEmergencyFab() {
    var existing = document.querySelector(".sfw-emergency-fab");
    if (existing) existing.remove();
    var prefix = pathPrefix();
    var lang = global.SFWi18n.getLang();
    var emergencyPage = global.SFWi18n.getPageData(lang, "emergency");
    var label = emergencyPage ? emergencyPage.navTitle : "Emergency Contacts";
    var fab = document.createElement("div");
    fab.className = "sfw-emergency-fab";
    fab.innerHTML = '<a href="' + prefix + 'pages/emergency.html"><span aria-hidden="true">🆘</span> <span>' + label + '</span></a>';
    document.body.appendChild(fab);
  }

  global.SFWComponents = {
    TAEGEUK_SVG: TAEGEUK_SVG,
    mountHeader: mountHeader,
    mountEmergencyFab: mountEmergencyFab,
    init: function () {
      mountHeader();
      mountEmergencyFab();
    }
  };
})(window);
