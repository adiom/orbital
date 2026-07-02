import { config } from "dotenv";
import postgres from "postgres";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const sql = postgres(process.env.POSTGRES_URL!);
const token = String(Math.floor(10000000 + Math.random() * 90000000));
const expires = new Date(Date.now() + 15 * 60 * 1000);

await sql`
  INSERT INTO "MagicToken" (token, email, "expiresAt", used)
  VALUES (${token}, 'adiom@list.ru', ${expires}, false)
`;

console.log("TOKEN=" + token);
console.log("LINK=http://localhost:3000/login?magic_token=" + token);

await sql.end();
