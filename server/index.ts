import 'dotenv/config';
import { app } from './app.js';
import { db } from './db.js';
const server = app.listen(Number(process.env.PORT || 4000), '0.0.0.0', () =>
  console.log('OpsBoard API listening on port ' + (process.env.PORT || 4000)),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(async () => {
      await db.$disconnect();
      process.exit(0);
    }),
  );
