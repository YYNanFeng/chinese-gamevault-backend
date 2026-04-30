import {
  CallHandler,
  ExecutionContext,
  Injectable,
  MethodNotAllowedException,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";

import { DISABLE_API_IF_KEY } from "../decorators/disable-api-if.decorator";

@Injectable()
export class DisableApiIfInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const disabled = this.reflector.get<boolean>(
      DISABLE_API_IF_KEY,
      context.getHandler(),
    );

    if (disabled) {
      throw new MethodNotAllowedException("此 API 端点已被禁用。");
    }

    return next.handle();
  }
}
