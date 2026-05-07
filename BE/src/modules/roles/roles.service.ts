import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
    constructor(private readonly prisma: PrismaService) {}

    // ─── CRUD Roles ───────────────────────────────────────────────────────────

    async findAll() {
        return this.prisma.role.findMany({
            include: { _count: { select: { users: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: { users: { select: { id: true, email: true, fullName: true } } },
        });
        if (!role) throw new NotFoundException(`Role ${id} not found`);
        return role;
    }

    async create(name: string, description?: string) {
        const normalized = name.toUpperCase().trim();
        const existing = await this.prisma.role.findUnique({ where: { name: normalized } });
        if (existing) throw new BadRequestException(`Role '${normalized}' already exists`);

        return this.prisma.role.create({ data: { name: normalized, description } });
    }

    async update(id: string, name?: string, description?: string) {
        await this.findOne(id); // throws if not found
        return this.prisma.role.update({
            where: { id },
            data: {
                ...(name && { name: name.toUpperCase().trim() }),
                ...(description !== undefined && { description }),
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id); // throws if not found
        await this.prisma.role.delete({ where: { id } });
        return { message: 'Role deleted successfully' };
    }

    // ─── Assign / Remove Role ─────────────────────────────────────────────────

    async assignRole(userId: string, roleName: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException(`User ${userId} not found`);

        const role = await this.prisma.role.findUnique({
            where: { name: roleName.toUpperCase().trim() },
        });
        if (!role) throw new NotFoundException(`Role '${roleName}' not found`);

        return this.prisma.user.update({
            where: { id: userId },
            data: { roles: { connect: { id: role.id } } },
            select: { id: true, email: true, fullName: true, roles: true },
        });
    }

    async removeRole(userId: string, roleName: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException(`User ${userId} not found`);

        const role = await this.prisma.role.findUnique({
            where: { name: roleName.toUpperCase().trim() },
        });
        if (!role) throw new NotFoundException(`Role '${roleName}' not found`);

        return this.prisma.user.update({
            where: { id: userId },
            data: { roles: { disconnect: { id: role.id } } },
            select: { id: true, email: true, fullName: true, roles: true },
        });
    }

    async getUserRoles(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, fullName: true, roles: true },
        });
        if (!user) throw new NotFoundException(`User ${userId} not found`);
        return user;
    }
}
