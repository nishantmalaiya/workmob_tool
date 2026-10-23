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

console.log("Build Timestamp:", process.env.BUILD_TIMESTAMP);

const projectDir = path.resolve(__dirname, "..");
console.log("Project Directory:", projectDir);

const builder = require(path.join(projectDir, "node_modules", "electron-builder"));
const Platform = builder.Platform;

console.log("Starting electron-builder for Windows (NSIS x64)...");
const startTime = Date.now();

builder.build({
  projectDir: projectDir,
  targets: Platform.WINDOWS.createTarget(["nsis"], builder.Arch.x64),
})
.then((artifacts) => {
  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log("\n========================================");
  console.log(`BUILD SUCCESSFUL in ${duration}s!`);
  console.log("Generated Artifacts:");
  if (Array.isArray(artifacts)) {
    artifacts.forEach((art) => console.log(` - ${art}`));
  } else {
    console.log(" - " + artifacts);
  }
  console.log("========================================\n");
  process.exit(0);
})
.catch((err) => {
  console.error("BUILD FAILED:", err);
  process.exit(1);
});
