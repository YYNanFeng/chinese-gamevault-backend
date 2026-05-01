import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotIn, Matches } from "class-validator";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from "typeorm";

import globals from "../../../globals";
import { MediaValidator } from "../../../validators/media.validator";
import { DatabaseEntity } from "../../database/database.entity";
import { Media } from "../../media/media.entity";
import { DeveloperMetadata } from "../developers/developer.metadata.entity";
import { GenreMetadata } from "../genres/genre.metadata.entity";
import { Metadata } from "../models/metadata.interface";
import { PublisherMetadata } from "../publishers/publisher.metadata.entity";
import { TagMetadata } from "../tags/tag.metadata.entity";

@Entity()
@Index("UQ_GAME_METADATA", ["provider_slug", "provider_data_id"], {
  unique: true,
})
export class GameMetadata extends DatabaseEntity implements Metadata {
  //#region Provider Metadata Properties
  @Column({ nullable: true })
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
  provider_slug?: string;

  @Column({ nullable: true })
  @Index()
  @ApiPropertyOptional({
    description: "提供商的游戏 ID",
    example: "Grand Theft Auto V",
  })
  provider_data_id?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "提供商的游戏 URL",
    example: "https://www.igdb.com/games/grand-theft-auto-v",
    pattern: "url",
  })
  provider_data_url?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "此元数据的可选优先级覆盖",
    example: 1,
  })
  provider_priority?: number;

  //#endregion

  @Column({ type: "int", nullable: true })
  @ApiPropertyOptional({
    description: "游戏的最低年龄要求",
    example: 18,
    default: 0,
  })
  age_rating?: number;

  @Column({ nullable: true })
  @Index()
  @ApiProperty({
    description: "游戏标题",
    example: "Grand Theft Auto V",
  })
  title?: string;

  @Index()
  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "游戏的发布日期",
    example: "2013-09-17T00:00:00.000Z",
  })
  release_date?: Date;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "游戏描述，支持 Markdown 格式",
    example:
      "An open world action-adventure video game developed by **Rockstar North** and published by **Rockstar Games**.",
  })
  description?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "管理员对游戏的公开备注，支持 Markdown 格式",
    example: "# README \n Install other game first!",
  })
  notes?: string;

  @Column({ type: "int", nullable: true })
  @ApiPropertyOptional({
    description: "其他玩家在该游戏中的平均游玩时间（分钟）",
    example: 180,
  })
  average_playtime?: number;

  @MediaValidator("image")
  @ManyToOne(() => Media, {
    nullable: true,
    eager: true,
  })
  @JoinColumn()
  @ApiPropertyOptional({
    description: "游戏的封面/包装图片",
    type: () => Media,
  })
  cover?: Media;

  @MediaValidator("image")
  @ManyToOne(() => Media, {
    nullable: true,
    eager: true,
  })
  @JoinColumn()
  @ApiPropertyOptional({
    description: "游戏的背景图片",
    type: () => Media,
  })
  background?: Media;

  @Column({ type: "simple-array", nullable: true })
  @ApiPropertyOptional({
    description: "游戏的外部托管截图 URL 列表",
    type: () => String,
    isArray: true,
  })
  url_screenshots?: string[];

  @Column({ type: "simple-array", nullable: true })
  @ApiPropertyOptional({
    description: "游戏的外部托管预告片视频 URL 列表",
    type: () => String,
    isArray: true,
  })
  url_trailers?: string[];

  @Column({ type: "simple-array", nullable: true })
  @ApiPropertyOptional({
    description: "游戏的外部托管实况视频 URL 列表",
    type: () => String,
    isArray: true,
  })
  url_gameplays?: string[];

  @Column({ type: "simple-array", nullable: true })
  @ApiPropertyOptional({
    description: "游戏的网站 URL 列表",
    example: "https://escapefromtarkov.com",
    type: () => String,
    isArray: true,
  })
  url_websites?: string[];

  @Column({ type: "float", nullable: true })
  @ApiPropertyOptional({
    description: "提供商的评分",
    example: 90,
  })
  rating?: number;

  @Column({ nullable: true })
  @ApiProperty({
    description: "指示该游戏是否处于抢先体验阶段",
    example: true,
  })
  early_access?: boolean;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "游戏的预设启动参数",
    example: "-fullscreen -dx11",
  })
  launch_parameters?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "游戏的预设启动可执行文件",
    example: "ShooterGame.exe",
  })
  launch_executable?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description:
      "游戏的预设安装程序参数。可以使用 %INSTALLDIR% 作为安装目录的占位符。",
    example: '/D="%INSTALLDIR%" /S /DIR="%INSTALLDIR%" /SILENT',
  })
  installer_parameters?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "游戏的预设安装可执行文件",
    example: "setup.exe",
  })
  installer_executable?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "游戏的预设卸载程序参数",
    example: "/SILENT",
  })
  uninstaller_parameters?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    description: "游戏的预设卸载可执行文件",
    example: "uninst.exe",
  })
  uninstaller_executable?: string;

  @JoinTable({
    name: "game_metadata_publishers_publisher_metadata",
    joinColumn: {
      name: "game_metadata_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "publisher_metadata_id",
      referencedColumnName: "id",
    },
  })
  @ManyToMany(() => PublisherMetadata, (publisher) => publisher.games, {
    eager: true,
  })
  @ApiPropertyOptional({
    description: "游戏的发行商",
    type: () => PublisherMetadata,
    isArray: true,
  })
  publishers?: PublisherMetadata[];

  @JoinTable({
    name: "game_metadata_developers_developer_metadata",
    joinColumn: {
      name: "game_metadata_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "developer_metadata_id",
      referencedColumnName: "id",
    },
  })
  @ManyToMany(() => DeveloperMetadata, (developer) => developer.games, {
    eager: true,
  })
  @ApiPropertyOptional({
    description: "游戏的开发商",
    type: () => DeveloperMetadata,
    isArray: true,
  })
  developers?: DeveloperMetadata[];

  @JoinTable({
    name: "game_metadata_tags_tag_metadata",
    joinColumn: {
      name: "game_metadata_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "tag_metadata_id",
      referencedColumnName: "id",
    },
  })
  @ManyToMany(() => TagMetadata, (tag) => tag.games, {
    eager: true,
  })
  @ApiPropertyOptional({
    description: "游戏的标签",
    type: () => TagMetadata,
    isArray: true,
  })
  tags?: TagMetadata[];

  @JoinTable({
    name: "game_metadata_genres_genre_metadata",
    joinColumn: {
      name: "game_metadata_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "genre_metadata_id",
      referencedColumnName: "id",
    },
  })
  @ManyToMany(() => GenreMetadata, (genre) => genre.games, {
    eager: true,
  })
  @ApiPropertyOptional({
    description: "游戏的类型",
    type: () => GenreMetadata,
    isArray: true,
  })
  genres?: GenreMetadata[];
}
