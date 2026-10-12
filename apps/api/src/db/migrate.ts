import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { projectRoot } from "../env";
import { db, pool } from "./index";
await migrate(db, {
  migrationsFolder: path.join(projectRoot, "apps/api/migrations"),
});
console.log("Northstar migrations applied");
await pool.end();
