import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: CurrentUserPayload) {
    const foundUser = await this.usersService.findById(user.sub);

    if (!foundUser) {
      throw new ForbiddenException('User not found');
    }
    if (!foundUser.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }
    return foundUser;
  }
}
