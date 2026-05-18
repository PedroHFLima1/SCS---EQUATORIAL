const { Client } = require('pg');

const originalUrl = process.env.DATABASE_URL;
let directUrl = originalUrl;
if (originalUrl) {
  directUrl = originalUrl.replace('6543', '5432').replace('?pgbouncer=true', '');
}

async function main() {
  const client = new Client({ connectionString: directUrl });
  await client.connect();
  try {
    await client.query('ALTER TABLE "Process" ADD COLUMN "data_triagem" TIMESTAMP(3)');
    console.log("Column added successfully!");
  } catch (e) {
    if (e.code === '42701') {
      console.log("Column already exists.");
    } else {
      console.error(e);
      process.exit(1);
    }
  }
  await client.end();
}

main();
