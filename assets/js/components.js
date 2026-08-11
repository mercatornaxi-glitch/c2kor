/*
 * C2KOR - shared header component
 * Usage: <div id="sfw-header" data-active="safety-at-sea"></div>
 * Then call SFWComponents.mountHeader() after DOM ready (before SFWi18n.init()).
 * Language list is NOT hardcoded here — it's read from
 * SFW_SITE_CONTENT.meta.languageOrder / meta.languages at render time.
 */
(function (global) {
  // Full Taegukgi (태극기). Geometry taken directly from the verified
  // reference construction (matches the National Flag Act enforcement
  // decree: circle split by a curve rotated atan(2/3) ≈ 33.69° off the
  // flag's horizontal axis — not a plain 45° diagonal — and the four
  // trigrams (건/곴/감/리) as tilted bar groups radiating toward each
  // corner, not horizontal bars). Exported so content-render.js can reuse
  // it for the home hero.
  var TAEGEUK_SVG = '<svg viewBox="-72 -48 144 96" focusable="false">' +
    '<rect x="-72" y="-48" width="144" height="96" fill="#FFFFFF" stroke="#00000022" stroke-width="1"/>' +
    '<g stroke="#0B0B0B" stroke-width="4">' +
    '<path transform="rotate(33.69006752598)" d="M-50-12v24m6 0v-24m6 0v24m76 0V1m0-2v-11m6 0v11m0 2v11m6 0V1m0-2v-11"/>' +
    '<path transform="rotate(-33.69006752598)" d="M-50-12v24m6 0V1m0-2v-11m6 0v24m76 0V1m0-2v-11m6 0v24m6 0V1m0-2v-11"/>' +
    '</g>' +
    '<g transform="rotate(33.69006752598)">' +
    '<path fill="#CD2E3A" d="M12 0a18 18 0 11-36 0 24 24 0 1148 0"/>' +
    '<path fill="#0047A0" d="M-24 0a24 24 0 1048 0A12 12 0 100 0a12 12 0 11-24 0"/>' +
    '</g>' +
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
