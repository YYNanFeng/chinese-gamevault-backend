import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotIn, Matches } from "class-validator";
import { Column, Entity, Index, ManyToMany } from "typeorm";

import globals from "../../../globals";
import { DatabaseEntity } from "../../database/database.entity";
import { GameMetadata } from "../games/game.metadata.entity";
import { Metadata } from "../models/metadata.interface";

@Entity()
@Index("UQ_GENRE_METADATA", ["provider_slug", "provider_data_id"], {
  unique: true,
})
export class GenreMetadata extends DatabaseEntity implements Metadata {
  @Column()
  @Index()
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
  @Column()
  @Index()
  @ApiProperty({
    description: "提供商中的类型 ID",
    example: "1190",
  })
  provider_data_id: string;

  @Index()
  @Column()
  @ApiProperty({
    example: "Platformer",
    description: "类型名称",
  })
  name: string;

  @ManyToMany(() => GameMetadata, (game) => game.genres)
  @ApiPropertyOptional({
    description: "属于该类型的游戏",
    type: () => GameMetadata,
    isArray: true,
  })
  games?: GameMetadata[];
}
