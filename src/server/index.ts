import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { reviewRouter } from './routes/review.js';
import { chatRouter } from './routes/chat.js';
import { fileRouter } from './routes/file.js';
import { presetsRouter } from './routes/presets.js';
import { a2uiRouter } from './routes/a2ui.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API routes
  app.use('/api', reviewRouter);
  app.use('/api', chatRouter);
  app.use('/api', fileRouter);
  app.use('/api', presetsRouter);
  app.use('/api', a2uiRouter);

  // Serve static frontend in production
  const clientPath = join(__dirname, '../../client');
  app.use(express.static(clientPath));
  app.use((req, res) => {
    res.sendFile(join(clientPath, 'index.html'));
  });

  return app;
}

export function startServer(port: number): Promise<any> {
  const app = createServer();
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      resolve(server);
    });
  });
}
