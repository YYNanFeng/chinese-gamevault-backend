import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmpty, IsNotEmpty, IsOptional } from "class-validator";

import { ActivityState } from "./activity-state.enum";

export class Activity {
  @IsEmpty()
  @ApiPropertyOptional({
    description: "该活动所属用户的 ID",
  })
  user_id?: number;

  @IsEmpty()
  @ApiPropertyOptional({
    description: "该活动所属用户的 Socket ID",
  })
  socket_id?: string;

  @ApiProperty({
    type: "string",
    enum: ActivityState,
    example: ActivityState.PLAYING,
    description: "要设置的在线状态",
  })
  @IsNotEmpty()
  state: ActivityState;

  @ApiPropertyOptional({
    description: "游戏 ID，仅在状态为 'PLAYING' 时必填",
  })
  @IsOptional()
  @IsNotEmpty()
  game_id?: number;
}
