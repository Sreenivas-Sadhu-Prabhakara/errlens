/* ============================================================
   errlens — paste an error, get a plain-English diagnosis.

   No network. No dependencies. Everything runs in your browser.
   The corpus lives in data.js (window.ERRLENS_CORPUS).

   Pipeline:
     1. Parse the pasted text for a stack-trace shape: the error
        class/type on top, and the first "your code" frame.
     2. Score every corpus entry by its most specific matching
        signature (specificity = the entry's highest matched weight,
        with small bonuses for extra matches and the detected class).
     3. Show the ranked matches. If nothing matches, fall back to a
        keyword heuristic that gives honest, clearly-general guidance
        rather than crashing or pretending.
   ============================================================ */
(function () {
  "use strict";

  var CORPUS = (window.ERRLENS_CORPUS || []);

  /* ---------- tiny DOM helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ============================================================
     STACK-TRACE / ERROR-CLASS PARSING
     Pull out the error "class" (e.g. TypeError, NullPointerException,
     ModuleNotFoundError) and the top user-code frame, across the
     common trace shapes. Everything is best-effort and defensive.
     ============================================================ */

  // Known error-class shapes we can recognise across languages.
  var CLASS_PATTERNS = [
    // JS / TS: "TypeError: ...", "ReferenceError: ..."
    /\b([A-Z][A-Za-z]*Error)\b\s*:/,
    // Java / Go / general dotted: "java.lang.NullPointerException"
    /\b((?:[a-z_][\w]*\.)+[A-Z][A-Za-z0-9_]*(?:Exception|Error))\b/,
    // Python bare class before colon at line start: "KeyError: 'x'"
    /(?:^|\n)\s*([A-Z][A-Za-z0-9_]*(?:Error|Exception|Warning))\s*:/,
    // Java exception without package: "NullPointerException: ..."
    /\b([A-Z][A-Za-z0-9_]*Exception)\b/
  ];

  function detectErrorClass(text) {
    for (var i = 0; i < CLASS_PATTERNS.length; i++) {
      var m = text.match(CLASS_PATTERNS[i]);
      if (m && m[1]) {
        // Return the short name (last dotted segment) plus the full match.
        var full = m[1];
        var short = full.indexOf(".") !== -1 ? full.split(".").pop() : full;
        return { full: full, short: short };
      }
    }
    return null;
  }

  // Try to surface the top "frame" line that looks like a location.
  var FRAME_PATTERNS = [
    /at\s+.+\((.+?:\d+(?::\d+)?)\)/,        // JS/Java: at foo (file.js:10:5)
    /at\s+(.+?:\d+(?::\d+)?)/,              // JS: at file.js:10:5
    /File "(.+?)", line (\d+)/,             // Python: File "x.py", line 10
    /^\s+(.+?\.go:\d+)/m,                   // Go: main.go:10
    /-->\s+(.+?:\d+:\d+)/,                  // Rust: --> src/main.rs:10:5
    /(?:^|\n)\s*(?:File |at )?(\S+\.\w+:\d+)/ // generic path:line
  ];

  function detectTopFrame(text) {
    for (var i = 0; i < FRAME_PATTERNS.length; i++) {
      var m = text.match(FRAME_PATTERNS[i]);
      if (m) {
        if (m[2]) return m[1] + ":" + m[2];   // Python "file" + "line"
        return m[1];
      }
    }
    return null;
  }

  /* ============================================================
     MATCHING
     Score each entry. An entry's score is dominated by the single
     most specific signature that matched (its weight), so a
     distinctive substring outranks a vague keyword. Extra matches
     and a matching detected error-class add small bonuses.
     ============================================================ */
  function scoreEntry(entry, text, klass) {
    var best = 0;         // highest single-signature weight that matched
    var matches = 0;      // how many signatures matched
    var matchedSig = null;
    for (var i = 0; i < entry.sig.length; i++) {
      var s = entry.sig[i];
      var re = s.re;
      if (re.test(text)) {
        matches++;
        if (s.weight > best) { best = s.weight; matchedSig = re; }
      }
    }
    if (best === 0) return null;   // no signature matched at all

    // Score: dominated by specificity, nudged by corroborating matches.
    var score = best + (matches - 1) * 0.4;

    // Bonus if the pasted error-class name appears in the entry's tags
    // or title (helps the right language win when text is short).
    if (klass) {
      var kl = klass.short.toLowerCase();
      var inTags = (entry.tags || []).some(function (t) { return t.toLowerCase() === kl; });
      var inTitle = entry.title.toLowerCase().indexOf(kl) !== -1;
      if (inTags || inTitle) score += 0.6;
    }
    return { entry: entry, score: score, best: best, matches: matches, matchedSig: matchedSig };
  }

  function rankMatches(text) {
    var klass = detectErrorClass(text);
    var scored = [];
    for (var i = 0; i < CORPUS.length; i++) {
      var r = scoreEntry(CORPUS[i], text, klass);
      if (r) scored.push(r);
    }
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.best !== a.best) return b.best - a.best;
      return a.entry.id.localeCompare(b.entry.id); // stable, deterministic
    });
    return { klass: klass, frame: detectTopFrame(text), matches: scored };
  }

  /* ============================================================
     HEURISTIC FALLBACK
     When nothing in the corpus matches, look for well-known signal
     words and return honest, clearly-labelled general guidance.
     This never throws — worst case it returns a generic tip.
     ============================================================ */
  var HEURISTICS = [
    {
      test: /timeout|timed out|ETIMEDOUT|deadline exceeded/i,
      title: "A timeout / slow response",
      note: "Something took too long to respond. Check that the service you're calling is reachable and healthy, look for a slow query or endpoint, and consider whether the timeout value is too short."
    },
    {
      test: /out of memory|OOM|heap|allocation failed|ENOMEM|Killed/i,
      title: "Running out of memory",
      note: "The process likely exhausted available memory. Look for large data held in memory, an unbounded loop or cache, or a leak; try smaller inputs and monitor memory to find the growth."
    },
    {
      test: /deprecat/i,
      title: "A deprecation warning",
      note: "Something you're using is deprecated — it still works for now but is scheduled to be removed. Find the recommended replacement in the library's changelog and migrate before it's dropped."
    },
    {
      test: /certificate|SSL|TLS|self[- ]signed|CERT_|unable to verify/i,
      title: "A TLS / certificate problem",
      note: "The secure connection failed to verify. Check the certificate is valid and not expired, that the hostname matches, and that any custom or self-signed CA is trusted by your client."
    },
    {
      test: /connection reset|ECONNRESET|broken pipe|EPIPE/i,
      title: "The connection dropped mid-way",
      note: "The other side closed the connection unexpectedly. Check the server didn't crash or restart, look for timeouts/limits, and add retries with backoff for transient drops."
    },
    {
      test: /disk|ENOSPC|no space left/i,
      title: "Out of disk space",
      note: "The device is full. Free up space, check for runaway log files, and confirm the target volume actually has room."
    },
    {
      test: /encoding|UnicodeDecodeError|codec can't decode|charmap/i,
      title: "A text encoding problem",
      note: "Bytes couldn't be decoded as the expected text encoding. Open/read the data with the correct encoding (often utf-8), or handle bytes vs. text explicitly."
    }
  ];

  function heuristicFor(text) {
    for (var i = 0; i < HEURISTICS.length; i++) {
      if (HEURISTICS[i].test.test(text)) return HEURISTICS[i];
    }
    return null;
  }

  /* ============================================================
     DIAGNOSE — the pure top-level function.
     Returns a structured result; never throws for string input.
       { kind: "empty" }                       (no usable input)
       { kind: "match", klass, frame, primary, others }
       { kind: "heuristic", klass, frame, hint }
       { kind: "none", klass, frame }
     ============================================================ */
  function diagnose(text) {
    if (typeof text !== "string" || !text.trim()) return { kind: "empty" };
    var ranked = rankMatches(text);
    if (ranked.matches.length) {
      return {
        kind: "match",
        klass: ranked.klass,
        frame: ranked.frame,
        primary: ranked.matches[0],
        others: ranked.matches.slice(1, 4)
      };
    }
    var h = heuristicFor(text);
    if (h) {
      return { kind: "heuristic", klass: ranked.klass, frame: ranked.frame, hint: h };
    }
    return { kind: "none", klass: ranked.klass, frame: ranked.frame };
  }

  // Expose for optional debugging (still no network; pure function).
  window.errlens = { diagnose: diagnose, detectErrorClass: detectErrorClass, detectTopFrame: detectTopFrame };

  /* ============================================================
     RENDERING
     ============================================================ */
  var input, resultsEl, metaEl, emptyEl, clearBtn, sampleBtn, liveRegion, countEl;

  function langChip(lang) {
    var c = el("span", "chip chip--lang", lang);
    return c;
  }

  function list(items, cls) {
    var ul = el("ul", cls);
    (items || []).forEach(function (t) { ul.appendChild(el("li", null, t)); });
    return ul;
  }

  // Build the detail card for one matched corpus entry.
  function entryCard(entry, opts) {
    opts = opts || {};
    var card = el("article", "diag" + (opts.primary ? " diag--primary" : ""));

    var head = el("header", "diag__head");
    var titleWrap = el("div", "diag__titlewrap");
    if (opts.primary) titleWrap.appendChild(el("span", "diag__badge", "Most likely"));
    titleWrap.appendChild(el("h3", "diag__title", entry.title));
    head.appendChild(titleWrap);
    head.appendChild(langChip(entry.lang));
    card.appendChild(head);

    var meaning = el("p", "diag__meaning", entry.meaning);
    card.appendChild(meaning);

    if (opts.primary) {
      var body = el("div", "diag__body");

      var causes = el("section", "block block--causes");
      causes.appendChild(el("h4", "block__label", "Most likely cause" + (entry.causes.length > 1 ? "s" : "")));
      causes.appendChild(list(entry.causes, "block__list block__list--causes"));
      body.appendChild(causes);

      var fixes = el("section", "block block--fixes");
      fixes.appendChild(el("h4", "block__label", "How to fix it"));
      fixes.appendChild(list(entry.fixes, "block__list block__list--fixes"));
      body.appendChild(fixes);

      card.appendChild(body);

      if (entry.tags && entry.tags.length) {
        var tags = el("div", "tags");
        entry.tags.forEach(function (t) { tags.appendChild(el("span", "chip chip--tag", t)); });
        card.appendChild(tags);
      }
    } else {
      // compact "also possible" row is a button that promotes to primary
      var btn = el("button", "diag__promote");
      btn.type = "button";
      btn.textContent = "Show fix";
      btn.setAttribute("aria-label", "Show the full diagnosis for: " + entry.title);
      btn.addEventListener("click", function () { promote(entry.id); });
      card.appendChild(btn);
    }
    return card;
  }

  // Render the parsed meta strip (error class + top frame).
  function renderMeta(result) {
    metaEl.innerHTML = "";
    var bits = [];
    if (result.klass) {
      var k = el("span", "meta__item");
      k.appendChild(el("span", "meta__key", "Error type"));
      k.appendChild(el("code", "meta__val", result.klass.full));
      bits.push(k);
    }
    if (result.frame) {
      var f = el("span", "meta__item");
      f.appendChild(el("span", "meta__key", "Top frame"));
      f.appendChild(el("code", "meta__val", result.frame));
      bits.push(f);
    }
    if (!bits.length) { metaEl.hidden = true; return; }
    metaEl.hidden = false;
    bits.forEach(function (b) { metaEl.appendChild(b); });
  }

  var lastResult = null;   // keep the last ranked result so "promote" works

  function promote(id) {
    if (!lastResult || lastResult.kind !== "match") return;
    // Reorder so the chosen entry becomes primary.
    var all = [lastResult.primary].concat(lastResult.others);
    var chosen = null, rest = [];
    all.forEach(function (m) { if (m.entry.id === id) chosen = m; else rest.push(m); });
    if (!chosen) return;
    lastResult.primary = chosen;
    lastResult.others = rest;
    paint(lastResult);
    // move focus to the now-primary card for keyboard users
    var pc = $(".diag--primary");
    if (pc) pc.setAttribute("tabindex", "-1"), pc.focus();
  }

  function announce(msg) {
    if (liveRegion) liveRegion.textContent = msg;
  }

  function paint(result) {
    resultsEl.innerHTML = "";
    lastResult = result;

    if (result.kind === "empty") {
      emptyEl.hidden = false;
      resultsEl.hidden = true;
      metaEl.hidden = true;
      countEl.textContent = "";
      announce("");
      return;
    }
    emptyEl.hidden = true;
    resultsEl.hidden = false;
    renderMeta(result);

    if (result.kind === "match") {
      countEl.textContent = result.others.length
        ? (result.others.length + 1) + " matches"
        : "1 match";
      resultsEl.appendChild(entryCard(result.primary.entry, { primary: true }));

      if (result.others.length) {
        var also = el("section", "also");
        also.appendChild(el("h4", "also__label", "Other possibilities"));
        var grid = el("div", "also__grid");
        result.others.forEach(function (m) { grid.appendChild(entryCard(m.entry, { primary: false })); });
        also.appendChild(grid);
        resultsEl.appendChild(also);
      }
      announce("Top match: " + result.primary.entry.title + ", " + result.primary.entry.lang + ".");
      return;
    }

    if (result.kind === "heuristic") {
      countEl.textContent = "general guidance";
      resultsEl.appendChild(heuristicCard(result.hint));
      announce("No exact match. General guidance: " + result.hint.title + ".");
      return;
    }

    // kind === "none"
    countEl.textContent = "no match";
    resultsEl.appendChild(noMatchCard(result));
    announce("No match found in the library for that message.");
  }

  function heuristicCard(hint) {
    var card = el("article", "diag diag--primary diag--heuristic");
    var head = el("header", "diag__head");
    var tw = el("div", "diag__titlewrap");
    tw.appendChild(el("span", "diag__badge diag__badge--soft", "General guidance"));
    tw.appendChild(el("h3", "diag__title", hint.title));
    head.appendChild(tw);
    card.appendChild(head);
    card.appendChild(el("p", "diag__meaning", hint.note));
    var caveat = el("p", "diag__caveat",
      "This isn't an exact match from the library — it's a general pointer based on keywords in your message. Treat it as a starting direction, and search the exact error text plus your language for specifics.");
    card.appendChild(caveat);
    return card;
  }

  function noMatchCard(result) {
    var card = el("article", "diag diag--primary diag--none");
    var head = el("header", "diag__head");
    var tw = el("div", "diag__titlewrap");
    tw.appendChild(el("span", "diag__badge diag__badge--soft", "No match"));
    tw.appendChild(el("h3", "diag__title", "No exact match in the library"));
    head.appendChild(tw);
    card.appendChild(head);
    card.appendChild(el("p", "diag__meaning",
      "errlens didn't recognise this specific message. That's expected — the library covers common errors, not every one."));
    var tips = el("ul", "block__list block__list--fixes");
    [
      result.klass
        ? ("Search the exact error type (" + result.klass.full + ") together with your language or framework.")
        : "Search the exact error text in quotes, plus your language or framework.",
      "Read the top of the stack trace — the first line in YOUR code is usually where to look.",
      "Reproduce with the smallest input that still fails, then change one thing at a time.",
      "Check recent changes: what did you edit, install, or upgrade just before it broke?"
    ].forEach(function (t) { tips.appendChild(el("li", null, t)); });
    card.appendChild(tips);
    return card;
  }

  /* ============================================================
     INPUT HANDLING (debounced, purely local)
     ============================================================ */
  var debounceTimer = null;
  function onInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    var val = input.value;
    debounceTimer = setTimeout(function () {
      paint(diagnose(val));
    }, 140);
    clearBtn.hidden = !val;
  }

  var SAMPLE = [
    "Uncaught TypeError: Cannot read properties of undefined (reading 'name')",
    "    at renderUser (app.js:42:17)",
    "    at app.js:88:3"
  ].join("\n");

  function loadSample() {
    input.value = SAMPLE;
    clearBtn.hidden = false;
    paint(diagnose(input.value));
    input.focus();
  }

  function clearAll() {
    input.value = "";
    clearBtn.hidden = true;
    paint(diagnose(""));
    input.focus();
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    input = $("#errorInput");
    resultsEl = $("#results");
    metaEl = $("#meta");
    emptyEl = $("#emptyState");
    clearBtn = $("#clearBtn");
    sampleBtn = $("#sampleBtn");
    liveRegion = $("#live");
    countEl = $("#resultCount");

    input.addEventListener("input", onInput);
    clearBtn.addEventListener("click", clearAll);
    sampleBtn.addEventListener("click", loadSample);

    // Ctrl/Cmd+Enter re-runs (useful if you paste then edit).
    input.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        paint(diagnose(input.value));
      }
    });

    // Reflect the corpus size honestly in the footer counter.
    var cc = $("#corpusCount");
    if (cc) cc.textContent = String(CORPUS.length);

    paint(diagnose(input.value || ""));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
