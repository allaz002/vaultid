import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserPayload = {
  sub: number;
  email: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const req = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    const user = req.user as CurrentUserPayload | undefined;

    return user ?? { sub: 0, email: '' };
  },
);
