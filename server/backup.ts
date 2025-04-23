
import fs from 'fs';
import path from 'path';
import { storage } from './storage';

export async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', timestamp);
  const backupFile = `backup-${timestamp}.tar.gz`;
  
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

  // Create tar.gz archive
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(backupFile);
    const archive = require('tar').c(
      {
        gzip: true,
        filter: (path) => !path.includes('node_modules') && !path.includes('.git')
      },
      ['.']
    );
    
    archive.pipe(output);
    output.on('close', resolve);
    archive.on('error', reject);
  });

  // Clean up backup directory
  fs.rmSync(backupDir, { recursive: true });
  
  return backupFile;
}
