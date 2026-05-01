import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

import { State } from "./state.enum";

export class UpdateProgressDto {
  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  @ApiPropertyOptional({
    description: "用户在游戏中的游玩分钟数，只能递增或等于当前值",
    example: 22,
  })
  minutes_played: number;

  @IsOptional()
  @IsEnum(State)
  @IsNotEmpty()
  @ApiPropertyOptional({
    description: "游戏进度的新状态",
    type: "string",
    enum: State,
    example: State.PLAYING,
  })
  state: State;
}
