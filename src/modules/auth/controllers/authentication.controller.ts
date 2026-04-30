import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { SkipGuards } from "../../../decorators/skip-guards.decorator";
import { GamevaultUser } from "../../users/gamevault-user.entity";
import { AuthenticationService } from "../authentication.service";
import { RefreshTokenGuard } from "../guards/refresh-token.guard";
import { RefreshTokenDto } from "../models/refresh-token.dto";
import { TokenPairDto } from "../models/token-pair.dto";
import { Session } from "../session.entity";

@Controller("auth")
@ApiTags("auth")
@ApiBearerAuth()
@ApiSecurity("apikey")
export class GamevaultJwtController {
  private readonly logger = new Logger(this.constructor.name);
  constructor(private readonly authService: AuthenticationService) {}

  @Post("refresh")
  @UseGuards(RefreshTokenGuard)
  @SkipGuards()
  @ApiOperation({
    summary: "刷新访问令牌并延长刷新令牌",
    description:
      "此端点接收有效的刷新令牌并签发新的访问令牌和刷新令牌。现有会话将使用新的刷新令牌哈希和延长的过期时间进行更新。刷新令牌必须在 Authorization 请求头中发送。",
    operationId: "postAuthRefresh",
  })
  @ApiOkResponse({ type: () => TokenPairDto })
  async postAuthRefresh(
    @Request()
    req: {
      user: GamevaultUser;
      ip: string;
      headers: { [key: string]: string };
    },
  ): Promise<TokenPairDto> {
    const refreshToken = req.headers.authorization?.replace("Bearer ", "");
    if (!refreshToken) {
      throw new BadRequestException("未提供刷新令牌");
    }
    return this.authService.refresh(
      req.user,
      req.ip,
      req.headers["user-agent"] || "Unknown User Agent",
      refreshToken,
    );
  }

  @Post("revoke")
  @ApiBody({ type: () => RefreshTokenDto })
  @SkipGuards()
  @ApiOperation({
    summary: "撤销指定的刷新令牌",
    description:
      "此端点接收一个刷新令牌并将关联的会话标记为已撤销。刷新令牌必须在请求体中发送。一旦撤销，该令牌将无法用于刷新访问令牌。",
    operationId: "postAuthRevoke",
  })
  async postAuthRevoke(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<void> {
    return this.authService.revoke(refreshTokenDto);
  }

  @Get("sessions")
  @ApiOperation({
    summary: "获取当前用户的所有活跃会话",
    description:
      "返回已认证用户的所有活跃会话列表。未撤销且未过期的会话被视为活跃会话。每个会话包含创建会话的设备信息（IP 地址和用户代理）。",
    operationId: "getAuthSessions",
  })
  @ApiOkResponse({ type: () => Session, isArray: true })
  async getAuthSessions(
    @Request() req: { user: GamevaultUser },
  ): Promise<Session[]> {
    return this.authService.getUserSessions(req.user);
  }

  @Post("revoke/all")
  @ApiOperation({
    summary: "撤销当前用户的所有活跃会话",
    description:
      "撤销已认证用户的所有活跃会话。这将使用户在所有设备上登出。未撤销且未过期的会话被视为活跃会话。用户需要重新登录以创建新的会话。",
    operationId: "postAuthRevokeAll",
  })
  async postAuthRevokeAll(
    @Request() req: { user: GamevaultUser },
  ): Promise<void> {
    return this.authService.revokeAllUserSessions(req.user);
  }
}
