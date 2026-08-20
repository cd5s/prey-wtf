// Generates the hosted payload file p/default.lua from the default config,
// using the same obfuscation pipeline the dashboard uses.
const fs = require("fs");
const path = require("path");

global.window = {};
require("./js/obfuscator.js");
require("./js/script-builder.js");

const { LuauArmor } = global.window;
const SB = global.window.ScriptBuilder;

const preset = process.argv[2] || "abyss";
const src = SB.buildPayloadSource(SB.DEFAULT_LOGIC);
const obf = LuauArmor.obfuscate(src, { ...LuauArmor.PRESETS[preset], preset }).output;
const file = `--// Prey.Wtf protected payload · default · auto-generated, do not edit\n${obf}\n`;

fs.mkdirSync(path.join(__dirname, "p"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "p", "default.lua"), file, "utf8");
console.log("Wrote p/default.lua (" + file.length + " bytes, preset=" + preset + ")");
