/* Builds Prey.Wtf scripts.
   Model: a SHORT loader (config table saved to shared + loadstring(game:HttpGet(url)))
   plus a separately HOSTED obfuscated payload file that lives in the public repo /p/. */
window.ScriptBuilder = (function () {
  // Public GitHub Pages host that serves the obfuscated payload files.
  const PAYLOAD_HOST = "https://cd5s.github.io/prey-wtf/p/";

  // The config table is a plain Lua object literal saved to shared.PreySaved.
  const DEFAULT_TABLE = `{
  Combat = {
    SilentAim = { Enabled = true, HitChance = 100 },
    AimAssist = { Enabled = false, Smoothness = 6.16 },
  },
  Visuals = {
    FOV = { Enabled = true, Radius = 80 },
  },
}`;

  // The logic reads the config from shared (set by the loader) — this is what gets
  // obfuscated and hosted as the payload file.
  const DEFAULT_LOGIC = `local Config = shared.PreySaved or getgenv().PreySaved or {}
getgenv().Prey = Config
print("[Prey.Wtf] Config loaded ·", Config.Combat and "Combat OK" or "Missing")`;

  function b64Encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function b64Decode(b64) {
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const norm = b64.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const bin = atob(norm);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  // Stable, filesystem-safe id for a config's hosted payload file.
  function payloadId(cfg) {
    if (cfg && cfg.id && /^[\w-]+$/.test(cfg.id)) return cfg.id;
    const name = (cfg && cfg.name) || "cfg";
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
    return "c" + Math.abs(h).toString(36);
  }

  // Normalise whatever the user typed in the table editor down to a `{ ... }` literal.
  function tableBody(t) {
    const s = (t || "").trim();
    if (s.startsWith("{")) return s;
    const m = s.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
    return m ? m[1] : s || DEFAULT_TABLE;
  }

  function executorStub() {
    return `local _Executor = "Unknown"
if identifyexecutor then
  local _ok, _name = pcall(identifyexecutor)
  if _ok and _name then _Executor = tostring(_name) end
elseif getexecutorname then
  local _ok, _name = pcall(getexecutorname)
  if _ok and _name then _Executor = tostring(_name) end
end
print("[Prey.Wtf] Executor ·", _Executor)
getgenv().PreyExecutor = _Executor`;
  }

  // The un-obfuscated payload source: executor detection + user logic.
  function buildPayloadSource(logicLua) {
    return `${executorStub()}\n\n${(logicLua || DEFAULT_LOGIC).trim()}`;
  }

  // The short loader the user copies into their executor.
  function buildLoader(tableLua, payloadUrl, meta = {}) {
    const body = tableBody(tableLua);
    const stamp = new Date().toISOString().slice(0, 10);
    return `--// Prey.Wtf loader · ${meta.user || "user"} · ${stamp}
--// Your settings are saved to shared.PreySaved and read by the protected payload.
shared.PreySaved = ${body}
getgenv().PreySaved = shared.PreySaved

loadstring(game:HttpGet("${payloadUrl}"))()`;
  }

  function parseScript(src) {
    if (!src) return { table: DEFAULT_TABLE, logic: DEFAULT_LOGIC };
    const loaderMatch = src.match(/shared\.PreySaved\s*=\s*(\{[\s\S]*?\n\})/);
    if (loaderMatch) return { table: loaderMatch[1], logic: DEFAULT_LOGIC };
    const legacy = src.match(/(?:local\s+Config\s*=|getgenv\(\)\.Prey\s*=)\s*(\{[\s\S]*?\n\})/);
    if (legacy) return { table: legacy[1], logic: DEFAULT_LOGIC };
    return { table: DEFAULT_TABLE, logic: DEFAULT_LOGIC };
  }

  // Kept for API compatibility: assemble a fully self-contained script (loader inlined
  // with the payload embedded). Not used by the default flow but handy for exports.
  function buildFullScript(tableLua, logicLua, obfuscatedPayload, meta = {}) {
    const payload = obfuscatedPayload || buildPayloadSource(logicLua);
    return `${buildLoader(tableLua, meta.payloadUrl || PAYLOAD_HOST + "inline.lua", meta)}

--// Inline payload (for offline/self-hosted use):
--[==[
${payload}
]==]`;
  }

  function rebuildConfig(cfg, obfuscateOpts) {
    const parsed = parseScript(cfg.lua);
    const tableLua = tableBody(cfg.tableLua || parsed.table);
    const logicLua = cfg.logicLua || parsed.logic;

    const payloadSrc = buildPayloadSource(logicLua);
    let obfuscated = payloadSrc;
    if (window.LuauArmor) {
      try {
        const opts = { ...LuauArmor.PRESETS[obfuscateOpts?.preset || "maximum"], ...obfuscateOpts };
        obfuscated = LuauArmor.obfuscate(payloadSrc, opts).output;
      } catch {
        obfuscated = payloadSrc;
      }
    }

    const id = payloadId(cfg);
    cfg.tableLua = tableLua;
    cfg.logicLua = logicLua;
    cfg.payloadId = id;
    cfg.payloadPath = `p/${id}.lua`;
    cfg.payloadUrl = `${PAYLOAD_HOST}${id}.lua`;
    cfg.payloadFile = `--// Prey.Wtf protected payload · ${id} · auto-generated, do not edit\n${obfuscated}\n`;
    cfg.loader = buildLoader(tableLua, cfg.payloadUrl, { user: obfuscateOpts?.user });
    cfg.lua = cfg.loader;
    cfg.payload = b64Encode(obfuscated);
    cfg.updated = Date.now();
    return cfg;
  }

  return {
    PAYLOAD_HOST,
    DEFAULT_TABLE,
    DEFAULT_LOGIC,
    parseScript,
    buildLoader,
    buildPayloadSource,
    buildFullScript,
    rebuildConfig,
    payloadId,
    tableBody,
    b64Encode,
    b64Decode,
  };
})();
