import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../../common/decorator/public.decorator';
import { Roles } from '../../common/decorator/role.decorator';

@ApiTags('Categories')
@Controller('api/categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @Public()
    @Get()
    @ApiOperation({ summary: 'List all categories (public)' })
    findAll() {
        return this.categoryService.findAll();
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Get category detail (public)' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.categoryService.findOne(id);
    }

    @ApiBearerAuth()
    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: '[ADMIN] Create a new category' })
    create(@Body() dto: CreateCategoryDto) {
        return this.categoryService.create(dto);
    }

    @ApiBearerAuth()
    @Patch(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: '[ADMIN] Rename a category' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
        return this.categoryService.update(id, dto);
    }

    @ApiBearerAuth()
    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: '[ADMIN] Delete category (only if no products use it)' })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.categoryService.remove(id);
    }
}
