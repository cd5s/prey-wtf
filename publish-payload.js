// node publish-payload.js [id] [preset]
// Generates p/<id>.lua from payload-src/<id>.lua and pushes to GitHub
const { execSync } = require("child_process");
const path = require("path");

const id = process.argv[2] || "default";
const preset = process.argv[3] || "abyss";

execSync(`node gen-payload.js ${id} ${preset}`, { stdio: "inherit", cwd: __dirname });
execSync(`git add p/${id}.lua payload-src/${id}.lua`, { cwd: __dirname });
try {
  execSync(`git diff --cached --quiet`, { cwd: __dirname });
  console.log("Nothing to publish — payload unchanged.");
} catch {
  execSync(
    `git -c user.name=cd5s -c user.email=cd5s@users.noreply.github.com commit -m "Publish payload ${id}"`,
    { stdio: "inherit", cwd: __dirname }
  );
  execSync("git push origin main", { stdio: "inherit", cwd: __dirname });
  console.log("Published p/" + id + ".lua to GitHub Pages.");
}
