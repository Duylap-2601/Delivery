import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { EventsService } from './events.service';

/**
 * WebSocket Gateway — entry point cho tất cả real-time connections.
 *
 * Client connect với header: { Authorization: "Bearer <accessToken>" }
 * Sau khi connect, client sẽ được join vào room cá nhân: user:<userId>
 *
 * Các room:
 *   user:<userId>         → notification cá nhân
 *   order:<orderId>       → tracking 1 đơn cụ thể
 *   store:<storeId>       → store nhận đơn mới
 *   driver:available      → pool đơn chờ tài xế
 *   admin:dashboard       → metrics real-time
 */
@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL ?? '*',
        credentials: true,
    },
    namespace: '/',
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(AppGateway.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly eventsService: EventsService,
    ) {}

    afterInit() {
        // Gắn server instance vào EventsService để emit từ bất kỳ đâu
        this.eventsService.setServer(this.server);
        this.logger.log('✅ WebSocket Gateway initialized');
    }

    // ─── Connection / Disconnection ───────────────────────────────────────────

    async handleConnection(client: Socket) {
        try {
            const payload = this.extractAndVerifyToken(client);
            if (!payload) {
                client.emit('error', { message: 'Unauthorized — invalid or missing token' });
                client.disconnect();
                return;
            }

            // Gắn thông tin user vào socket để dùng sau
            (client as any).user = payload;

            // Auto join vào room cá nhân
            const userRoom = `user:${payload.sub}`;
            await client.join(userRoom);

            this.logger.log(
                `🔌 Connected: ${client.id} | User: ${payload.email} | Room: ${userRoom}`,
            );

            client.emit('connected', {
                message: 'Connected to real-time server',
                userId: payload.sub,
                rooms: [userRoom],
            });
        } catch {
            client.emit('error', { message: 'Connection failed' });
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const user = (client as any).user;
        this.logger.log(
            `🔌 Disconnected: ${client.id} | User: ${user?.email ?? 'unknown'}`,
        );
    }

    // ─── Room Management ──────────────────────────────────────────────────────

    /** Client tự join vào room theo dõi 1 đơn hàng cụ thể */
    @SubscribeMessage('join:order')
    async handleJoinOrder(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { orderId: string },
    ) {
        const room = `order:${data.orderId}`;
        await client.join(room);
        this.logger.debug(`${client.id} joined room: ${room}`);
        return { event: 'joined', room };
    }

    /** Client rời room theo dõi đơn hàng */
    @SubscribeMessage('leave:order')
    async handleLeaveOrder(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { orderId: string },
    ) {
        const room = `order:${data.orderId}`;
        await client.leave(room);
        return { event: 'left', room };
    }

    /** Store join vào room nhận đơn mới */
    @SubscribeMessage('join:store')
    async handleJoinStore(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { storeId: string },
    ) {
        const user = (client as any).user;
        const room = `store:${data.storeId}`;
        await client.join(room);
        this.logger.debug(`User ${user?.email} joined store room: ${room}`);
        return { event: 'joined', room };
    }

    /** Driver join vào pool đơn chờ trong khu vực */
    @SubscribeMessage('join:driver-pool')
    async handleJoinDriverPool(@ConnectedSocket() client: Socket) {
        const room = 'driver:available';
        await client.join(room);
        return { event: 'joined', room };
    }

    /** Driver gửi vị trí GPS real-time */
    @SubscribeMessage('driver:location')
    handleDriverLocation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { orderId: string; lat: number; lng: number },
    ) {
        const user = (client as any).user;
        // Broadcast vị trí đến tất cả client đang theo dõi đơn hàng này
        this.server.to(`order:${data.orderId}`).emit('driver:location', {
            driverId: user?.sub,
            orderId: data.orderId,
            lat: data.lat,
            lng: data.lng,
            timestamp: new Date().toISOString(),
        });
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private extractAndVerifyToken(client: Socket): any {
        // Lấy token từ handshake auth hoặc header
        const token =
            client.handshake.auth?.token ??
            client.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) return null;

        try {
            return this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET ?? 'super-secret',
            });
        } catch {
            return null;
        }
    }
}
