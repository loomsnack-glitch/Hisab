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
import tableServiceRoutes from './modules/tenant/table-service/table-service.routes';
import whatsappRoutes, { whatsappInternalRoutes } from './modules/tenant/whatsapp/whatsapp.routes';
import { whatsappCloudWebhookRoutes } from './modules/tenant/whatsapp/cloud-api/cloud-webhook.routes';
import googleContactsRoutes from './modules/tenant/google-contacts/google-contacts.routes';
import unitsRoutes from './modules/tenant/units/units.routes';
import expenseCategoriesRoutes from './modules/tenant/expense-categories/expense-categories.routes';
import vendorsRoutes from './modules/tenant/vendors/vendors.routes';
import moneyAccountsRoutes from './modules/tenant/money-accounts/money-accounts.routes';
import purchasesRoutes from './modules/tenant/purchases/purchases.routes';
import expensesRoutes from './modules/tenant/expenses/expenses.routes';
import googleContactsInternalRoutes from './modules/tenant/google-contacts/google-contacts.internal-routes';
import publicInvoiceRoutes from './modules/tenant/whatsapp/public-invoice.routes';

const BASE_PATH = process.env.BASE_PATH
const app = BASE_PATH ? new Hono().basePath(BASE_PATH) : new Hono();

const consoleOrigin = process.env.CONSOLE_ORIGIN?.trim() || "https://console.ganatri.in";
const allowedOrigins = process.env.NODE_ENV === "production"
    ? [
        "https://ganatri.in",
        "https://www.ganatri.in",
        "https://admin.ganatri.in",
        "https://pos.ganatri.in",
        consoleOrigin,
        // Keep the previous host allowed so ganatri.loomsnack.com can stay live
        // until the ganatri.in cutover is finished.
        "https://ganatri.loomsnack.com",
    ]
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "https://ganatri.in",
        "https://admin.ganatri.in",
        "https://pos.ganatri.in",
        consoleOrigin,
        "https://ganatri.loomsnack.com",
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
app.route('/organizations', tableServiceRoutes);
app.route('/organizations', whatsappRoutes);
app.route('/organizations', googleContactsRoutes);
app.route('/organizations', unitsRoutes);
app.route('/organizations', expenseCategoriesRoutes);
app.route('/organizations', vendorsRoutes);
app.route('/organizations', moneyAccountsRoutes);
app.route('/organizations', purchasesRoutes);
app.route('/organizations', expensesRoutes);
app.route('/internal/whatsapp', whatsappInternalRoutes);
app.route('/internal/google-contacts', googleContactsInternalRoutes);
app.route('/public/whatsapp', publicInvoiceRoutes);
app.route('/webhooks/whatsapp', whatsappCloudWebhookRoutes);

export default app
