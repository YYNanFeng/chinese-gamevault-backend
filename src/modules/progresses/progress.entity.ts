import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Column, Entity, Index, ManyToOne } from "typeorm";

import { DatabaseEntity } from "../database/database.entity";
import { GamevaultGame } from "../games/gamevault-game.entity";
import { GamevaultUser } from "../users/gamevault-user.entity";
import { State } from "./models/state.enum";

@Entity()
export class Progress extends DatabaseEntity {
  @Index()
  @ManyToOne(() => GamevaultUser, (user) => user.progresses)
  @ApiPropertyOptional({
    description: "进度所属的用户",
    type: () => GamevaultUser,
  })
  user?: GamevaultUser;

  @Index()
  @ManyToOne(() => GamevaultGame, (game) => game.progresses)
  @ApiPropertyOptional({
    description: "进度所属的游戏",
    type: () => GamevaultGame,
  })
  game?: GamevaultGame;

  @Column({ type: "int", default: 0 })
  @ApiProperty({
    description: "游玩时间（分钟）",
    example: 25,
  })
  minutes_played: number;

  @Column({ type: "simple-enum", enum: State, default: State.UNPLAYED })
  @ApiProperty({
    description: "游戏进度的状态",
    type: "string",
    enum: State,
    example: State.PLAYING,
  })
  state: State;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "进度更新日期",
    example: "2020-01-01T00:00:00.000Z",
  })
  last_played_at?: Date;
}
