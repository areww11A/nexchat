import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function setup() {
  try {
    await mkdir(`${__dirname}/data`, { recursive: true });
    await mkdir(`${__dirname}/uploads`, { recursive: true });
    console.log('Directories created successfully');
  } catch (err) {
    console.error('Error creating directories:', err);
    process.exit(1);
  }
}

setup();
