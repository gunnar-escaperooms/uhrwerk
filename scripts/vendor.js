// Kopiert Three.js nach src/vendor, damit das Spiel ohne Bundler und ohne Internet läuft.
const fs = require("fs"), path = require("path");
const quelle = path.join(__dirname, "..", "node_modules", "three", "build", "three.module.js");
const ziel = path.join(__dirname, "..", "src", "vendor", "three.module.js");
fs.mkdirSync(path.dirname(ziel), { recursive: true });
fs.copyFileSync(quelle, ziel);
console.log("three.module.js → src/vendor/");
