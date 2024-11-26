const { readFileSync, writeFileSync } = require("fs");

function main() {
  const filepath = "./node_modules/png2icons/lib/UPNG.js";
  const content = readFileSync("./node_modules/png2icons/lib/UPNG.js", "utf-8");
  const updated = content.replace("var UPNG = {};", "var UPNG = {};var UZIP;");
  writeFileSync(filepath, updated);

  console.log(`Update ${filepath} Success`);
}

main();
