import { pg } from "@/config/db";
import { redis } from "@/config/redis";

export async function handleShutdown(signal: string) {
    console.log(`🛑 Received ${signal}. Shutting down gracefully...`);

    try {
        redis.close();
        pg.close();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error during shutdown:", error);
        process.exit(1);
    }
}