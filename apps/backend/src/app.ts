import { Hono } from 'hono';
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { deviceMiddleware } from './middlewares/device.middleware';

const BASE_PATH = process.env.BASE_PATH
const app = BASE_PATH ? new Hono().basePath(BASE_PATH) : new Hono();

const origin = process.env.NODE_ENV === "production" ?
    ["https://hisab.loomsanck.in",] :
    [
        'http://localhost:5173',
        'http://localhost:5174',
        "https://hisab.loomsanck.in"
    ];

app.use('*', cors({
    origin,
    credentials: true,
}));

// Middleware
app.use('*', logger());
app.use('*', deviceMiddleware)

// Routes
app.get('/', (c) => {
    return c.text('Hello World');
});

export default app