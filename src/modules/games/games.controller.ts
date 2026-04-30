import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Logger,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Request,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Response } from "express";
import {
  FilterOperator,
  Paginate,
  PaginateQuery,
  Paginated,
  PaginationType,
  paginate,
} from "nestjs-paginate";
import { In, Not, Repository } from "typeorm";

import { FileInterceptor } from "@nestjs/platform-express";
import bytes from "bytes";
import { isArray } from "lodash";
import { FilterSuffix } from "nestjs-paginate/lib/filter";
import configuration from "../../configuration";
import { DisableApiIf } from "../../decorators/disable-api-if.decorator";
import { MinimumRole } from "../../decorators/minimum-role.decorator";
import { PaginateQueryOptions } from "../../decorators/pagination.decorator";
import { ApiOkResponsePaginated } from "../../globals";
import { OtpService } from "../otp/otp.service";
import { State } from "../progresses/models/state.enum";
import { Progress } from "../progresses/progress.entity";
import { GamevaultUser } from "../users/gamevault-user.entity";
import { Role } from "../users/models/role.enum";
import { UsersService } from "../users/users.service";
import { FilesService } from "./files.service";
import { GamesService } from "./games.service";
import { GamevaultGame } from "./gamevault-game.entity";
import { GameIdDto } from "./models/game-id.dto";
import { UpdateGameDto } from "./models/update-game.dto";

@ApiBearerAuth()
@ApiTags("game")
@Controller("games")
@ApiSecurity("apikey")
export class GamesController {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly gamesService: GamesService,
    private readonly filesService: FilesService,
    @InjectRepository(GamevaultGame)
    private readonly gamesRepository: Repository<GamevaultGame>,
    @InjectRepository(Progress)
    private readonly progressRepository: Repository<Progress>,
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  @Put("reindex")
  @ApiOperation({
    summary: "手动触发所有游戏的索引",
    operationId: "putFilesReindex",
  })
  @ApiOkResponse({ type: () => GamevaultGame, isArray: true })
  @MinimumRole(Role.ADMIN)
  async putFilesReindex() {
    return this.filesService.indexAllFiles();
  }

  /** Deletes a game file from disk. Admins only. */
  @Delete(":game_id")
  @ApiOperation({
    summary: "从磁盘删除游戏文件",
    description:
      "永久从文件系统中删除游戏文件。文件索引器会自动检测缺失的文件并在数据库中软删除该游戏。仅管理员可使用此端点。服务器必须对文件卷具有写入权限。",
    operationId: "deleteGame",
  })
  @MinimumRole(Role.ADMIN)
  @DisableApiIf(configuration.SERVER.DEMO_MODE_ENABLED)
  async deleteGame(@Param() params: GameIdDto): Promise<void> {
    return this.filesService.deleteGameFile(Number(params.game_id));
  }

