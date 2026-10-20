/*
 * Optional local MongoDB for trying the app without Atlas. Data persists in
 * .data/mongo (git-ignored) between runs. Point MONGODB_URI at
 * mongodb://127.0.0.1:27017/remit while this is running.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const dbPath = path.resolve(".data/mongo");
  mkdirSync(dbPath, { recursive: true });

  const server = await MongoMemoryServer.create({
    instance: { port: 27017, dbPath, storageEngine: "wiredTiger" },
  });
  console.log(`Local MongoDB is running at ${server.getUri()} (data in ${dbPath}).`);
  console.log("Use MONGODB_URI=mongodb://127.0.0.1:27017/remit in .env. Press Ctrl+C to stop.");

  const stop = async () => {
    await server.stop({ doCleanup: false }); // keep the data files
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
