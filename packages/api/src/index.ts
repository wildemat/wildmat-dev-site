import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());

app.use('/api/health', healthRouter);

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});

export default app;
