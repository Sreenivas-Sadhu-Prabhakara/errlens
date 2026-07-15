/* ============================================================
   errlens — the error corpus.

   A curated, hand-written set of real, common programming errors.
   No network, no generation: every entry below is a fixed fact.

   Each entry:
     id        unique slug
     lang      display language / runtime (JavaScript, Python, Java, Go,
               Rust, Shell, HTTP, npm, Git, TypeScript)
     sig       an array of matchers. Each is { re, weight } where `re` is a
               RegExp (matched case-insensitively unless the flag is baked in)
               and `weight` is how *specific* the match is (higher = more
               distinctive, so it outranks vague keyword hits).
     title     short plain-English name for the error
     meaning   one or two sentences: what the message actually says
     causes    array of the most likely reasons, most common first
     fixes     array of concrete, checkable steps ("do X, then Y")
     tags      short keywords for the chip row

   Matching philosophy: prefer the entry whose most specific signature
   matched. A distinctive substring like "ECONNREFUSED" (weight 10) must
   beat a generic word like "undefined" (weight 2). Never invent a fix we
   are unsure of — fixes are phrased as concrete things to check.
   ============================================================ */

window.ERRLENS_CORPUS = [
  /* ---------------- JavaScript (browser + Node) ---------------- */
  {
    id: "js-undefined-reading",
    lang: "JavaScript",
    sig: [
      { re: /Cannot read propert(?:y|ies)(?: (?:'[^']*'|"[^"]*"|\S+))? of undefined/i, weight: 10 },
      { re: /Cannot read propert(?:y|ies) .* of undefined/i, weight: 8 },
      { re: /undefined is not an object \(evaluating/i, weight: 9 }
    ],
    title: "Reading a property of undefined",
    meaning: "You tried to read a field (like .name or [0]) on a value that is undefined — the variable or object you expected simply isn't there yet.",
    causes: [
      "A variable was never assigned, or a function returned undefined.",
      "Data hasn't loaded yet (async result read before it arrived).",
      "A typo in the property or variable name.",
      "An array/object index that doesn't exist (e.g. arr[5] on a 3-item array)."
    ],
    fixes: [
      "Log the value just before the failing line to see what is actually undefined.",
      "Guard the access with optional chaining: obj?.prop or arr?.[0].",
      "Provide a default: const { name } = data || {}.",
      "If it's async, make sure you await the value (or read it inside .then / after the state updates)."
    ],
    tags: ["undefined", "TypeError", "null-safety", "browser", "node"]
  },
  {
    id: "js-null-reading",
    lang: "JavaScript",
    sig: [
      { re: /Cannot read propert(?:y|ies)(?: (?:'[^']*'|"[^"]*"|\S+))? of null/i, weight: 10 },
      { re: /null is not an object \(evaluating/i, weight: 9 }
    ],
    title: "Reading a property of null",
    meaning: "You accessed a property on null. In the browser this most often means a DOM element you looked up wasn't found (document.getElementById returned null).",
    causes: [
      "getElementById / querySelector returned null because the element doesn't exist or the id/selector is wrong.",
      "The script ran before the element existed in the DOM.",
      "A value that can legitimately be null wasn't checked first."
    ],
    fixes: [
      "Confirm the selector matches: check spelling, '#id' vs '.class', and that the element is on the page.",
      "Run your script after the DOM is ready: put <script defer>, or move it to the end of <body>, or use DOMContentLoaded.",
      "Guard it: const el = document.querySelector('#x'); if (el) { ... }."
    ],
    tags: ["null", "DOM", "TypeError", "browser"]
  },
  {
    id: "js-not-a-function",
    lang: "JavaScript",
    sig: [
      { re: /(\S+) is not a function/i, weight: 8 },
      { re: /is not a function/i, weight: 6 }
    ],
    title: "Calling something that isn't a function",
    meaning: "You put () after a value that isn't callable — it might be undefined, a number, an object, or a method that doesn't exist on that type.",
    causes: [
      "Typo in the method name, or the method doesn't exist on that object.",
      "The import/require returned something other than the function you expected (e.g. default vs named export).",
      "A variable was reassigned to a non-function value.",
      "Calling an array method on something that isn't an array."
    ],
    fixes: [
      "console.log the thing you're calling and its typeof right before the call.",
      "Check the import style: `import x from` (default) vs `import { x } from` (named).",
      "Verify the method spelling and that it exists for that type (e.g. .map is on arrays, not objects).",
      "If it comes from a library, check the version — the API may have changed."
    ],
    tags: ["TypeError", "function", "import", "node", "browser"]
  },
  {
    id: "js-unexpected-token-json",
    lang: "JavaScript",
    sig: [
      { re: /Unexpected token .* in JSON at position/i, weight: 10 },
      { re: /Unexpected end of JSON input/i, weight: 10 },
      { re: /is not valid JSON/i, weight: 9 },
      { re: /JSON\.parse/i, weight: 5 }
    ],
    title: "Invalid JSON while parsing",
    meaning: "JSON.parse received text that isn't valid JSON. Very often the text is actually an HTML error page, an empty string, or a JS object literal — not JSON.",
    causes: [
      "The response was HTML (a 404/500 page or login redirect), not JSON.",
      "The string is empty or was truncated.",
      "Single quotes, trailing commas, or unquoted keys (valid JS, invalid JSON).",
      "You passed an already-parsed object to JSON.parse."
    ],
    fixes: [
      "Log the raw text before parsing to see what actually arrived.",
      "Check the HTTP status and Content-Type — if it's text/html you're parsing an error page.",
      "Wrap it: try { JSON.parse(t) } catch (e) { /* handle bad payload */ }.",
      "Make sure keys and strings use double quotes and there are no trailing commas."
    ],
    tags: ["JSON", "SyntaxError", "parse", "api"]
  },
  {
    id: "js-unexpected-token-generic",
    lang: "JavaScript",
    sig: [
      { re: /SyntaxError:\s*Unexpected token/i, weight: 6 },
      { re: /Unexpected end of input/i, weight: 7 },
      { re: /missing \) after argument list/i, weight: 9 },
      { re: /Unexpected identifier/i, weight: 6 }
    ],
    title: "JavaScript syntax error",
    meaning: "The parser hit something it couldn't understand at that point — usually a missing or extra bracket, brace, parenthesis, comma, or quote.",
    causes: [
      "A missing or unmatched ) } ] or closing quote.",
      "A stray or missing comma between items.",
      "Using a reserved word or a language feature the runtime doesn't support.",
      "Pasting code with smart-quotes (“ ”) instead of straight quotes."
    ],
    fixes: [
      "Jump to the reported line and column — the real fault is often just before it.",
      "Check that every ( { [ and quote has a matching close; a formatter/linter finds these fast.",
      "Replace any curly “smart quotes” with straight ' or \".",
      "Run the file through a linter (eslint) or your editor's syntax highlighting."
    ],
    tags: ["SyntaxError", "parser", "brackets"]
  },
  {
    id: "js-reference-not-defined",
    lang: "JavaScript",
    sig: [
      { re: /ReferenceError:\s*(\S+) is not defined/i, weight: 9 },
      { re: /(\S+) is not defined/i, weight: 7 }
    ],
    title: "Using a name that doesn't exist",
    meaning: "You referenced a variable or function that hasn't been declared in scope. The name is unknown at that point in the code.",
    causes: [
      "A typo in the variable/function name.",
      "The variable is declared in a different scope or file that isn't loaded.",
      "A script that defines it hasn't run yet, or failed to load.",
      "Using a Node global in the browser (or vice-versa), e.g. `require`, `process`, `window`."
    ],
    fixes: [
      "Check the spelling and capitalisation against where it's declared.",
      "Make sure the declaring script/module is loaded before this one runs.",
      "If it's from a module, add the correct import/require statement.",
      "Confirm you're in the right environment (browser vs Node) for that global."
    ],
    tags: ["ReferenceError", "scope", "import", "typo"]
  },
  {
    id: "js-assignment-to-constant",
    lang: "JavaScript",
    sig: [
      { re: /Assignment to constant variable/i, weight: 10 },
      { re: /invalid assignment to const/i, weight: 9 }
    ],
    title: "Reassigning a const",
    meaning: "You tried to assign a new value to a variable declared with const. A const binding can't be reassigned after it's set.",
    causes: [
      "You meant to update the variable but declared it with const instead of let.",
      "Reassigning in a loop where the variable should be let."
    ],
    fixes: [
      "Change const to let if the variable genuinely needs to change.",
      "If it's an object/array, note you CAN mutate its contents (push, obj.x = 1) — you just can't rebind the variable itself."
    ],
    tags: ["TypeError", "const", "let", "assignment"]
  },
  {
    id: "js-maximum-call-stack",
    lang: "JavaScript",
    sig: [
      { re: /Maximum call stack size exceeded/i, weight: 10 },
      { re: /too much recursion/i, weight: 9 },
      { re: /call stack/i, weight: 4 }
    ],
    title: "Stack overflow (runaway recursion)",
    meaning: "A function kept calling itself (directly or indirectly) without ever stopping, so the call stack filled up.",
    causes: [
      "A recursive function with a missing or wrong base case.",
      "Two functions that call each other in a loop.",
      "A getter/setter or toJSON that references itself.",
      "An event handler that triggers the same event again."
    ],
    fixes: [
      "Add or fix the base case so the recursion actually terminates.",
      "Log the arguments each call to confirm they move toward the base case.",
      "For deep-but-valid recursion, rewrite it as an iterative loop.",
      "Break event feedback loops (don't dispatch the same event you're handling)."
    ],
    tags: ["RangeError", "recursion", "stack-overflow"]
  },
  {
    id: "js-cors",
    lang: "JavaScript",
    sig: [
      { re: /has been blocked by CORS policy/i, weight: 10 },
      { re: /No 'Access-Control-Allow-Origin' header/i, weight: 10 },
      { re: /Cross-Origin Request Blocked/i, weight: 10 },
      { re: /\bCORS\b/, weight: 6 }
    ],
    title: "Request blocked by CORS",
    meaning: "The browser blocked a cross-origin request because the server didn't return the Access-Control-Allow-Origin header allowing your page's origin. This is a browser security rule, not a bug in your fetch.",
    causes: [
      "The API server doesn't send CORS headers for your origin.",
      "A preflight (OPTIONS) request isn't handled by the server.",
      "You're calling an API from the browser that was meant to be called server-side.",
      "http vs https or a different port makes it a different origin."
    ],
    fixes: [
      "Fix it on the SERVER: add Access-Control-Allow-Origin (and handle OPTIONS) for your origin.",
      "If you don't control the API, proxy the request through your own backend.",
      "For local dev, use a dev-server proxy (e.g. Vite/webpack proxy) instead of calling the API directly.",
      "Never rely on disabling browser security — it won't work for your users."
    ],
    tags: ["CORS", "fetch", "browser", "http", "security"]
  },
  {
    id: "node-econnrefused",
    lang: "Node.js",
    sig: [
      { re: /ECONNREFUSED/, weight: 10 },
      { re: /connect ECONNREFUSED/i, weight: 10 }
    ],
    title: "Connection refused (ECONNREFUSED)",
    meaning: "Your code tried to open a TCP connection and nothing was listening at that host:port, so the OS refused it. The target server isn't up, or you're pointing at the wrong address.",
    causes: [
      "The server/database you're connecting to isn't running.",
      "Wrong host or port (e.g. 5432 vs 3306, localhost vs a container name).",
      "A firewall or Docker network is blocking the port.",
      "The service is still starting up and isn't listening yet."
    ],
    fixes: [
      "Confirm the target is running and listening: e.g. `lsof -i :PORT` or the service's status command.",
      "Double-check host and port in your connection string / config.",
      "Inside Docker, use the service name (not localhost) and make sure the port is exposed.",
      "Add a retry/backoff if the dependency may still be booting."
    ],
    tags: ["ECONNREFUSED", "network", "node", "database", "port"]
  },
  {
    id: "node-module-not-found",
    lang: "Node.js",
    sig: [
      { re: /Cannot find module ['"]([^'"]+)['"]/i, weight: 10 },
      { re: /Error: Cannot find module/i, weight: 9 },
      { re: /MODULE_NOT_FOUND/, weight: 9 }
    ],
    title: "Cannot find module",
    meaning: "Node tried to resolve a require/import and couldn't find it — either an npm package that isn't installed, or a relative file path that's wrong.",
    causes: [
      "The package isn't installed (no node_modules, or it's missing from dependencies).",
      "A wrong relative path or missing file extension.",
      "Case mismatch in the path (matters on Linux, not always on macOS).",
      "You're running from the wrong working directory."
    ],
    fixes: [
      "If it's a package: run `npm install`, or `npm install <name>` to add it.",
      "If it's a relative path: check the ./ prefix, the exact filename, and the extension.",
      "Match the case of the filename exactly.",
      "Delete node_modules and package-lock.json, then `npm install` if things look corrupted."
    ],
    tags: ["MODULE_NOT_FOUND", "require", "import", "npm", "node"]
  },
  {
    id: "node-err-require-esm",
    lang: "Node.js",
    sig: [
      { re: /ERR_REQUIRE_ESM/, weight: 10 },
      { re: /require\(\) of ES Module/i, weight: 10 },
      { re: /Cannot use import statement outside a module/i, weight: 10 }
    ],
    title: "ESM / CommonJS module mismatch",
    meaning: "You mixed the two JavaScript module systems: either require()d a package that's ES-modules-only, or used `import` in a file Node is treating as CommonJS.",
    causes: [
      "A dependency is now ESM-only and can't be require()d.",
      "Using `import` without \"type\": \"module\" in package.json (or a .mjs extension).",
      "A build/tooling config that transpiles inconsistently."
    ],
    fixes: [
      "To use import syntax, add \"type\": \"module\" to package.json, or name the file .mjs.",
      "To keep CommonJS, load ESM packages with dynamic import: `const pkg = await import('pkg')`.",
      "Check the package's docs for whether it ships ESM, CJS, or both.",
      "Keep one module system per file; don't mix require and import in the same file."
    ],
    tags: ["ESM", "CommonJS", "import", "require", "node"]
  },
  {
    id: "node-eaddrinuse",
    lang: "Node.js",
    sig: [
      { re: /EADDRINUSE/, weight: 10 },
      { re: /address already in use/i, weight: 9 }
    ],
    title: "Port already in use (EADDRINUSE)",
    meaning: "The port your server wants to listen on is already taken by another process — often a previous run of your own app that didn't shut down.",
    causes: [
      "A prior instance of the app is still running.",
      "Another program uses the same port.",
      "The process crashed but the OS hasn't released the socket yet."
    ],
    fixes: [
      "Find and stop the process on that port: `lsof -i :PORT` then `kill <pid>` (macOS/Linux).",
      "Change your app's port (e.g. via a PORT env var).",
      "On nodemon/dev servers, make sure old watchers were killed.",
      "Wait a few seconds if a socket is in TIME_WAIT, or set SO_REUSEADDR in server options."
    ],
    tags: ["EADDRINUSE", "port", "node", "server"]
  },
  {
    id: "node-unhandled-rejection",
    lang: "Node.js",
    sig: [
      { re: /UnhandledPromiseRejection/i, weight: 9 },
      { re: /Unhandled promise rejection/i, weight: 9 }
    ],
    title: "Unhandled promise rejection",
    meaning: "A Promise rejected (threw) and nothing caught it. The real error is whatever the promise rejected with — the underlying reason is shown alongside this warning.",
    causes: [
      "An async function threw and you didn't await it or .catch it.",
      "A missing try/catch around an await.",
      "A rejected promise deep in a chain with no .catch at the end."
    ],
    fixes: [
      "Look at the reason printed with the rejection — that's the actual error to fix.",
      "await the promise inside a try/catch, or add .catch(...) to the chain.",
      "Add a process-level handler to log them: process.on('unhandledRejection', ...).",
      "Make sure every async function's callers handle its rejection."
    ],
    tags: ["promise", "async", "rejection", "node"]
  },
  {
    id: "js-await-outside-async",
    lang: "JavaScript",
    sig: [
      { re: /await is only valid in async funct/i, weight: 10 },
      { re: /await is only valid in async/i, weight: 9 }
    ],
    title: "await used outside an async function",
    meaning: "You used await in a function that isn't marked async (or at a spot where top-level await isn't allowed).",
    causes: [
      "The enclosing function isn't declared async.",
      "Using top-level await in a CommonJS file or an environment that doesn't support it."
    ],
    fixes: [
      "Add async to the function: `async function f() { await ... }`.",
      "For top-level await, use an ES module (\"type\": \"module\" or .mjs).",
      "Or wrap it: (async () => { await ... })();."
    ],
    tags: ["async", "await", "SyntaxError"]
  },

  /* ---------------- TypeScript ---------------- */
  {
    id: "ts-not-assignable",
    lang: "TypeScript",
    sig: [
      { re: /Type '.*' is not assignable to type '.*'/i, weight: 10 },
      { re: /is not assignable to parameter of type/i, weight: 10 },
      { re: /\bTS2322\b/, weight: 9 },
      { re: /\bTS2345\b/, weight: 9 }
    ],
    title: "Type is not assignable",
    meaning: "The value's type doesn't match the type expected in that position — TypeScript is refusing the assignment or argument at compile time.",
    causes: [
      "A genuine type mismatch (e.g. string where a number is expected).",
      "A value that might be null/undefined assigned to a non-nullable type.",
      "An object missing a required property, or with an extra one.",
      "Union types that don't overlap the way you assumed."
    ],
    fixes: [
      "Read the whole message — TS points to exactly which property or member is incompatible.",
      "Fix the value's shape, or widen/narrow the target type to match reality.",
      "Handle null/undefined (guard, ?? default, or non-null assertion only when truly safe).",
      "Avoid `as any` to silence it — it hides the real mismatch."
    ],
    tags: ["TypeScript", "types", "TS2322", "TS2345", "compile"]
  },
  {
    id: "ts-property-does-not-exist",
    lang: "TypeScript",
    sig: [
      { re: /Property '.*' does not exist on type '.*'/i, weight: 10 },
      { re: /\bTS2339\b/, weight: 9 }
    ],
    title: "Property does not exist on type",
    meaning: "You accessed a property TypeScript doesn't know is on that type — either the type is wrong/too narrow, or the property name is misspelled.",
    causes: [
      "A typo in the property name.",
      "The variable's inferred type doesn't include that property (e.g. it's typed as `object` or a narrower union).",
      "Missing or wrong type definitions for a library.",
      "The value is really `any`/`unknown` and needs narrowing."
    ],
    fixes: [
      "Check the spelling against the actual type/interface.",
      "Give the value the correct type or interface so the property is declared.",
      "Install the library's @types package if the types are missing.",
      "Narrow unknown/union values with a type guard before accessing the property."
    ],
    tags: ["TypeScript", "TS2339", "types", "property"]
  },
  {
    id: "ts-possibly-null",
    lang: "TypeScript",
    sig: [
      { re: /Object is possibly 'null'/i, weight: 10 },
      { re: /Object is possibly 'undefined'/i, weight: 10 },
      { re: /\bTS2531\b/, weight: 9 },
      { re: /\bTS18047\b/, weight: 9 }
    ],
    title: "Object is possibly null/undefined",
    meaning: "Under strict null checks, TypeScript sees that this value could be null or undefined, so accessing it directly isn't safe.",
    causes: [
      "A DOM lookup or map access that can return null/undefined.",
      "An optional property or a value from a function that may return undefined.",
      "strictNullChecks is on (as it should be) and the value isn't guarded."
    ],
    fixes: [
      "Guard it: `if (x) { x.foo }` — TS narrows it inside the block.",
      "Use optional chaining and a default: `x?.foo ?? fallback`.",
      "Only use the non-null assertion `x!` when you're certain it can't be null there.",
      "Return early when the value is missing so the rest of the code sees a defined value."
    ],
    tags: ["TypeScript", "null", "strictNullChecks", "TS2531"]
  },

  /* ---------------- Python ---------------- */
  {
    id: "py-modulenotfound",
    lang: "Python",
    sig: [
      { re: /ModuleNotFoundError: No module named ['"]([^'"]+)['"]/i, weight: 10 },
      { re: /No module named ['"]?([^'"\s]+)['"]?/i, weight: 8 },
      { re: /ImportError/i, weight: 5 }
    ],
    title: "No module named …",
    meaning: "Python couldn't import a module. Either the package isn't installed in the interpreter you're running, or the module name/path is wrong.",
    causes: [
      "The package isn't installed in this environment.",
      "You're running a different Python/venv than the one where it's installed.",
      "The import name differs from the pip name (e.g. pip install pillow, import PIL).",
      "A local file/module isn't on the path, or shadows a real package."
    ],
    fixes: [
      "Install it in the RIGHT interpreter: `python -m pip install <package>` (use the same python you run).",
      "Activate the correct virtual environment first.",
      "Check the actual import name in the package's docs.",
      "Run `python -c \"import sys; print(sys.executable)\"` to confirm which Python you're using."
    ],
    tags: ["ModuleNotFoundError", "ImportError", "pip", "venv", "python"]
  },
  {
    id: "py-indentation",
    lang: "Python",
    sig: [
      { re: /IndentationError:/i, weight: 10 },
      { re: /TabError:/i, weight: 10 },
      { re: /unexpected indent/i, weight: 9 },
      { re: /expected an indented block/i, weight: 9 }
    ],
    title: "Indentation error",
    meaning: "Python uses indentation to define blocks, and the whitespace here is inconsistent or unexpected — often mixed tabs and spaces, or a block that isn't indented as required.",
    causes: [
      "Mixing tabs and spaces in the same block.",
      "A body (after if/for/def/:) that isn't indented, or is indented too far.",
      "Copy-pasted code with different indentation than the surrounding lines."
    ],
    fixes: [
      "Pick spaces (PEP 8: 4 spaces) and convert all tabs — most editors have 'convert indentation to spaces'.",
      "Make sure each block after a colon is indented one consistent level.",
      "Turn on 'show whitespace' in your editor to see the mismatch.",
      "Re-indent the offending block to match its siblings."
    ],
    tags: ["IndentationError", "TabError", "whitespace", "python"]
  },
  {
    id: "py-typeerror-nonetype",
    lang: "Python",
    sig: [
      { re: /'NoneType' object has no attribute ['"]([^'"]+)['"]/i, weight: 10 },
      { re: /'NoneType' object is not subscriptable/i, weight: 10 },
      { re: /'NoneType' object is not iterable/i, weight: 10 }
    ],
    title: "NoneType has no attribute / not subscriptable",
    meaning: "A value you expected to be an object (or list/dict) is actually None. Often a function returned None because it had no explicit return, or a lookup found nothing.",
    causes: [
      "A function that should return a value falls off the end (returns None implicitly).",
      "A dict.get() or search that found nothing returned None.",
      "You assigned the result of a method that mutates in place and returns None (e.g. list.sort()).",
      "An API/DB call returned None on failure."
    ],
    fixes: [
      "Print the value right before the failing line to confirm it's None.",
      "Make sure the function actually returns the value (add the missing `return`).",
      "Guard it: `if x is not None: x.foo()`.",
      "Remember in-place methods (list.sort, list.append) return None — call them, then use the original variable."
    ],
    tags: ["AttributeError", "NoneType", "TypeError", "python"]
  },
  {
    id: "py-keyerror",
    lang: "Python",
    sig: [
      { re: /KeyError:/i, weight: 10 }
    ],
    title: "KeyError (missing dict key)",
    meaning: "You looked up a key that isn't in the dictionary. The key printed after 'KeyError:' is the one that's missing.",
    causes: [
      "A typo in the key name, or wrong case.",
      "The key genuinely isn't present in this data.",
      "Expecting a field that the input/JSON didn't include."
    ],
    fixes: [
      "Use dict.get(key, default) when the key may be absent.",
      "Check membership first: `if key in d:`.",
      "Print d.keys() to see what's actually there.",
      "Validate incoming data before indexing into it."
    ],
    tags: ["KeyError", "dict", "python"]
  },
  {
    id: "py-indexerror",
    lang: "Python",
    sig: [
      { re: /IndexError: list index out of range/i, weight: 10 },
      { re: /IndexError:/i, weight: 8 }
    ],
    title: "List index out of range",
    meaning: "You indexed a list/sequence at a position that doesn't exist — the index is past the end (or the list is empty).",
    causes: [
      "An off-by-one error in a loop or index calculation.",
      "The list is shorter than you assumed (or empty).",
      "Using a length as an index (list has indices 0..len-1)."
    ],
    fixes: [
      "Check len(list) before indexing, or iterate with `for item in list`.",
      "Remember valid indices are 0 to len-1; use list[-1] for the last item.",
      "Handle the empty case explicitly.",
      "Print the index and len(list) at the failure point."
    ],
    tags: ["IndexError", "list", "off-by-one", "python"]
  },
  {
    id: "py-valueerror-int",
    lang: "Python",
    sig: [
      { re: /ValueError: invalid literal for int\(\) with base/i, weight: 10 },
      { re: /could not convert string to float/i, weight: 10 },
      { re: /ValueError:/i, weight: 5 }
    ],
    title: "Can't convert string to number",
    meaning: "int() or float() got a string that isn't a clean number — it may contain letters, spaces, symbols, or be empty.",
    causes: [
      "Extra whitespace, a currency symbol, commas, or a newline in the string.",
      "An empty string or a header row read as data.",
      "Locale formatting (e.g. '1,5' vs '1.5')."
    ],
    fixes: [
      "Strip and clean first: `int(s.strip())`, remove commas/symbols.",
      "Validate before converting, or wrap in try/except ValueError.",
      "Skip header/blank rows when parsing files.",
      "Print repr(s) to see hidden characters."
    ],
    tags: ["ValueError", "int", "float", "parsing", "python"]
  },
  {
    id: "py-unexpected-eof",
    lang: "Python",
    sig: [
      { re: /SyntaxError: unexpected EOF while parsing/i, weight: 10 },
      { re: /SyntaxError: invalid syntax/i, weight: 7 },
      { re: /SyntaxError: '(?:\(|\[|\{)' was never closed/i, weight: 10 }
    ],
    title: "Python syntax error",
    meaning: "The parser reached code it couldn't complete — commonly an unclosed bracket/quote, or a missing colon after if/for/def/class.",
    causes: [
      "An unclosed ( [ { or string quote.",
      "A missing colon at the end of a def/if/for/while/class line.",
      "A stray or missing comma.",
      "Python 2 syntax (e.g. `print x`) run under Python 3."
    ],
    fixes: [
      "Check the reported line and the one above it for an unclosed bracket or quote.",
      "Make sure compound statements end with a colon.",
      "Use an editor with bracket matching / syntax highlighting.",
      "Confirm you're running the intended Python version."
    ],
    tags: ["SyntaxError", "EOF", "parser", "python"]
  },
  {
    id: "py-recursion",
    lang: "Python",
    sig: [
      { re: /RecursionError: maximum recursion depth exceeded/i, weight: 10 },
      { re: /maximum recursion depth exceeded/i, weight: 9 }
    ],
    title: "Maximum recursion depth exceeded",
    meaning: "A function recursed deeper than Python's limit (default ~1000). Usually the base case is missing or wrong, so it never stops.",
    causes: [
      "A recursive function with no correct base case.",
      "Mutual recursion between two functions.",
      "A legitimately deep computation that exceeds the default limit."
    ],
    fixes: [
      "Add or fix the base case so recursion terminates.",
      "Convert deep recursion to an iterative loop or use an explicit stack.",
      "Only if truly needed, raise the limit with sys.setrecursionlimit (with caution).",
      "Print the arguments to confirm they move toward the base case."
    ],
    tags: ["RecursionError", "recursion", "python"]
  },
  {
    id: "py-unbound-local",
    lang: "Python",
    sig: [
      { re: /UnboundLocalError: (?:local variable|cannot access local variable)/i, weight: 10 },
      { re: /UnboundLocalError/i, weight: 9 }
    ],
    title: "Local variable referenced before assignment",
    meaning: "Inside a function you read a variable before it was assigned. Because you also assign to it somewhere in the function, Python treats it as local — so the outer/global value isn't used.",
    causes: [
      "Assigning to a name anywhere in a function makes it local for the whole function.",
      "You meant to use a global/outer variable but also assign to it.",
      "A branch that assigns the variable didn't run before it was read."
    ],
    fixes: [
      "Initialise the variable at the top of the function before any branch.",
      "If you truly mean the module-level variable, declare `global name` (or `nonlocal` for closures).",
      "Restructure so every path assigns the variable before it's read."
    ],
    tags: ["UnboundLocalError", "scope", "global", "python"]
  },
  {
    id: "py-import-circular",
    lang: "Python",
    sig: [
      { re: /ImportError: cannot import name ['"]([^'"]+)['"]/i, weight: 10 },
      { re: /most likely due to a circular import/i, weight: 10 }
    ],
    title: "Cannot import name (often circular import)",
    meaning: "Python couldn't import that specific name. A common cause is a circular import: module A imports B while B is still importing A, so the name isn't defined yet.",
    causes: [
      "Two modules import each other at the top level.",
      "The name is defined below the import that needs it.",
      "A typo, or the name isn't actually exported by that module."
    ],
    fixes: [
      "Break the cycle: import inside a function, or move shared code to a third module.",
      "Import the module (import mod) and reference mod.name lazily instead of `from mod import name`.",
      "Check the name really exists and is spelled correctly in the target module.",
      "Reorder definitions so the name exists before it's imported."
    ],
    tags: ["ImportError", "circular-import", "python"]
  },

  /* ---------------- Java ---------------- */
  {
    id: "java-npe",
    lang: "Java",
    sig: [
      { re: /java\.lang\.NullPointerException/i, weight: 10 },
      { re: /Cannot invoke ".*" because .* is null/i, weight: 10 },
      { re: /NullPointerException/i, weight: 8 }
    ],
    title: "NullPointerException",
    meaning: "You called a method or accessed a field on a reference that is null. Newer JVMs add a helpful message naming exactly which variable was null.",
    causes: [
      "A variable/field was never initialised (still null).",
      "A method returned null and you used it without checking.",
      "A map/list lookup returned null for a missing key.",
      "An uninjected dependency (e.g. a null @Autowired field)."
    ],
    fixes: [
      "Read the 'because ... is null' part of the message — it names the null reference.",
      "Add a null check, or use Optional to make absence explicit.",
      "Initialise fields, and return empty collections instead of null.",
      "For frameworks, confirm the dependency is actually injected/configured."
    ],
    tags: ["NullPointerException", "NPE", "null", "java"]
  },
  {
    id: "java-classnotfound",
    lang: "Java",
    sig: [
      { re: /java\.lang\.ClassNotFoundException/i, weight: 10 },
      { re: /java\.lang\.NoClassDefFoundError/i, weight: 10 },
      { re: /ClassNotFoundException/i, weight: 8 },
      { re: /NoClassDefFoundError/i, weight: 8 }
    ],
    title: "Class not found / NoClassDefFound",
    meaning: "The JVM couldn't load a class at runtime. ClassNotFoundException means it wasn't on the classpath; NoClassDefFoundError often means it was present at compile time but not at run time (or failed to initialise).",
    causes: [
      "A dependency JAR is missing from the runtime classpath.",
      "A version mismatch between compile-time and run-time libraries.",
      "A static initialiser threw (for NoClassDefFoundError on a class that exists).",
      "Wrong or shaded package name."
    ],
    fixes: [
      "Make sure the dependency is on the runtime classpath (check your build tool's scope, e.g. not 'provided').",
      "Rebuild cleanly so compile and runtime use the same versions.",
      "For NoClassDefFoundError, look for an earlier exception in a static initialiser.",
      "Verify the fully-qualified class name and that the JAR is actually included."
    ],
    tags: ["ClassNotFoundException", "NoClassDefFoundError", "classpath", "java"]
  },
  {
    id: "java-arrayindex",
    lang: "Java",
    sig: [
      { re: /java\.lang\.ArrayIndexOutOfBoundsException/i, weight: 10 },
      { re: /java\.lang\.IndexOutOfBoundsException/i, weight: 10 },
      { re: /ArrayIndexOutOfBoundsException/i, weight: 8 },
      { re: /StringIndexOutOfBoundsException/i, weight: 9 }
    ],
    title: "Index out of bounds",
    meaning: "You accessed an array, list, or string at an index that doesn't exist. The message usually shows the bad index and the length.",
    causes: [
      "An off-by-one error (looping to <= length instead of < length).",
      "Assuming a fixed size for data that's shorter or empty.",
      "Using length as an index (valid indices are 0..length-1)."
    ],
    fixes: [
      "Loop with `i < array.length` (strictly less than).",
      "Check the size/length before indexing; handle empty inputs.",
      "Use the enhanced for-loop (for (x : arr)) when you don't need the index.",
      "Print the index and length at the failure point."
    ],
    tags: ["ArrayIndexOutOfBoundsException", "off-by-one", "java"]
  },
  {
    id: "java-classcast",
    lang: "Java",
    sig: [
      { re: /java\.lang\.ClassCastException/i, weight: 10 },
      { re: /ClassCastException/i, weight: 8 },
      { re: /cannot be cast to/i, weight: 8 }
    ],
    title: "ClassCastException",
    meaning: "You cast an object to a type it isn't. The runtime type of the object doesn't match the type you tried to cast it to.",
    causes: [
      "Casting a value from a raw/generic collection to the wrong type.",
      "Assuming a subtype without checking.",
      "Deserialisation producing a different concrete type than expected."
    ],
    fixes: [
      "Check the type first: `if (obj instanceof Foo f) { ... }` (pattern matching).",
      "Use generics properly so casts aren't needed.",
      "Confirm what type the value actually is (log obj.getClass()).",
      "Fix the source so it produces the expected type."
    ],
    tags: ["ClassCastException", "generics", "cast", "java"]
  },
  {
    id: "java-numberformat",
    lang: "Java",
    sig: [
      { re: /java\.lang\.NumberFormatException/i, weight: 10 },
      { re: /NumberFormatException: For input string/i, weight: 10 }
    ],
    title: "NumberFormatException",
    meaning: "Integer.parseInt / Double.parseDouble (etc.) got a string that isn't a valid number. The 'For input string' part shows the offending value.",
    causes: [
      "Whitespace, letters, symbols, or an empty string in the input.",
      "Locale/format issues (commas, currency).",
      "Parsing a header or blank line as a number."
    ],
    fixes: [
      "Trim and validate the string before parsing.",
      "Wrap parsing in try/catch(NumberFormatException) and handle bad input.",
      "Strip non-numeric characters, or use a locale-aware parser.",
      "Log the exact input string to see what's wrong."
    ],
    tags: ["NumberFormatException", "parsing", "java"]
  },
  {
    id: "java-concurrent-mod",
    lang: "Java",
    sig: [
      { re: /java\.util\.ConcurrentModificationException/i, weight: 10 },
      { re: /ConcurrentModificationException/i, weight: 9 }
    ],
    title: "ConcurrentModificationException",
    meaning: "You modified a collection (add/remove) while iterating over it with a for-each loop or iterator, which the collection detects and rejects.",
    causes: [
      "Removing/adding items to a list inside a for-each over the same list.",
      "Modifying a collection from another thread during iteration."
    ],
    fixes: [
      "Use the iterator's own remove(): `Iterator it = ...; it.remove();`.",
      "Collect items to remove, then removeAll after the loop; or use removeIf(...).",
      "Iterate over a copy: `for (X x : new ArrayList<>(list))`.",
      "For multi-threaded access, use a concurrent collection or synchronise."
    ],
    tags: ["ConcurrentModificationException", "iterator", "collections", "java"]
  },

  /* ---------------- Go ---------------- */
  {
    id: "go-nil-pointer",
    lang: "Go",
    sig: [
      { re: /runtime error: invalid memory address or nil pointer dereference/i, weight: 10 },
      { re: /nil pointer dereference/i, weight: 9 },
      { re: /SIGSEGV/i, weight: 6 }
    ],
    title: "Nil pointer dereference",
    meaning: "Your Go program dereferenced a nil pointer (or called a method on a nil receiver / used a nil map or interface). The panic trace shows the exact line.",
    causes: [
      "Using a pointer that was never assigned (still nil).",
      "A function returned (nil, err) and you used the value without checking err.",
      "Accessing a struct field through a nil pointer.",
      "Calling a method on a nil interface value."
    ],
    fixes: [
      "Check errors before using returned values: `if err != nil { return err }`.",
      "Guard the pointer: `if p != nil { ... }`.",
      "Initialise maps with make() before writing to them.",
      "Read the panic stack trace — the top frame is the exact dereference."
    ],
    tags: ["nil", "pointer", "panic", "SIGSEGV", "go"]
  },
  {
    id: "go-index-range",
    lang: "Go",
    sig: [
      { re: /runtime error: index out of range/i, weight: 10 },
      { re: /index out of range \[\d+\] with length \d+/i, weight: 10 },
      { re: /slice bounds out of range/i, weight: 10 }
    ],
    title: "Index / slice out of range",
    meaning: "You indexed a slice or array beyond its length. The message shows the index and the length.",
    causes: [
      "An off-by-one error in a loop.",
      "Assuming a slice has elements when it's empty.",
      "A slice expression with bounds larger than the slice."
    ],
    fixes: [
      "Check len(s) before indexing; use `for i := range s` or `for _, v := range s`.",
      "Valid indices are 0..len-1; handle the empty case.",
      "For slicing, ensure low <= high <= len(s).",
      "The panic trace points at the exact line."
    ],
    tags: ["index-out-of-range", "slice", "panic", "go"]
  },
  {
    id: "go-declared-not-used",
    lang: "Go",
    sig: [
      { re: /declared (?:and|but) not used/i, weight: 10 },
      { re: /imported and not used/i, weight: 10 }
    ],
    title: "Declared/imported but not used",
    meaning: "Go refuses to compile if a variable or import is declared but never used. This is a compile error by design, to keep code clean.",
    causes: [
      "A leftover variable from refactoring.",
      "An import that's no longer needed.",
      "A variable assigned but never read."
    ],
    fixes: [
      "Remove the unused variable or import.",
      "If you need the side-effect of an import, use a blank import: `import _ \"pkg\"`.",
      "To intentionally ignore a value, assign it to `_`.",
      "Let `goimports`/`gofmt` clean up unused imports automatically."
    ],
    tags: ["compile", "unused", "imports", "go"]
  },
  {
    id: "go-assignment-mismatch",
    lang: "Go",
    sig: [
      { re: /assignment mismatch: \d+ variables? but .* returns \d+/i, weight: 10 },
      { re: /multiple-value .* in single-value context/i, weight: 10 },
      { re: /not enough (?:arguments|return values)/i, weight: 8 }
    ],
    title: "Assignment / return value mismatch",
    meaning: "The number of values on the left doesn't match what the function returns — very often you ignored the error return, or used a two-value function where one value is expected.",
    causes: [
      "A function returns (value, error) but you assigned only one variable.",
      "Using a multi-return call inside an expression that wants one value.",
      "Calling a function with the wrong number of arguments."
    ],
    fixes: [
      "Capture all returns: `v, err := f()` and handle err.",
      "If you must ignore one, use `_`: `v, _ := f()`.",
      "Don't nest a multi-value call inside another call that expects a single value.",
      "Match the function signature exactly."
    ],
    tags: ["compile", "return-values", "error-handling", "go"]
  },
  {
    id: "go-cannot-use-type",
    lang: "Go",
    sig: [
      { re: /cannot use .* \(.*type .*\) as .* value/i, weight: 10 },
      { re: /cannot use .* as .* in (?:argument|assignment)/i, weight: 9 },
      { re: /mismatched types/i, weight: 7 }
    ],
    title: "Type mismatch",
    meaning: "You used a value of one type where a different type is required. Go doesn't do implicit conversions, so the types must match or be explicitly converted.",
    causes: [
      "Passing an int where an int64/float64 is expected (or vice-versa).",
      "A value whose type doesn't implement the expected interface.",
      "Mixing named types with their underlying type."
    ],
    fixes: [
      "Convert explicitly: `int64(x)`, `float64(n)`, `string(b)` (mind the semantics).",
      "For interfaces, make sure the type implements all required methods.",
      "Align the declared types across the call.",
      "Read which type is expected vs. what you passed — the message states both."
    ],
    tags: ["compile", "types", "conversion", "go"]
  },

  /* ---------------- Rust ---------------- */
  {
    id: "rust-borrow-moved",
    lang: "Rust",
    sig: [
      { re: /borrow of moved value/i, weight: 10 },
      { re: /value (?:used|borrowed) here after move/i, weight: 10 },
      { re: /use of moved value/i, weight: 10 },
      { re: /\bE0382\b/, weight: 9 }
    ],
    title: "Use of moved value",
    meaning: "Ownership of the value moved elsewhere (e.g. passed by value or reassigned), so you can't use the original binding anymore. This is the borrow checker preventing use-after-move.",
    causes: [
      "Passing a non-Copy value to a function by value, then using it again.",
      "Assigning a value to a new binding and using the old one.",
      "Moving out of a variable inside a loop."
    ],
    fixes: [
      "Borrow instead of move: pass `&value` and take `&T` in the function.",
      "Clone if you genuinely need a second owned copy: `value.clone()`.",
      "For simple types, derive Copy so values are copied, not moved.",
      "Restructure so the value is used before it's moved."
    ],
    tags: ["ownership", "move", "borrow-checker", "E0382", "rust"]
  },
  {
    id: "rust-cannot-borrow-mutable",
    lang: "Rust",
    sig: [
      { re: /cannot borrow .* as mutable/i, weight: 10 },
      { re: /cannot borrow .* as mutable more than once/i, weight: 10 },
      { re: /\bE0499\b/, weight: 9 },
      { re: /\bE0502\b/, weight: 9 },
      { re: /\bE0596\b/, weight: 9 }
    ],
    title: "Cannot borrow as mutable",
    meaning: "The borrow checker won't allow this mutable borrow — either the binding isn't `mut`, or you already have another borrow (mutable, or a conflicting immutable one) alive at the same time.",
    causes: [
      "The variable was declared without `mut`.",
      "A mutable borrow overlaps another borrow (Rust allows only one mutable, or many immutable, at a time).",
      "Borrowing a field while the struct is otherwise borrowed."
    ],
    fixes: [
      "Add `mut`: `let mut x = ...`.",
      "Shorten borrow lifetimes: end one borrow (drop it / new scope) before starting another.",
      "Restructure so mutable and immutable borrows don't overlap.",
      "Consider interior mutability (RefCell) only when the design truly needs it."
    ],
    tags: ["borrow-checker", "mutable", "E0499", "E0502", "rust"]
  },
  {
    id: "rust-lifetime",
    lang: "Rust",
    sig: [
      { re: /does not live long enough/i, weight: 10 },
      { re: /borrowed value does not live long enough/i, weight: 10 },
      { re: /missing lifetime specifier/i, weight: 10 },
      { re: /\bE0106\b/, weight: 9 },
      { re: /\bE0597\b/, weight: 9 }
    ],
    title: "Lifetime error (value doesn't live long enough)",
    meaning: "A reference would outlive the data it points to, or the compiler can't infer how long a reference is valid. Rust rejects references that could dangle.",
    causes: [
      "Returning a reference to a local value that's dropped at the end of the function.",
      "Storing a reference that outlives its owner.",
      "A function signature that needs an explicit lifetime annotation."
    ],
    fixes: [
      "Return an owned value (String, Vec) instead of a reference to a local.",
      "Make sure the referenced data lives at least as long as the reference.",
      "Add lifetime parameters where the compiler asks (e.g. fn f<'a>(x: &'a T) -> &'a T).",
      "Move ownership into the struct/return rather than borrowing."
    ],
    tags: ["lifetimes", "borrow-checker", "E0106", "E0597", "rust"]
  },
  {
    id: "rust-unwrap-none",
    lang: "Rust",
    sig: [
      { re: /called ['`]Option::unwrap\(\)['`] on a ['`]None['`] value/i, weight: 10 },
      { re: /called ['`]Result::unwrap\(\)['`] on an ['`]Err['`] value/i, weight: 10 },
      { re: /thread '.*' panicked at/i, weight: 6 }
    ],
    title: "unwrap() on None / Err",
    meaning: "You called .unwrap() (or .expect()) on an Option that was None or a Result that was Err, which panics. The value you assumed was present wasn't.",
    causes: [
      "A lookup/parse/IO returned None or Err and you unwrapped it anyway.",
      "Assuming success without handling the failure path."
    ],
    fixes: [
      "Handle both cases with `match` or `if let Some(x) = ...`.",
      "Propagate errors with `?` instead of unwrapping in functions that return Result.",
      "Provide a default: `.unwrap_or(default)` / `.unwrap_or_else(...)`.",
      "Use `.expect(\"why this should exist\")` to at least get a clearer panic message."
    ],
    tags: ["Option", "Result", "unwrap", "panic", "rust"]
  },
  {
    id: "rust-mismatched-types",
    lang: "Rust",
    sig: [
      { re: /mismatched types/i, weight: 8 },
      { re: /expected .*, found .*/i, weight: 6 },
      { re: /\bE0308\b/, weight: 9 }
    ],
    title: "Mismatched types",
    meaning: "The compiler expected one type and found another at that spot. Rust's types are strict — no implicit numeric or reference conversions.",
    causes: [
      "Returning/passing a different type than declared.",
      "A reference vs. owned mismatch (&String vs String, or &T vs T).",
      "Integer type differences (i32 vs u64) or Result/Option wrapping."
    ],
    fixes: [
      "Read 'expected X, found Y' and convert or adjust to match.",
      "Add/remove & to fix reference vs. owned, or call .to_string()/.clone() as needed.",
      "Cast numbers explicitly with `as`, minding overflow/semantics.",
      "Wrap/unwrap Option/Result to line up the types (Ok(...), Some(...), ?)."
    ],
    tags: ["types", "E0308", "compile", "rust"]
  },

  /* ---------------- Shell / Bash ---------------- */
  {
    id: "sh-command-not-found",
    lang: "Shell",
    sig: [
      { re: /command not found/i, weight: 10 },
      { re: /: not found\b/i, weight: 6 }
    ],
    title: "command not found",
    meaning: "The shell couldn't find that command — it isn't installed, isn't on your PATH, or the name is mistyped.",
    causes: [
      "The program isn't installed.",
      "It's installed but its directory isn't on PATH.",
      "A typo in the command name.",
      "A script isn't executable or lacks a shebang, so it's run as a command."
    ],
    fixes: [
      "Check the spelling; try `which <cmd>` or `type <cmd>`.",
      "Install it with your package manager (brew/apt/etc.).",
      "Add its location to PATH (export PATH=\"$PATH:/path/to/bin\") in your shell profile.",
      "For your own script, run it as `./script.sh` and make it executable with `chmod +x`."
    ],
    tags: ["command-not-found", "PATH", "shell", "bash"]
  },
  {
    id: "sh-permission-denied",
    lang: "Shell",
    sig: [
      { re: /permission denied/i, weight: 9 },
      { re: /EACCES/, weight: 9 },
      { re: /Operation not permitted/i, weight: 8 }
    ],
    title: "Permission denied",
    meaning: "The OS refused the operation because your user doesn't have the required rights on that file, directory, or port — or the file isn't marked executable.",
    causes: [
      "The file/directory isn't readable/writable by your user.",
      "Trying to run a file that isn't executable.",
      "Binding to a privileged port (<1024) as a normal user.",
      "Writing to a system location that needs elevated rights."
    ],
    fixes: [
      "Check ownership/permissions: `ls -l`; adjust with chmod/chown as appropriate.",
      "Make a script executable: `chmod +x script.sh`.",
      "Avoid blanket sudo; fix the actual permission or use a directory you own.",
      "For ports <1024, use a higher port or a proper mechanism (reverse proxy, capabilities)."
    ],
    tags: ["permission-denied", "EACCES", "chmod", "shell"]
  },
  {
    id: "sh-no-such-file",
    lang: "Shell",
    sig: [
      { re: /No such file or directory/i, weight: 9 },
      { re: /ENOENT/, weight: 9 }
    ],
    title: "No such file or directory",
    meaning: "The path you referenced doesn't exist from where the command is running. Often a wrong working directory, a typo, or a relative path that doesn't resolve.",
    causes: [
      "A typo in the path or filename.",
      "A relative path interpreted from a different working directory than you expect.",
      "The file was moved/deleted, or never created.",
      "A missing parent directory when writing a file."
    ],
    fixes: [
      "Print the current directory (pwd) and list files (ls) to confirm what's there.",
      "Use an absolute path, or cd to the right place first.",
      "Create missing parent directories (mkdir -p) before writing.",
      "Check for hidden characters or case differences in the name."
    ],
    tags: ["ENOENT", "no-such-file", "path", "shell"]
  },
  {
    id: "sh-segfault",
    lang: "Shell",
    sig: [
      { re: /segmentation fault/i, weight: 10 },
      { re: /segfault/i, weight: 9 },
      { re: /core dumped/i, weight: 8 }
    ],
    title: "Segmentation fault",
    meaning: "A program tried to access memory it wasn't allowed to and was killed by the OS. This is a bug inside the program (often native C/C++), not usually the shell.",
    causes: [
      "Dereferencing a null/invalid pointer or reading past a buffer (in native code).",
      "A stack overflow from deep recursion.",
      "Incompatible or corrupted native libraries.",
      "A bug in the program or its dependencies."
    ],
    fixes: [
      "If it's your native code, run it under a debugger (gdb/lldb) or a memory tool (valgrind/ASan) to find the bad access.",
      "Update or reinstall the offending program and its libraries.",
      "Reduce input size to see if it's an overflow, and check for recursion depth.",
      "Search the exact program + version for known crash reports."
    ],
    tags: ["segfault", "SIGSEGV", "memory", "native"]
  },
  {
    id: "sh-syntax-error-token",
    lang: "Shell",
    sig: [
      { re: /syntax error near unexpected token/i, weight: 10 },
      { re: /unexpected end of file/i, weight: 8 },
      { re: /syntax error: unterminated quoted string/i, weight: 9 }
    ],
    title: "Shell syntax error",
    meaning: "Bash couldn't parse the script — commonly an unclosed quote, an unmatched if/fi or do/done, or CRLF line endings from a Windows editor.",
    causes: [
      "An unclosed quote or an unmatched bracket/keyword (if/fi, do/done, { }).",
      "Windows-style CRLF line endings in the script.",
      "A missing `;` or newline before `then`/`do`.",
      "Running a bash script under a different shell (sh vs bash)."
    ],
    fixes: [
      "Check the reported line for an unclosed quote or missing fi/done.",
      "Convert line endings to Unix (LF): `dos2unix script.sh` or your editor's setting.",
      "Make sure `then`/`do` are on a new line or after a `;`.",
      "Run with the intended interpreter, and validate with `bash -n script.sh`."
    ],
    tags: ["syntax-error", "bash", "quoting", "CRLF"]
  },

  /* ---------------- HTTP status codes ---------------- */
  {
    id: "http-400",
    lang: "HTTP",
    sig: [
      { re: /\b400\b.*\bBad Request\b/i, weight: 9 },
      { re: /HTTP\/\d(?:\.\d)?\s+400/i, weight: 9 },
      { re: /status(?:code)?[:\s]+400\b/i, weight: 8 },
      { re: /Bad Request/i, weight: 5 }
    ],
    title: "400 Bad Request",
    meaning: "The server rejected the request because it was malformed or invalid — bad syntax, missing/invalid parameters, or a body it couldn't understand.",
    causes: [
      "Malformed JSON or wrong Content-Type on the body.",
      "Missing required fields or invalid parameter values.",
      "A too-long URL/header, or bad encoding.",
      "Client-side validation the API enforces that your request violated."
    ],
    fixes: [
      "Read the response body — most APIs explain exactly what was wrong.",
      "Validate your JSON and set the correct Content-Type header.",
      "Check required fields, types, and value ranges against the API docs.",
      "Log the exact request you sent and compare with a working example."
    ],
    tags: ["http", "400", "client-error", "api"]
  },
  {
    id: "http-401-403",
    lang: "HTTP",
    sig: [
      { re: /\b401\b.*\bUnauthorized\b/i, weight: 9 },
      { re: /\b403\b.*\bForbidden\b/i, weight: 9 },
      { re: /HTTP\/\d(?:\.\d)?\s+40[13]/i, weight: 9 },
      { re: /status(?:code)?[:\s]+40[13]\b/i, weight: 8 },
      { re: /Unauthorized|Forbidden/i, weight: 5 }
    ],
    title: "401 Unauthorized / 403 Forbidden",
    meaning: "401 means you aren't authenticated (no or invalid credentials). 403 means you're authenticated but not allowed to do this. They look similar but mean different things.",
    causes: [
      "Missing, expired, or malformed token/API key (401).",
      "Wrong Authorization header format or scheme.",
      "Valid identity but insufficient permissions/roles/scopes (403).",
      "Accessing a resource that isn't yours."
    ],
    fixes: [
      "For 401: send valid credentials; check the token isn't expired and the header is `Authorization: Bearer <token>` (or the scheme the API wants).",
      "Refresh/re-issue the token if it expired.",
      "For 403: check the account's roles, scopes, or permissions for this action.",
      "Read the response body and the API's auth docs for the exact requirement."
    ],
    tags: ["http", "401", "403", "auth", "api"]
  },
  {
    id: "http-404",
    lang: "HTTP",
    sig: [
      { re: /\b404\b.*\bNot Found\b/i, weight: 9 },
      { re: /HTTP\/\d(?:\.\d)?\s+404/i, weight: 9 },
      { re: /status(?:code)?[:\s]+404\b/i, weight: 8 },
      { re: /\b404 Not Found\b/i, weight: 9 }
    ],
    title: "404 Not Found",
    meaning: "The server has no resource at that URL. Either the path is wrong, or the resource doesn't exist (or was removed).",
    causes: [
      "A typo or wrong path/route in the URL.",
      "A missing base path, API version, or trailing-slash difference.",
      "The resource ID doesn't exist.",
      "A client-side route hitting the server without SPA fallback configured."
    ],
    fixes: [
      "Double-check the full URL, including base path and API version.",
      "Confirm the route exists on the server (check the API docs / route table).",
      "Verify the resource ID actually exists.",
      "For SPAs, configure the host to serve index.html for unknown routes."
    ],
    tags: ["http", "404", "not-found", "routing", "api"]
  },
  {
    id: "http-500",
    lang: "HTTP",
    sig: [
      { re: /\b500\b.*\bInternal Server Error\b/i, weight: 9 },
      { re: /HTTP\/\d(?:\.\d)?\s+500/i, weight: 9 },
      { re: /status(?:code)?[:\s]+500\b/i, weight: 8 },
      { re: /Internal Server Error/i, weight: 6 }
    ],
    title: "500 Internal Server Error",
    meaning: "The server hit an unhandled error while processing the request. The fault is on the server side — the real cause is in the server's own logs, not in your request format.",
    causes: [
      "An unhandled exception in the server code.",
      "A failing dependency (database, downstream service).",
      "A bad server-side configuration or environment variable.",
      "Occasionally, input that the server didn't validate and then choked on."
    ],
    fixes: [
      "Check the SERVER logs/stack trace — that's where the actual error is.",
      "If it's your server, add error handling and reproduce with the same input.",
      "Verify dependencies (DB, cache, third-party APIs) are healthy.",
      "If it's someone else's API, retry, then report it with the request details."
    ],
    tags: ["http", "500", "server-error", "api"]
  },
  {
    id: "http-502-503-504",
    lang: "HTTP",
    sig: [
      { re: /\b502\b.*\bBad Gateway\b/i, weight: 9 },
      { re: /\b503\b.*\bService Unavailable\b/i, weight: 9 },
      { re: /\b504\b.*\bGateway Timeout\b/i, weight: 9 },
      { re: /HTTP\/\d(?:\.\d)?\s+50[234]/i, weight: 9 },
      { re: /Bad Gateway|Service Unavailable|Gateway Timeout/i, weight: 6 }
    ],
    title: "502 / 503 / 504 (gateway & availability)",
    meaning: "A proxy/load-balancer couldn't get a good response from the upstream server: 502 got an invalid response, 503 the service is unavailable/overloaded, 504 the upstream timed out.",
    causes: [
      "The upstream app is down, crashing, or still starting (502/503).",
      "The app is overloaded or in maintenance (503).",
      "The upstream took too long to respond (504).",
      "Misconfigured proxy target or health checks."
    ],
    fixes: [
      "Check that the upstream app is running and healthy.",
      "Look at the proxy/load-balancer and app logs together.",
      "For 504, find and speed up the slow operation, or raise timeouts appropriately.",
      "If it's a third party, retry with backoff and check their status page."
    ],
    tags: ["http", "502", "503", "504", "gateway", "proxy"]
  },
  {
    id: "http-429",
    lang: "HTTP",
    sig: [
      { re: /\b429\b.*\bToo Many Requests\b/i, weight: 9 },
      { re: /HTTP\/\d(?:\.\d)?\s+429/i, weight: 9 },
      { re: /Too Many Requests/i, weight: 7 },
      { re: /rate limit(?:ed| exceeded)?/i, weight: 6 }
    ],
    title: "429 Too Many Requests",
    meaning: "You hit the API's rate limit — you're sending requests faster than allowed. The server is asking you to slow down.",
    causes: [
      "Too many requests in a short window.",
      "A retry loop hammering the endpoint.",
      "Sharing a rate limit across many clients/keys.",
      "A burst that exceeded the per-second/per-minute quota."
    ],
    fixes: [
      "Respect the Retry-After header if present, and back off before retrying.",
      "Add exponential backoff with jitter to your retries.",
      "Batch or cache requests to reduce volume.",
      "Check the API's documented limits and stay under them."
    ],
    tags: ["http", "429", "rate-limit", "backoff", "api"]
  },

  /* ---------------- npm ---------------- */
  {
    id: "npm-eresolve",
    lang: "npm",
    sig: [
      { re: /ERESOLVE unable to resolve dependency tree/i, weight: 10 },
      { re: /ERESOLVE/i, weight: 8 },
      { re: /peer dep.*from|Could not resolve dependency/i, weight: 8 }
    ],
    title: "npm ERESOLVE (dependency conflict)",
    meaning: "npm couldn't build a consistent dependency tree — usually a peer-dependency conflict, where two packages want incompatible versions of the same dependency.",
    causes: [
      "A package's required peer dependency conflicts with an installed version.",
      "Outdated packages that haven't caught up to a new major version.",
      "A lockfile out of sync with package.json."
    ],
    fixes: [
      "Read which packages conflict — the message names both and the versions.",
      "Upgrade/downgrade one side so the peer requirement is satisfied.",
      "As a last resort, `npm install --legacy-peer-deps` (understand it ignores peer conflicts).",
      "Delete node_modules and package-lock.json, then reinstall to rebuild cleanly."
    ],
    tags: ["npm", "ERESOLVE", "peer-deps", "dependencies"]
  },
  {
    id: "npm-enoent-package",
    lang: "npm",
    sig: [
      { re: /npm ERR!.*ENOENT.*package\.json/i, weight: 10 },
      { re: /ENOENT.*no such file or directory, open '.*package\.json'/i, weight: 10 },
      { re: /npm ERR! code ENOENT/i, weight: 8 }
    ],
    title: "npm can't find package.json",
    meaning: "npm ran in a directory that has no package.json. You're almost certainly in the wrong folder, or the project wasn't initialised.",
    causes: [
      "Running npm from outside the project root.",
      "The project has no package.json yet.",
      "A wrong path in a script."
    ],
    fixes: [
      "cd into the project directory that contains package.json.",
      "If starting fresh, run `npm init -y` to create one.",
      "Confirm with `ls package.json` before running npm scripts.",
      "Check any script that changes directories."
    ],
    tags: ["npm", "ENOENT", "package.json", "node"]
  },
  {
    id: "npm-missing-script",
    lang: "npm",
    sig: [
      { re: /npm ERR! Missing script:/i, weight: 10 },
      { re: /Missing script: ['"]?[\w:-]+['"]?/i, weight: 9 }
    ],
    title: "npm missing script",
    meaning: "You ran `npm run <name>` but there's no script by that name in package.json's \"scripts\" section (or you're in the wrong project).",
    causes: [
      "A typo in the script name.",
      "The script isn't defined in this package.json.",
      "You're in the wrong project directory."
    ],
    fixes: [
      "List available scripts: `npm run` (with no name) prints them.",
      "Check the exact name and spelling in package.json \"scripts\".",
      "Add the script to package.json if it should exist.",
      "Make sure you're in the intended project."
    ],
    tags: ["npm", "scripts", "package.json"]
  },

  /* ---------------- Git ---------------- */
  {
    id: "git-merge-conflict",
    lang: "Git",
    sig: [
      { re: /CONFLICT \(content\): Merge conflict in/i, weight: 10 },
      { re: /Automatic merge failed; fix conflicts/i, weight: 10 },
      { re: /Merge conflict in/i, weight: 8 }
    ],
    title: "Git merge conflict",
    meaning: "Git couldn't automatically combine changes because the same lines were edited on both sides. It marked the conflicting regions and is waiting for you to resolve them.",
    causes: [
      "The same lines changed in both branches being merged.",
      "A file deleted on one side and modified on the other.",
      "Long-lived branches that drifted apart."
    ],
    fixes: [
      "Open the conflicted files; edit the regions between <<<<<<< , ======= , and >>>>>>>.",
      "Keep the correct combination, remove the conflict markers, then `git add` the files.",
      "Finish with `git commit` (or `git merge --continue` / `git rebase --continue`).",
      "To bail out, `git merge --abort` returns to the pre-merge state."
    ],
    tags: ["git", "merge", "conflict"]
  },
  {
    id: "git-rejected-non-fast-forward",
    lang: "Git",
    sig: [
      { re: /! \[rejected\].*\(non-fast-forward\)/i, weight: 10 },
      { re: /Updates were rejected because the remote contains work/i, weight: 10 },
      { re: /failed to push some refs/i, weight: 8 },
      { re: /non-fast-forward/i, weight: 8 }
    ],
    title: "Push rejected (non-fast-forward)",
    meaning: "The remote branch has commits you don't have locally, so pushing would overwrite them. Git blocks the push until you integrate the remote changes.",
    causes: [
      "Someone else pushed to the branch since you last pulled.",
      "The remote history diverged from your local branch.",
      "A force-push or rebase changed the remote history."
    ],
    fixes: [
      "Pull and integrate first: `git pull --rebase` (then resolve any conflicts) and push again.",
      "Or `git fetch` then `git merge origin/<branch>` before pushing.",
      "Only force-push (`git push --force-with-lease`) if you're SURE you should replace the remote history.",
      "Never force-push shared branches without agreement."
    ],
    tags: ["git", "push", "non-fast-forward", "remote"]
  },
  {
    id: "git-detached-head",
    lang: "Git",
    sig: [
      { re: /You are in ['"]?detached HEAD['"]? state/i, weight: 10 },
      { re: /detached HEAD/i, weight: 8 }
    ],
    title: "Detached HEAD state",
    meaning: "HEAD points directly at a commit instead of a branch. You can look around and even commit, but new commits aren't on any branch and can be lost if you switch away.",
    causes: [
      "Checking out a specific commit, tag, or remote-tracking ref directly.",
      "A rebase or bisect that left you on a raw commit."
    ],
    fixes: [
      "To keep work here, make a branch: `git switch -c my-branch`.",
      "To just go back, `git switch -` or `git switch main`.",
      "If you already committed and left, `git reflog` finds the lost commits.",
      "Create the branch BEFORE switching away to avoid losing commits."
    ],
    tags: ["git", "detached-head", "branch"]
  },
  {
    id: "git-not-a-repo",
    lang: "Git",
    sig: [
      { re: /fatal: not a git repository/i, weight: 10 },
      { re: /not a git repository \(or any of the parent/i, weight: 10 }
    ],
    title: "Not a git repository",
    meaning: "You ran a git command in a directory that isn't inside a git repo. There's no .git folder here or in any parent directory.",
    causes: [
      "You're in the wrong directory.",
      "The repo was never initialised or cloned here.",
      "The .git directory was deleted or is missing."
    ],
    fixes: [
      "cd into the actual repository directory.",
      "Initialise a new repo with `git init` if this should be one.",
      "Clone the project with `git clone <url>` if you meant to work on an existing repo.",
      "Confirm .git exists: `ls -a` should show it."
    ],
    tags: ["git", "not-a-repository", "init"]
  },
  {
    id: "git-upstream-not-set",
    lang: "Git",
    sig: [
      { re: /fatal: The current branch .* has no upstream branch/i, weight: 10 },
      { re: /has no upstream branch/i, weight: 9 },
      { re: /set the remote as upstream/i, weight: 8 }
    ],
    title: "No upstream branch set",
    meaning: "You tried to push/pull a branch that isn't yet linked to a remote branch, so git doesn't know where to send it.",
    causes: [
      "A newly created local branch that was never pushed.",
      "No tracking relationship configured for the branch."
    ],
    fixes: [
      "Push and set upstream in one go: `git push -u origin <branch>`.",
      "Git usually prints the exact command to copy — use it.",
      "After that, plain `git push`/`git pull` will work for the branch.",
      "Check `git branch -vv` to see which branches track what."
    ],
    tags: ["git", "upstream", "push", "tracking"]
  },
  {
    id: "git-auth-failed",
    lang: "Git",
    sig: [
      { re: /Authentication failed for/i, weight: 10 },
      { re: /Support for password authentication was removed/i, weight: 10 },
      { re: /Permission denied \(publickey\)/i, weight: 10 },
      { re: /fatal: could not read Username/i, weight: 8 }
    ],
    title: "Git authentication failed",
    meaning: "Git couldn't authenticate with the remote (e.g. GitHub). Password auth over HTTPS is no longer accepted by major hosts — you need a token or SSH key.",
    causes: [
      "Using an account password instead of a personal access token over HTTPS.",
      "An expired or wrong token.",
      "SSH key not added to the host or agent (Permission denied (publickey)).",
      "Wrong remote URL (HTTPS vs SSH)."
    ],
    fixes: [
      "Over HTTPS, use a Personal Access Token as the password (or a credential helper).",
      "For SSH, add your key to the agent and to the host account (`ssh -T git@github.com` to test).",
      "Check/rotate the token if it expired, and update your stored credentials.",
      "Verify the remote URL: `git remote -v` (switch between HTTPS and SSH as needed)."
    ],
    tags: ["git", "auth", "token", "ssh", "github"]
  }
];
