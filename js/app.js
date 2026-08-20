const STORE = "prey.wtf.v4";

const DEFAULT_LUA = `-- Prey.Wtf cloud config (demo)
-- Visual editor only. Nothing here is executed remotely.

getgenv().Prey = {
  Combat = {
    SilentAim = {
      Enabled = true,
      HitChance = 100,
      Waitpart = "ClosestPart", -- ClosestPart | UpperTorso | Head
      ClosestPoint = { Enabled = true, Scale = 0.16 },
      Prediction = { Enabled = false, X = 4, Y = 4, Z = 8 },
      Sensor = {
        UseNoBarrelSS = false,
        Resolver = false,
        ClientConfirmer = false,
      },
    },
    AimAssist = {
      Enabled = false,
      Smoothness = 6.16,
      Mode = "Always", -- FOV | Toggle | Always
      ClosestPoint = { Name = "ClosestPart", Scale = 0.35 },
      LookingStyle = { Style = "Quadratic", Direction = "InOut" },
    },
    Triggerbot = {
      Enabled = false,
      Distance = 0.15,
      Type = "Toggle", -- Hold | Toggle
      HitPart = "Torso",
      Prediction = { X = 8, Y = 8, Z = 8 },
    },
  },
  Visuals = {
    InstanceCheck = { Enabled = false },
    FOV = { Enabled = true, Radius = 80, Filled = false },
  },
}
`;

const seedPeople = [
  ["gg", "a"],
  ["n0hv", "yoooo"],
  ["ben", "chat im him"],
  ["justatest", "tuff"],
  ["Jah", "son"],
  ["lifepelaez1", "uh"],
  ["born", "hi guys"],
  ["born", "how we doing"],
  ["born", "💀"],
  ["nes", "hi"],
  ["justatest", ":?"],
  ["gorehill", "hello"],
  ["xx", "yo"],
  ["Oqjd", "yo"],
  ["Oqjd", "neegy"],
  ["Punchzxz", "yooo"],
  ["canonninja", "hi"],
];

const defaultState = () => ({
  user: {
    name: "imasexfreak",
    role: "UNIQUE CUSTOMER",
    id: "ENCRYPTED",
    balance: 106,
    key: "PK-" + cryptoRandom(20).toUpperCase(),
    hwid: "D8E-B4D9-****-G8CT",
    ip: "hidden",
    country: "United States",
    discord: { linked: true, tag: "Welcome-here_750", id: "750" },
    status: "ACTIVE",
    orders: 1,
    configName: "Default",
  },
  theme: { build: "abyss", color: "", custom: "Abyss Theme" },
  unlocked: false,
  configs: [
    {
      id: "default",
      name: "Default",
      tableLua: ScriptBuilder.DEFAULT_TABLE,
      logicLua: ScriptBuilder.DEFAULT_LOGIC,
      lua: "",
      updated: Date.now(),
    },
  ],
  activeConfig: "default",
  messages: seedPeople.map(([user, text], i) => ({
    user,
    text,
    at: hoursAgo(seedPeople.length - i),
  })),
  auth: { loggedIn: false, key: "", at: 0, source: "" },
  bot: {
    webhook: "",
    token: "",
    name: "Prey.Wtf Bot",
    validKeys: ["PK-DEMO-2026", "PK-PREY-WTF"],
  },
  broadcast: { syncUrl: "", webhook: "" },
  session: { used: true, started: Date.now() - 3600_000 },
  passwordSet: false,
  armor: {
    webhook: "",
    botName: "Prey.Wtf Bot",
    preset: "abyss",
    options: { ...LuauArmor.PRESETS.abyss },
    input: `-- Paste Luau here
local msg = "Protected by Prey.Wtf"
print(msg)
`,
    output: "",
    queue: [],
    botOnline: true,
  },
});

function hoursAgo(h) {
  return Date.now() - h * 3600_000;
}

function cryptoRandom(n) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  for (let i = 0; i < n; i++) out += chars[buf[i] % chars.length];
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      user: { ...base.user, ...(parsed.user || {}) },
      theme: { ...base.theme, ...(parsed.theme || {}) },
      armor: { ...base.armor, ...(parsed.armor || {}), options: { ...base.armor.options, ...(parsed.armor?.options || {}) } },
      auth: { ...base.auth, ...(parsed.auth || {}) },
      bot: { ...base.bot, ...(parsed.bot || {}), validKeys: parsed.bot?.validKeys || base.bot.validKeys },
      broadcast: { ...base.broadcast, ...(parsed.broadcast || {}) },
    };
  } catch {
    return defaultState();
  }
}

