import { RedisClient } from "bun";

export const redis = new RedisClient(process.env.REDIS_URL);

// Called when successfully connected to Redis server
redis.onconnect = () => {
    console.log("Connected to Redis server");
};

// Called when disconnected from Redis server
redis.onclose = error => {
    console.log("Disconnected from Redis server");
};