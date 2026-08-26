const { spawnSync } = require("child_process");
const path = require("path");

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    String(d.getFullYear()) +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

process.env.BUILD_TIMESTAMP = timestamp();
process.env.TIMESTAMP = process.env.BUILD_TIMESTAMP;

const cliPath = path.join(__dirname, "..", "node_modules", "electron-builder", "cli.js");
const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status === null ? 1 : result.status);
