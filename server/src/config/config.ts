import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  server: {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/hydra',
  },
  security: {
    bcryptSaltRounds: 10,
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // maximum 100 requests per window
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }
}; 