import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildPosVersionMetadata } from "../src/lib/app-version";

type PackageJson = {
    version?: string;
};

const posDirectory = path.resolve(import.meta.dir, "..");
const rootDirectory = path.resolve(posDirectory, "../..");
const outputDirectory = path.join(posDirectory, "public");
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

const metadata = buildPosVersionMetadata({ version, build, builtAt });

await mkdir(outputDirectory, { recursive: true });
await writeFile(
    outputPath,
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
);

console.log(`Generated ${metadata.name} version ${version} (${build})`);
