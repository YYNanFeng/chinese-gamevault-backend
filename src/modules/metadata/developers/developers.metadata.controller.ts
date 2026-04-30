import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Paginate,
  PaginateQuery,
  Paginated,
  PaginationType,
  paginate,
} from "nestjs-paginate";
import { Repository } from "typeorm";

import { MinimumRole } from "../../../decorators/minimum-role.decorator";
import { PaginateQueryOptions } from "../../../decorators/pagination.decorator";
import { ApiOkResponsePaginated } from "../../../globals";
import { GamevaultGame } from "../../games/gamevault-game.entity";
import { Role } from "../../users/models/role.enum";
import { DeveloperMetadata } from "./developer.metadata.entity";

@Controller("developers")
@ApiTags("developers")
@ApiBearerAuth()
@ApiSecurity("apikey")
export class DeveloperController {
  constructor(
    @InjectRepository(DeveloperMetadata)
    private readonly developerRepository: Repository<DeveloperMetadata>,
  ) {}

  /**
   * Get a paginated list of developers, sorted by the number of games released by
   * each developer (by default).
   */
  @Get()
  @ApiOperation({
    summary: "获取开发商列表",
    description:
      "默认情况下，列表按每个开发商开发的游戏数量排序。",
    operationId: "getDevelopers",
  })
  @MinimumRole(Role.GUEST)
  @ApiOkResponsePaginated(DeveloperMetadata)
  @PaginateQueryOptions()
  async getDevelopers(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<DeveloperMetadata>> {
    const queryBuilder = this.developerRepository
      .createQueryBuilder("developer")
      .innerJoin("developer.games", "games")
      .innerJoin(
        GamevaultGame,
        "game",
        "game.metadata_id = games.id AND game.deleted_at IS NULL",
      )
      .where("developer.provider_slug = :provider_slug", {
        provider_slug: "gamevault",
      })
      .groupBy("developer.id");

    // If no specific sort is provided, sort by the number of games in descending order
    if (query.sortBy?.length === 0) {
      queryBuilder
        .addSelect("COUNT(DISTINCT game.id)", "games_count")
        .orderBy("games_count", "DESC");
    }

    const paginatedResults = await paginate(query, queryBuilder, {
      paginationType: PaginationType.TAKE_AND_SKIP,
      defaultLimit: 100,
      maxLimit: -1,
      nullSort: "last",
      loadEagerRelations: false,
      sortableColumns: ["id", "name", "created_at", "provider_slug"],
      searchableColumns: ["name"],
      filterableColumns: {
        id: true,
        created_at: true,
        name: true,
      },
      withDeleted: false,
    });

    return paginatedResults;
  }
}
