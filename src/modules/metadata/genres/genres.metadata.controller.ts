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
import { GenreMetadata } from "./genre.metadata.entity";

@Controller("genres")
@ApiTags("genres")
@ApiBearerAuth()
@ApiSecurity("apikey")
export class GenreController {
  constructor(
    @InjectRepository(GenreMetadata)
    private readonly genreRepository: Repository<GenreMetadata>,
  ) {}

  /**
   * Get a paginated list of genres, sorted by the number of games released by
   * each genre (by default).
   */
  @Get()
  @ApiOperation({
    summary: "获取游戏类型列表",
    description: "默认情况下，列表按每种类型包含的游戏数量排序。",
    operationId: "getGenres",
  })
  @MinimumRole(Role.GUEST)
  @ApiOkResponsePaginated(GenreMetadata)
  @PaginateQueryOptions()
  async getGenres(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<GenreMetadata>> {
    const queryBuilder = this.genreRepository
      .createQueryBuilder("genre")
      .innerJoin("genre.games", "games")
      .innerJoin(
        GamevaultGame,
        "game",
        "game.metadata_id = games.id AND game.deleted_at IS NULL",
      )
      .where("genre.provider_slug = :provider_slug", {
        provider_slug: "gamevault",
      })
      .groupBy("genre.id");

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
