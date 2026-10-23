import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 无效');
const { app } = await createApp({
  dataDir: process.env.DATA_DIR ?? fileURLToPath(new URL('../../data', import.meta.url)),
  webDir: fileURLToPath(new URL('../../dist', import.meta.url)),
});
app.listen(port, '127.0.0.1', () => console.log(`RE:FRAME API listening on port ${port}`));
