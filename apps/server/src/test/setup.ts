import path from 'path';
import dotenv from 'dotenv';

// Load server env before env.ts validation runs in imported modules.
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../client/.env') });

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
