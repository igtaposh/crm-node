import express from "express";
import cookieParser from "cookie-parser";

import accountingPeriodRouter from "./routes/accounting/accountingPeriodRoutes.js";
import chartOfAccountsRouter from "./routes/accounting/chartOfAccountsRoutes.js";
import journalEntryRouter from "./routes/accounting/journalEntryRoutes.js";
import bookingRouter from "./routes/bookings/bookingRoutes.js";
import customerRouter from "./routes/crm/customerRoutes.js";
import enquiryRouter from "./routes/crm/enquiryRoutes.js";
import leadRouter from "./routes/crm/leadRoutes.js";
import taskRouter from "./routes/crm/taskRoutes.js";
import expenseRouter from "./routes/finance/expenseRoutes.js";
import paymentRouter from "./routes/finance/paymentRoutes.js";
import refundRouter from "./routes/finance/refundRoutes.js";
import supplierPaymentRouter from "./routes/finance/supplierPaymentRoutes.js";
import creditNoteRouter from "./routes/invoices/creditNoteRoutes.js";
import invoiceRouter from "./routes/invoices/invoiceRoutes.js";
import vendorBillRouter from "./routes/invoices/vendorBillRoutes.js";
import permissionRoutes from "./routes/users/permissionRoutes.js";
import organizationsRouter from "./routes/organizations/organizationRoutes.js";
import branchRouter from "./routes/organizations/brancheRoutes.js";
import userRouter from "./routes/users/userRoutes.js";
import adminRouter from "./routes/superAdmin/adminRoutes.js";
import rolesRouter from "./routes/users/rolesRoutes.js";
import quotationRouter from "./routes/quotations/quotationRoutes.js";
import serviceRouter from "./routes/suppliers/serviceRoutes.js";
import supplierRouter from "./routes/suppliers/supplierRoutes.js";
import documentRouter from "./routes/system/documentRoutes.js";
import cancellationPolicyRouter from "./routes/tours/cancellationPolicyRoutes.js";
import destinationRouter from "./routes/tours/destinationRoutes.js";
import tourPackageRouter from "./routes/tours/tourPackageRoutes.js";
import notificationRouter from "./routes/system/notificationRoutes.js";
import { initializeDatabase, pool } from "./config/db.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/permissions", permissionRoutes);
app.use("/api/organizations", organizationsRouter);
app.use("/api/branches", branchRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/accounting", accountingPeriodRouter);
app.use("/api/chart-of-accounts", chartOfAccountsRouter);
app.use("/api/journal-entries", journalEntryRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/customers", customerRouter);
app.use("/api/enquiries", enquiryRouter);
app.use("/api/leads", leadRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/expenses", expenseRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/refunds", refundRouter);
app.use("/api/supplier-payments", supplierPaymentRouter);
app.use("/api/credit-notes", creditNoteRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/vendor-bills", vendorBillRouter);
app.use("/api/quotations", quotationRouter);
app.use("/api/services", serviceRouter);
app.use("/api/suppliers", supplierRouter);
app.use("/api/documents", documentRouter);
app.use("/api/cancellation-policies", cancellationPolicyRouter);
app.use("/api/destinations", destinationRouter);
app.use("/api/tour-packages", tourPackageRouter);
app.use("/api/notifications", notificationRouter);

app.use((req, res) => {
  return res.status(404).json({ success: false, message: "Route not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === "entity.parse.failed" ? 400 : error.status === 413 ? 413 : 500;
  const message = status === 400 ? "Invalid JSON." : status === 413 ? "Request body is too large." : "Internal server error.";
  if (status === 500) console.error("Request failed.", error.code || error.name);
  return res.status(status).json({ success: false, message });
});

try {
  const salt_rounds = Number(process.env.SALT_ROUNDS);
  if (
    !process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32 ||
    !/^[0-9a-f]{64}$/i.test(process.env.ENCRYPTION_SECRET_KEY || "") ||
    !Number.isInteger(salt_rounds) || salt_rounds < 10 || salt_rounds > 15
  ) {
    throw new Error("Configure JWT_SECRET (32 bytes minimum), ENCRYPTION_SECRET_KEY (64 hex characters), and SALT_ROUNDS (10–15).");
  }

  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT.");
  await initializeDatabase();

  const server = app.listen(port, process.env.HOST || "0.0.0.0", () => console.log(`Server listening on port ${port}`));
  server.on("error", async (error) => {
    console.error("Server could not listen.", error.code);
    await pool.end();
    process.exitCode = 1;
  });
} catch (error) {
  console.error("Server startup failed.", error.code || error.message);
  await pool.end();
  process.exitCode = 1;
}