function save() {
  state.configs.forEach((c) => {
    if (!c.tableLua) c.tableLua = ScriptBuilder.parseScript(c.lua).table;
    if (!c.logicLua) c.logicLua = ScriptBuilder.parseScript(c.lua).logic;
  });
  localStorage.setItem(STORE, JSON.stringify(state));
}

function rebuildAllConfigs() {
  state.configs.forEach((c) => ScriptBuilder.rebuildConfig(c, { preset: state.armor.preset, user: state.user.name }));
}

let state = load();
let route = "home";

const view = document.getElementById("view");
const rail = document.getElementById("rail");
const toasts = document.getElementById("toasts");

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  toasts.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

const WEBHOOK_RE = /^https:\/\/(ptb\.|canary\.)?(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

function isValidWebhook(url) {
  return WEBHOOK_RE.test((url || "").trim());
}

function attachWebhookValidation(input) {
  if (!input) return;
  const hint = document.createElement("p");
  hint.className = "wh-hint";
  input.insertAdjacentElement("afterend", hint);
  const update = () => {
    const v = input.value.trim();
    if (!v) {
      input.classList.remove("ok", "bad");
      hint.textContent = "Paste a Discord Webhook URL (Server Settings → Integrations → Webhooks)";
      hint.className = "wh-hint";
    } else if (isValidWebhook(v)) {
      input.classList.add("ok");
      input.classList.remove("bad");
      hint.textContent = "Valid webhook ✓";
      hint.className = "wh-hint ok";
    } else if (/^[\w-]{20,}\.[\w-]+\.[\w-]+$/.test(v)) {
      input.classList.add("bad");
      input.classList.remove("ok");
      hint.textContent = "That looks like a bot TOKEN, not a webhook URL — use the Bot token field instead";
      hint.className = "wh-hint bad";
    } else {
      input.classList.add("bad");
      input.classList.remove("ok");
      hint.textContent = "Not a webhook URL. Format: https://discord.com/api/webhooks/ID/TOKEN";
      hint.className = "wh-hint bad";
    }
  };
  input.addEventListener("input", update);
  update();
}

function applyTheme() {
  document.body.className = `theme-${state.theme.build} ${state.theme.color ? "color-" + state.theme.color : ""}`;
  document.getElementById("chip-name").textContent = state.user.name;
  document.getElementById("chip-status").textContent = `ID · ${state.user.id}`;
  document.getElementById("chip-bal").textContent = `$${Number(state.user.balance).toFixed(2)}`;
  paintAvatar(document.getElementById("chip-avatar"), state.user.name);
}

function paintAvatar(el, name) {
  if (!el) return;
  el.textContent = (name || "?").slice(0, 1).toUpperCase();
  el.style.background = `linear-gradient(145deg, hsl(${hash(name) % 360} 42% 42%), #1a2a48)`;
}

function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function copy(text, label = "Copied") {
  navigator.clipboard.writeText(text).then(() => toast(label)).catch(() => toast("Copy failed"));
}

function setRoute(next) {
  if (!state.auth.loggedIn && next !== "login") {
    route = "login";
    location.hash = "login";
    renderLogin();
    return;
  }
  route = next;
  location.hash = next;
  render();
}

function renderLogin() {
  const gate = document.getElementById("login-gate");
  gate.classList.remove("hidden");
  gate.innerHTML = `
    <div class="login-card">
      <h2>Prey<span style="color:var(--accent)">.</span>Wtf</h2>
      <p>Enter your license key · verified through Discord bot</p>
      <div class="field"><label>License key</label><input id="login-key" placeholder="PK-XXXXXXXX" value="${esc(state.auth.key)}" /></div>
      <button class="btn white" id="login-go">Log in</button>
      <p class="hint" style="margin-top:14px">Demo keys: PK-DEMO-2026 · PK-PREY-WTF · or your account key</p>
    </div>
  `;
  gate.querySelector("#login-go").onclick = async () => {
    const key = gate.querySelector("#login-key").value;
    const res = await PreyAuth.login(key, state);
    if (!res.ok) return toast(res.error || "Login failed");
    save();
    gate.classList.add("hidden");
    toast("Logged in");
    setRoute("home");
  };
  gate.querySelector("#login-key").addEventListener("keydown", (e) => {
    if (e.key === "Enter") gate.querySelector("#login-go").click();
  });
}

function hideLoginGate() {
  document.getElementById("login-gate")?.classList.add("hidden");
}

function currentConfig() {
  return state.configs.find((c) => c.id === state.activeConfig) || state.configs[0];
}

function pages() {
  return {
    home: renderHome,
    settings: renderSettings,
    security: renderSecurity,
    profile: renderProfile,
    broadcast: renderBroadcast,
    configs: renderConfigs,
    armor: renderArmor,
  };
}

function render() {
  if (!state.auth.loggedIn) {
    renderLogin();
    return;
  }
  hideLoginGate();
  applyTheme();
  document.getElementById("user-chip").classList.toggle("hidden", route === "broadcast" || route === "configs" || route === "armor");
  document.getElementById("discord-fab").classList.toggle("hidden", route === "configs" || route === "armor");
  rail.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.route === route));
  document.getElementById("settings-btn").classList.toggle("active", route === "settings");
  const fn = pages()[route] || renderHome;
  view.innerHTML = "";
  view.appendChild(fn());
  if (route === "broadcast") {
    BroadcastHub.startPolling(state, () => {
      save();
      const box = document.getElementById("msgs");
      if (!box) return;
      box.innerHTML = "";
      state.messages.slice(-50).forEach((m) => box.appendChild(messageRow(m)));
      box.scrollTop = box.scrollHeight;
    });
  } else {
    BroadcastHub.stopPolling();
  }
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function renderHome() {
  const u = state.user;
  const page = el(`<section class="page center"></section>`);
  page.innerHTML = `
    <div class="kicker">Dashboard layout</div>
    <div class="stack">
      <article class="card pad-lg welcome">
        <div class="avatar" id="home-av"></div>
        <div class="meta">
          <div class="kicker">Welcome back</div>
          <h2>${esc(u.name)}</h2>
          <div class="badge">${esc(u.role)}</div>
        </div>
      </article>
      <article class="card">
        <div class="key-row">
          <div class="kicker">🔑 License key</div>
          <button class="btn tiny" data-copy="key">Copy</button>
        </div>
        <div class="key-box"><code>${esc(u.key)}</code></div>
        <p class="hint">Share to redeem · Click copy to clipboard</p>
      </article>
    </div>
    <p class="foot">Built in 2026</p>
  `;
  paintAvatar(page.querySelector("#home-av"), u.name);
  page.querySelector("[data-copy=key]").onclick = () => copy(u.key, "License key copied");
  return page;
}

