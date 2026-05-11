import mongoose from "mongoose";

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = global as typeof globalThis & { mongooseCache?: Cached };

const cached = globalWithMongoose.mongooseCache || { conn: null, promise: null };
globalWithMongoose.mongooseCache = cached;

export async function connectDb() {
  if (cached.conn) return cached.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  cached.promise ||= mongoose.connect(uri, { bufferCommands: false });
  cached.conn = await cached.promise;
  return cached.conn;
}
