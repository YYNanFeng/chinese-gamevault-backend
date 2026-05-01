import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
} from "typeorm";

import { Session } from "../auth/session.entity";
import { DatabaseEntity } from "../database/database.entity";
import { GamevaultGame } from "../games/gamevault-game.entity";
import { Media } from "../media/media.entity";
import { Progress } from "../progresses/progress.entity";
import { Role } from "./models/role.enum";

@Entity()
export class GamevaultUser extends DatabaseEntity {
  @Index({ unique: true })
  @Column({ unique: true })
  @ApiProperty({ example: "JohnDoe", description: "用户名" })
  username: string;

  @Column({ select: false })
  @ApiProperty({
    description: "用户的加密密码",
    example: "Hunter2",
  })
  password: string;

  @Index({ unique: true })
  @Column({ select: false, unique: true, length: 64 })
  @ApiPropertyOptional({
    description:
      "用户的 API 密钥，可用于服务器认证（例如 API 密钥认证 / WebSocket 协议）",
    example: "fd9c4f417fb494aeacef28a70eba95128d9f2521374852cdb12ecb746888b892",
  })
  api_key?: string;

  @OneToOne(() => Media, {
    nullable: true,
    eager: true,
    onDelete: "CASCADE",
    orphanedRowAction: "soft-delete",
  })
  @JoinColumn()
  @ApiPropertyOptional({
    type: () => Media,
    description: "用户的头像图片",
  })
  avatar?: Media;

  @OneToOne(() => Media, {
    nullable: true,
    eager: true,
    onDelete: "CASCADE",
    orphanedRowAction: "soft-delete",
  })
  @JoinColumn()
  @ApiPropertyOptional({
    type: () => Media,
    description: "用户的个人资料背景图片",
  })
  background?: Media;

  @Column({ unique: true, nullable: true })
  @ApiProperty({
    example: "john.doe@mail.com",
    description: "用户的邮箱地址",
  })
  email: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    example: "John",
    description: "名",
  })
  first_name?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({ example: "Doe", description: "姓" })
  last_name?: string;

  @Index()
  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "用户的生日",
    example: "2013-09-17T00:00:00.000Z",
  })
  birth_date?: Date;

  @Column({ default: false })
  @ApiProperty({
    description: "指示用户是否已激活",
    example: false,
  })
  activated: boolean;

  @OneToMany(() => Progress, (progress) => progress.user)
  @ApiPropertyOptional({
    description: "用户的游戏进度列表",
    type: () => Progress,
    isArray: true,
  })
  progresses?: Progress[];

  @Column({
    type: "simple-enum",
    enum: Role,
    default: Role.USER,
  })
  @ApiProperty({
    type: "string",
    enum: Role,
    example: Role.EDITOR,
    description: "角色决定了用户在系统中的权限集合和访问权限。",
  })
  role: Role;

  @OneToMany(() => Media, (media) => media.uploader)
  @ApiPropertyOptional({
    description: "该用户上传的媒体",
    type: () => Media,
    isArray: true,
  })
  uploaded_media?: Media[];

  @OneToMany(() => Session, (session) => session.user)
  @ApiPropertyOptional({
    description: "用户的会话列表",
    type: () => Session,
    isArray: true,
  })
  sessions?: Session[];

  @ManyToMany(() => GamevaultGame, (game) => game.bookmarked_users)
  @JoinTable({
    name: "bookmark",
    joinColumn: {
      name: "gamevault_user_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "gamevault_game_id",
      referencedColumnName: "id",
    },
  })
  @ApiPropertyOptional({
    description: "该用户收藏的游戏",
    type: () => GamevaultGame,
    isArray: true,
  })
  bookmarked_games?: GamevaultGame[];
}
