import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorator/role.decorator';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    // ─── Role CRUD (ADMIN only) ───────────────────────────────────────────────

    @Get()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Lấy danh sách tất cả roles [ADMIN]' })
    findAll() {
        return this.rolesService.findAll();
    }

    @Get(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Lấy chi tiết một role [ADMIN]' })
    findOne(@Param('id') id: string) {
        return this.rolesService.findOne(id);
    }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Tạo role mới [ADMIN]' })
    create(@Body() body: { name: string; description?: string }) {
        return this.rolesService.create(body.name, body.description);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Cập nhật role [ADMIN]' })
    update(
        @Param('id') id: string,
        @Body() body: { name?: string; description?: string },
    ) {
        return this.rolesService.update(id, body.name, body.description);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Xóa role [ADMIN]' })
    remove(@Param('id') id: string) {
        return this.rolesService.remove(id);
    }

    // ─── Assign / Remove Role to User (ADMIN only) ───────────────────────────

    @Post('assign')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Gán role cho user [ADMIN]' })
    assignRole(@Body() body: { userId: string; roleName: string }) {
        return this.rolesService.assignRole(body.userId, body.roleName);
    }

    @Post('remove-role')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Thu hồi role khỏi user [ADMIN]' })
    removeRole(@Body() body: { userId: string; roleName: string }) {
        return this.rolesService.removeRole(body.userId, body.roleName);
    }

    @Get('user/:userId')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Xem roles của một user [ADMIN]' })
    getUserRoles(@Param('userId') userId: string) {
        return this.rolesService.getUserRoles(userId);
    }
}
