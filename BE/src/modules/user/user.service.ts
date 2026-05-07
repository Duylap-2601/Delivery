import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Prisma } from '@prisma/client';

// ── Shared select for safe user output (no password) ──────────────────────────
const USER_SAFE_SELECT = {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    status: true,
    provider: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: true,
    updatedAt: true,
    roles: {
        select: { id: true, name: true },
    },
} satisfies Prisma.UserSelect;

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

    // ─── ADMIN: Lấy danh sách users ──────────────────────────────────────────

    async findAll(query: QueryUsersDto) {
        const { page = 1, limit = 10, search, status } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            ...(status && { status }),
            ...(search && {
                OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: USER_SAFE_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ─── ADMIN: Xem chi tiết một user ────────────────────────────────────────

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: USER_SAFE_SELECT,
        });

        if (!user) {
            throw new NotFoundException(`User with id "${id}" not found`);
        }

        return user;
    }

    // ─── USER: Xem profile của chính mình ────────────────────────────────────

    async getProfile(userId: string) {
        return this.findOne(userId);
    }

    // ─── USER: Cập nhật profile của chính mình ───────────────────────────────

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        // Kiểm tra số điện thoại có trùng không (nếu có cập nhật)
        if (dto.phone) {
            const existingPhone = await this.prisma.user.findFirst({
                where: {
                    phone: dto.phone,
                    NOT: { id: userId },
                },
            });
            if (existingPhone) {
                throw new ConflictException('Phone number is already in use by another account');
            }
        }

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.fullName !== undefined && { fullName: dto.fullName }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
            },
            select: USER_SAFE_SELECT,
        });

        return { message: 'Profile updated successfully', user: updated };
    }

    // ─── ADMIN: Thay đổi trạng thái user ─────────────────────────────────────

    async updateStatus(id: string, dto: UpdateUserStatusDto) {
        await this.findOne(id); // ném 404 nếu không tồn tại

        const updated = await this.prisma.user.update({
            where: { id },
            data: { status: dto.status },
            select: USER_SAFE_SELECT,
        });

        return { message: `User status updated to ${dto.status}`, user: updated };
    }

    // ─── ADMIN: Gán roles cho user ────────────────────────────────────────────

    // ─── Address Book ─────────────────────────────────────────────────────────

    async getAddresses(userId: string) {
        return this.prisma.userAddress.findMany({
            where: { userId },
            orderBy: [
                { isDefault: 'desc' }, // địa chỉ mặc định lên đầu
                { createdAt: 'desc' },
            ],
        });
    }

    async createAddress(userId: string, dto: CreateAddressDto) {
        // Nếu isDefault = true → unset tất cả default cũ của user này
        return this.prisma.$transaction(async (tx) => {
            if (dto.isDefault) {
                await tx.userAddress.updateMany({
                    where: { userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            // Nếu đây là địa chỉ đầu tiên → tự động set làm default
            const existingCount = await tx.userAddress.count({ where: { userId } });
            const shouldBeDefault = dto.isDefault ?? existingCount === 0;

            const address = await tx.userAddress.create({
                data: {
                    userId,
                    label: dto.label,
                    fullAddress: dto.fullAddress,
                    lat: dto.lat,
                    lng: dto.lng,
                    isDefault: shouldBeDefault,
                },
            });

            return { message: 'Address created successfully', address };
        });
    }

    async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
        const existing = await this.prisma.userAddress.findUnique({
            where: { id: addressId },
        });

        if (!existing) throw new NotFoundException('Address not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not your address');

        return this.prisma.$transaction(async (tx) => {
            // Nếu set isDefault = true → unset tất cả địa chỉ default cũ
            if (dto.isDefault === true) {
                await tx.userAddress.updateMany({
                    where: { userId, isDefault: true, NOT: { id: addressId } },
                    data: { isDefault: false },
                });
            }

            const updated = await tx.userAddress.update({
                where: { id: addressId },
                data: {
                    ...(dto.label !== undefined && { label: dto.label }),
                    ...(dto.fullAddress !== undefined && { fullAddress: dto.fullAddress }),
                    ...(dto.lat !== undefined && { lat: dto.lat }),
                    ...(dto.lng !== undefined && { lng: dto.lng }),
                    ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
                },
            });

            return { message: 'Address updated successfully', address: updated };
        });
    }

    async setDefaultAddress(userId: string, addressId: string) {
        const existing = await this.prisma.userAddress.findUnique({
            where: { id: addressId },
        });

        if (!existing) throw new NotFoundException('Address not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not your address');

        return this.prisma.$transaction(async (tx) => {
            // Bỏ default tất cả địa chỉ hiện tại
            await tx.userAddress.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });

            // Set địa chỉ này làm default
            const updated = await tx.userAddress.update({
                where: { id: addressId },
                data: { isDefault: true },
            });

            return { message: 'Default address updated', address: updated };
        });
    }

    async deleteAddress(userId: string, addressId: string) {
        const existing = await this.prisma.userAddress.findUnique({
            where: { id: addressId },
        });

        if (!existing) throw new NotFoundException('Address not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not your address');

        await this.prisma.userAddress.delete({ where: { id: addressId } });

        // Nếu vừa xóa địa chỉ default → tự động set địa chỉ mới nhất làm default
        if (existing.isDefault) {
            const next = await this.prisma.userAddress.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
            if (next) {
                await this.prisma.userAddress.update({
                    where: { id: next.id },
                    data: { isDefault: true },
                });
            }
        }

        return { message: 'Address deleted successfully' };
    }

    async updateRoles(id: string, dto: UpdateUserRolesDto) {
        await this.findOne(id); // ném 404 nếu không tồn tại

        // Validate rằng tất cả role names đều tồn tại trong DB
        const roles = await this.prisma.role.findMany({
            where: { name: { in: dto.roles } },
        });

        if (roles.length !== dto.roles.length) {
            const foundNames = roles.map((r) => r.name);
            const invalid = dto.roles.filter((name) => !foundNames.includes(name));
            throw new BadRequestException(`Invalid role(s): ${invalid.join(', ')}`);
        }

        // Replace toàn bộ roles (set = disconnect tất cả rồi connect lại)
        const updated = await this.prisma.user.update({
            where: { id },
            data: {
                roles: {
                    set: roles.map((r) => ({ id: r.id })),
                },
            },
            select: USER_SAFE_SELECT,
        });

        return { message: 'User roles updated successfully', user: updated };
    }
}
