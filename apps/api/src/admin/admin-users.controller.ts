import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard, SuperAdminGuard } from '../common/admin-auth.guard.js';
import {
  AdminUsersService,
  type CreateAdminUserDto,
  type UpdateAdminUserDto,
} from './admin-users.service.js';

@Controller('admin/users')
@UseGuards(AdminAuthGuard, SuperAdminGuard)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  listUsers() {
    return this.usersService.listUsers();
  }

  @Post()
  createUser(@Body() body: CreateAdminUserDto) {
    return this.usersService.createUser(body);
  }

  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() body: UpdateAdminUserDto) {
    return this.usersService.updateUser(id, body);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
