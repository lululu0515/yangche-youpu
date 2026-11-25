const fs = require("node:fs");
const path = require("node:path");
const { harden } = require("./harden-web.cjs");

const root = path.resolve(__dirname, "..");
const web = path.join(root, "www");
const dev = process.argv.includes("--dev");

fs.rmSync(web, { recursive: true, force: true });
fs.cpSync(path.join(root, "src"), web, { recursive: true });
fs.cpSync(path.join(root, "licenses"), path.join(web, "licenses"), { recursive: true });
fs.copyFileSync(path.join(root, "THIRD-PARTY-NOTICES.md"), path.join(web, "THIRD-PARTY-NOTICES.md"));

(async () => {
  if (!dev) {
    console.log("Hardening web assets for release...");
    await harden(web);
  }
  for (const destination of ["android/app/src/main/assets/public", "ios/App/App/public"]) {
    const target = path.join(root, destination);
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(web, target, { recursive: true });
  }
  console.log(`Web assets synced: www, iOS, Android${dev ? " (dev, unhardened)" : ""}`);
})();
