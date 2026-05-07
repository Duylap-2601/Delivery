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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { Public } from '../../common/decorator/public.decorator';
import { CurrentUser } from '../../common/decorator/current-user.decorator';

@ApiTags('Products')
@Controller('api/products')
export class ProductController {
    constructor(private readonly productService: ProductService) {}

    // ─── Public routes ────────────────────────────────────────────────────────

    @Public()
    @Get()
    @ApiOperation({
        summary: 'Browse products (public) — filter by store, category, price, search',
    })
    findAll(@Query() query: QueryProductsDto) {
        return this.productService.findAll(query);
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Get product detail (public)' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.productService.findOne(id);
    }

    // ─── Owner routes (store owner manages their products) ────────────────────

    @ApiBearerAuth()
    @Get('owner/mine')
    @ApiOperation({ summary: "List your store's products (owner — includes inactive)" })
    findMyProducts(
        @CurrentUser() user: any,
        @Query() query: QueryProductsDto,
    ) {
        return this.productService.findMyProducts(user.id, query);
    }

    @ApiBearerAuth()
    @Post('owner/mine')
    @ApiOperation({ summary: 'Add a product to your store' })
    create(
        @CurrentUser() user: any,
        @Body() dto: CreateProductDto,
    ) {
        return this.productService.create(user.id, dto);
    }

    @ApiBearerAuth()
    @Patch('owner/mine/:id')
    @ApiOperation({ summary: 'Update a product in your store' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
        @Body() dto: UpdateProductDto,
    ) {
        return this.productService.update(id, user.id, dto);
    }

    @ApiBearerAuth()
    @Patch('owner/mine/:id/toggle')
    @ApiOperation({ summary: 'Toggle product visibility (active/inactive)' })
    toggleActive(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ) {
        return this.productService.toggleActive(id, user.id);
    }

    @ApiBearerAuth()
    @Delete('owner/mine/:id')
    @ApiOperation({ summary: 'Delete a product from your store' })
    remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ) {
        return this.productService.remove(id, user.id);
    }
}