function renderSettings() {
  const u = state.user;
  const builds = ["prey", "noreint", "eclipse", "noir", "obsidian", "abyss"];
  const colors = [
    ["soft-pink", "♡ Soft pink"],
    ["sakura", "♡ Sakura petal"],
    ["strawberry", "♡ Strawberry milk"],
    ["emerald", "♣ Emerald green"],
  ];
  const page = el(`<section class="page center"></section>`);
  page.innerHTML = `
    <div>
      <div class="title">Settings</div>
      <div class="subtitle">Staring into the byte locks</div>
      <div class="grid-settings">
        <article class="card">
          <div class="kicker">Builds</div>
          <div class="builds" id="builds"></div>
          <div class="field">
            <label>Custom theme picker</label>
            <select id="custom-theme">
              <option>Abyss Theme</option>
              <option>Midnight Tide</option>
              <option>Void Glass</option>
              <option>Carbon Drift</option>
            </select>
          </div>
        </article>
        <article class="card">
          <div class="kicker">Account info</div>
          <strong style="display:block;margin:6px 0 10px">${esc(u.name)}</strong>
          <div class="kicker">Key</div>
          <div class="key-box" style="margin-top:8px">
            <code>${esc(u.key)}</code>
            <button class="btn tiny" data-copy="key">Copy</button>
          </div>
          <button class="btn white" id="get-script" style="margin-top:12px">Get script</button>
        </article>
        <article class="card">
          <div class="kicker">Account security</div>
          <div class="field"><label>Current password</label><input type="password" id="pw-cur" /></div>
          <div class="field"><label>New password</label><input type="password" id="pw-new" /></div>
          <div class="field"><label>Confirmation password</label><input type="password" id="pw-conf" /></div>
          <button class="btn white" id="pw-save">Change</button>
        </article>
        <article class="card">
          <div class="kicker">Discord bot</div>
          <div class="field"><label>Discord Webhook URL</label><input id="bot-webhook" value="${esc(state.bot.webhook)}" placeholder="https://discord.com/api/webhooks/ID/TOKEN" /></div>
          <div class="field"><label>Bot token (optional · unused on static site)</label><input id="bot-token" type="password" value="${esc(state.bot.token)}" placeholder="Only for a future backend bot" /></div>
          <div class="field"><label>Valid keys (comma separated)</label><input id="bot-keys" value="${esc((state.bot.validKeys || []).join(", "))}" /></div>
          <div class="field"><label>Broadcast sync JSON URL</label><input id="bcast-sync" value="${esc(state.broadcast.syncUrl)}" placeholder="Optional raw JSON for shared chat" /></div>
          <button class="btn white" id="bot-save">Save bot settings</button>
        </article>
        <article class="card">
          <div class="kicker">Color themes</div>
          <div class="themes" id="colors" style="margin-top:10px"></div>
        </article>
      </div>
    </div>
  `;
  const buildBox = page.querySelector("#builds");
  builds.forEach((b) => {
    const btn = el(`<button class="build ${state.theme.build === b ? "active" : ""}"><i class="dot"></i>${b}</button>`);
    btn.onclick = () => {
      state.theme.build = b;
      save();
      applyTheme();
      render();
    };
    buildBox.appendChild(btn);
  });
  const colorBox = page.querySelector("#colors");
  colors.forEach(([id, label]) => {
    const btn = el(`<button class="theme ${state.theme.color === id ? "active" : ""}">${label}</button>`);
    btn.onclick = () => {
      state.theme.color = state.theme.color === id ? "" : id;
      save();
      applyTheme();
      render();
    };
    colorBox.appendChild(btn);
  });
  page.querySelector("#custom-theme").value = state.theme.custom;
  page.querySelector("#custom-theme").onchange = (e) => {
    state.theme.custom = e.target.value;
    save();
    toast("Theme saved · " + e.target.value);
  };
  page.querySelector("[data-copy=key]").onclick = () => copy(u.key, "Key copied");
  page.querySelector("#get-script").onclick = () => setRoute("armor");
  attachWebhookValidation(page.querySelector("#bot-webhook"));
  page.querySelector("#bot-save").onclick = () => {
    state.bot.webhook = page.querySelector("#bot-webhook").value.trim();
    state.bot.token = page.querySelector("#bot-token").value.trim();
    state.bot.validKeys = page.querySelector("#bot-keys").value.split(",").map((s) => s.trim()).filter(Boolean);
    state.broadcast.syncUrl = page.querySelector("#bcast-sync").value.trim();
    state.armor.webhook = state.bot.webhook;
    save();
    toast("Bot settings saved");
  };
  page.querySelector("#pw-save").onclick = () => {
    const a = page.querySelector("#pw-new").value;
    const b = page.querySelector("#pw-conf").value;
    if (!a || a.length < 6) return toast("Use at least 6 characters");
    if (a !== b) return toast("Passwords do not match");
    state.passwordSet = true;
    save();
    toast("Password updated");
    page.querySelectorAll("input").forEach((i) => (i.value = ""));
  };
  return page;
}

