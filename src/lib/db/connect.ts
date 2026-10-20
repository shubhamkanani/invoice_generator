import mongoose from "mongoose";
import { InvoiceModel, UserModel } from "./models";

type ConnectionCache = { promise: Promise<typeof mongoose> | null };

// Next.js dev reloads modules on every change; keep one connection on globalThis.
const globalCache = globalThis as unknown as { __remitMongoose?: ConnectionCache };
const cache = (globalCache.__remitMongoose ??= { promise: null });

/** Returns the shared Mongoose connection, connecting (and building indexes) on first use. */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set — see .env.example");

    cache.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10_000 })
      .then(async (instance) => {
        // Make sure the unique indexes exist before the first write relies on them.
        await Promise.all([UserModel.init(), InvoiceModel.init()]);
        return instance;
      })
      .catch((error: unknown) => {
        cache.promise = null; // allow a retry on the next request
        throw error;
      });
  }
  return cache.promise;
}
