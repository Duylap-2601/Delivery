import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { QueryStoresDto } from './dto/query-stores.dto';

// Shared select — trả về thông tin store kèm owner cơ bản
const STORE_SELECT = {
    id: true,
    name: true,
    type: true,
    address: true,
    description: true,
    ownerId: true,
    createdAt: true,
    updatedAt: true,
    owner: {
        select: { id: true, fullName: true, email: true, phone: true },
    },
    _count: {
        select: { products: true, orders: true },
    },
} satisfies Prisma.StoreSelect;

@Injectable()
export class StoreService {
    constructor(private readonly prisma: PrismaService) {}

    // ─── Public ───────────────────────────────────────────────────────────────

    async findAll(query: QueryStoresDto) {
        const { page = 1, limit = 10, search, type } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.StoreWhereInput = {
            ...(type && { type }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { address: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [stores, total] = await Promise.all([
            this.prisma.store.findMany({
                where,
                select: STORE_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.store.count({ where }),
        ]);

        return {
            data: stores,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const store = await this.prisma.store.findUnique({
            where: { id },
            select: STORE_SELECT,
        });

        if (!store) throw new NotFoundException(`Store with id "${id}" not found`);
        return store;
    }

    // ─── Owner ────────────────────────────────────────────────────────────────

    /** Lấy store của chính user đang đăng nhập */
    async findMine(ownerId: string) {
        const store = await this.prisma.store.findUnique({
            where: { ownerId },
            select: STORE_SELECT,
        });

        if (!store) throw new NotFoundException('You do not have a store yet');
        return store;
    }

    /** Tạo store — mỗi user chỉ được tạo 1 store */
    async create(ownerId: string, dto: CreateStoreDto) {
        const existing = await this.prisma.store.findUnique({ where: { ownerId } });
        if (existing) {
            throw new BadRequestException('You already own a store. Each account can only have one store.');
        }

        const store = await this.prisma.store.create({
            data: {
                name: dto.name,
                type: dto.type,
                address: dto.address,
                description: dto.description,
                ownerId,
            },
            select: STORE_SELECT,
        });

        return { message: 'Store created successfully', store };
    }

    /** Cập nhật store — chỉ owner hoặc ADMIN */
    async update(storeId: string, requesterId: string, requesterRoles: string[], dto: UpdateStoreDto) {
        const store = await this.findOne(storeId);

        const isAdmin = requesterRoles.includes('ADMIN');
        const isOwner = store.ownerId === requesterId;

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException('Only the store owner or an admin can update this store');
        }

        const updated = await this.prisma.store.update({
            where: { id: storeId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.type !== undefined && { type: dto.type }),
                ...(dto.address !== undefined && { address: dto.address }),
                ...(dto.description !== undefined && { description: dto.description }),
            },
            select: STORE_SELECT,
        });

        return { message: 'Store updated successfully', store: updated };
    }

    /** Xóa store — chỉ owner hoặc ADMIN */
    async remove(storeId: string, requesterId: string, requesterRoles: string[]) {
        const store = await this.findOne(storeId);

        const isAdmin = requesterRoles.includes('ADMIN');
        const isOwner = store.ownerId === requesterId;

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException('Only the store owner or an admin can delete this store');
        }

        await this.prisma.store.delete({ where: { id: storeId } });
        return { message: 'Store deleted successfully' };
    }
}