function renderSecurity() {
  const u = state.user;
  const page = el(`<section class="page center"></section>`);
  page.innerHTML = `
    <div>
      <div class="title">Security</div>
      <div class="subtitle">Manage your sessions & devices</div>
      <div class="grid-2">
        <article class="card">
          <div class="kicker">Device info</div>
          <div class="field" style="margin-top:12px"><label>HWID</label><div class="key-box" style="margin:0"><code>${esc(u.hwid)}</code></div></div>
          <div class="field"><label>Last IP</label><div class="key-box" style="margin:0"><code>${esc(u.ip)}</code></div></div>
          <div class="field"><label>Last country</label><div class="key-box" style="margin:0"><code>${esc(u.country)}</code></div></div>
        </article>
        <article class="card">
          <div class="kicker">Sessions</div>
          <div class="stat-row">
            <div class="stat"><span>Session</span><strong>${state.session.used ? "Used" : "Idle"}</strong></div>
            <div class="stat"><span>Since</span><strong>${fmtTime(state.session.started)}</strong></div>
          </div>
          <p class="hint">If you switched devices or your executor changed, reset your HWID to regain access.</p>
          <button class="btn white" id="reset-hwid" style="margin-top:14px">Reset HWID</button>
        </article>
      </div>
    </div>
  `;
  page.querySelector("#reset-hwid").onclick = () => {
    state.user.hwid = randHwid();
    state.session = { used: true, started: Date.now() };
    save();
    toast("HWID reset");
    render();
  };
  return page;
}

