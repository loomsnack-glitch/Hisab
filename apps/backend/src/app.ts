import { Hono } from 'hono';
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { deviceMiddleware } from './middlewares/device.middleware';
import authRoutes from './modules/access-control/auth/auth.routes';
import deviceAuthRoutes from './modules/access-control/device-auth/device-auth.routes';
import commonRoutes from './modules/common/common.routes';
import posRoutes from './modules/pos/pos.routes';
import billingRoutes from './modules/tenant/billing/billing.routes';
import catalogRoutes from './modules/tenant/catalog/catalog.routes';
import organizationRoutes from './modules/tenant/organization/organization.routes';

const BASE_PATH = process.env.BASE_PATH
const app = BASE_PATH ? new Hono().basePath(BASE_PATH) : new Hono();

const allowedOrigins = process.env.NODE_ENV === "production"
    ? ["https://ganatri.loomsanck.in"]
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://ganatri.loomsanck.in",
    ];

app.use('*', cors({
    origin: allowedOrigins,
    credentials: true,
}));

// Middleware
app.use('*', logger());
app.use('*', deviceMiddleware)

// Routes
app.get('/', (c) => {
    return c.text('Hello World');
});

app.route('/auth', authRoutes);
app.route('/device-auth', deviceAuthRoutes);
app.route('/common', commonRoutes);
app.route('/pos', posRoutes);
app.route('/organizations', organizationRoutes);
app.route('/organizations', catalogRoutes);
app.route('/organizations', billingRoutes);

export default app
