import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNotIn,
  Matches,
} from "class-validator";

import globals from "../../../../globals";

export class MetadataProviderDto {
  @IsNotEmpty()
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
  public slug: string;

  @IsNotEmpty()
  @ApiProperty({
    description: "提供商的显示名称",
    example: "IGDB",
  })
  public name: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({
    type: Number,
    description:
      "此提供商的使用优先级。优先级较低的提供商会优先尝试，优先级较高的提供商用于填补空白。",
  })
  public priority: number;

  @IsBoolean()
  @ApiProperty({
    type: Boolean,
    description: "此提供商是否已启用",
    default: true,
  })
  public enabled = true;
}
