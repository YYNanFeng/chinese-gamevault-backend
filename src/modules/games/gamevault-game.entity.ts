import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  AfterLoad,
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
} from "typeorm";

import { DatabaseEntity } from "../database/database.entity";
import { GameMetadata } from "../metadata/games/game.metadata.entity";
import { Progress } from "../progresses/progress.entity";
import { GamevaultUser } from "../users/gamevault-user.entity";
import { GameType } from "./models/game-type.enum";

@Entity()
export class GamevaultGame extends DatabaseEntity {
  @Index({ unique: true })
  @Column({ unique: true })
  @ApiPropertyOptional({
    description:
      "游戏或游戏清单的文件路径（相对于根目录）",
    example: "/files/Action/Grand Theft Auto V (v1.0.0).zip",
  })
  file_path?: string;

  @Column({
    type: "bigint",
    default: 0,
    transformer: {
      to: (value) => value,
      from: (value) => {
        if (value) return BigInt(value).toString();
        return value;
      },
    },
  })
  @ApiPropertyOptional({
    description: "游戏文件的大小（字节）",
    example: "1234567890",
    type: () => String,
  })
  size?: bigint;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "游戏标题（从文件名提取）",
    example: "Grand Theft Auto V",
  })
  title?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description:
      "游戏的排序标题，用于优化排序",
    example: "grand theft auto 5",
  })
  sort_title?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "版本标签（从文件名提取，例如 '(v1.0.0)'）",
    example: "v1.0.0",
  })
  version?: string;

  @Index()
  @Column({ nullable: true })
  @ApiPropertyOptional({
    description:
      "游戏的发布日期（从文件名提取，例如 '(2013)'）",
    example: "2013-01-01T00:00:00.000Z",
  })
  release_date?: Date;

  @Column({ default: false })
  @ApiPropertyOptional({
    description:
      "指示该游戏是否为抢先体验版本（从文件名提取，例如 '(EA)'）",
    example: true,
    default: false,
  })
  early_access?: boolean = false;

  @Column({ default: 0 })
  @ApiPropertyOptional({
    description:
      "该游戏在本服务器上的下载次数",
    example: 10,
    default: 0,
  })
  download_count: number = 0;

  @Column({
    type: "simple-enum",
    enum: GameType,
    default: GameType.UNDETECTABLE,
  })
  @ApiPropertyOptional({
    description:
      "游戏类型，详见 https://gamevau.lt/docs/server-docs/game-types 了解所有可能的值",
    type: "string",
    enum: GameType,
    example: GameType.WINDOWS_PORTABLE,
  })
  type: GameType;

  @JoinTable({
    name: "gamevault_game_provider_metadata_game_metadata",
    joinColumn: {
      name: "gamevault_game_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "game_metadata_id",
      referencedColumnName: "id",
    },
  })
  @ManyToMany(() => GameMetadata)
  @ApiPropertyOptional({
    description: "与游戏关联的各提供商元数据",
    type: () => GameMetadata,
    isArray: true,
  })
  provider_metadata?: GameMetadata[];

  @OneToOne(() => GameMetadata, {
    nullable: true,
    cascade: true,
    onDelete: "SET NULL",
    orphanedRowAction: "delete",
  })
  @JoinColumn()
  @ApiPropertyOptional({
    description: "用户自定义的游戏元数据",
    type: () => GameMetadata,
  })
  user_metadata?: GameMetadata;

  @OneToOne(() => GameMetadata, {
    eager: true,
    nullable: true,
    cascade: true,
    onDelete: "SET NULL",
    orphanedRowAction: "delete",
  })
  @JoinColumn()
  @ApiPropertyOptional({
    description: "游戏的有效合并元数据",
    type: () => GameMetadata,
  })
  metadata?: GameMetadata;

  @OneToMany(() => Progress, (progress) => progress.game)
  @ApiPropertyOptional({
    description: "与游戏关联的进度列表",
    type: () => Progress,
    isArray: true,
  })
  progresses?: Progress[];

  @ManyToMany(() => GamevaultUser, (user) => user.bookmarked_games)
  @ApiPropertyOptional({
    description: "收藏了该游戏的用户",
    type: () => GamevaultUser,
    isArray: true,
  })
  bookmarked_users?: GamevaultUser[];

  private createSortTitle(title: string): string {
    // List of leading articles to be removed
    const articles: string[] = ["the", "a", "an"];

    // Convert the title to lowercase
    let sortTitle: string = title.toLowerCase().trim();

    // Remove any leading article
    for (const article of articles) {
      const articleWithSpace = article + " ";
      if (sortTitle.startsWith(articleWithSpace)) {
        sortTitle = sortTitle.substring(articleWithSpace.length);
        break;
      }
    }

    // Remove special characters except alphanumeric and spaces
    sortTitle = sortTitle.replace(/[^a-z0-9\s]/g, "");

    // Replace multiple spaces with a single space and trim
    sortTitle = sortTitle.replace(/\s+/g, " ").trim();

    return sortTitle;
  }

  @AfterLoad()
  async nullChecks() {
    if (!this.provider_metadata) {
      this.provider_metadata = [];
    }
  }
}
