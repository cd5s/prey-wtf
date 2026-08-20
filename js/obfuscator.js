/* Luau obfuscation engine — enhanced passes */
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
    "getexecutorname", "Config", "Prey", "true", "false", "nil", "and", "or", "not",
    "if", "then", "else", "elseif", "end", "while", "do", "for", "in", "repeat",
    "until", "function", "local", "return", "break", "continue", "self",
  ]);

  const JUNK = [
    "local _Z{I}=({A}^{B})",
    "local _Z{I}=string.char({A},{B},{C})",
    "local _Z{I}=table.concat({{string.char({A})}})",
    "local _Z{I}=math.abs(({A})-({B}))",
    "local _Z{I}=bit32.band({A},{B})",
    "local _Z{I}=({A}*0+{B})",
    "if ({A}~={B}) then local _={C} end",
  ];

  function randId(p, used) {
    const c = "IlO0l1";
    let id;
    do {
      id = p + Array.from({ length: 10 }, () => c[(Math.random() * c.length) | 0]).join("");
    } while (used.has(id));
    used.add(id);
    return id;
  }

  function randInt(a, b) {
    return (Math.random() * (b - a + 1) | 0) + a;
  }

  function stripComments(s) {
    return s.replace(/--\[\[[\s\S]*?\]\]/g, "").replace(/--[^\n]*/g, "");
  }

  function extractStrings(src) {
    const strings = [];
    let out = "";
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        let val = "";
        while (j < src.length) {
          if (src[j] === "\\" && j + 1 < src.length) {
            val += src[j] + src[j + 1];
            j += 2;
            continue;
          }
          if (src[j] === ch) break;
          val += src[j++];
        }
        const id = strings.length;
        strings.push({ raw: val.replace(/\\(.)/g, "$1"), quote: ch });
        out += `__S${id}__`;
        i = j + 1;
        continue;
      }
      out += ch;
      i++;
    }
    return { body: out, strings };
  }

  function restore(body, strings, fn) {
    return body.replace(/__S(\d+)__/g, (_, n) => fn(strings[+n], +n));
  }

  function multiLayerString(str, names) {
    const k1 = randInt(1, 255);
    const k2 = randInt(1, 255);
    const bytes = [...str].map((c) => bit32xor(c.charCodeAt(0), k1) ^ k2);
    return `${names.dec}({${bytes.join(",")}},${k1},${k2})`;
  }

  function bit32xor(a, b) {
    return a ^ b;
  }

  function buildDecoder(n) {
    return `local function ${n.dec}(t,k1,k2)
  local r={}
  for i=1,#t do r[i]=string.char(bit32.bxor(bit32.bxor(t[i],k1),k2)) end
  return table.concat(r)
end
local function ${n.dec2}(t,k)
  local r={}
  for i=1,#t do r[i]=string.char(bit32.bxor(t[i],k)) end
  return table.concat(r)
end`;
  }

  function collectIds(src) {
    const ids = new Set();
    const re = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let m;
    while ((m = re.exec(src))) {
      const n = m[1];
      if (!GLOBALS.has(n) && !/^__S\d+__$/.test(n) && !n.startsWith("_Z")) ids.add(n);
    }
    return [...ids].sort((a, b) => b.length - a.length);
  }

  function rename(src, on) {
    if (!on) return src;
    const used = new Set();
    const map = new Map();
    collectIds(src).forEach((n) => map.set(n, randId("_", used)));
    let out = src;
    for (const [a, b] of map) out = out.replace(new RegExp(`\\b${a}\\b`, "g"), b);
    return out;
  }

  function obfNumbers(src, on) {
    if (!on) return src;
    return src.replace(/\b(\d+)\b/g, (n) => {
      const v = +n;
      if (v < 2) return n;
      const a = randInt(1, Math.max(1, v - 1));
      const opts = [
        `((${a}+${v - a}))`,
        `(bit32.bxor(${v ^ 0xaa},170))`,
        `(math.floor(${v}.0))`,
        `(((${v << 0})>>0))`.replace("<<", "*").replace(">>", "/"),
      ];
      return opts[(Math.random() * opts.length) | 0];
    });
  }

  function junk(src, on, n) {
    if (!on || !n) return src;
    const lines = src.split("\n");
    for (let i = 0; i < n; i++) {
      const tpl = JUNK[(Math.random() * JUNK.length) | 0];
      lines.splice(randInt(1, Math.max(1, lines.length - 1)), 0, tpl
        .replace(/{I}/g, i)
        .replace(/{A}/g, randInt(2, 99))
        .replace(/{B}/g, randInt(2, 99))
        .replace(/{C}/g, randInt(2, 99)));
    }
    return lines.join("\n");
  }

  function opaqueWrap(src, on) {
    if (!on) return src;
    const g = randInt(10000, 99999);
    return `do local _G${g}=((function()if ((${g}*2)-${g})==${g} then return function()\n${src}\nend end end)())if _G${g} then _G${g}()end end`;
  }

  function vmWrap(src, on, names) {
    if (!on) return src;
    return `local ${names.vm}=loadstring([=[${src}]=])if ${names.vm} then ${names.vm}()end`;
  }

  function splitEncode(src, on, names) {
    if (!on) return src;
    const chunks = [];
    for (let i = 0; i < src.length; i += 48) chunks.push(src.slice(i, i + 48));
    const encoded = chunks.map((c) => {
      const bytes = [...c].map((ch) => ch.charCodeAt(0));
      return `{${bytes.join(",")}}`;
    });
    return `local ${names.parts}={${encoded.join(",")}}\nlocal ${names.join}=""\nfor _,p in ipairs(${names.parts}) do for _,b in ipairs(p) do ${names.join}=${names.join}..string.char(b) end end\nloadstring(${names.join})()`;
  }

  function minify(s) {
    return s.replace(/[ \t]+/g, " ").replace(/ ?([,;=(){}[\]]) ?/g, "$1").replace(/\n{2,}/g, "\n").trim();
  }

  const PRESETS = {
    light: { strings: true, rename: false, numbers: false, junk: false, flow: false, vm: false, split: false, minify: true, junkCount: 0 },
    medium: { strings: true, rename: true, numbers: true, junk: true, flow: false, vm: false, split: false, minify: true, junkCount: 8 },
    heavy: { strings: true, rename: true, numbers: true, junk: true, flow: true, vm: true, split: false, minify: true, junkCount: 18 },
    maximum: { strings: true, rename: true, numbers: true, junk: true, flow: true, vm: true, split: true, minify: true, junkCount: 35 },
    abyss: { strings: true, rename: true, numbers: true, junk: true, flow: true, vm: true, split: true, minify: true, junkCount: 50 },
  };

  function obfuscate(source, userOpts = {}) {
    const opts = { ...PRESETS.maximum, ...userOpts };
    const used = new Set();
    const names = { dec: randId("_D", used), dec2: randId("_X", used), vm: randId("_V", used), parts: randId("_P", used), join: randId("_J", used) };

    let src = source.trim();
    if (!src) throw new Error("Paste Luau source first");

    src = stripComments(src);
    const ex = extractStrings(src);
    let body = ex.body;

    if (opts.strings) {
      body = restore(body, ex.strings, (s) => multiLayerString(s.raw, names));
    } else {
      body = restore(body, ex.strings, (s) => `${s.quote}${s.raw}${s.quote}`);
    }

    body = rename(body, opts.rename);
    body = obfNumbers(body, opts.numbers);
    body = junk(body, opts.junk, opts.junkCount || 0);
    body = opaqueWrap(body, opts.flow);
    body = vmWrap(body, opts.vm, names);
    body = splitEncode(body, opts.split, names);
    if (opts.minify) body = minify(body);

    let output = opts.strings ? buildDecoder(names) + "\n" + body : body;

    return {
      output,
      stats: {
        inputBytes: source.length,
        outputBytes: output.length,
        stringsHidden: opts.strings ? ex.strings.length : 0,
        preset: opts.preset || "custom",
        layers: ["strings", "rename", "numbers", "junk", "flow", "vm", "split"].filter((k) => opts[k]),
      },
    };
  }

  async function sendToBot(webhook, payload) {
    if (!webhook) throw new Error("Add Discord webhook URL");
    const url = webhook.trim();
    if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(url)) {
      throw new Error("Invalid Discord webhook");
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: payload.botName || "Prey.Wtf · LuauArmor",
        embeds: [{
          title: "Obfuscation complete",
          color: 0x6ec8ff,
          fields: [
            { name: "User", value: payload.user || "?", inline: true },
            { name: "Preset", value: payload.preset || "?", inline: true },
            { name: "Size", value: `${payload.inputBytes} → ${payload.outputBytes}`, inline: true },
            { name: "Preview", value: "```lua\n" + payload.preview.slice(0, 800) + "\n```" },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    if (!res.ok) throw new Error(`Bot returned ${res.status}`);
    return true;
  }

  return { obfuscate, sendToBot, PRESETS };
})();
