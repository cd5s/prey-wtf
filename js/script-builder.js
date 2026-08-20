/* Builds Prey.Wtf scripts.
   Loader → shared.saved (config table) + loadstring(game:HttpGet(payload))
   Payload → YOUR script (logic layer), obfuscated and hosted at /p/<id>.lua */
window.ScriptBuilder = (function () {
  const PAYLOAD_HOST = "https://cd5s.github.io/prey-wtf/p/";

  const DEFAULT_TABLE = `{
  Combat = {
    SilentAim = { Enabled = true, HitChance = 100 },
    AimAssist = { Enabled = false, Smoothness = 6.16 },
  },
  Visuals = {
    FOV = { Enabled = true, Radius = 80 },
  },
}`;

  const LOGIC_PLACEHOLDER = `-- Paste YOUR full script here (your ESP, aim, etc.)
-- The loader already saved your cloud table to shared.saved
-- After editing: Rebuild → Download payload → run publish-payload.js → copy loader
`;

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

  function payloadId(cfg) {
    if (cfg && cfg.id && /^[\w-]+$/.test(cfg.id)) return cfg.id;
    const name = (cfg && cfg.name) || "cfg";
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
    return "c" + Math.abs(h).toString(36);
  }

  function tableBody(t) {
    let s = (t || "").trim();
    s = s.replace(/^--[^\n]*\n/m, "").trim();
    if (s.startsWith("{")) return s;
    const m =
      s.match(/(?:shared\.saved|shared\.PreySaved|getgenv\(\)\.Prey)\s*=\s*(\{[\s\S]*\})\s*;?\s*$/) ||
      s.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
    return m ? m[1] : s || DEFAULT_TABLE;
  }

  function isPlaceholderLogic(s) {
    const t = (s || "").trim();
    if (!t) return true;
    if (t.includes("Paste YOUR full script")) return true;
    if (t.includes("PreyRuntimeLogic")) return true;
    if (/Config loaded ·/.test(t) && t.length < 600) return true;
    return false;
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

  function buildPayloadSource(logicLua) {
    const logic = (logicLua || "").trim();
    if (!logic || isPlaceholderLogic(logic)) {
      throw new Error("No script in Logic layer — paste your source first");
    }
    return `${executorStub()}\n\n${logic}`;
  }

  function buildLoader(tableLua, payloadUrl, meta = {}) {
    const body = tableBody(tableLua);
    const stamp = new Date().toISOString().slice(0, 10);
    return `--// Prey.Wtf loader · ${meta.user || "user"} · ${stamp}
shared.saved = ${body}
getgenv().saved = shared.saved
getgenv().PreySaved = shared.saved
getgenv().Prey = shared.saved

loadstring(game:HttpGet("${payloadUrl}"))()`;
  }

  function parseScript(src) {
    if (!src) return { table: DEFAULT_TABLE, logic: "" };
    const loaderMatch =
      src.match(/shared\.saved\s*=\s*(\{[\s\S]*?\n\})/) ||
      src.match(/shared\.PreySaved\s*=\s*(\{[\s\S]*?\n\})/);
    if (loaderMatch) return { table: loaderMatch[1], logic: "" };
    const legacy = src.match(/(?:getgenv\(\)\.Prey\s*=)\s*(\{[\s\S]*?\n\})/);
    if (legacy) return { table: legacy[1], logic: "" };
    return { table: DEFAULT_TABLE, logic: "" };
  }

  function buildFullScript(tableLua, logicLua, obfuscatedPayload, meta = {}) {
    const payload = obfuscatedPayload || buildPayloadSource(logicLua);
    return `${buildLoader(tableLua, meta.payloadUrl || PAYLOAD_HOST + "inline.lua", meta)}

--[==[
${payload}
]==]`;
  }

  function rebuildConfig(cfg, obfuscateOpts) {
    const parsed = parseScript(cfg.lua);
    const tableLua = tableBody(cfg.tableLua || parsed.table);
    let logicLua = (cfg.logicLua || "").trim();
    if (!logicLua || isPlaceholderLogic(logicLua)) {
      logicLua = (parsed.logic || "").trim();
    }
    if (!logicLua || isPlaceholderLogic(logicLua)) {
      logicLua = LOGIC_PLACEHOLDER;
    }

    let payloadSrc;
    try {
      payloadSrc = buildPayloadSource(logicLua);
    } catch {
      payloadSrc = `${executorStub()}\n\n${LOGIC_PLACEHOLDER}`;
    }

    let obfuscated = payloadSrc;
    if (window.LuauArmor && !isPlaceholderLogic(logicLua)) {
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
    cfg.payloadFile = `--// Prey.Wtf protected payload · ${id}\n${obfuscated}\n`;
    cfg.loader = buildLoader(tableLua, cfg.payloadUrl, { user: obfuscateOpts?.user });
    cfg.lua = cfg.loader;
    cfg.payload = b64Encode(obfuscated);
    cfg.payloadReady = !isPlaceholderLogic(logicLua);
    cfg.updated = Date.now();
    return cfg;
  }

  return {
    PAYLOAD_HOST,
    DEFAULT_TABLE,
    LOGIC_PLACEHOLDER,
    parseScript,
    buildLoader,
    buildPayloadSource,
    buildFullScript,
    rebuildConfig,
    payloadId,
    tableBody,
    isPlaceholderLogic,
    b64Encode,
    b64Decode,
  };
})();
