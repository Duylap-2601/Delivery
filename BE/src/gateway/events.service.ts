import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * EventsService — service dùng nội bộ để emit events từ bất kỳ module nào.
 *
 * Inject service này vào OrderService, StoreService... để emit real-time events
 * mà không cần biết chi tiết về Socket.IO.
 *
 * Các event được phát ra:
 *
 *   order:status_changed  → Customer & Store biết trạng thái đơn thay đổi
 *   order:new             → Store nhận đơn mới
 *   driver:new_order      → Pool tài xế có đơn mới chờ nhận
 *   notification          → Thông báo chung cho user
 */
@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);
    private server: Server | null = null;

    /** Được gọi từ AppGateway.afterInit() để gắn server instance */
    setServer(server: Server) {
        this.server = server;
    }

    // ─── Order Events ─────────────────────────────────────────────────────────

    /**
     * Emit khi trạng thái đơn hàng thay đổi.
     * Phát đến: room của đơn + room cá nhân của customer
     */
    emitOrderStatusChanged(payload: {
        orderId: string;
        customerId: string;
        storeId: string;
        status: string;
        cancelReason?: string;
    }) {
        if (!this.server) return;

        const event = 'order:status_changed';
        const data = { ...payload, timestamp: new Date().toISOString() };

        // Phát đến tất cả người đang theo dõi đơn này
        this.server.to(`order:${payload.orderId}`).emit(event, data);

        // Phát thêm đến room cá nhân của customer
        this.server.to(`user:${payload.customerId}`).emit(event, data);

        this.logger.debug(
            `[emit] ${event} → order:${payload.orderId} | status: ${payload.status}`,
        );
    }

    /**
     * Emit khi có đơn mới cho store.
     * Phát đến: room của store
     */
    emitNewOrderToStore(payload: {
        orderId: string;
        storeId: string;
        customerId: string;
        totalAmount: number;
        itemCount: number;
    }) {
        if (!this.server) return;

        const data = { ...payload, timestamp: new Date().toISOString() };
        this.server.to(`store:${payload.storeId}`).emit('order:new', data);

        this.logger.debug(`[emit] order:new → store:${payload.storeId}`);
    }

    /**
     * Emit khi có đơn mới cần tài xế (PREPARING → chờ driver nhận).
     * Phát đến: driver:available pool
     */
    emitNewOrderToDriverPool(payload: {
        orderId: string;
        storeId: string;
        storeAddress: string;
        shippingAddress: string;
    }) {
        if (!this.server) return;

        const data = { ...payload, timestamp: new Date().toISOString() };
        this.server.to('driver:available').emit('driver:new_order', data);

        this.logger.debug(`[emit] driver:new_order → pool | order:${payload.orderId}`);
    }

    /**
     * Emit thông báo chung đến 1 user cụ thể.
     */
    emitNotification(userId: string, payload: { title: string; body: string; data?: any }) {
        if (!this.server) return;

        this.server.to(`user:${userId}`).emit('notification', {
            ...payload,
            timestamp: new Date().toISOString(),
        });

        this.logger.debug(`[emit] notification → user:${userId} | ${payload.title}`);
    }
}
