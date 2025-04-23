import { pool, db } from '../server/db';
import * as schema from '../shared/schema';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Creating database tables...');
    
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'brand',
        plan_type TEXT DEFAULT 'standard',
        logo TEXT,
        parent_id INTEGER,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created users table');
    
    // Create brands table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        logo TEXT,
        primary_color TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created brands table');
    
    // Create retail_partners table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS retail_partners (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        brand_id INTEGER NOT NULL,
        user_id INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        contact_email TEXT NOT NULL,
        contact_phone TEXT,
        address TEXT,
        footer_template TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        connection_date TIMESTAMP
      )
    `);
    console.log('Created retail_partners table');
    
    // Create social_accounts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS social_accounts (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        platform_id TEXT NOT NULL,
        platform_username TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'active',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created social_accounts table');
    
    // Create content_posts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS content_posts (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER NOT NULL,
        creator_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        platforms TEXT[] NOT NULL,
        scheduled_date TIMESTAMP,
        published_date TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'draft',
        is_evergreen BOOLEAN DEFAULT FALSE,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created content_posts table');
    
    // Create post_assignments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS post_assignments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        partner_id INTEGER NOT NULL,
        custom_footer TEXT,
        custom_tags TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        published_url TEXT,
        published_date TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created post_assignments table');
    
    // Create analytics table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analytics (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        partner_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        impressions INTEGER DEFAULT 0,
        engagements INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        date TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created analytics table');
    
    // Create media_library table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS media_library (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_type TEXT NOT NULL,
        description TEXT,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('Created media_library table');
    
    // Create sessions table for connect-pg-simple
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
      )
    `);
    console.log('Created sessions table');
    
    // Create index on sessions expiry
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire")
    `);
    console.log('Created sessions index');

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
  } finally {
    await pool.end();
  }
}

main();