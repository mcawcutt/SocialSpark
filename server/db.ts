import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set. Database functionality will be limited.");
    
    // For deployment, provide a more friendly error
    if (process.env.NODE_ENV === 'production') {
      // We'll create a dummy pool and db that won't actually connect
      // but will allow the app to start without crashing
      pool = {} as Pool;
      db = {} as ReturnType<typeof drizzle>;
    } else {
      // In development, we'll still throw an error
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
  } else {
    // Normal initialization when DATABASE_URL is available
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log("Database connection established successfully");
  }
} catch (error) {
  console.error("Failed to initialize database:", error);
  
  // For deployment, provide a fallback to prevent crashing
  if (process.env.NODE_ENV === 'production') {
    pool = {} as Pool;
    db = {} as ReturnType<typeof drizzle>;
  } else {
    // In development, rethrow the error
    throw error;
  }
}

export { pool, db };
