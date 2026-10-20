import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { connectToDatabase } from "@/lib/db/connect";

/**
 * Runs the file's tests against a throwaway in-memory MongoDB. Collections are
 * emptied (not dropped) between tests so unique indexes stay in place.
 */
export function setupTestDatabase() {
  let server: MongoMemoryServer | undefined;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    process.env.MONGODB_URI = server.getUri("remit-test");
  });

  beforeEach(async () => {
    const { connection } = await connectToDatabase();
    await Promise.all(Object.values(connection.collections).map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await server?.stop();
  });
}
