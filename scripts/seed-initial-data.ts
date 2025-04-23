import { pool, db } from '../server/db';
import * as schema from '../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  try {
    console.log('Seeding initial data...');

    // Check if admin user exists
    const adminUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, 'admin'));
    
    // Create admin user if it doesn't exist
    if (adminUsers.length === 0) {
      const hashedPassword = await hashPassword('Ignyt456#');
      
      // Insert admin user
      const [adminUser] = await db
        .insert(schema.users)
        .values({
          username: 'admin',
          password: hashedPassword,
          name: 'Administrator',
          email: 'admin@ignyt.com',
          role: 'admin'
        })
        .returning();
      
      console.log('Created admin user:', adminUser.id);
    } else {
      console.log('Admin user already exists, skipping creation');
    }

    // Check if Dulux brand exists
    const duluxBrands = await db
      .select()
      .from(schema.brands)
      .where(eq(schema.brands.name, 'Dulux'));
    
    // Create demo brand if it doesn't exist
    if (duluxBrands.length === 0) {
      // First create a brand user
      const hashedPassword = await hashPassword('Brand123#');
      
      const [brandUser] = await db
        .insert(schema.users)
        .values({
          username: 'dulux',
          password: hashedPassword,
          name: 'Dulux Marketing',
          email: 'marketing@dulux.com',
          role: 'brand',
          logo: '/uploads/demo-logo.png'
        })
        .returning();
      
      console.log('Created brand user:', brandUser.id);
      
      // Then create the brand
      const [brand] = await db
        .insert(schema.brands)
        .values({
          name: 'Dulux',
          ownerId: brandUser.id,
          logo: '/uploads/demo-logo.png',
          primaryColor: '#2A56C6',
          metadata: {
            description: 'Premium paint and coating manufacturer'
          }
        })
        .returning();
      
      console.log('Created brand:', brand.id);
      
      // Seed some retail partners
      for (let i = 1; i <= 10; i++) {
        const status = i <= 7 ? 'active' : (i <= 9 ? 'pending' : 'needs_attention');
        
        const [partner] = await db
          .insert(schema.retailPartners)
          .values({
            name: `Paint Supply ${i}`,
            brandId: brand.id,
            status: status,
            contactEmail: `contact${i}@paintsupply.com`,
            contactPhone: `+1 (555) 123-${1000 + i}`,
            address: `${100 + i} Main Street, Paintsville`,
            footerTemplate: 'Visit our store for exclusive Dulux paint deals!',
            metadata: {
              region: i % 3 === 0 ? 'North' : (i % 3 === 1 ? 'South' : 'East'),
              type: i % 2 === 0 ? 'Retail' : 'Wholesale'
            },
            connectionDate: status === 'active' ? new Date() : null
          })
          .returning();
        
        console.log(`Created retail partner ${i}:`, partner.id);
        
        // Add a social account for active partners
        if (status === 'active') {
          const [socialAccount] = await db
            .insert(schema.socialAccounts)
            .values({
              partnerId: partner.id,
              platform: 'facebook',
              accountId: `fb_${1000000 + partner.id}`,
              accountName: `paintsupply${i}`,
              accessToken: 'mock-token-for-demo',
              status: 'active'
            })
            .returning();
          
          console.log(`Created social account for partner ${i}:`, socialAccount.id);
        }
      }
      
      // Seed some content posts
      const postTypes = [
        {
          title: 'New Spring Colors',
          description: 'Introducing our new spring color palette, perfect for refreshing your home.',
          imageUrl: '/uploads/demo-outdoor.png',
          isEvergreen: false
        },
        {
          title: 'Weekend Special: 20% Off',
          description: 'This weekend only! Get 20% off all premium Dulux paints at your local retailer.',
          imageUrl: '/uploads/demo-logo.png',
          isEvergreen: true
        },
        {
          title: 'How to Choose the Right Paint',
          description: 'Tips and tricks for selecting the perfect paint for your next project.',
          imageUrl: '/uploads/demo-biking.png',
          isEvergreen: true
        }
      ];
      
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Create scheduled posts
      for (let i = 0; i < 3; i++) {
        const postData = postTypes[i];
        const scheduledDate = i === 0 ? tomorrow : (i === 1 ? nextWeek : null);
        const status = scheduledDate ? 'scheduled' : (postData.isEvergreen ? 'automated' : 'draft');
        
        const [post] = await db
          .insert(schema.contentPosts)
          .values({
            brandId: brand.id,
            creatorId: brandUser.id,
            title: postData.title,
            description: postData.description,
            imageUrl: postData.imageUrl,
            platforms: ['facebook', 'instagram'],
            scheduledDate: scheduledDate,
            status: status,
            isEvergreen: postData.isEvergreen,
            metadata: {
              tags: ['paint', 'home', 'design'],
              category: i === 0 ? 'promotion' : (i === 1 ? 'sale' : 'education')
            }
          })
          .returning();
        
        console.log(`Created content post ${i+1}:`, post.id);
        
        // Create assignments for this post to first 3 partners
        if (i < 2) {
          for (let j = 1; j <= 3; j++) {
            const partners = await db
              .select()
              .from(schema.retailPartners)
              .where(eq(schema.retailPartners.brandId, brand.id))
              .limit(3);
            
            if (partners.length > 0) {
              const [assignment] = await db
                .insert(schema.postAssignments)
                .values({
                  postId: post.id,
                  partnerId: partners[j-1].id,
                  customFooter: j === 1 ? 'Special offer for our loyal customers!' : null,
                  status: 'pending'
                })
                .returning();
              
              console.log(`Created post assignment for post ${post.id} to partner ${partners[j-1].id}:`, assignment.id);
            }
          }
        }
      }
      
      // Create some media items
      const mediaItems = [
        {
          name: 'Dulux Logo',
          fileUrl: '/uploads/demo-logo.png',
          fileType: 'image/png',
          description: 'Official Dulux logo',
          tags: ['logo', 'branding']
        },
        {
          name: 'Outdoor Paint Ad',
          fileUrl: '/uploads/demo-outdoor.png',
          fileType: 'image/png',
          description: 'Outdoor paint advertisement',
          tags: ['advertisement', 'outdoor']
        },
        {
          name: 'Spring Campaign Image',
          fileUrl: '/uploads/demo-biking.png',
          fileType: 'image/png',
          description: 'Spring campaign promotional image',
          tags: ['campaign', 'spring', 'promotional']
        }
      ];
      
      for (const item of mediaItems) {
        const [mediaItem] = await db
          .insert(schema.mediaLibrary)
          .values({
            brandId: brandUser.id,
            name: item.name,
            fileUrl: item.fileUrl,
            fileType: item.fileType,
            description: item.description,
            tags: item.tags
          })
          .returning();
        
        console.log(`Created media item:`, mediaItem.id);
      }
      
      console.log('Demo data seeded successfully');
    } else {
      console.log('Dulux brand already exists, skipping demo data creation');
    }

  } catch (error) {
    console.error('Error seeding initial data:', error);
  } finally {
    await pool.end();
  }
}

main();