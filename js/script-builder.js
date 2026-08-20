/* Builds Prey.Wtf scripts: config table top + URL payload bottom */
window.ScriptBuilder = (function () {
  const TABLE_MARKER = "--[[ PREY:TABLE ]]";
  const PAYLOAD_MARKER = "--[[ PREY:PAYLOAD ]]";
  const PAYLOAD_HOST = "https://cd5s.github.io/prey-wtf/p/";

  const DEFAULT_TABLE = `local Config = {
  Combat = {
    SilentAim = { Enabled = true, HitChance = 100 },
    AimAssist = { Enabled = false, Smoothness = 6.16 },
  },
  Visuals = {
    FOV = { Enabled = true, Radius = 80 },
  },
}`;

  const DEFAULT_LOGIC = `local Prey = getgenv().Prey or Config
getgenv().Prey = Prey
print("[Prey.Wtf] Config loaded ·", Prey.Combat and "Combat OK" or "Missing")`;

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

  function executorStub() {
    return `-- Executor detection (runs on inject)
local _Executor = "Unknown"
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

  function payloadDecoder(names) {
    return `
local function ${names.dec}(s)
  s = s:gsub("-", "+"):gsub("_", "/")
  local pad = (#s % 4)
  if pad > 0 then s = s .. string.rep("=", 4 - pad) end
  return (loadstring("return " .. string.char(108,111,97,100,115,116,114,105,110,103)(s))())
end`.trim();
  }

  function parseScript(src) {
    if (!src) return { table: DEFAULT_TABLE, logic: DEFAULT_LOGIC };
    if (src.includes(TABLE_MARKER) && src.includes(PAYLOAD_MARKER)) {
      const parts = src.split(PAYLOAD_MARKER);
      const tablePart = parts[0].replace(TABLE_MARKER, "").trim();
      const rest = (parts[1] || "").trim();
      const urlMatch = rest.match(/local _PayloadURL = "([^"]+)"/);
      const logicMatch = rest.match(/local _Logic = \[\[\s*([\s\S]*?)\s*\]\]/);
      return {
        table: tablePart || DEFAULT_TABLE,
        logic: logicMatch ? logicMatch[1].trim() : DEFAULT_LOGIC,
        payloadUrl: urlMatch ? urlMatch[1] : "",
      };
    }
    const tableMatch = src.match(/(?:local\s+Config\s*=|getgenv\(\)\.Prey\s*=)\s*(\{[\s\S]*?\n\})/);
    if (tableMatch) {
      return { table: `local Config = ${tableMatch[1]}`, logic: DEFAULT_LOGIC };
    }
    return { table: src.trim() || DEFAULT_TABLE, logic: DEFAULT_LOGIC };
  }

  function buildFullScript(tableLua, logicLua, obfuscatedPayload, meta = {}) {
    const payload = obfuscatedPayload || logicLua;
    const bytes = [...payload].map((c) => c.charCodeAt(0));
    const chunkSize = 80;
    const chunks = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
      chunks.push("{" + bytes.slice(i, i + chunkSize).join(",") + "}");
    }
    const payloadUrl = meta.payloadUrl || `${PAYLOAD_HOST}${ScriptBuilder.b64Encode(payload).slice(0, 56)}`;

    return `${TABLE_MARKER}
--[[ Prey.Wtf · ${meta.user || "user"} · ${new Date().toISOString().slice(0, 10)} ]]
${executorStub()}

${tableLua.trim()}

getgenv().Prey = Config

${PAYLOAD_MARKER}
local _PayloadURL = "${payloadUrl}"
local _PayloadChunks = {${chunks.join(",")}}

local function _BuildPayload(chunks)
  local out = {}
  for _, chunk in ipairs(chunks) do
    for _, byte in ipairs(chunk) do
      out[#out + 1] = string.char(byte)
    end
  end
  return table.concat(out)
end

local _raw = _BuildPayload(_PayloadChunks)
local _fn = loadstring(_raw)
if _fn then
  print("[Prey.Wtf] Executing protected payload on", getgenv().PreyExecutor or "Unknown")
  _fn()
else
  warn("[Prey.Wtf] Payload failed to load")
end`;
  }

  function rebuildConfig(cfg, obfuscateOpts) {
    const parsed = parseScript(cfg.lua);
    const tableLua = cfg.tableLua || parsed.table;
    const logicLua = cfg.logicLua || parsed.logic;
    let obfuscated = logicLua;
    if (window.LuauArmor) {
      try {
        const opts = { ...LuauArmor.PRESETS[obfuscateOpts?.preset || "maximum"], ...obfuscateOpts };
        obfuscated = LuauArmor.obfuscate(logicLua, opts).output;
      } catch {
        obfuscated = logicLua;
      }
    }
    cfg.tableLua = tableLua;
    cfg.logicLua = logicLua;
    cfg.lua = buildFullScript(tableLua, logicLua, obfuscated, { user: obfuscateOpts?.user });
    cfg.payload = b64Encode(obfuscated);
    cfg.updated = Date.now();
    return cfg;
  }

  return {
    TABLE_MARKER,
    PAYLOAD_MARKER,
    DEFAULT_TABLE,
    DEFAULT_LOGIC,
    parseScript,
    buildFullScript,
    rebuildConfig,
    b64Encode,
    b64Decode,
  };
})();
