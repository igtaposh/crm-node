import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Database
import { initializeDatabase, pool } from "./config/db.js";

// Accounting routes
import accountingPeriodRouter from "./routes/accounting/accountingPeriodRoutes.js";
import chartOfAccountsRouter from "./routes/accounting/chartOfAccountsRoutes.js";
import journalEntryRouter from "./routes/accounting/journalEntryRoutes.js";

// Booking routes
import bookingRouter from "./routes/bookings/bookingRoutes.js";

// CRM routes
import customerRouter from "./routes/crm/customerRoutes.js";
import enquiryRouter from "./routes/crm/enquiryRoutes.js";
import leadRouter from "./routes/crm/leadRoutes.js";
import taskRouter from "./routes/crm/taskRoutes.js";

// Finance routes
import expenseRouter from "./routes/finance/expenseRoutes.js";
import paymentRouter from "./routes/finance/paymentRoutes.js";
import refundRouter from "./routes/finance/refundRoutes.js";
import supplierPaymentRouter from "./routes/finance/supplierPaymentRoutes.js";

// Invoice routes
import creditNoteRouter from "./routes/invoices/creditNoteRoutes.js";
import invoiceRouter from "./routes/invoices/invoiceRoutes.js";
import vendorBillRouter from "./routes/invoices/vendorBillRoutes.js";

// Organization routes
import organizationsRouter from "./routes/organizations/organizationRoutes.js";
import branchRouter from "./routes/organizations/brancheRoutes.js";

// User routes
import permissionRoutes from "./routes/users/permissionRoutes.js";
import userRouter from "./routes/users/userRoutes.js";
import rolesRouter from "./routes/users/rolesRoutes.js";

// Super admin routes
import adminRouter from "./routes/superAdmin/adminRoutes.js";

// Quotation routes
import quotationRouter from "./routes/quotations/quotationRoutes.js";

// Supplier routes
import serviceRouter from "./routes/suppliers/serviceRoutes.js";
import supplierRouter from "./routes/suppliers/supplierRoutes.js";

// System routes
import documentRouter from "./routes/system/documentRoutes.js";
import notificationRouter from "./routes/system/notificationRoutes.js";

// Tour routes
import cancellationPolicyRouter from "./routes/tours/cancellationPolicyRoutes.js";
import destinationRouter from "./routes/tours/destinationRoutes.js";
import tourPackageRouter from "./routes/tours/tourPackageRoutes.js";

const app = express();

const PORT = Number(process.env.PORT || 3000);

let server;
let isShuttingDown = false;

// ==========================================
// SECURITY CONFIGURATION
// ==========================================

app.disable("x-powered-by");

app.use(helmet());

// Enable only if deployed behind a trusted proxy
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin not allowed.");
      error.status = 403;

      return callback(error);
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "Idempotency-Key",
    ],
  }),
);

// ==========================================
// RATE LIMITER
// ==========================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 300,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// ==========================================
// REQUEST PARSERS
// ==========================================

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

app.use(cookieParser());

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "CRM server is running.",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      success: true,
      message: "Server is healthy.",
      database: "connected",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: "Service unavailable.",
      database: "disconnected",
    });
  }
});

// ==========================================
// ORGANIZATION ROUTES
// ==========================================

app.use("/api/organizations", organizationsRouter);
app.use("/api/branches", branchRouter);

// ==========================================
// USER & ADMIN ROUTES
// ==========================================

