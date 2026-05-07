import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

const PRODUCT_SELECT = {
    id: true,
    name: true,
    description: true,
    price: true,
    stock: true,
    image: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    category: { select: { id: true, name: true } },
    store: { select: { id: true, name: true, type: true } },
} satisfies Prisma.ProductSelect;

@Injectable()
export class ProductService {
    constructor(private readonly prisma: PrismaService) {}

    // ─── Public ───────────────────────────────────────────────────────────────

    async findAll(query: QueryProductsDto) {
        const {
            page = 1, limit = 10, search,
            storeId, categoryId, minPrice, maxPrice,
            isActive,
        } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {
            // Public chỉ thấy sản phẩm đang active (trừ khi owner/admin truyền isActive=false)
            isActive: isActive !== undefined ? isActive : true,
            ...(storeId && { storeId }),
            ...(categoryId && { categoryId }),
            ...(minPrice !== undefined && { price: { gte: minPrice } }),
            ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
            ...(minPrice !== undefined && maxPrice !== undefined && {
                price: { gte: minPrice, lte: maxPrice },
            }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                select: PRODUCT_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.product.count({ where }),
        ]);

        return {
            data: products,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            select: PRODUCT_SELECT,
        });
        if (!product) throw new NotFoundException(`Product "${id}" not found`);
        return product;
    }

    // ─── Owner ────────────────────────────────────────────────────────────────

    /** Lấy store của owner, throw nếu chưa có */
    private async getOwnerStore(ownerId: string) {
        const store = await this.prisma.store.findUnique({ where: { ownerId } });
        if (!store) throw new BadRequestException('You do not have a store yet. Create a store first.');
        return store;
    }

    /** Lấy danh sách sản phẩm của store mình (bao gồm cả inactive) */
    async findMyProducts(ownerId: string, query: QueryProductsDto) {
        const store = await this.getOwnerStore(ownerId);
        // Override storeId và bỏ filter isActive để owner thấy tất cả
        return this.findAll({ ...query, storeId: store.id, isActive: query.isActive });
    }

    async create(ownerId: string, dto: CreateProductDto) {
        const store = await this.getOwnerStore(ownerId);

        // Validate category tồn tại
        const category = await this.prisma.category.findUnique({
            where: { id: dto.categoryId },
        });
        if (!category) throw new BadRequestException(`Category "${dto.categoryId}" does not exist`);

        const product = await this.prisma.product.create({
            data: {
                name: dto.name,
                description: dto.description,
                price: dto.price,
                stock: dto.stock ?? 0,
                image: dto.image,
                isActive: true,
                storeId: store.id,
                categoryId: dto.categoryId,
            },
            select: PRODUCT_SELECT,
        });

        return { message: 'Product created successfully', product };
    }

    async update(productId: string, ownerId: string, dto: UpdateProductDto) {
        const store = await this.getOwnerStore(ownerId);
        const product = await this.findOne(productId);

        if (product.store.id !== store.id) {
            throw new ForbiddenException('You can only update products in your own store');
        }

        // Validate category nếu có thay đổi
        if (dto.categoryId) {
            const category = await this.prisma.category.findUnique({
                where: { id: dto.categoryId },
            });
            if (!category) throw new BadRequestException(`Category "${dto.categoryId}" does not exist`);
        }

        const updated = await this.prisma.product.update({
            where: { id: productId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.price !== undefined && { price: dto.price }),
                ...(dto.stock !== undefined && { stock: dto.stock }),
                ...(dto.image !== undefined && { image: dto.image }),
                ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
            },
            select: PRODUCT_SELECT,
        });

        return { message: 'Product updated successfully', product: updated };
    }

    async toggleActive(productId: string, ownerId: string) {
        const store = await this.getOwnerStore(ownerId);
        const product = await this.findOne(productId);

        if (product.store.id !== store.id) {
            throw new ForbiddenException('You can only manage products in your own store');
        }

        const updated = await this.prisma.product.update({
            where: { id: productId },
            data: { isActive: !product.isActive },
            select: PRODUCT_SELECT,
        });

        return {
            message: `Product is now ${updated.isActive ? 'active' : 'inactive'}`,
            product: updated,
        };
    }

    async remove(productId: string, ownerId: string) {
        const store = await this.getOwnerStore(ownerId);
        const product = await this.findOne(productId);

        if (product.store.id !== store.id) {
            throw new ForbiddenException('You can only delete products in your own store');
        }

        await this.prisma.product.delete({ where: { id: productId } });
        return { message: 'Product deleted successfully' };
    }
}
