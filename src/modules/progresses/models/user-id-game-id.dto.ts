import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumberString } from "class-validator";

import { GameIdDto } from "../../games/models/game-id.dto";
import { UserIdDto } from "../../users/models/user-id.dto";

export class UserIdGameIdDto implements UserIdDto, GameIdDto {
  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({ example: "1", description: "用户 ID" })
  user_id: number;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({ example: "1", description: "游戏 ID" })
  game_id: number;
}