function randHwid() {
  const chunk = () => cryptoRandom(4).slice(0, 4).toUpperCase();
  return `${chunk()}-${chunk()}-****-${chunk()}`;
}

function renderProfile() {
  const u = state.user;
  const page = el(`<section class="page center"></section>`);
  page.innerHTML = `
    <div>
      <div class="kicker">👤 Profile</div>
      <div class="subtitle">Your account overview</div>
      <div class="grid-2">
        <article class="card">
          <div class="kicker">☁ Cloud Config</div>
          <div class="subtitle" style="margin-bottom:10px">Manage your saved layouts</div>
          <div class="stat-row">
            <div class="stat"><span>Active config</span><strong>${esc(currentConfig().name)}</strong></div>
            <div class="stat"><span>Total configs</span><strong>${state.configs.length}</strong></div>
          </div>
          <button class="btn white" data-route="configs">View & edit configs</button>
          <div class="kicker" style="margin:16px 0 8px">Linked account</div>
          <div class="card" style="padding:14px;box-shadow:none">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong>${u.discord.linked ? "Discord Connected" : "Not linked"}</strong>
                <p class="hint" style="margin:4px 0 0">${u.discord.linked ? esc(u.discord.tag) : "Connect to sync"}</p>
              </div>
              <span class="ok">${u.discord.linked ? "●" : "○"}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
              <span class="hint">Connected ${esc(u.discord.id)}</span>
              <button class="btn tiny" id="toggle-dc">${u.discord.linked ? "Unlink" : "Link"}</button>
            </div>
          </div>
        </article>
        <article class="card">
          <div class="welcome" style="margin-bottom:12px">
            <div class="avatar" id="pf-av"></div>
            <div>
              <h2 style="font-size:16px">${esc(u.name)}</h2>
              <div class="badge">${esc(u.role)}</div>
            </div>
          </div>
          <div class="kicker">License key</div>
          <div class="key-box">
            <code>${esc(u.key)}</code>
            <button class="btn tiny" data-copy="key">Copy</button>
          </div>
          <div class="pills">
            <div class="pill"><span>Status</span><strong class="ok">${esc(u.status)}</strong></div>
            <div class="pill"><span>Order</span><strong>${u.orders}</strong></div>
            <div class="pill"><span>Config</span><strong>${esc(u.configName)}</strong></div>
          </div>
          <div class="kicker">Discord user id</div>
          <div class="inline" style="margin-top:8px">
            <input id="dc-id" placeholder="e.g. 123456789" value="${esc(u.discord.id)}" />
            <button class="btn white" id="dc-save">Link</button>
          </div>
          <p class="hint">Find your ID in your Discord profile bio.</p>
        </article>
      </div>
    </div>
  `;
  paintAvatar(page.querySelector("#pf-av"), u.name);
  page.querySelector("[data-route=configs]").onclick = () => setRoute("configs");
  page.querySelector("[data-copy=key]").onclick = () => copy(u.key);
  page.querySelector("#toggle-dc").onclick = () => {
    u.discord.linked = !u.discord.linked;
    save();
    toast(u.discord.linked ? "Discord linked" : "Discord unlinked");
    render();
  };
  page.querySelector("#dc-save").onclick = () => {
    const id = page.querySelector("#dc-id").value.trim();
    if (!id) return toast("Enter a Discord id");
    u.discord.id = id;
    u.discord.linked = true;
    u.discord.tag = `user_${id}`;
    save();
    toast("Discord id saved");
    render();
  };
  return page;
}

