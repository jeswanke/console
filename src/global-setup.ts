import fs from 'fs';
import path from 'path';

async function globalSetup() {
  const authDir = path.join(__dirname, '../.auth');
  
  // Clean up .auth directory before each test run
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true });
    console.log('Cleaned up .auth directory');
  }
  
  // Recreate the directory
  fs.mkdirSync(authDir, { recursive: true });
}

export default globalSetup;

