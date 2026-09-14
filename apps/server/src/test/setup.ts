import path from 'path';
import dotenv from 'dotenv';

// Load server env before env.ts validation runs in imported modules.
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../client/.env') });

// Unit tests assert raw R2 keys. Production signing is covered by mediaPlaybackUrl tests
// and MatchEngine/daily playback mocks — do not inherit a developer Worker URL here.
process.env.MEDIA_PLAYBACK_URL = '';
process.env.MEDIA_PLAYBACK_SECRET = '';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