  /** Upload a game file to the server. */
  @Post()
  @ApiOperation({
    summary: "上传游戏文件到服务器",
    description: `直接上传游戏文件到游戏库。仅管理员可使用此端点。文件必须是支持的游戏文件格式。服务器必须对文件卷具有写入权限。`,
    operationId: "postGameUpload",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "The game file to upload",
        },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      properties: {
        path: {
          type: "string",
          description: "The path where the game file was saved",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  @MinimumRole(Role.ADMIN)
  @DisableApiIf(configuration.SERVER.DEMO_MODE_ENABLED)
  async postGameUpload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: configuration.GAMES.MAX_UPLOAD_SIZE,
            message: `文件超过了最大允许上传大小 ${bytes(configuration.GAMES.MAX_UPLOAD_SIZE, { unit: "GB", thousandsSeparator: "." })}。`,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.filesService.upload(file);
  }

  /** Get paginated games list based on the given query parameters. */
  @Get()
  @PaginateQueryOptions()
  @ApiOkResponsePaginated(GamevaultGame)
  @ApiOperation({
    summary: "获取游戏列表",
    operationId: "getGames",
  })
  @MinimumRole(Role.GUEST)
  async findGames(
    @Request() request: { user: GamevaultUser },
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<GamevaultGame>> {
    const relations = [
      "bookmarked_users",
      "metadata",
      "metadata.cover",
      "metadata.background",
    ];

    if (query.filter?.["metadata.genres.name"]) {
      relations.push("metadata.genres");
    }

    if (query.filter?.["metadata.tags.name"]) {
      relations.push("metadata.tags");
    }

    if (query.filter?.["metadata.developers.name"]) {
      relations.push("metadata.developers");
    }

    if (query.filter?.["metadata.publishers.name"]) {
      relations.push("metadata.publishers");
    }

    query = this.redirectLegacyQueries(query);

    const progressStateFilter = query.filter?.["progresses.state"];
    const progressUserFilter = query.filter?.["progresses.user.id"];

    // "UNPLAYED" means either:
    //   a) The user has no progress record for this game at all, OR
    //   b) The user has a progress record with state explicitly set to UNPLAYED.
    //
    // We can't use nestjs-paginate's column-level filters for this because:
    //   1. A LEFT JOIN on progresses returns rows for ALL users' progress,
    //      so a $null check only matches when NO user has a progress record
    //      — not just the requesting user.
    //   2. nestjs-paginate forces INNER JOIN on filtered relations, which
    //      drops games with no progress rows before IS NULL can match.
    //
    // Instead, we pre-query the game IDs where this user has a non-UNPLAYED
    // progress and exclude them via PaginateConfig.where.
    let unplayedWhereCondition = undefined;

    if (progressStateFilter || progressUserFilter) {
      if (progressStateFilter?.includes("UNPLAYED")) {
        let userId = request.user.id;
        if (progressUserFilter && !isArray(progressUserFilter)) {
          userId = Number(progressUserFilter.split(":").pop());
        }

        const playedProgresses = await this.progressRepository.find({
          where: {
            user: { id: userId },
            state: Not(State.UNPLAYED),
          },
          relations: ["game"],
          select: { game: { id: true } },
        });

        const excludedGameIds = playedProgresses
          .filter((p) => p.game != null)
          .map((p) => p.game.id);

        if (excludedGameIds.length > 0) {
          unplayedWhereCondition = { id: Not(In(excludedGameIds)) };
        }

        // Remove progress filters — handled by the pre-query above
        delete query.filter["progresses.state"];
        delete query.filter["progresses.user.id"];
      } else {
        relations.push("progresses", "progresses.user");
      }
    }

    if (
      configuration.PARENTAL.AGE_RESTRICTION_ENABLED &&
      request.user.role !== Role.ADMIN
    ) {
      query.filter ??= {};
      query.filter["metadata.age_rating"] = [
        `$null`,
        `$or:$lte:${await this.usersService.findUserAgeByUsername(request.user.username)}`,
      ];
    }

    return paginate(query, this.gamesRepository, {
      paginationType: PaginationType.TAKE_AND_SKIP,
      where: unplayedWhereCondition,
      defaultLimit: 100,
      defaultSortBy: [["sort_title", "ASC"]],
      maxLimit: -1,
      nullSort: "last",
      relations,
      sortableColumns: [
        "id",
        "title",
        "sort_title",
        "created_at",
        "size",
        "type",
        "download_count",
        "bookmarked_users.id",
        "metadata.title",
        "metadata.early_access",
        "metadata.release_date",
        "metadata.average_playtime",
        "metadata.age_rating",
        "metadata.rating",
      ],
      loadEagerRelations: false,
      searchableColumns: [
        "id",
        "title",
        "file_path",
        "metadata.title",
        "metadata.description",
      ],
      filterableColumns: {
        id: true,
        title: true,
        file_path: true,
        created_at: true,
        updated_at: true,
        size: true,
        metacritic_rating: true,
        average_playtime: true,
        type: true,
        download_count: true,
        "bookmarked_users.id": true,
        "metadata.genres.name": true,
        "metadata.tags.name": true,
        "metadata.developers.name": true,
        "metadata.publishers.name": true,
        "metadata.release_date": true,
        "metadata.early_access": true,
        "metadata.age_rating": true,
        "progresses.state": [
          FilterOperator.EQ,
          FilterOperator.NULL,
          FilterSuffix.NOT,
        ],
        "progresses.user.id": [
          FilterOperator.EQ,
          FilterOperator.NULL,
          FilterSuffix.NOT,
        ],
      },
      withDeleted: false,
    });
  }

  /** Retrieves a random game */
  @Get("random")
  @ApiOperation({
    summary: "获取随机游戏",
    operationId: "getGameRandom",
  })
  @ApiOkResponse({ type: () => GamevaultGame })
  @MinimumRole(Role.GUEST)
  async getGameRandom(
    @Request() request: { user: GamevaultUser },
  ): Promise<GamevaultGame> {
    return this.gamesService.findRandom({
      loadDeletedEntities: false,
      loadRelations: true,
      filterByAge: await this.usersService.findUserAgeByUsername(
        request.user.username,
      ),
    });
  }

  /** Retrieves details for a game with the specified ID. */
  @Get(":game_id")
  @ApiOperation({
    summary: "获取游戏详情",
    operationId: "getGameByGameId",
  })
  @ApiOkResponse({ type: () => GamevaultGame })
  @MinimumRole(Role.GUEST)
  async getGameByGameId(
    @Request() request: { user: GamevaultUser },
    @Param() params: GameIdDto,
  ): Promise<GamevaultGame> {
    return this.gamesService.findOneByGameIdOrFail(Number(params.game_id), {
      loadDeletedEntities: true,
      filterByAge: await this.usersService.findUserAgeByUsername(
        request.user.username,
      ),
    });
  }

  /** Download a game by its ID. */
  @Get(":game_id/download")
  @ApiHeader({
    name: "X-Download-Speed-Limit",
    required: false,
    description:
      "此请求头用于设置最大下载速度限制，单位为 KiB/s。如果未设置此请求头，下载速度将不受限制。",
    example: "1024",
  })
  @ApiHeader({
    name: "Range",
    required: false,
    description:
      "此请求头用于控制下载的字节范围。如果未设置此请求头或格式无效，将下载整个文件。",
    examples: {
      "bytes=0-1023": {
        description: "下载前 1024 个字节",
        value: "bytes=-1023",
      },
      "bytes=1024-2047": {
        description: "下载第 1024 到 2047 个字节",
        value: "bytes=1024-2047",
      },
      "bytes=1024-": {
        description: "下载从第 1024 个字节到文件末尾的内容",
        value: "bytes=1024-",
      },
    },
  })
  @ApiOperation({
    summary: "下载游戏",
    operationId: "getGameDownload",
  })
  @MinimumRole(Role.USER)
  @ApiOkResponse({ type: () => StreamableFile })
  @Header("Accept-Ranges", "bytes")
  async getGameDownload(
    @Request() request: { user: GamevaultUser },
    @Param() params: GameIdDto,
    @Res({ passthrough: true }) response: Response,
    @Headers("X-Download-Speed-Limit") speedlimit?: string,
    @Headers("Range") range?: string,
  ): Promise<StreamableFile> {
    response.setHeader(
      "X-Otp",
      this.otpService.create(
        request.user.username,
        Number(params.game_id),
        Number(speedlimit),
      ),
    );
    return this.filesService.download(
      response,
      Number(params.game_id),
      Number(speedlimit),
      range,
      await this.usersService.findUserAgeByUsername(request.user.username),
    );
  }

  @Put(":game_id")
  @ApiOperation({
    summary: "更新游戏详情",
    operationId: "putGameUpdate",
  })
  @ApiBody({ type: () => UpdateGameDto })
  @MinimumRole(Role.EDITOR)
  async putGameUpdate(
    @Param() params: GameIdDto,
    @Body() dto: UpdateGameDto,
  ): Promise<GamevaultGame> {
    return this.gamesService.update(Number(params.game_id), dto);
  }

  private redirectLegacyQueries(query: PaginateQuery) {
    // Early Access
    if (query.filter?.["early_access"]) {
      this.logger.debug({
        message:
          'Redirecting legacy filter key "early_access" to "metadata.early_access"',
        oldValue: query.filter["early_access"],
      });

      query.filter["metadata.early_access"] = query.filter["early_access"];
      delete query.filter["early_access"];
    }

    const sortByEarlyAccess = query.sortBy?.find(
      (x) => x[0] === "early_access",
    );
    if (sortByEarlyAccess) {
      this.logger.debug({
        message:
          'Redirecting legacy sort key "early_access" to "metadata.early_access"',
        direction: sortByEarlyAccess[1],
      });

      query.sortBy.push(["metadata.early_access", sortByEarlyAccess[1]]);
      delete query.sortBy[query.sortBy.indexOf(sortByEarlyAccess)];
    }

    // Release Date
    if (query.filter?.["release_date"]) {
      this.logger.debug({
        message:
          'Redirecting legacy filter key "release_date" to "metadata.release_date"',
        oldValue: query.filter["release_date"],
      });

      query.filter["metadata.release_date"] = query.filter["release_date"];
      delete query.filter["release_date"];
    }

    const sortByReleaseDate = query.sortBy?.find(
      (x) => x[0] === "release_date",
    );
    if (sortByReleaseDate) {
      this.logger.debug({
        message:
          'Redirecting legacy sort key "release_date" to "metadata.release_date"',
        direction: sortByReleaseDate[1],
      });

      query.sortBy.push(["metadata.release_date", sortByReleaseDate[1]]);
      delete query.sortBy[query.sortBy.indexOf(sortByReleaseDate)];
    }

    return query;
  }
}
