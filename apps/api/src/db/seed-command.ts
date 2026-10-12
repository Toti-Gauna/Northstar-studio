import { pool } from "./index";
import { createDemoWorkspace } from "./seed";
const result = await createDemoWorkspace();
console.log(
  `Seeded isolated Northstar workspace ${result.workspace.id}. New browser sessions seed their own workspace automatically.`,
);
await pool.end();