app.use("/api/users", userRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/permissions", permissionRoutes);
app.use("/api/admin", adminRouter);

// ==========================================
// ACCOUNTING ROUTES
// ==========================================

app.use("/api/accounting", accountingPeriodRouter);
app.use("/api/chart-of-accounts", chartOfAccountsRouter);
app.use("/api/journal-entries", journalEntryRouter);

// ==========================================
// CRM ROUTES
// ==========================================

app.use("/api/customers", customerRouter);
app.use("/api/enquiries", enquiryRouter);
app.use("/api/leads", leadRouter);
app.use("/api/tasks", taskRouter);

// ==========================================
// BOOKING ROUTES
// ==========================================

app.use("/api/bookings", bookingRouter);

// ==========================================
// FINANCE ROUTES
// ==========================================

app.use("/api/expenses", expenseRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/refunds", refundRouter);
app.use("/api/supplier-payments", supplierPaymentRouter);

// ==========================================
// INVOICE ROUTES
// ==========================================

app.use("/api/credit-notes", creditNoteRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/vendor-bills", vendorBillRouter);

// ==========================================
// QUOTATION ROUTES
// ==========================================

app.use("/api/quotations", quotationRouter);

// ==========================================
// SUPPLIER ROUTES
// ==========================================

app.use("/api/services", serviceRouter);
app.use("/api/suppliers", supplierRouter);

// ==========================================
// TOUR ROUTES
// ==========================================

app.use("/api/cancellation-policies", cancellationPolicyRouter);
app.use("/api/destinations", destinationRouter);
app.use("/api/tour-packages", tourPackageRouter);

// ==========================================
// SYSTEM ROUTES
// ==========================================

app.use("/api/documents", documentRouter);
app.use("/api/notifications", notificationRouter);

// ==========================================
// 404 ROUTE HANDLER
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

// app.use((error, req, res, next) => {
//   if (res.headersSent) {
//     return next(error);
//   }

//   let status = error.status || error.statusCode || 500;

//   if (!Number.isInteger(status) || status < 400 || status > 599) {
//     status = 500;
//   }

//   let message = "Internal server error.";

//   if (error.type === "entity.parse.failed") {
//     status = 400;
//     message = "Invalid JSON.";
//   } else {
//     switch (status) {
//       case 400:
//         message = "Invalid request.";
//         break;

//       case 401:
//         message = "Unauthorized access.";
//         break;

//       case 403:
//         message = "Access denied.";
//         break;

//       case 404:
//         message = "Resource not found.";
//         break;

//       case 409:
//         message = "Resource conflict.";
//         break;

//       case 413:
//         message = "Request body is too large.";
//         break;

//       case 422:
//         message = "Invalid request data.";
//         break;

//       case 429:
//         message = "Too many requests.";
//         break;

//       case 503:
//         message = "Service unavailable.";
//         break;

//       default:
//         if (status < 500) {
//           message = "Request could not be processed.";
//         }
//         break;
//     }
//   }

//   if (status >= 500) {
//     console.error("Request failed:", {
//       method: req.method,
//       code: error.code,
//       name: error.name,
//       status,
//     });
//   }

//   return res.status(status).json({
//     success: false,
//     message,
//   });
// });

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

const shutdown = async (exitCode = 0) => {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log("Shutting down server...");

  const forceShutdown = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10000);

  forceShutdown.unref();

  try {
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) return reject(error);

          resolve();
        });
      });

      console.log("HTTP server closed.");
    }

    await pool.end();

    console.log("PostgreSQL connection pool closed.");

    clearTimeout(forceShutdown);

    process.exit(exitCode);
  } catch (error) {
    console.error("Shutdown failed:", error.message);

    process.exit(1);
  }
};

// ==========================================
// SERVER STARTUP
// ==========================================

const startServer = async () => {
  try {
    if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
      throw new Error("Invalid PORT.");
    }

    await initializeDatabase();

    console.log("Database initialized successfully.");

    server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });

    server.on("error", (error) => {
      console.error("Server error:", error.code || error.name);

      void shutdown(1);
    });
  } catch (error) {
    console.error("Server startup failed:", error.code || error.message);
    console.error("Server startup failed:", {
      code: error.code,
      message: error.message,
      detail: error.detail,
      hint: error.hint,
      schema: error.schema,
      table: error.table,
      where: error.where,
      stack: error.stack,
    });

    await shutdown(1);
  }
};

// ==========================================
// PROCESS SIGNALS
// ==========================================

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error.code || error.name);

  void shutdown(1);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error?.code || error?.name);

  void shutdown(1);
});

// Start application
startServer();
