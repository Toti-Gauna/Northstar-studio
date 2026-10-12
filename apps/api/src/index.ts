import { app } from "./app";
import { pool } from "./db";
import { env } from "./env";
await pool.query("select 1");
const server = app.listen(env.PORT, "0.0.0.0", () =>
  console.log(`Northstar API http://localhost:${env.PORT}`),
);
process.on("SIGTERM", async () => {
  server.close();
  await pool.end();
  process.exit(0);
});
