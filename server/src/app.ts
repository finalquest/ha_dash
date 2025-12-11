import express from 'express';
import apiRouter from './routes';

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use('/api', apiRouter);

  return app;
};

export type App = ReturnType<typeof createApp>;
