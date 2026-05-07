import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        // Prisma 7 requires a driver adapter for direct DB connections
        const adapter = new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        });

        super({
            adapter,
            log: [
                { level: 'warn', emit: 'event' },
                { level: 'error', emit: 'event' },
            ],
        });
    }

    // Connect early on startup to avoid cold-start latency on first request
    async onModuleInit() {
        await this.$connect();
        this.logger.log('Prisma connected to database');
        this.startKeepAlive();
    }

    /**
     * Ping DB every 2 minutes to prevent Neon from suspending the connection.
     * Neon suspends after ~5 min idle → 2 min ping = safe buffer.
     */
    private startKeepAlive() {
        const INTERVAL_MS = 2 * 60 * 1000;
        setInterval(async () => {
            try {
                await this.$queryRaw`SELECT 1`;
                this.logger.debug('[KeepAlive] DB ping OK');
            } catch (err) {
                this.logger.warn('[KeepAlive] DB ping failed, reconnecting...', err);
                await this.$connect().catch(() => null);
            }
        }, INTERVAL_MS);
    }
}