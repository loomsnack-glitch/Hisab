// File: src/config/db.ts
import { SQL } from "bun";

export const pg = new SQL({
    // Connection details (adapter is auto-detected as PostgreSQL)
    url: process.env.DATABASE_URL,

    // Alternative connection parameters
    // hostname: process.env.DB_HOST,
    // port: process.env.DB_PORT,
    // database: process.env.DB_NAME,
    // username: process.env.DB_USER,
    // password: process.env.DB_PASSWORD,

    // Connection pool settings
    max: 20, // Maximum connections in pool
    idleTimeout: 30, // Close idle connections after 30s
    // maxLifetime: 0, // Connection lifetime in seconds (0 = forever)
    connectionTimeout: 30, // Timeout when establishing new connections

    // SSL/TLS options
    tls: process.env.NODE_ENV === 'production',
    // tls: {
    //   rejectUnauthorized: true,
    //   requestCert: true,
    //   ca: "path/to/ca.pem",
    //   key: "path/to/key.pem",
    //   cert: "path/to/cert.pem",
    //   checkServerIdentity(hostname, cert) {
    //     ...
    //   },
    // },

    // Callbacks
    // onconnect: client => {
    //     console.log("Connected to PostgreSQL");
    // },
    // onclose: client => {
    //     console.log("PostgreSQL connection closed");
    // },
});