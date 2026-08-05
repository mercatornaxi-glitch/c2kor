/*
 * C2KOR - "Save as Image" feature
 * Renders the current page's already-translated content onto a <canvas>
 * and downloads it as a PNG, so crew can keep an offline copy on their
 * phone. Pure Canvas 2D, no external libraries — works without internet
 * and regardless of which language is currently selected.
 */
(function (global) {
  var WIDTH = 720;
  var PADDING = 32;
  var COLORS = {
    bg: "#ffffff",
    title: "#0b3d66",
    heading: "#0b3d66",
    text: "#16232e",
    muted: "#4b5c6b",
    rule: "#d7e1ea",
    brand: "#0e7c86"
  };

  function wrapToken(ctx, token, maxWidth) {
    var chunks = [];
    var chunk = "";
    for (var i = 0; i < token.length; i++) {
      var ch = token[i];
      var test = chunk + ch;
      if (chunk === "" || ctx.measureText(test).width <= maxWidth) {
        chunk = test;
      } else {
        chunks.push(chunk);
        chunk = ch;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  }

  // Greedy word-wrap that falls back to character-level wrapping for
  // scripts without spaces (Korean, Chinese, Khmer, Burmese all still
  // work correctly since a spaceless string is treated as one long word).
  function wrapText(ctx, text, maxWidth) {
    var words = text.split(" ").filter(function (w) { return w.length > 0; });
    var lines = [];
    var line = "";

    words.forEach(function (word) {
      if (ctx.measureText(word).width > maxWidth) {
        if (line) { lines.push(line); line = ""; }
        var chunks = wrapToken(ctx, word, maxWidth);
        for (var i = 0; i < chunks.length - 1; i++) lines.push(chunks[i]);
        line = chunks[chunks.length - 1] || "";
        return;
      }
      var test = line ? line + " " + word : word;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  // Reads the already-rendered (translated) DOM instead of the i18n data,
  // so the exported image always matches whatever language is on screen.
  // Matches the schema-driven markup produced by assets/js/content-render.js.
  function collectBlocks(main) {
    var blocks = [];

    var h1 = main.querySelector(":scope > h1");
    if (h1) blocks.push({ type: "title", text: h1.textContent.trim() });

    var summary = main.querySelector(":scope > .summary-box");
    if (summary) blocks.push({ type: "text", text: summary.textContent.trim() });

    main.querySelectorAll(":scope > .section-block:not(.link-section)").forEach(function (sec) {
      var h2 = sec.querySelector(":scope > h2");
      if (h2) blocks.push({ type: "heading", text: h2.textContent.trim() });

      sec.querySelectorAll(":scope > p").forEach(function (p) {
        var t = p.textContent.trim();
        if (t) blocks.push({ type: "text", text: t });
      });

      sec.querySelectorAll("dl.def-list > dt").forEach(function (dt) {
        var dd = dt.nextElementSibling;
        var text = dt.textContent.trim() + (dd ? " — " + dd.textContent.trim() : "");
        blocks.push({ type: "bullet", text: text });
      });

      sec.querySelectorAll("h3.list-label").forEach(function (h3) {
        blocks.push({ type: "heading", text: h3.textContent.trim() });
      });

      sec.querySelectorAll("ul.plain-list > li").forEach(function (li) {
        blocks.push({ type: "bullet", text: li.textContent.trim() });
      });

      sec.querySelectorAll("table.data-table").forEach(function (table) {
        table.querySelectorAll("tr").forEach(function (tr) {
          var cells = Array.prototype.map.call(tr.querySelectorAll("th,td"), function (c) {
            return c.textContent.trim();
          });
          if (cells.length) blocks.push({ type: "bullet", text: cells.join("  |  ") });
        });
      });

      var note = sec.querySelector(".placeholder-box");
      if (note) blocks.push({ type: "note", text: note.textContent.trim() });
    });

    var tip = main.querySelector(":scope > .tip-box");
    if (tip) blocks.push({ type: "note", text: tip.textContent.trim() });

    return blocks;
  }

  function fontFor(type) {
    switch (type) {
      case "title": return { size: 28, weight: "800", color: COLORS.title, lineGap: 10, before: 0, after: 12 };
      case "text": return { size: 16, weight: "400", color: COLORS.muted, lineGap: 6, before: 0, after: 16 };
      case "heading": return { size: 19, weight: "700", color: COLORS.heading, lineGap: 7, before: 20, after: 6 };
      case "bullet": return { size: 15, weight: "400", color: COLORS.text, lineGap: 6, before: 0, after: 5, bullet: true };
      case "note": return { size: 13, weight: "400", color: COLORS.muted, lineGap: 5, before: 8, after: 8, note: true };
      default: return { size: 15, weight: "400", color: COLORS.text, lineGap: 6, before: 0, after: 6 };
    }
  }

  function buildFontString(size, weight) {
    return weight + " " + size + 'px "Segoe UI", "Malgun Gothic", "Noto Sans", sans-serif';
  }

  function layout(ctx, blocks, contentWidth) {
    var items = [];
    var y = 0;

    blocks.forEach(function (block) {
      var spec = fontFor(block.type);
      y += spec.before;
      ctx.font = buildFontString(spec.size, spec.weight);
      var indent = spec.bullet ? 20 : (spec.note ? 12 : 0);
      var maxWidth = contentWidth - indent;
      var prefix = spec.bullet ? "• " : "";
      var lines = wrapText(ctx, prefix + block.text, maxWidth);

      lines.forEach(function (line) {
        items.push({ text: line, x: indent, y: y, font: ctx.font, color: spec.color });
        y += spec.size + spec.lineGap;
      });
      y += spec.after;
    });

    return { items: items, totalHeight: y };
  }

  function capture(opts) {
    opts = opts || {};
    var main = document.querySelector("main");
    if (!main) return;
    var blocks = collectBlocks(main);
    if (!blocks.length) return;

    var measureCanvas = document.createElement("canvas");
    var mctx = measureCanvas.getContext("2d");
    var contentWidth = WIDTH - PADDING * 2;
    var layoutResult = layout(mctx, blocks, contentWidth);

    var footerHeight = 46;
    var totalHeight = PADDING + layoutResult.totalHeight + footerHeight + PADDING;

    var canvas = document.createElement("canvas");
    var scale = Math.min(2, global.devicePixelRatio || 1);
    canvas.width = Math.round(WIDTH * scale);
    canvas.height = Math.round(totalHeight * scale);
    var ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, WIDTH, totalHeight);
    ctx.textBaseline = "top";

    layoutResult.items.forEach(function (item) {
      ctx.font = item.font;
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, PADDING + item.x, PADDING + item.y);
    });

    var footerY = PADDING + layoutResult.totalHeight + 18;
    ctx.strokeStyle = COLORS.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, footerY - 10);
    ctx.lineTo(WIDTH - PADDING, footerY - 10);
    ctx.stroke();

    ctx.font = buildFontString(13, "700");
    ctx.fillStyle = COLORS.brand;
    ctx.fillText("C2KOR", PADDING, footerY);

    var dataUrl = canvas.toDataURL("image/png");
    var lang = (function () {
      try { return localStorage.getItem("sfw_lang") || "en"; } catch (e) { return "en"; }
    })();
    var slug = opts.slug || "c2kor-page";

    var link = document.createElement("a");
    link.href = dataUrl;
    link.download = "c2kor-" + slug + "-" + lang + ".png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  global.SFWSaveImage = { capture: capture };
})(window);
