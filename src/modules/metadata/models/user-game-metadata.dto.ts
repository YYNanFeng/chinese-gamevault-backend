import { Optional } from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  NotContains,
} from "class-validator";

import { MediaValidator } from "../../../validators/media.validator";
import { Media } from "../../media/media.entity";

export class UpdateGameUserMetadataDto {
  @ApiPropertyOptional({
    description: "游戏的最低年龄要求",
    example: 18,
    default: 0,
  })
  @IsOptional()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  age_rating?: number = 0;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({
    description: "游戏标题",
    example: "Grand Theft Auto V",
  })
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({
    description:
      "游戏的排序标题，用于优化排序",
    example: "grand theft auto 5",
  })
  sort_title?: string;

  @ApiPropertyOptional({
    description: "游戏的发布日期（ISO8601 格式）",
    example: "2013-09-17T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  @IsNotEmpty()
  release_date?: string;

  @ApiPropertyOptional({
    description: "游戏描述，支持 Markdown 格式",
    example:
      "An open world action-adventure video game developed by **Rockstar North** and published by **Rockstar Games**.",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({
    description:
      "管理员对游戏的公开备注，支持 Markdown 格式",
    example: "# README \n Install other game first!",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;

  @ApiPropertyOptional({
    description: "其他玩家在该游戏中的平均游玩时间（分钟）",
    example: 180,
  })
  @IsInt()
  @Min(0)
  @Optional()
  @IsNotEmpty()
  average_playtime?: number;

  @MediaValidator("image")
  @Optional()
  @IsNotEmpty()
  @ApiPropertyOptional({
    description: "游戏的封面/包装图片",
    type: () => Media,
  })
  cover?: Media;

  @MediaValidator("image")
  @Optional()
  @IsNotEmpty()
  @ApiPropertyOptional({
    description: "游戏的背景图片",
    type: () => Media,
  })
  background?: Media;

  @ApiPropertyOptional({
    description: "提供商的评分",
    example: 90,
  })
  @IsOptional()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  rating?: number;

  @ApiPropertyOptional({
    description: "指示该游戏是否处于抢先体验阶段",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @IsNotEmpty()
  early_access?: boolean;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @ApiPropertyOptional({
    description: "游戏的预设启动参数",
    example: "-fullscreen -dx11",
  })
  launch_parameters?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @ApiPropertyOptional({
    description: "游戏的预设启动可执行文件",
    example: "ShooterGame.exe",
  })
  launch_executable?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @ApiPropertyOptional({
    description:
      "游戏的预设安装程序参数。可以使用 %INSTALLDIR% 作为安装目录的占位符。",
    example: '/D="%INSTALLDIR%" /S /DIR="%INSTALLDIR%" /SILENT',
  })
  installer_parameters?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @ApiPropertyOptional({
    description: "游戏的预设安装可执行文件",
    example: "setup.exe",
  })
  installer_executable?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @ApiPropertyOptional({
    description: "游戏的预设卸载程序参数",
    example: "/SILENT",
  })
  uninstaller_parameters?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @ApiPropertyOptional({
    description: "游戏的预设卸载可执行文件",
    example: "uninst.exe",
  })
  uninstaller_executable?: string;

  @IsArray()
  @IsOptional()
  @IsUrl(undefined, { each: true })
  @NotContains(",", { each: true })
  @IsNotEmpty({ each: true })
  @ApiPropertyOptional({
    description: "游戏的外部托管截图 URL 列表",
    type: () => String,
    isArray: true,
  })
  url_screenshots?: string[];

  @IsArray()
  @IsOptional()
  @IsUrl(undefined, { each: true })
  @NotContains(",", { each: true })
  @IsNotEmpty({ each: true })
  @ApiPropertyOptional({
    description: "游戏的外部托管预告片视频 URL 列表",
    type: () => String,
    isArray: true,
  })
  url_trailers?: string[];

  @IsArray()
  @IsOptional()
  @IsUrl(undefined, { each: true })
  @NotContains(",", { each: true })
  @IsNotEmpty({ each: true })
  @ApiPropertyOptional({
    description: "游戏的外部托管实况视频 URL 列表",
    type: () => String,
    isArray: true,
  })
  url_gameplays?: string[];

  @IsArray()
  @IsOptional()
  @IsUrl(undefined, { each: true })
  @NotContains(",", { each: true })
  @IsNotEmpty({ each: true })
  @ApiPropertyOptional({
    description: "游戏的网站 URL 列表",
    example: "https://www.escapefromtarkov.com/",
    type: () => String,
    isArray: true,
  })
  url_websites?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ApiPropertyOptional({
    description: "游戏的发行商",
    type: () => String,
    isArray: true,
  })
  publishers?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ApiPropertyOptional({
    description: "游戏的开发商",
    type: () => String,
    isArray: true,
  })
  developers?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ApiPropertyOptional({
    description: "游戏的标签",
    type: () => String,
    isArray: true,
  })
  tags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: "游戏的类型",
    type: () => String,
    isArray: true,
  })
  genres?: string[];
}
