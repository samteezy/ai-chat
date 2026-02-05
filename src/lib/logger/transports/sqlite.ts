import Transport from 'winston-transport';
import { db } from '@/lib/db';
import { logs } from '@/lib/db/schema';
import { generateLogId } from '@/lib/utils/id';
import { isLogSavingEnabledSync } from '../settings';

interface SQLiteTransportOptions extends Transport.TransportStreamOptions {
  // Additional options can be added here if needed
}

export class SQLiteTransport extends Transport {
  constructor(opts?: SQLiteTransportOptions) {
    super(opts);
  }

  log(info: { level: string; message: string; source?: string; requestId?: string; context?: Record<string, unknown> }, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Check if log saving is enabled before persisting
    if (!isLogSavingEnabledSync()) {
      callback();
      return;
    }

    try {
      const level = info.level as 'debug' | 'info' | 'warn' | 'error';
      db.insert(logs).values({
        id: generateLogId(),
        level,
        message: info.message,
        context: info.context ?? null,
        source: info.source || 'app',
        requestId: info.requestId ?? null,
        createdAt: new Date(),
      }).run();
    } catch (err) {
      // Don't let logging failures break the application
      console.error('Failed to persist log:', err);
    }

    callback();
  }
}
