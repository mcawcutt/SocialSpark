
import fs from 'fs';
import path from 'path';
import { storage } from './storage';

export async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', timestamp);
  
  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });
  
  // Backup uploads folder
  if (fs.existsSync('uploads')) {
    fs.cpSync('uploads', path.join(backupDir, 'uploads'), { recursive: true });
  }
  
  // Backup data
  const data = {
    retailPartners: Array.from(await storage.getRetailPartnersByBrandId(1)),
    contentPosts: Array.from(await storage.getContentPostsByBrandId(1)),
    socialAccounts: [] // Add any other data you want to backup
  };
  
  fs.writeFileSync(
    path.join(backupDir, 'data.json'),
    JSON.stringify(data, null, 2)
  );
  
  return backupDir;
}
