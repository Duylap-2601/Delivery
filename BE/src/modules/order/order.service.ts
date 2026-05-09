import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../../gateway/events.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

// ─── Shared Select ────────────────────────────────────────────────────────────

const ORDER_SELECT = {
    id: true,
    totalAmount: true,
    shippingAddress: true,
    note: true,
    status: true,
    paymentMethod: true,
    cancelReason: true,
    completedAt: true,
    createdAt: true,
    updatedAt: true,
    customer: { select: { id: true, fullName: true, email: true, phone: true } },
    store: { select: { id: true, name: true, address: true } },
    items: {
        select: {
            id: true,
            quantity: true,
            priceAtOrder: true,
            product: { select: { id: true, name: true, image: true } },
        },
    },
    delivery: {
        select: {
            id: true,
            currentLat: true,
            currentLng: true,
            pickedUpAt: true,
            deliveredAt: true,
            driver: { select: { id: true, fullName: true, phone: true } },
        },
    },
} satisfies Prisma.OrderSelect;

// ─── Helper: build pagination WHERE ──────────────────────────────────────────

function buildPagination(query: QueryOrdersDto) {
    const { page = 1, limit = 10, status } = query;
    return {
        where: status ? { status } : {},
        skip: (page - 1) * limit,
        take: limit,
        page,
        limit,
    };
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class OrderService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: EventsService,
    ) {}

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOMER
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Đặt đơn hàng mới.
     * - Validate: sản phẩm active, cùng 1 store, đủ tồn kho
     * - Atomic: trừ stock + tạo order trong 1 transaction (tránh race condition)
     */
    async createOrder(customerId: string, dto: CreateOrderDto) {
        const productIds = dto.items.map((i) => i.productId);

        // 1. Load tất cả sản phẩm 1 lần (batch query)
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, isActive: true },
        });

        // 2. Validate: tất cả product phải tồn tại và đang active
        if (products.length !== productIds.length) {
            const foundIds = new Set(products.map((p) => p.id));
            const missing = productIds.filter((id) => !foundIds.has(id));
            throw new NotFoundException(
                `Sản phẩm không tồn tại hoặc đã ngừng bán: ${missing.join(', ')}`,
            );
        }

        // 3. Validate: tất cả product phải thuộc cùng 1 store
        const storeIds = [...new Set(products.map((p) => p.storeId))];
        if (storeIds.length > 1) {
            throw new BadRequestException(
                'Mỗi đơn hàng chỉ được đặt sản phẩm từ 1 cửa hàng duy nhất',
            );
        }
        const storeId = storeIds[0];

        // 4. Build order items & kiểm tra tồn kho sơ bộ (pre-check, atomic check ở transaction)
        const orderItemsData = dto.items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!;
            if (product.stock < item.quantity) {
                throw new BadRequestException(
                    `"${product.name}" chỉ còn ${product.stock} sản phẩm`,
                );
            }
            return {
                productId: item.productId,
                quantity: item.quantity,
                priceAtOrder: product.price, // snapshot giá tại thời điểm đặt
            };
        });

        // 5. Tính tổng tiền
        const totalAmount = orderItemsData.reduce(
            (sum, item) => sum + item.priceAtOrder * item.quantity,
            0,
        );

        // 6. Transaction: atomic stock deduction → tạo order
        const order = await this.prisma.$transaction(async (tx) => {
            // Trừ stock theo kiểu atomic: updateMany với điều kiện stock >= quantity
            // Nếu count === 0 → stock không đủ (race condition) → rollback
            for (const item of orderItemsData) {
                const result = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        stock: { gte: item.quantity }, // điều kiện atomic
                    },
                    data: { stock: { decrement: item.quantity } },
                });

                if (result.count === 0) {
                    const product = products.find((p) => p.id === item.productId)!;
                    throw new ConflictException(
                        `"${product.name}" vừa hết hàng, vui lòng thử lại`,
                    );
                }
            }

            // Tạo Order + OrderItems
            return tx.order.create({
                data: {
                    customerId,
                    storeId,
                    totalAmount,
                    shippingAddress: dto.shippingAddress,
                    note: dto.note,
                    paymentMethod: 'COD',
                    items: { create: orderItemsData },
                },
                select: ORDER_SELECT,
            });
        });

        // Emit real-time: store nhận đơn mới
        this.events.emitNewOrderToStore({
            orderId: order.id,
            storeId: order.store.id,
            customerId: order.customer.id,
            totalAmount: order.totalAmount,
            itemCount: order.items.length,
        });

        return { message: 'Đặt hàng thành công', order };
    }

    /** Lịch sử đơn hàng của customer đang đăng nhập */
    async getMyOrders(customerId: string, query: QueryOrdersDto) {
        const { where, skip, take, page, limit } = buildPagination(query);

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where: { customerId, ...where },
                select: ORDER_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.order.count({ where: { customerId, ...where } }),
        ]);

        return {
            data: orders,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    /** Chi tiết 1 đơn — Customer chỉ thấy đơn của mình; Admin/Store/Driver thấy tất cả */
    async getOrderById(orderId: string, userId: string, roles: string[]) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                ...ORDER_SELECT,
                customerId: true,
                storeId: true,
                // Lấy thêm storeId để check ownership cho store owner
                store: { select: { id: true, name: true, address: true, ownerId: true } },
                delivery: {
                    select: {
                        id: true,
                        driverId: true,
                        currentLat: true,
                        currentLng: true,
                        pickedUpAt: true,
                        deliveredAt: true,
                        driver: { select: { id: true, fullName: true, phone: true } },
                    },
                },
            },
        });

        if (!order) throw new NotFoundException(`Đơn hàng "${orderId}" không tồn tại`);

        const isAdmin = roles.includes('ADMIN');
        const isCustomer = order.customerId === userId;
        const isStoreOwner = order.store.ownerId === userId;
        const isDriver = order.delivery?.driverId === userId;

        if (!isAdmin && !isCustomer && !isStoreOwner && !isDriver) {
            throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
        }

        return order;
    }

    /** Customer huỷ đơn — chỉ được khi status = PENDING */
    async cancelOrderByCustomer(orderId: string, customerId: string, dto: CancelOrderDto) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, status: true, customerId: true },
        });

        if (!order) throw new NotFoundException(`Đơn hàng "${orderId}" không tồn tại`);
        if (order.customerId !== customerId) throw new ForbiddenException('Không phải đơn của bạn');
        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(
                'Chỉ có thể huỷ đơn khi đang ở trạng thái PENDING (chờ xác nhận)',
            );
        }

        return this.performCancellation(orderId, dto.reason);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STORE OWNER
    // ═══════════════════════════════════════════════════════════════════════════

    /** Lấy store của owner, throw nếu chưa có */
    private async getOwnerStore(ownerId: string) {
        const store = await this.prisma.store.findUnique({ where: { ownerId } });
        if (!store) throw new BadRequestException('Bạn chưa có cửa hàng');
        return store;
    }

    /** Danh sách đơn hàng của store */
    async getStoreOrders(ownerId: string, query: QueryOrdersDto) {
        const store = await this.getOwnerStore(ownerId);
        const { where, skip, take, page, limit } = buildPagination(query);

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where: { storeId: store.id, ...where },
                select: ORDER_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.order.count({ where: { storeId: store.id, ...where } }),
        ]);

        return {
            data: orders,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    /** Store xác nhận đơn: PENDING → CONFIRMED, tạo Delivery record */
    async confirmOrder(orderId: string, ownerId: string) {
        const { order } = await this.getStoreOrderOrThrow(orderId, ownerId);

        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(`Chỉ có thể xác nhận đơn đang PENDING`);
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            // Tạo Delivery record (chưa có driver)
            await tx.delivery.create({ data: { orderId } });

            return tx.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.CONFIRMED },
                select: ORDER_SELECT,
            });
        });

        // Emit real-time: customer nhận được cập nhật
        this.events.emitOrderStatusChanged({
            orderId: updated.id,
            customerId: updated.customer.id,
            storeId: updated.store.id,
            status: updated.status,
        });

        return { message: 'Đã xác nhận đơn hàng', order: updated };
    }

    /** Store bắt đầu chuẩn bị: CONFIRMED → PREPARING */
    async prepareOrder(orderId: string, ownerId: string) {
        const { order } = await this.getStoreOrderOrThrow(orderId, ownerId);

        if (order.status !== OrderStatus.CONFIRMED) {
            throw new BadRequestException(`Chỉ có thể chuẩn bị đơn đang CONFIRMED`);
        }

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.PREPARING },
            select: ORDER_SELECT,
        });

        // Emit real-time: customer + thông báo pool tài xế có đơn mới
        this.events.emitOrderStatusChanged({
            orderId: updated.id,
            customerId: updated.customer.id,
            storeId: updated.store.id,
            status: updated.status,
        });
        this.events.emitNewOrderToDriverPool({
            orderId: updated.id,
            storeId: updated.store.id,
            storeAddress: updated.store.address,
            shippingAddress: updated.shippingAddress,
        });

        return { message: 'Đơn hàng đang được chuẩn bị', order: updated };
    }

    /** Store từ chối / huỷ đơn — chỉ khi PENDING hoặc CONFIRMED */
    async cancelOrderByStore(orderId: string, ownerId: string, dto: CancelOrderDto) {
        const { order } = await this.getStoreOrderOrThrow(orderId, ownerId);

        const cancelableStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
        if (!cancelableStatuses.includes(order.status)) {
            throw new BadRequestException(
                'Không thể huỷ đơn khi đang ở trạng thái PREPARING hoặc sau đó',
            );
        }

        return this.performCancellation(orderId, dto.reason);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DRIVER
    // ═══════════════════════════════════════════════════════════════════════════

    /** Danh sách đơn PREPARING chưa có tài xế — driver tự chọn nhận */
    async getAvailableOrders(query: QueryOrdersDto) {
        const { skip, take, page, limit } = buildPagination(query);

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where: {
                    status: OrderStatus.PREPARING,
                    delivery: { driverId: null }, // chưa có driver nào nhận
                },
                select: ORDER_SELECT,
                orderBy: { createdAt: 'asc' }, // FIFO — đơn cũ lên trước
                skip,
                take,
            }),
            this.prisma.order.count({
                where: { status: OrderStatus.PREPARING, delivery: { driverId: null } },
            }),
        ]);

        return {
            data: orders,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    /** Driver nhận đơn: PREPARING → SHIPPING */
    async pickupOrder(orderId: string, driverId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, status: true, delivery: { select: { id: true, driverId: true } } },
        });

        if (!order) throw new NotFoundException(`Đơn hàng "${orderId}" không tồn tại`);
        if (order.status !== OrderStatus.PREPARING) {
            throw new BadRequestException('Đơn hàng không ở trạng thái sẵn sàng để nhận');
        }
        if (!order.delivery) {
            throw new BadRequestException('Đơn hàng chưa có bản ghi giao hàng');
        }
        if (order.delivery.driverId) {
            throw new ConflictException('Đơn hàng này đã có tài xế khác nhận rồi');
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.delivery.update({
                where: { orderId },
                data: { driverId, pickedUpAt: new Date() },
            });

            return tx.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.SHIPPING },
                select: ORDER_SELECT,
            });
        });

        // Emit real-time: customer thấy "Đang giao"
        this.events.emitOrderStatusChanged({
            orderId: updated.id,
            customerId: updated.customer.id,
            storeId: updated.store.id,
            status: updated.status,
        });

        return { message: 'Đã nhận đơn, bắt đầu giao hàng', order: updated };
    }

    /** Driver xác nhận giao thành công: SHIPPING → COMPLETED */
    async completeOrder(orderId: string, driverId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, status: true, delivery: { select: { driverId: true } } },
        });

        if (!order) throw new NotFoundException(`Đơn hàng "${orderId}" không tồn tại`);
        if (order.status !== OrderStatus.SHIPPING) {
            throw new BadRequestException('Đơn hàng không ở trạng thái đang giao');
        }
        if (order.delivery?.driverId !== driverId) {
            throw new ForbiddenException('Bạn không phải tài xế của đơn hàng này');
        }

        const now = new Date();
        const updated = await this.prisma.$transaction(async (tx) => {
            await tx.delivery.update({
                where: { orderId },
                data: { deliveredAt: now },
            });

            return tx.order.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.COMPLETED,
                    completedAt: now,
                },
                select: ORDER_SELECT,
            });
        });

        // Emit real-time: customer thấy "Hoàn thành"
        this.events.emitOrderStatusChanged({
            orderId: updated.id,
            customerId: updated.customer.id,
            storeId: updated.store.id,
            status: updated.status,
        });

        return { message: 'Giao hàng thành công!', order: updated };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Lấy order thuộc store của owner, throw nếu không phải đơn của mình */
    private async getStoreOrderOrThrow(orderId: string, ownerId: string) {
        const store = await this.getOwnerStore(ownerId);

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, status: true, storeId: true },
        });

        if (!order) throw new NotFoundException(`Đơn hàng "${orderId}" không tồn tại`);
        if (order.storeId !== store.id) {
            throw new ForbiddenException('Đơn hàng này không thuộc cửa hàng của bạn');
        }

        return { order, store };
    }

    /**
     * Thực hiện huỷ đơn:
     * - Cập nhật status → CANCELLED, lưu lý do huỷ
     * - Cộng lại stock cho tất cả OrderItems
     */
    private async performCancellation(orderId: string, reason?: string) {
        const cancelled = await this.prisma.$transaction(async (tx) => {
            // Lấy items để restore stock
            const items = await tx.orderItem.findMany({
                where: { orderId },
                select: { productId: true, quantity: true },
            });

            // Cộng lại stock cho từng sản phẩm
            await Promise.all(
                items.map((item) =>
                    tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } },
                    }),
                ),
            );

            return tx.order.update({
                where: { id: orderId },
                data: {
                    status: OrderStatus.CANCELLED,
                    cancelReason: reason ?? null,
                },
                select: ORDER_SELECT,
            });
        });

        // Emit real-time: thông báo huỷ đơn
        this.events.emitOrderStatusChanged({
            orderId: cancelled.id,
            customerId: cancelled.customer.id,
            storeId: cancelled.store.id,
            status: cancelled.status,
            cancelReason: reason,
        });

        return { message: 'Đơn hàng đã được huỷ', order: cancelled };
    }
}
