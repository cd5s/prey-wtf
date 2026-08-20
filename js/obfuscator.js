/* Luau obfuscation engine — runs fully in the browser */
window.LuauArmor = (function () {
  const GLOBALS = new Set([
    "print", "warn", "error", "assert", "type", "typeof", "tonumber", "tostring",
    "pairs", "ipairs", "next", "select", "unpack", "table", "string", "math",
    "bit32", "coroutine", "pcall", "xpcall", "setmetatable", "getmetatable",
    "rawget", "rawset", "rawequal", "rawlen", "loadstring", "load", "game",
    "workspace", "script", "wait", "task", "spawn", "delay", "tick", "time",
    "Instance", "Vector3", "CFrame", "Color3", "UDim2", "Enum", "Ray", "Region3",
    "BrickColor", "Random", "require", "getgenv", "getrenv", "getgc", "gethui",
    "syn", "fluxus", "hookfunction", "newcclosure", "clonefunction", "identifyexecutor",
    "true", "false", "nil", "and", "or", "not", "if", "then", "else", "elseif",
    "end", "while", "do", "for", "in", "repeat", "until", "function", "local",
    "return", "break", "continue", "self",
  ]);

  const JUNK_TEMPLATES = [
    "local _J{I}=({N1}+{N2})",
    "local _J{I}=string.char({N1},{N2},{N3})",
    "local _J{I}=table.concat({{'{A}','{B}'}})",
    "local _J{I}=math.floor({N1}*{N2})",
    "local _J{I}=({N1}~{N2})",
  ];

  function randId(prefix, used) {
    const chars = "IlO0";
    let id;
    do {
      id = prefix + Array.from({ length: 8 }, () => chars[(Math.random() * chars.length) | 0]).join("");
    } while (used.has(id));
    used.add(id);
    return id;
  }

  function randInt(min, max) {
    return (Math.random() * (max - min + 1) | 0) + min;
  }

  function stripComments(src) {
    return src
      .replace(/--\[\[[\s\S]*?\]\]/g, "")
      .replace(/--[^\n]*/g, "");
  }

  function extractStrings(src) {
    const strings = [];
    let out = "";
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '"' || ch === "'") {
        const q = ch;
        let j = i + 1;
        let val = "";
        while (j < src.length) {
          if (src[j] === "\\" && j + 1 < src.length) {
            val += src[j] + src[j + 1];
            j += 2;
            continue;
          }
          if (src[j] === q) break;
          val += src[j++];
        }
        const full = src.slice(i, j + 1);
        const id = strings.length;
        strings.push({ raw: val, quote: q });
        out += `__STR_${id}__`;
        i = j + 1;
        continue;
      }
      out += ch;
      i++;
    }
    return { body: out, strings };
  }

  function restoreStrings(body, strings, replacer) {
    return body.replace(/__STR_(\d+)__/g, (_, n) => replacer(strings[+n], +n));
  }

  function encryptStringLuau(str, key, fnName) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i) ^ key);
    }
    return `${fnName}({${bytes.join(",")}},${key})`;
  }

  function buildDecoder(names) {
    return `
local ${names.dec} = function(_t,_k)
  local _r = {}
  for _i = 1, #_t do
    _r[_i] = string.char(bit32.bxor(_t[_i], _k))
  end
  return table.concat(_r)
end`.trim();
  }

  function collectIdentifiers(src) {
    const ids = new Map();
    const re = /\b(local\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let m;
    while ((m = re.exec(src))) {
      const name = m[2];
      if (!GLOBALS.has(name) && !/^__STR_\d+__$/.test(name) && !name.startsWith("_J")) {
        ids.set(name, (ids.get(name) || 0) + 1);
      }
    }
    return [...ids.keys()].sort((a, b) => b.length - a.length);
  }

  function renameIdentifiers(src, enabled) {
    if (!enabled) return src;
    const used = new Set();
    const names = collectIdentifiers(src);
    let out = src;
    const map = new Map();
    names.forEach((n) => map.set(n, randId("_", used)));
    for (const [from, to] of map) {
      out = out.replace(new RegExp(`\\b${from}\\b`, "g"), to);
    }
    return out;
  }

  function obfuscateNumbers(src, enabled) {
    if (!enabled) return src;
    return src.replace(/\b(\d{2,})\b/g, (n) => {
      const v = +n;
      const a = randInt(1, v - 1);
      const b = v - a;
      const ops = [
        `(${a}+${b})`,
        `((${v + 3})-3)`,
        `(bit32.bxor(${v ^ 0xff},255))`,
        `(math.floor(${v / 2}+${v / 2}))`,
      ];
      return ops[(Math.random() * ops.length) | 0];
    });
  }

  function insertJunk(src, enabled, count) {
    if (!enabled || count <= 0) return src;
    const lines = src.split("\n");
    const used = new Set();
    for (let i = 0; i < count; i++) {
      const tpl = JUNK_TEMPLATES[(Math.random() * JUNK_TEMPLATES.length) | 0];
      const line = tpl
        .replace("{I}", i)
        .replace("{N1}", randInt(2, 99))
        .replace("{N2}", randInt(2, 99))
        .replace("{N3}", randInt(65, 90))
        .replace("{A}", String.fromCharCode(randInt(97, 122)))
        .replace("{B}", String.fromCharCode(randInt(97, 122)));
      const at = randInt(1, Math.max(1, lines.length - 1));
      lines.splice(at, 0, line);
    }
    return lines.join("\n");
  }

  function wrapControlFlow(src, enabled) {
    if (!enabled) return src;
    const gate = randInt(1000, 9999);
    return `
do
  local _G${gate} = (function()
    if ((${gate} * 2) - ${gate}) == ${gate} then
      return function()
${src.split("\n").map((l) => "        " + l).join("\n")}
      end
    end
  end)()
  if _G${gate} then _G${gate}() end
end`.trim();
  }

  function minify(src) {
    return src
      .replace(/[ \t]+/g, " ")
      .replace(/ ?([,;=(){}[\]]) ?/g, "$1")
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  function wrapLoader(src) {
    return `--[[ Prey.Wtf · LuauArmor · ${new Date().toISOString()} ]]
local _src = [=[
${src}
]=]
local _fn = loadstring(_src)
if _fn then _fn() end`;
  }

  const PRESETS = {
    light: { strings: true, rename: false, numbers: false, junk: false, flow: false, minify: true, wrap: false, junkCount: 0 },
    medium: { strings: true, rename: true, numbers: true, junk: true, flow: false, minify: true, wrap: false, junkCount: 4 },
    heavy: { strings: true, rename: true, numbers: true, junk: true, flow: true, minify: true, wrap: true, junkCount: 10 },
    maximum: { strings: true, rename: true, numbers: true, junk: true, flow: true, minify: true, wrap: true, junkCount: 22 },
  };

  function obfuscate(source, userOpts = {}) {
    const opts = { ...PRESETS.heavy, ...userOpts };
    const used = new Set();
    const names = {
      dec: randId("_D", used),
      run: randId("_R", used),
    };

    let src = source.trim();
    if (!src) throw new Error("Paste Luau source first");

    src = stripComments(src);
    const extracted = extractStrings(src);

    let body = extracted.body;
    if (opts.strings) {
      body = restoreStrings(body, extracted.strings, (s) => {
        const key = randInt(1, 255);
        return encryptStringLuau(s.raw, key, names.dec);
      });
    } else {
      body = restoreStrings(body, extracted.strings, (s) => `${s.quote}${s.raw}${s.quote}`);
    }

    body = renameIdentifiers(body, opts.rename);
    body = obfuscateNumbers(body, opts.numbers);
    body = insertJunk(body, opts.junk, opts.junkCount || 0);
    body = wrapControlFlow(body, opts.flow);
    if (opts.minify) body = minify(body);

    let output = body;
    if (opts.strings) output = buildDecoder(names) + "\n" + output;
    if (opts.wrap) output = wrapLoader(output);

    const stats = {
      inputBytes: source.length,
      outputBytes: output.length,
      stringsHidden: opts.strings ? extracted.strings.length : 0,
      preset: opts.preset || "custom",
      passes: Object.entries(opts).filter(([k, v]) => v === true && k !== "preset").map(([k]) => k),
    };

    return { output, stats };
  }

  async function sendToBot(webhook, payload) {
    if (!webhook) throw new Error("Add a Discord webhook URL first");
    const url = webhook.trim();
    if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(url)) {
      throw new Error("Webhook must be a Discord URL");
    }
    const body = {
      username: payload.botName || "Prey.Wtf · LuauArmor",
      embeds: [{
        title: "Obfuscation complete",
        color: 0x6ec8ff,
        fields: [
          { name: "User", value: payload.user || "unknown", inline: true },
          { name: "Preset", value: payload.preset || "custom", inline: true },
          { name: "Size", value: `${payload.inputBytes} → ${payload.outputBytes} bytes`, inline: true },
          { name: "Preview", value: "```lua\n" + payload.preview.slice(0, 900) + "\n```" },
        ],
        timestamp: new Date().toISOString(),
      }],
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Bot returned ${res.status}`);
    return true;
  }

  return { obfuscate, sendToBot, PRESETS };
})();
