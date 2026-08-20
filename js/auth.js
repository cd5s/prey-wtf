/* License key auth + Discord bot bridge (webhook) */
window.PreyAuth = (function () {
  async function notifyBot(bot, event, data) {
    if (!bot?.webhook) return { ok: false, reason: "no_webhook" };
    const url = bot.webhook.trim();
    if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(url)) {
      return { ok: false, reason: "bad_webhook" };
    }
    const body = {
      username: bot.name || "Prey.Wtf Auth",
      embeds: [{
        title: event,
        color: event.includes("LOGIN") ? 0x3dd68c : event.includes("FAIL") ? 0xff6b7a : 0x6ec8ff,
        fields: Object.entries(data).map(([k, v]) => ({ name: k, value: String(v).slice(0, 900), inline: k.length < 12 })),
        timestamp: new Date().toISOString(),
      }],
    };
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  function normalizeKey(k) {
    return String(k || "").trim().toUpperCase();
  }

  function validateKey(key, validKeys, userKey) {
    const k = normalizeKey(key);
    if (!k || k.length < 8) return { ok: false, error: "Invalid key format" };
    const list = (validKeys || []).map(normalizeKey);
    if (userKey && normalizeKey(userKey) === k) return { ok: true, source: "owner" };
    if (list.includes(k)) return { ok: true, source: "whitelist" };
    if (/^PK-[A-Z0-9-]{8,}$/.test(k)) return { ok: true, source: "format" };
    return { ok: false, error: "Key not recognized · check Discord bot" };
  }

  async function login(key, state) {
    const check = validateKey(key, state.bot?.validKeys, state.user?.key);
    if (!check.ok) {
      await notifyBot(state.bot, "AUTH FAIL", { key: key.slice(0, 8) + "…", error: check.error });
      return check;
    }
    state.auth = {
      loggedIn: true,
      key: normalizeKey(key),
      at: Date.now(),
      source: check.source,
    };
    await notifyBot(state.bot, "AUTH LOGIN", {
      user: state.user?.name || "unknown",
      key: state.auth.key.slice(0, 12) + "…",
      source: check.source,
    });
    return { ok: true };
  }

  function logout(state) {
    state.auth = { loggedIn: false, key: "", at: 0, source: "" };
  }

  return { login, logout, validateKey, notifyBot, normalizeKey };
})();
