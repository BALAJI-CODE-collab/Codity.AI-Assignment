import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import router from './routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(router);

app.use((err: Error | any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = err?.statusCode ?? 500;
  const code = err?.code ?? 'server_error';
  const message = err?.message ?? 'Internal Server Error';
  const details = err?.details ?? {};

  if (err instanceof Error && (err as any).issues) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: { issues: (err as any).issues }
      }
    });
    return;
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      details
    }
  });
});

export default app;
