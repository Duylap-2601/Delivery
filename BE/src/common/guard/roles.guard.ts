import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '../decorator/role.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            ROLE_KEY,
            [context.getHandler(), context.getClass()],
        );

        // No role restriction on this route → allow
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.roles || user.roles.length === 0) {
            throw new ForbiddenException('User has no role assigned');
        }

        // user.roles is Role[] from JwtStrategy (objects with { id, name, description })
        const userRoleNames: string[] = user.roles.map((r: { name: string }) => r.name);
        const hasRole = requiredRoles.some((role) => userRoleNames.includes(role));

        if (!hasRole) {
            throw new ForbiddenException(
                `Access denied. Required roles: ${requiredRoles.join(', ')}`,
            );
        }

        return true;
    }
}