function renderConfigs() {
  if (!state.unlocked) {
    const page = el(`<section class="page"></section>`);
    page.innerHTML = `
      <div class="locked">
        <div>
          <div class="pulse"></div>
          <p>Waiting for script execution…</p>
          <p class="hint">Executor detected · unlock cloud configs</p>
          <button class="btn" id="unlock">Unlock preview</button>
        </div>
      </div>
    `;
    page.querySelector("#unlock").onclick = () => {
      state.unlocked = true;
      save();
      toast("Preview unlocked");
      render();
    };
    return page;
  }

  const cfg = currentConfig();
  if (!cfg.tableLua) cfg.tableLua = ScriptBuilder.parseScript(cfg.lua).table;
  if (!cfg.logicLua) cfg.logicLua = ScriptBuilder.parseScript(cfg.lua).logic;
  ScriptBuilder.rebuildConfig(cfg, { preset: state.armor.preset, user: state.user.name });
  save();

  const page = el(`<section class="page" style="padding:72px 110px 24px 28px"></section>`);
  page.innerHTML = `
    <div class="editor-wrap">
      <article class="editor-card">
        <div class="editor-head">
          <strong>Cloud Config · ${esc(cfg.name)}</strong>
          <div class="head-btns">
            <button class="btn tiny" id="cfg-rebuild">Rebuild script</button>
            <button class="btn tiny" id="exec">Execute</button>
          </div>
        </div>
        <div class="config-split">
          <div class="config-pane">
            <label>Config table (top of script)</label>
            <textarea id="table-edit" spellcheck="false">${esc(cfg.tableLua)}</textarea>
          </div>
          <div class="config-pane readonly">
            <label>Generated script · table + payload URL</label>
            <textarea id="full-script" readonly spellcheck="false">${esc(cfg.lua)}</textarea>
          </div>
        </div>
      </article>
      <aside class="side-card">
        <div class="side-head">
          <div>
            <h3>Cloud Configs</h3>
            <p>Edit table · payload auto-updates</p>
          </div>
          <div class="add-row">
            <input id="cfg-name" placeholder="Config name" />
            <button class="btn tiny" id="cfg-add">+</button>
          </div>
        </div>
        <div class="config-list" id="cfg-list"></div>
        <div style="padding:8px 12px">
          <div class="kicker">Logic layer</div>
          <textarea id="logic-edit" style="width:100%;min-height:100px;background:var(--input);border:1px solid var(--stroke);border-radius:10px;padding:8px;font-family:var(--mono);font-size:10px;color:#cfe0ff" spellcheck="false">${esc(cfg.logicLua)}</textarea>
        </div>
      </aside>
    </div>
  `;

  const syncScript = () => {
    cfg.tableLua = page.querySelector("#table-edit").value;
    cfg.logicLua = page.querySelector("#logic-edit").value;
    ScriptBuilder.rebuildConfig(cfg, { preset: state.armor.preset, user: state.user.name });
    page.querySelector("#full-script").value = cfg.lua;
    save();
  };

  let debounce;
  page.querySelector("#table-edit").addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(syncScript, 400);
  });
  page.querySelector("#logic-edit").addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(syncScript, 400);
  });

  page.querySelector("#cfg-rebuild").onclick = () => {
    syncScript();
    toast("Script rebuilt with obfuscated payload");
  };
  page.querySelector("#exec").onclick = async () => {
    syncScript();
    toast(`Execute queued · ${cfg.name}`);
    await PreyAuth.notifyBot(state.bot, "SCRIPT EXECUTE", {
      user: state.user.name,
      config: cfg.name,
      executor: "Awaiting inject",
      bytes: String(cfg.lua.length),
    });
  };

  const list = page.querySelector("#cfg-list");
  state.configs.forEach((c) => {
    const row = el(`<button class="cfg ${c.id === cfg.id ? "active" : ""}"><span>${esc(c.name)}</span><small>${new Date(c.updated).toLocaleDateString()}</small></button>`);
    row.onclick = () => {
      state.activeConfig = c.id;
      state.user.configName = c.name;
      save();
      render();
    };
    list.appendChild(row);
  });
  page.querySelector("#cfg-add").onclick = () => {
    const name = page.querySelector("#cfg-name").value.trim() || "New config";
    const id = cryptoRandom(8);
    const nc = {
      id, name,
      tableLua: ScriptBuilder.DEFAULT_TABLE,
      logicLua: ScriptBuilder.DEFAULT_LOGIC,
      lua: "",
      updated: Date.now(),
    };
    ScriptBuilder.rebuildConfig(nc, { preset: state.armor.preset, user: state.user.name });
    state.configs.push(nc);
    state.activeConfig = id;
    state.user.configName = name;
    save();
    toast("Config created");
    render();
  };
  return page;
}

