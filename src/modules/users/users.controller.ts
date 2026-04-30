import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Request,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";

import configuration from "../../configuration";
import { DisableApiIf } from "../../decorators/disable-api-if.decorator";
import { MinimumRole } from "../../decorators/minimum-role.decorator";
import { GameIdDto } from "../games/models/game-id.dto";
import { ApiKeyService } from "./api-key.service";
import { GamevaultUser } from "./gamevault-user.entity";
import { Role } from "./models/role.enum";
import { UpdateUserDto } from "./models/update-user.dto";
import { UserIdDto } from "./models/user-id.dto";
import { UsersService } from "./users.service";

@ApiBearerAuth()
@ApiTags("user")
@Controller("users")
@ApiSecurity("apikey")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly apiKeyService: ApiKeyService,
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  @Get()
  @ApiOperation({
    summary:
      "获取所有用户概览。管理员可通过此端点查看隐藏用户。",
    operationId: "getUsers",
  })
  @ApiOkResponse({ type: () => GamevaultUser, isArray: true })
  @MinimumRole(Role.GUEST)
  async getUsers(
    @Request() req: { user: GamevaultUser },
  ): Promise<GamevaultUser[]> {
    const includeHiddenUsers = req.user.role >= Role.ADMIN;
    return this.usersService.find(includeHiddenUsers);
  }

  //#region Redirects

  /** Retrieve own user information. */
  @Get("me")
  @ApiOperation({
    summary: "获取当前用户详情",
    operationId: "getUsersMe",
  })
  @MinimumRole(Role.GUEST)
  @ApiOkResponse({ type: () => GamevaultUser })
  async getUsersMe(
    @Request() request: { user: GamevaultUser },
  ): Promise<GamevaultUser> {
    return this.getUserByUserId({ user_id: request.user.id }, request);
  }

  /** Updates details of the user. */
  @Put("me")
  @ApiBody({ type: () => UpdateUserDto })
  @ApiOperation({
    summary: "更新当前用户详情",
    operationId: "putUsersMe",
  })
  @MinimumRole(Role.USER)
  @ApiOkResponse({ type: () => GamevaultUser })
  @DisableApiIf(configuration.SERVER.DEMO_MODE_ENABLED)
  async putUsersMe(
    @Body() dto: UpdateUserDto,
    @Request() request: { user: GamevaultUser },
  ): Promise<GamevaultUser> {
    return this.putUserByUserId(
      { user_id: request.user.id },
      dto,
      request,
      false,
    );
  }

  /** Deletes your own user. */
  @Delete("me")
  @ApiOperation({
    summary: "删除自己的用户",
    operationId: "deleteUserMe",
  })
  @ApiOkResponse({ type: () => GamevaultUser })
  @MinimumRole(Role.USER)
  @DisableApiIf(configuration.SERVER.DEMO_MODE_ENABLED)
  async deleteUsersMe(@Request() request): Promise<GamevaultUser> {
    return this.deleteUserByUserId(request.user.id);
  }

  //#endregion

  @Post("me/bookmark/:game_id")
  @ApiOperation({
    summary: "收藏游戏",
    operationId: "postUsersMeBookmark",
  })
  @MinimumRole(Role.GUEST)
  async postUsersMeBookmark(
    @Request() request: { user: GamevaultUser },
    @Param() params: GameIdDto,
  ): Promise<GamevaultUser> {
    const user = await this.usersService.findOneByUsernameOrFail(
      request.user.username,
      { loadDeletedEntities: false, loadRelations: ["bookmarked_games"] },
    );
    return this.usersService.bookmarkGame(user.id, Number(params.game_id));
  }

  @Delete("me/bookmark/:game_id")
  @ApiOperation({
    summary: "取消收藏游戏",
    operationId: "deleteUsersMeBookmark",
  })
  @MinimumRole(Role.GUEST)
  async deleteUsersMeBookmark(
    @Request() request: { user: GamevaultUser },
    @Param() params: GameIdDto,
  ): Promise<GamevaultUser> {
    const user = await this.usersService.findOneByUsernameOrFail(
      request.user.username,
      { loadDeletedEntities: false, loadRelations: ["bookmarked_games"] },
    );
    return this.usersService.unbookmarkGame(user.id, Number(params.game_id));
  }

  /** Get details on a user. */
  @Get(":user_id")
  @ApiOperation({
    summary: "获取用户详情",
    operationId: "getUserByUserId",
  })
  @MinimumRole(Role.GUEST)
  @ApiOkResponse({ type: () => GamevaultUser })
  async getUserByUserId(
    @Param() params: UserIdDto,
    @Request() request: { user: GamevaultUser },
  ): Promise<GamevaultUser> {
    const user = await this.usersService.findOneByUserIdOrFail(
      Number(params.user_id),
    );
    if (user.id === request.user.id) {
      // If the user is requesting their own details, ensure the API key is loaded.
      user.api_key = await this.apiKeyService.findApiKeyOrFail(request.user.id);
    }
    return user;
  }

  /** Updates details of any user. */
  @Put(":user_id")
  @ApiBody({ type: () => UpdateUserDto })
  @ApiOperation({
    summary: "更新任意用户详情",
    operationId: "putUserByUserId",
  })
  @MinimumRole(Role.ADMIN)
  @ApiOkResponse({ type: () => GamevaultUser })
  async putUserByUserId(
    @Param() params: UserIdDto,
    @Body() dto: UpdateUserDto,
    @Request() request: { user: GamevaultUser },
    isAdmin = true,
  ): Promise<GamevaultUser> {
    const user = await this.usersService.update(
      Number(params.user_id),
      dto,
      isAdmin,
    );
    if (user.id === request.user.id) {
      // If the user is editing their own details, ensure the API key is loaded.
      user.api_key = await this.apiKeyService.findApiKeyOrFail(request.user.id);
    }
    return user;
  }

  /** Deletes any user with the specified ID. */
  @Delete(":user_id")
  @ApiOperation({
    summary: "删除任意用户",
    operationId: "deleteUserByUserId",
  })
  @ApiOkResponse({ type: () => GamevaultUser })
  @MinimumRole(Role.ADMIN)
  async deleteUserByUserId(@Param() params: UserIdDto): Promise<GamevaultUser> {
    return this.usersService.delete(Number(params.user_id));
  }

  /** Recover a deleted user. */
  @Post(":user_id/recover")
  @MinimumRole(Role.ADMIN)
  @ApiOperation({
    summary: "恢复已删除的用户",
    operationId: "postUserRecoverByUserId",
  })
  @ApiOkResponse({ type: () => GamevaultUser })
  async postUserRecoverByUserId(
    @Param() params: UserIdDto,
  ): Promise<GamevaultUser> {
    return this.usersService.recover(Number(params.user_id));
  }
}
