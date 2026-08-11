import { createHash } from "node:crypto";

const argument = (name: string, fallback: number): number => {
    const index = process.argv.indexOf(name);
    const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
    if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
    return value;
};

const accountCount = argument("--accounts", 50);
const partitionCount = argument("--partitions", 2);
if (accountCount > 500) throw new Error("The bounded load test is limited to 500 simulated accounts");
if (partitionCount > accountCount) throw new Error("Partition count cannot exceed account count");

const startedAt = performance.now();
const before = process.memoryUsage();
const partitions = Array.from({ length: partitionCount }, () => 0);
for (let index = 0; index < accountCount; index += 1) {
    const digest = createHash("sha256").update(`simulated-account-${index}`).digest();
    const partition = digest.readUInt32BE(0) % partitionCount;
    partitions[partition] += 1;
}
const after = process.memoryUsage();

console.log(JSON.stringify({
    mode: "dry-run",
    accountCount,
    partitionCount,
    accountsPerPartition: partitions,
    durationMs: Number((performance.now() - startedAt).toFixed(2)),
    rssDeltaBytes: after.rss - before.rss,
    heapUsedDeltaBytes: after.heapUsed - before.heapUsed,
    note: "No WhatsApp accounts, sockets, database rows, or provider messages were created",
}));
