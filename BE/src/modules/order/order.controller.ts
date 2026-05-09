import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { Roles } from '../../common/decorator/role.decorator';
import { PhoneVerified } from '../../common/decorator/phone-verified.decorator';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('api/orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    // ─── Customer ─────────────────────────────────────────────────────────────

    @Post()
    @ApiOperation({ summary: '[CUSTOMER] Đặt đơn hàng mới — yêu cầu SĐT đã xác nhận' })
    createOrder(@PhoneVerified() user: any, @Body() dto: CreateOrderDto) {
        return this.orderService.createOrder(user.id, dto);
    }

    // QUAN TRỌNG: các route có tên cụ thể (me, store, available) phải đặt
    // TRƯỚC route có param (:id) để tránh NestJS match nhầm

    @Get('me')
    @ApiOperation({ summary: '[CUSTOMER] Lịch sử đơn hàng của tôi' })
    getMyOrders(@CurrentUser() user: any, @Query() query: QueryOrdersDto) {
        return this.orderService.getMyOrders(user.id, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết đơn hàng (Customer xem đơn mình / Store / Driver / Admin)' })
    getOrderById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.orderService.getOrderById(id, user.id, user.roles);
    }

    @Patch(':id/cancel')
    @ApiOperation({ summary: '[CUSTOMER] Huỷ đơn — chỉ được khi đơn đang PENDING' })
    cancelOrderByCustomer(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
        @Body() dto: CancelOrderDto,
    ) {
        return this.orderService.cancelOrderByCustomer(id, user.id, dto);
    }

    // ─── Store Owner ──────────────────────────────────────────────────────────

    @Get('store/mine')
    @ApiOperation({ summary: '[STORE] Danh sách đơn hàng của cửa hàng tôi' })
    getStoreOrders(@CurrentUser() user: any, @Query() query: QueryOrdersDto) {
        return this.orderService.getStoreOrders(user.id, query);
    }

    @Patch(':id/confirm')
    @ApiOperation({ summary: '[STORE] Xác nhận đơn: PENDING → CONFIRMED' })
    confirmOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.orderService.confirmOrder(id, user.id);
    }

    @Patch(':id/prepare')
    @ApiOperation({ summary: '[STORE] Bắt đầu chuẩn bị: CONFIRMED → PREPARING' })
    prepareOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.orderService.prepareOrder(id, user.id);
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: '[STORE] Từ chối / huỷ đơn (PENDING hoặc CONFIRMED)' })
    cancelOrderByStore(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
        @Body() dto: CancelOrderDto,
    ) {
        return this.orderService.cancelOrderByStore(id, user.id, dto);
    }

    // ─── Driver ───────────────────────────────────────────────────────────────

    @Get('driver/available')
    @Roles('DRIVER')
    @ApiOperation({ summary: '[DRIVER] Đơn PREPARING chưa có tài xế — danh sách để nhận' })
    getAvailableOrders(@Query() query: QueryOrdersDto) {
        return this.orderService.getAvailableOrders(query);
    }

    @Patch(':id/pickup')
    @Roles('DRIVER')
    @ApiOperation({ summary: '[DRIVER] Nhận đơn và lấy hàng: PREPARING → SHIPPING' })
    pickupOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.orderService.pickupOrder(id, user.id);
    }

    @Patch(':id/complete')
    @Roles('DRIVER')
    @ApiOperation({ summary: '[DRIVER] Xác nhận giao thành công: SHIPPING → COMPLETED' })
    completeOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.orderService.completeOrder(id, user.id);
    }
}
