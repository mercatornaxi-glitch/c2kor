/*
 * C2KOR - schema-based content renderer
 * Reads page data via SFWi18n.getPageData()/getHomeData() and builds the
 * DOM for the home page and the 8 content pages. See CLAUDE_CODE_INSTRUCTIONS.md
 * section 5 for the field -> rendering mapping this implements.
 */
(function (global) {
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Matches only known phone-number shapes (international +.., domestic
  // dash-grouped numbers, and the specific bare hotline codes used in this
  // content) so it never mistakes things like "2026" or "300만원" for a
  // phone number.
  var PHONE_REGEX = /(\+\d[\d\s-]{7,14}\d)|(\b\d{2,4}(?:-\d{3,4}){1,2}\b)|(\b(?:119|112|122|1345|1350|1339|1330)\b)/g;

  function linkifyPhones(escapedText) {
    return escapedText.replace(PHONE_REGEX, function (match) {
      var tel = match.replace(/[\s-]/g, "");
      return '<a class="tel-link" href="tel:' + tel + '">' + match + "</a>";
    });
  }

  function richText(str) {
    return linkifyPhones(escapeHtml(str));
  }

  function paragraphsHtml(body) {
    if (!body) return "";
    return body.split(/\n\n+/).map(function (p) {
      return "<p>" + richText(p) + "</p>";
    }).join("");
  }

  function renderTable(table) {
    var html = '<div class="table-scroll"><table class="data-table"><thead><tr>';
    table.columns.forEach(function (c) { html += "<th>" + escapeHtml(c) + "</th>"; });
    html += "</tr></thead><tbody>";
    table.rows.forEach(function (row) {
      html += "<tr>";
      row.forEach(function (cell) { html += "<td>" + richText(cell) + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }

  // Collapsible per-row mini-map: OpenStreetMap embed (no API key needed)
  // plus a link to open the same spot in the Naver Map app/website for full
  // navigation. `rows` are the table's rows (for the port name label),
  // `points` is meta.portMapPoints — parallel array, matched by index.
  function renderMapPoints(rows, points, lang) {
    if (!Array.isArray(points) || !points.length) return "";
    var viewLabel = { en: "View map", ko: "지도 보기" }[lang] || "View map";
    var naverLabel = { en: "Open in Naver Map", ko: "네이버지도에서 보기" }[lang] || "Open in Naver Map";
    var html = '<div class="port-maps">';
    rows.forEach(function (row, i) {
      var point = points[i];
      if (!point) return;
      var portName = row[0] || "";
      var bbox = [point.lon - 0.05, point.lat - 0.035, point.lon + 0.05, point.lat + 0.035].join(",");
      var osmSrc = "https://www.openstreetmap.org/export/embed.html?bbox=" + bbox + "&layer=mapnik&marker=" + point.lat + "," + point.lon;
      var naverUrl = "https://map.naver.com/p/search/" + encodeURIComponent(point.naverQuery || portName);
      html += '<details class="port-map-item">' +
        "<summary>" + escapeHtml(portName) + ' — <span class="view-map-label">' + escapeHtml(viewLabel) + "</span></summary>" +
        '<div class="port-map-frame"><iframe src="' + osmSrc + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>' +
        '<a class="external-link-btn port-map-naver" href="' + naverUrl + '" target="_blank" rel="noopener noreferrer"><span>' + escapeHtml(naverLabel) + '</span><span class="arrow" aria-hidden="true">↗</span></a>' +
        "</details>";
    });
    html += "</div>";
    return html;
  }

  // Row of icon-link chips ("바로가기" shortcuts) to Naver search results for
  // "<city> 맛집" (restaurants), one per port city. Shows a city label +
  // icon, not the raw URL, per the query used to power the search.
  function renderCityFoodLinks(items) {
    if (!Array.isArray(items) || !items.length) return "";
    var html = '<div class="city-food-links">';
    items.forEach(function (it) {
      var url = "https://search.naver.com/search.naver?query=" + encodeURIComponent(it.query);
      html += '<a class="external-link-btn city-food-link" href="' + url + '" target="_blank" rel="noopener noreferrer">' +
        '<span aria-hidden="true">🍴</span><span>' + escapeHtml(it.label) + "</span>" +
        '<span class="arrow" aria-hidden="true">↗</span></a>';
    });
    html += "</div>";
    return html;
  }

  function renderSection(sec) {
    var html = '<div class="section-block" data-section>';
    html += "<h2>" + escapeHtml(sec.heading) + "</h2>";
    html += paragraphsHtml(sec.body);

    if (Array.isArray(sec.subsections)) {
      html += '<dl class="def-list">';
      sec.subsections.forEach(function (s) {
        html += "<dt>" + escapeHtml(s.label) + "</dt><dd>" + richText(s.text) + "</dd>";
      });
      html += "</dl>";
    }

    if (Array.isArray(sec.lists)) {
      sec.lists.forEach(function (l) {
        if (l.label) html += '<h3 class="list-label">' + escapeHtml(l.label) + "</h3>";
        html += '<ul class="plain-list">';
        (l.items || []).forEach(function (item) {
          html += "<li>" + richText(item) + "</li>";
        });
        html += "</ul>";
      });
    }

    if (sec.table) {
      html += renderTable(sec.table);
      if (sec.id === "port-transport-table") {
        var meta = global.SFWi18n.getMeta();
        var lang = global.SFWi18n.getLang();
        html += renderMapPoints(sec.table.rows, meta.portMapPoints, lang);
      }
    }
    if (Array.isArray(sec.cityLinks)) {
      if (sec.cityLinksLabel) html += '<h3 class="list-label">' + escapeHtml(sec.cityLinksLabel) + "</h3>";
      html += renderCityFoodLinks(sec.cityLinks);
    }
    if (sec.note) html += '<div class="placeholder-box">' + richText(sec.note) + "</div>";

    html += "</div>";
    return html;
  }

  function renderPhraseGroups(groups) {
    var html = "";
    groups.forEach(function (g) {
      html += '<div class="section-block" data-section><h2>' + escapeHtml(g.heading) + "</h2>";
      html += '<div class="table-scroll"><table class="data-table phrase-table"><thead><tr>' +
        "<th>한국어</th><th>Pronunciation</th><th>Meaning</th></tr></thead><tbody>";
      g.phrases.forEach(function (p) {
        html += '<tr><td class="phrase-ko">' + escapeHtml(p.korean) +
          '</td><td class="phrase-pron">' + escapeHtml(p.pronunciation) +
          "</td><td>" + richText(p.meaning) + "</td></tr>";
      });
      html += "</tbody></table></div></div>";
    });
    return html;
  }

  function renderContacts(contacts) {
    var html = '<div class="section-block" data-section>';
    html += '<div class="table-scroll"><table class="data-table contacts-table"><tbody>';
    contacts.forEach(function (c) {
      var tel = c.number.replace(/[\s-]/g, "");
      html += '<tr><td class="contact-num"><a class="tel-link" href="tel:' + tel + '">' + escapeHtml(c.number) +
        "</a></td><td>" + escapeHtml(c.service) + '</td><td class="contact-lang">' + escapeHtml(c.languages) + "</td></tr>";
    });
    html += "</tbody></table></div></div>";
    return html;
  }

  function renderReferenceLinks(links, label) {
    if (!links || !links.length) return "";
    var html = '<div class="section-block link-section"><h2>' + escapeHtml(label) + '</h2><ul class="link-list">';
    links.forEach(function (l) {
      html += '<li><a class="external-link-btn" href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener noreferrer"><span>' +
        escapeHtml(l.label) + '</span><span class="arrow" aria-hidden="true">↗</span></a></li>';
    });
    html += "</ul></div>";
    return html;
  }

  function errorBanner(message) {
    return '<div class="content-error">⚠️ ' + escapeHtml(message) + "</div>";
  }

  // Hero illustration shown at the top of each content page. Pages always
  // live under pages/, so the ../ prefix here is safe and doesn't need to
  // be computed dynamically.
  var HERO_IMAGES = {
    "safety-at-sea": "../assets/images/safety-at-sea.jpg",
    "worker-rights": "../assets/images/worker-rights.jpg",
    "living-in-korea": "../assets/images/living-in-korea.jpg",
    "first-time-korea": "../assets/images/first-time-korea.jpg",
    "know-korea": "../assets/images/know-korea.jpg",
    "port-city-guide": "../assets/images/port-city-guide.jpg",
    "phrasebook": "../assets/images/phrasebook.jpg",
    "emergency": "../assets/images/emergency.jpg"
  };

  function renderHeroImage(pageId, altText) {
    var src = HERO_IMAGES[pageId];
    if (!src) return "";
    return '<img class="hero-image" src="' + src + '" alt="' + escapeHtml(altText) + '" loading="lazy">';
  }

  function renderPage(main, pageId) {
    var lang = global.SFWi18n.getLang();
    var data;
    try {
      data = global.SFWi18n.getPageData(lang, pageId);
    } catch (e) {
      data = null;
    }

    if (!data) {
      main.innerHTML = errorBanner("Content failed to load for this page. Please refresh the page or check your connection.");
      return;
    }

    var referenceLinksLabel = { en: "Related Links", ko: "관련 링크" }[lang] || "Related Links";

    var html = "";
    html += "<h1>" + escapeHtml(data.title) + "</h1>";
    html += renderHeroImage(pageId, data.title);
    if (data.summary) html += '<div class="summary-box">' + richText(data.summary) + "</div>";

    var saveSlug = escapeHtml(pageId);
    var saveLabel = { en: "Save as Image", ko: "이미지로 저장" }[lang] || "Save as Image";
    html += '<button id="sfw-save-image-btn" class="save-image-btn" data-slug="' + saveSlug + '"><span aria-hidden="true">🖼️</span> <span>' + saveLabel + "</span></button>";

    if (Array.isArray(data.sections)) {
      data.sections.forEach(function (sec) { html += renderSection(sec); });
    } else if (Array.isArray(data.phraseGroups)) {
      html += renderPhraseGroups(data.phraseGroups);
      if (data.tip) html += '<div class="tip-box">' + richText(data.tip) + "</div>";
    } else if (Array.isArray(data.contacts)) {
      html += renderContacts(data.contacts);
    }

    html += renderReferenceLinks(data.referenceLinks, referenceLinksLabel);
    html += '<footer class="sfw-footer"></footer>';

    main.innerHTML = html;

    var footer = main.querySelector(".sfw-footer");
    var home = global.SFWi18n.getHomeData(lang);
    if (footer) footer.textContent = (home && home.disclaimer) || "";
  }

  function renderHome(main) {
    var lang = global.SFWi18n.getLang();
    var meta = global.SFWi18n.getMeta();
    var home;
    try {
      home = global.SFWi18n.getHomeData(lang);
    } catch (e) {
      home = null;
    }

    if (!home) {
      main.innerHTML = errorBanner("Content failed to load. Please refresh the page or check your connection.");
      return;
    }

    var taegeuk = (global.SFWComponents && global.SFWComponents.TAEGEUK_SVG) || "";

    var html = "";
    html += '<div class="persona-hero"><div class="logo-emoji" aria-hidden="true">' + taegeuk + "</div>";
    html += "<h1>" + escapeHtml(home.title) + "</h1><p>" + escapeHtml(home.subtitle) + "</p></div>";
    html += '<p style="text-align:center;color:var(--color-text-muted);font-size:0.9rem;margin-top:6px;">' + escapeHtml(home.prompt) + "</p>";
    html += '<div class="card-grid two-col">';

    (meta.pageOrder || []).forEach(function (pageId) {
      var page = global.SFWi18n.getPageData(lang, pageId);
      if (!page) return;
      var cls = pageId === "emergency" ? "nav-card emergency-card" : "nav-card";
      html += '<a class="' + cls + '" href="pages/' + pageId + '.html">' +
        '<span class="nav-card__icon" aria-hidden="true">' + (page.icon || "") + "</span>" +
        '<span class="nav-card__text"><strong>' + escapeHtml(page.navTitle) + "</strong><span>" + escapeHtml(page.navDescription) + "</span></span></a>";
    });

    html += "</div>";
    html += '<footer class="sfw-footer">' + escapeHtml(home.disclaimer) + "</footer>";
    html += '<div class="ai-help-link"><a href="https://claude.ai" target="_blank" rel="noopener noreferrer">' +
      '<span aria-hidden="true">🤖</span> <span>' + escapeHtml(home.aiLinkLabel || "Ask AI for anything else") + "</span></a></div>";
    main.innerHTML = html;
  }

  global.SFWContentRender = {
    renderPage: renderPage,
    renderHome: renderHome
  };
})(window);
