import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotIn, Matches } from "class-validator";

import globals from "../../../globals";

export class MinimalGameMetadataDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "Invalid slug: Only lowercase letters, numbers, and single hyphens inbetween them are allowed.",
  })
  @IsNotIn(globals.RESERVED_PROVIDER_SLUGS, {
    message:
      "Invalid slug: The terms 'gamevault' and 'user' are reserved slugs.",
  })
  @ApiProperty({
    description:
      "提供商的 slug（URL 友好名称）。这是主要标识符，必须符合有效的 slug 格式。",
    example: "igdb",
  })
  provider_slug: string;

  @ApiPropertyOptional({
    description: "提供商的游戏 ID",
    example: "Grand Theft Auto V",
  })
  provider_data_id?: string;

  @ApiProperty({
    description: "游戏标题",
    example: "Grand Theft Auto V",
  })
  title: string;

  @ApiPropertyOptional({
    description: "游戏的发布日期",
    example: "2013-09-17T00:00:00.000Z",
  })
  release_date?: Date;

  @ApiPropertyOptional({
    description: "游戏的封面图片 URL",
    example: "example.com/example.jpg",
  })
  cover_url?: string;

  @ApiPropertyOptional({
    description: "游戏描述，支持 Markdown 格式",
    example:
      "An open world action-adventure video game developed by **Rockstar North** and published by **Rockstar Games**.",
  })
  description?: string;
}
