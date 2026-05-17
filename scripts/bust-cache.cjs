const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "index.html");
const buildId = process.env.BUILD_ID || Date.now().toString(36);

const index = fs
  .readFileSync(indexPath, "utf8")
  .replace(/<meta name="build-id" content="[^"]*">/, `<meta name="build-id" content="${buildId}">`)
  .replace(/app\.js\?v=[^"]*"/, `app.js?v=${buildId}"`)
  .replace(/__BUILD_ID__/g, buildId);
fs.writeFileSync(indexPath, index, "utf8");
console.log("Updated index.html build id:", buildId);
