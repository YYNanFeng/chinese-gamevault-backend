import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumberString, Matches } from "class-validator";

import { GameIdDto } from "../../games/models/game-id.dto";
import { ProviderSlugDto } from "../providers/models/provider-slug.dto";

export class MapGameParamsDto implements ProviderSlugDto, GameIdDto {
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "Invalid slug: Only lowercase letters, numbers, and single hyphens inbetween them are allowed.",
  })
  @ApiProperty({
    description:
      "提供商的 slug（URL 友好名称）。这是主要标识符，必须符合有效的 slug 格式。",
    example: "igdb",
  })
  provider_slug: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({ example: "1", description: "游戏 ID" })
  game_id: number;
}
