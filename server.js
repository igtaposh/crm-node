import express from "express";

import dotenv from "dotenv";
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
import { initializeDatabase, pool } from "./config/db.js";

const app = express();
dotenv.config();

app.use(express.json());

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

try {
  app.listen(process.env.PORT, async () => {
    console.log(`Server listening on port ${process.env.PORT}`);
    await initializeDatabase();
  });
} catch (error) {
  console.error(
    "Failed to initialize the database or start the server:",
    error,
  );
  await pool.end();
  process.exitCode = 1;
}
