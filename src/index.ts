import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import { apiRouter } from './routes/apiRoutes';
import { webhookRouter } from './routes/webhookRoutes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (Dashboard UI & Chat Simulator)
app.use(express.static(path.join(__dirname, '../public')));

// Mount API & Webhook Routes
app.use('/api', apiRouter);
app.use('/api/v1/webhook', webhookRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', store: 'Shundor Product', bot: 'BikroyBot', time: new Date() });
});

// Serve frontend index.html for all SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 BikroyBot Server Running on http://localhost:${config.port}`);
  console.log(`💬 Open http://localhost:${config.port} in Chrome to test Chat Simulator & Dashboard`);
  console.log(`=======================================================`);
});
