import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type PackageJson = {
    version?: string;
};

const webDirectory = path.resolve(import.meta.dir, "..");
const rootDirectory = path.resolve(webDirectory, "../..");
const outputDirectory = path.join(webDirectory, "public");
const outputPath = path.join(outputDirectory, "version.json");

const packageJson = JSON.parse(
    await readFile(path.join(rootDirectory, "package.json"), "utf8"),
) as PackageJson;

const getBuildId = () => {
    const configuredBuildId = process.env.BUILD_ID?.trim();
    if (configuredBuildId) {
        return configuredBuildId;
    }

    try {
        return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
            cwd: rootDirectory,
            encoding: "utf8",
        }).trim();
    } catch {
        return "local";
    }
};

const version = process.env.APP_VERSION?.trim() || packageJson.version || "development";
const build = getBuildId();
const builtAt = new Date().toISOString();

await mkdir(outputDirectory, { recursive: true });
await writeFile(
    outputPath,
    `${JSON.stringify({ version, build, builtAt }, null, 2)}\n`,
    "utf8",
);

console.log(`Generated frontend version ${version} (${build})`);
