import { Hono } from 'hono';
import { cors } from "hono/cors";
import { accessLog } from './middlewares/access-log';
import { deviceMiddleware } from './middlewares/device.middleware';
import authRoutes from './modules/access-control/auth/auth.routes';
import deviceAuthRoutes from './modules/access-control/device-auth/device-auth.routes';
import commonRoutes from './modules/common/common.routes';
import posRoutes from './modules/pos/pos.routes';
import { createPlatformRoutes } from './modules/platform/platform.routes';
import billingRoutes from './modules/tenant/billing/billing.routes';
import catalogRoutes from './modules/tenant/catalog/catalog.routes';
import organizationRoutes from './modules/tenant/organization/organization.routes';
import purchaseRoutes from './modules/tenant/purchase/purchase.routes';
import tableServiceRoutes from './modules/tenant/table-service/table-service.routes';
import whatsappRoutes, { whatsappInternalRoutes } from './modules/tenant/whatsapp/whatsapp.routes';

const BASE_PATH = process.env.BASE_PATH
const app = BASE_PATH ? new Hono().basePath(BASE_PATH) : new Hono();

const consoleOrigin = process.env.CONSOLE_ORIGIN?.trim() || "https://console.ganatri.in";
const allowedOrigins = process.env.NODE_ENV === "production"
    ? ["https://ganatri.loomsnack.com", consoleOrigin]
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "https://ganatri.loomsnack.com",
        "https://ganatri.loomsanck.in",
    ];

app.use('*', cors({
    origin: (origin) => {
        if (process.env.NODE_ENV !== "production") {
            return origin;
        }
        return allowedOrigins.includes(origin) ? origin : undefined;
    },
    credentials: true,
}));

// Middleware
app.use('*', accessLog());
app.use('*', deviceMiddleware)

// Routes
app.get('/', (c) => {
    return c.text('Hello World');
});

app.route('/auth', authRoutes);
app.route('/device-auth', deviceAuthRoutes);
app.route('/common', commonRoutes);
app.route('/pos', posRoutes);
app.route('/platform', createPlatformRoutes());
app.route('/organizations', organizationRoutes);
app.route('/organizations', catalogRoutes);
app.route('/organizations', billingRoutes);
app.route('/organizations', purchaseRoutes);
app.route('/organizations', tableServiceRoutes);
app.route('/organizations', whatsappRoutes);
app.route('/internal/whatsapp', whatsappInternalRoutes);

export default app
