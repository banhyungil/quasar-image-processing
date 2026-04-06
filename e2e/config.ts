import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const TEST_IMAGE_DIR = process.env.E2E_TEST_IMAGE_DIR
  ? path.resolve(process.env.E2E_TEST_IMAGE_DIR)
  : path.join(__dirname, 'fixtures');

export const TEST_IMAGE = path.join(TEST_IMAGE_DIR, 'test.png');