function renderArmor() {
  const a = state.armor;
  const page = el(`<section class="page armor-v2"></section>`);
  page.innerHTML = `
    <div class="armor-shell">
      <nav class="armor-nav">
        <h3>LuauArmor v2</h3>
        <button class="active" data-p="abyss">Abyss preset</button>
        <button data-p="maximum">Maximum</button>
        <button data-p="heavy">Heavy</button>
        <button data-p="medium">Medium</button>
        <button id="armor-load-config">Load cloud config</button>
        <button id="armor-sync-config">Push to cloud</button>
      </nav>
      <div class="armor-main">
        <div class="armor-main-head">
          <strong>Obfuscation pipeline</strong>
          <div class="head-btns">
            <button class="btn tiny" id="armor-run">Run armor</button>
            <button class="btn tiny" id="armor-copy">Copy</button>
          </div>
        </div>
        <div class="armor-code">
          <textarea id="armor-in" placeholder="Input Luau…" spellcheck="false">${esc(a.input || "")}</textarea>
          <textarea id="armor-out" readonly placeholder="Obfuscated output…" spellcheck="false">${esc(a.output || "")}</textarea>
        </div>
        <div style="padding:10px 14px;border-top:1px solid var(--stroke)">
          <div class="armor-meter"><i id="armor-bar" style="width:0%"></i></div>
          <p class="hint" id="armor-meta" style="margin-top:8px">Ready</p>
        </div>
      </div>
      <aside class="armor-bot">
        <h3 style="font-size:13px">Discord bot</h3>
        <div class="field"><label>Discord Webhook URL</label><input id="armor-webhook" value="${esc(a.webhook || state.bot.webhook)}" placeholder="https://discord.com/api/webhooks/ID/TOKEN" /></div>
        <div class="field"><label>Bot token (optional · unused on static site)</label><input id="armor-token" type="password" value="${esc(state.bot.token)}" placeholder="Only for a future backend bot" /></div>
        <div class="armor-options" id="armor-options"></div>
        <button class="btn white" id="armor-bot">Send to bot</button>
        <div class="queue-list" id="armor-queue" style="flex:1;min-height:80px"></div>
      </aside>
    </div>
  `;

  page.querySelectorAll(".armor-nav button[data-p]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.p === a.preset);
    btn.onclick = () => {
      a.preset = btn.dataset.p;
      a.options = { ...LuauArmor.PRESETS[a.preset], preset: a.preset };
      save();
      render();
    };
  });

  const optKeys = [
    ["strings", "Multi-layer strings"],
    ["rename", "Mangle identifiers"],
    ["numbers", "Number opaque"],
    ["junk", "Junk injection"],
    ["flow", "Control-flow"],
    ["vm", "VM loadstring wrap"],
    ["split", "Split byte payload"],
    ["minify", "Minify"],
  ];
  const optBox = page.querySelector("#armor-options");
  optKeys.forEach(([key, label]) => {
    const row = el(`<label class="opt"><span>${label}</span><input type="checkbox" data-opt="${key}" ${a.options[key] ? "checked" : ""} /></label>`);
    row.querySelector("input").onchange = (e) => { a.options[key] = e.target.checked; save(); };
    optBox.appendChild(row);
  });

  const input = page.querySelector("#armor-in");
  const output = page.querySelector("#armor-out");
  input.oninput = () => { a.input = input.value; save(); };

  page.querySelector("#armor-webhook").addEventListener("input", (e) => { a.webhook = e.target.value; state.bot.webhook = e.target.value; save(); });
  page.querySelector("#armor-token").oninput = (e) => { state.bot.token = e.target.value; save(); };
  attachWebhookValidation(page.querySelector("#armor-webhook"));

  function runArmor() {
    const opts = { ...a.options, preset: a.preset, junkCount: LuauArmor.PRESETS[a.preset]?.junkCount ?? 20 };
    const result = LuauArmor.obfuscate(input.value, opts);
    a.output = result.output;
    a.lastStats = result.stats;
    output.value = result.output;
    const pct = Math.min(100, Math.round((result.stats.outputBytes / Math.max(result.stats.inputBytes, 1)) * 40));
    page.querySelector("#armor-bar").style.width = pct + "%";
    page.querySelector("#armor-meta").textContent = `${result.stats.inputBytes}b → ${result.stats.outputBytes}b · ${result.stats.layers?.length || 0} layers · ${a.preset}`;
    a.queue.unshift({ status: "done", text: `Armor ${a.preset}`, at: Date.now() });
    a.queue = a.queue.slice(0, 15);
    save();
    return result;
  }

  page.querySelector("#armor-run").onclick = () => {
    try { runArmor(); toast("Armor applied"); } catch (e) { toast(e.message); }
  };
  page.querySelector("#armor-copy").onclick = () => copy(a.output || output.value, "Copied");
  page.querySelector("#armor-load-config").onclick = () => {
    const c = currentConfig();
    input.value = c.logicLua || ScriptBuilder.parseScript(c.lua).logic;
    a.input = input.value;
    save();
    toast("Loaded logic from cloud config");
  };
  page.querySelector("#armor-sync-config").onclick = () => {
    try {
      if (!a.output) runArmor();
      const c = currentConfig();
      c.logicLua = input.value;
      ScriptBuilder.rebuildConfig(c, { preset: a.preset, user: state.user.name });
      save();
      toast("Cloud config updated with armor output");
    } catch (e) { toast(e.message); }
  };
  page.querySelector("#armor-bot").onclick = async () => {
    try { if (!a.output) runArmor(); } catch (e) { return toast(e.message); }
    const webhook = a.webhook || state.bot.webhook;
    try {
      await LuauArmor.sendToBot(webhook, { botName: state.bot.name, user: state.user.name, preset: a.preset, inputBytes: a.lastStats?.inputBytes, outputBytes: a.output.length, preview: a.output });
      toast("Sent to Discord bot");
    } catch (e) { toast(e.message); }
  };

  const queueBox = page.querySelector("#armor-queue");
  (a.queue.length ? a.queue : [{ status: "idle", text: "Queue empty" }]).slice(0, 8).forEach((j) => {
    queueBox.appendChild(el(`<div class="queue-item">${esc(j.status)} · ${esc(j.text)}</div>`));
  });

  if (a.lastStats) {
    page.querySelector("#armor-bar").style.width = Math.min(100, Math.round(a.lastStats.outputBytes / 50)) + "%";
    page.querySelector("#armor-meta").textContent = `${a.lastStats.inputBytes}b → ${a.lastStats.outputBytes}b`;
  }
  return page;
}

