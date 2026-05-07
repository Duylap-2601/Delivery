import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll() {
        return this.prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { products: true } } },
        });
    }

    async findOne(id: string) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: { _count: { select: { products: true } } },
        });
        if (!category) throw new NotFoundException(`Category "${id}" not found`);
        return category;
    }

    async create(dto: CreateCategoryDto) {
        const existing = await this.prisma.category.findUnique({
            where: { name: dto.name },
        });
        if (existing) throw new ConflictException(`Category "${dto.name}" already exists`);

        const category = await this.prisma.category.create({
            data: { name: dto.name },
        });
        return { message: 'Category created successfully', category };
    }

    async update(id: string, dto: UpdateCategoryDto) {
        await this.findOne(id);

        // Kiểm tra tên mới có bị trùng không
        const conflict = await this.prisma.category.findFirst({
            where: { name: dto.name, NOT: { id } },
        });
        if (conflict) throw new ConflictException(`Category "${dto.name}" already exists`);

        const updated = await this.prisma.category.update({
            where: { id },
            data: { name: dto.name },
        });
        return { message: 'Category updated successfully', category: updated };
    }

    async remove(id: string) {
        const category = await this.findOne(id);

        // Không cho xóa nếu đang có products dùng
        if ((category._count as any).products > 0) {
            throw new ConflictException(
                `Cannot delete category "${category.name}" — it still has ${(category._count as any).products} product(s)`,
            );
        }

        await this.prisma.category.delete({ where: { id } });
        return { message: 'Category deleted successfully' };
    }
}
