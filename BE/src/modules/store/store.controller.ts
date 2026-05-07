import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { QueryStoresDto } from './dto/query-stores.dto';
import { Public } from '../../common/decorator/public.decorator';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { Roles } from '../../common/decorator/role.decorator';

@ApiTags('Stores')
@Controller('api/stores')
export class StoreController {
    constructor(private readonly storeService: StoreService) {}

    // ─── Public routes (không cần đăng nhập) ─────────────────────────────────

    @Public()
    @Get()
    @ApiOperation({ summary: 'Browse all stores (public, supports search & type filter)' })
    findAll(@Query() query: QueryStoresDto) {
        return this.storeService.findAll(query);
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Get store detail by ID (public)' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.storeService.findOne(id);
    }

    // ─── Owner routes ─────────────────────────────────────────────────────────

    @ApiBearerAuth()
    @Get('owner/mine')
    @ApiOperation({ summary: 'Get your own store' })
    findMine(@CurrentUser() user: any) {
        return this.storeService.findMine(user.id);
    }

    @ApiBearerAuth()
    @Post()
    @ApiOperation({ summary: 'Create your store (one store per account)' })
    create(
        @CurrentUser() user: any,
        @Body() dto: CreateStoreDto,
    ) {
        return this.storeService.create(user.id, dto);
    }

    @ApiBearerAuth()
    @Patch(':id')
    @ApiOperation({ summary: 'Update store info (owner or ADMIN only)' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
        @Body() dto: UpdateStoreDto,
    ) {
        return this.storeService.update(id, user.id, user.roles, dto);
    }

    @ApiBearerAuth()
    @Delete('owner/mine')
    @ApiOperation({ summary: 'Delete your own store' })
    async removeMine(@CurrentUser() user: any) {
        // Tìm store của owner trước rồi xóa
        const store = await this.storeService.findMine(user.id);
        return this.storeService.remove(store.id, user.id, user.roles);
    }

    // ─── Admin routes ─────────────────────────────────────────────────────────

    @ApiBearerAuth()
    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: '[ADMIN] Force-delete any store by ID' })
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ) {
        return this.storeService.remove(id, user.id, user.roles);
    }
}
