const { execSync } = require('child_process');
const originalUrl = process.env.DATABASE_URL;
let directUrl = originalUrl;
if (originalUrl) {
  directUrl = originalUrl.replace('6543', '5432').replace('?pgbouncer=true', '');
  console.log('Using directUrl:', directUrl);
}
try {
  execSync(`npx prisma db push --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: directUrl },
    stdio: 'inherit'
  });
} catch (e) {
  process.exit(1);
}
