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
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { Roles } from '../../common/decorator/role.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('api/users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    // ─── Current User (Self) ──────────────────────────────────────────────────

    @Get('profile')
    @ApiOperation({ summary: 'Get own profile' })
    getProfile(@CurrentUser() user: any) {
        return this.userService.getProfile(user.id);
    }

    @Patch('profile')
    @ApiOperation({ summary: 'Update own profile (fullName, phone)' })
    updateProfile(
        @CurrentUser() user: any,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.userService.updateProfile(user.id, dto);
    }

    // ─── Address Book ─────────────────────────────────────────────────────────

    @Get('addresses')
    @ApiOperation({ summary: 'Get all saved delivery addresses (default first)' })
    getAddresses(@CurrentUser() user: any) {
        return this.userService.getAddresses(user.id);
    }

    @Post('addresses')
    @ApiOperation({ summary: 'Add a new delivery address (auto-set as default if first)' })
    createAddress(
        @CurrentUser() user: any,
        @Body() dto: CreateAddressDto,
    ) {
        return this.userService.createAddress(user.id, dto);
    }

    @Patch('addresses/:id')
    @ApiOperation({ summary: 'Update a saved address' })
    updateAddress(
        @CurrentUser() user: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAddressDto,
    ) {
        return this.userService.updateAddress(user.id, id, dto);
    }

    @Patch('addresses/:id/default')
    @ApiOperation({ summary: 'Set an address as the default delivery address' })
    setDefaultAddress(
        @CurrentUser() user: any,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.userService.setDefaultAddress(user.id, id);
    }

    @Delete('addresses/:id')
    @ApiOperation({ summary: 'Delete a saved address (auto-promotes next address to default)' })
    deleteAddress(
        @CurrentUser() user: any,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.userService.deleteAddress(user.id, id);
    }

    // ─── Admin Routes ─────────────────────────────────────────────────────────

    @Get()
    @Roles('ADMIN')
    @ApiOperation({ summary: '[ADMIN] Get paginated user list with optional filters' })
    findAll(@Query() query: QueryUsersDto) {
        return this.userService.findAll(query);
    }

    @Get(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: '[ADMIN] Get user detail by ID' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.userService.findOne(id);
    }

    @Patch(':id/status')
    @Roles('ADMIN')
    @ApiOperation({ summary: '[ADMIN] Update user status (ACTIVE, BANNED, INACTIVE...)' })
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserStatusDto,
    ) {
        return this.userService.updateStatus(id, dto);
    }

    @Patch(':id/roles')
    @Roles('ADMIN')
    @ApiOperation({ summary: '[ADMIN] Assign roles to a user (replaces existing roles)' })
    updateRoles(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserRolesDto,
    ) {
        return this.userService.updateRoles(id, dto);
    }
}
