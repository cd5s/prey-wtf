// node gen-payload.js [id] [preset]
// Reads YOUR script from payload-src/<id>.lua and writes p/<id>.lua
const fs = require("fs");
const path = require("path");

global.window = {};
require("./js/obfuscator.js");
require("./js/script-builder.js");

const SB = global.window.ScriptBuilder;
const LuauArmor = global.window.LuauArmor;

const id = process.argv[2] || "default";
const preset = process.argv[3] || "abyss";
const logicPath = path.join(__dirname, "payload-src", `${id}.lua`);

if (!fs.existsSync(logicPath)) {
  console.error("Missing payload-src/" + id + ".lua — paste your script there first.");
  process.exit(1);
}

const logic = fs.readFileSync(logicPath, "utf8");
const src = SB.buildPayloadSource(logic);
const obf = LuauArmor.obfuscate(src, { ...LuauArmor.PRESETS[preset], preset }).output;
const outPath = path.join(__dirname, "p", `${id}.lua`);
const file = `--// Prey.Wtf protected payload · ${id}\n${obf}\n`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, file, "utf8");
console.log("Wrote p/" + id + ".lua (" + file.length + " bytes, preset=" + preset + ")");
