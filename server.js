import express from "express";

import dotenv from "dotenv";
import permissionRoutes from "./routes/users/permissionRoutes.js";
import organizationsRouter from "./routes/organizations/organizationRoutes.js";
import branchRouter from "./routes/organizations/brancheRoutes.js";
import userRouter from "./routes/users/userRoutes.js";
import adminRouter from "./routes/superAdmin/adminRoutes.js";
import rolesRouter from "./routes/users/rolesRoutes.js";
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
