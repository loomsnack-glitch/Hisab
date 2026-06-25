const fs = require("fs");
const path = require("path");

const targetFile = path.join(
  __dirname,
  "..",
  "node_modules",
  "@react-native",
  "gradle-plugin",
  "settings.gradle.kts"
);

if (!fs.existsSync(targetFile)) {
  console.log("[postinstall] React Native Gradle plugin settings file not found, skipping patch.");
  process.exit(0);
}

const original = 'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0") }';
const replacement = 'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0") }';

const contents = fs.readFileSync(targetFile, "utf8");

if (contents.includes(replacement)) {
  console.log("[postinstall] React Native Gradle plugin patch already applied.");
  process.exit(0);
}

if (!contents.includes(original)) {
  console.log("[postinstall] Expected foojay plugin version string not found, skipping patch.");
  process.exit(0);
}

fs.writeFileSync(targetFile, contents.replace(original, replacement));
console.log("[postinstall] Updated React Native Gradle plugin foojay resolver to 1.0.0.");
