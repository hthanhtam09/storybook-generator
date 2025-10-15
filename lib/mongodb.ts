import { MongoClient, Db } from "mongodb";

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://hthanhtam0901:hthanhtam0901@cluster0.rj7buo9.mongodb.net/storybook";
const dbName = "storybook";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export const connectToDatabase = async (): Promise<{
  client: MongoClient;
  db: Db;
}> => {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
};

export const getDb = async (): Promise<Db> => {
  const { db } = await connectToDatabase();
  return db;
};