function messageRow(m) {
  return el(`<div class="feed-row"><b>${esc(m.user)}</b><time>${fmtTime(m.at)}</time><span>${esc(m.text)}</span></div>`);
}

function renderBroadcast() {
  const online = BroadcastHub.BOT_USERS.length + 1;
  const page = el(`<section class="page broadcast-page"></section>`);
  page.innerHTML = `
    <div class="broadcast-head">
      <div class="title">Broadcast</div>
      <div class="subtitle">Chat with everyone · <em>${online} online</em></div>
    </div>
    <article class="broadcast-board">
      <div class="bcast-online"><em>●</em> Live feed · other users appear automatically</div>
      <div class="feed-list" id="msgs"></div>
      <form class="composer" id="composer">
        <input name="text" placeholder="Type a message..." autocomplete="off" />
        <button class="btn white" type="submit">Send</button>
      </form>
    </article>
  `;
  const msgs = page.querySelector("#msgs");
  state.messages.slice(-50).forEach((m) => msgs.appendChild(messageRow(m)));
  msgs.scrollTop = msgs.scrollHeight;
  page.querySelector("#composer").onsubmit = async (e) => {
    e.preventDefault();
    const input = e.target.text;
    const text = input.value.trim();
    if (!text) return;
    const msg = { user: state.user.name, text, at: Date.now() };
    state.messages.push(msg);
    save();
    input.value = "";
    msgs.appendChild(messageRow(msg));
    msgs.scrollTop = msgs.scrollHeight;
    const hook = state.broadcast.webhook || state.bot.webhook;
    await BroadcastHub.postMessage(hook, state.user.name, text);
  };
  return page;
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-route]");
  if (btn) {
    e.preventDefault();
    setRoute(btn.dataset.route);
  }
});

window.addEventListener("hashchange", () => {
  const next = location.hash.replace("#", "") || "home";
  if (!state.auth.loggedIn) {
    renderLogin();
    return;
  }
  if (next !== route) {
    route = pages()[next] ? next : "home";
    render();
  }
});

document.getElementById("notify-btn").onclick = () => toast("No new notifications");
document.getElementById("history-btn").onclick = () => setRoute("broadcast");
document.getElementById("logout-btn").onclick = () => {
  PreyAuth.logout(state);
  save();
  toast("Logged out");
  renderLogin();
};

state.configs.forEach((c) => {
  if (!c.tableLua) c.tableLua = ScriptBuilder.parseScript(c.lua || "").table;
  if (!c.logicLua) c.logicLua = ScriptBuilder.parseScript(c.lua || "").logic;
  if (!c.lua) ScriptBuilder.rebuildConfig(c, { preset: state.armor.preset, user: state.user.name });
});

route = location.hash.replace("#", "") || "home";
if (route === "login") route = "home";
if (!state.auth.loggedIn) {
  renderLogin();
} else {
  if (!pages()[route]) route = "home";
  applyTheme();
  render();
}
