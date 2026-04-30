import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsAlpha,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Length,
  Matches,
  MinLength,
} from "class-validator";

import { IsDateStringBeforeNow } from "../../../validators/is-date-string-before-now.validator";
import { Role } from "./role.enum";

export class UpdateUserDto {
  @Matches(/^\w+$/, {
    message:
      "Usernames can only contain latin letters, numbers and underscores",
  })
  @Length(2, 32)
  @IsOptional()
  @IsNotEmpty()
  @ApiPropertyOptional({
    example: "JohnDoe",
    description: "用户名",
  })
  username?: string;

  @IsEmail()
  @IsOptional()
  @IsNotEmpty()
  @ApiPropertyOptional({
    example: "john.doe@mail.com",
    description: "邮箱地址",
  })
  email?: string;

  @MinLength(8)
  @IsOptional()
  @IsNotEmpty()
  @ApiPropertyOptional({
    example: "SecretPw822!",
    minLength: 8,
    description: "密码",
  })
  password?: string;

  @IsAlpha("de-DE")
  @IsOptional()
  @IsNotEmpty()
  @ApiPropertyOptional({
    example: "John",
    description: "名",
  })
  first_name?: string;

  @IsAlpha("de-DE")
  @IsOptional()
  @IsNotEmpty()
  @ApiPropertyOptional({
    example: "Doe",
    description: "姓",
  })
  last_name?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsDateString()
  @IsDateStringBeforeNow()
  @ApiPropertyOptional({
    description: "用户的出生日期，ISO8601 格式",
  })
  birth_date?: string;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    example: 69_420,
    description: "用户头像图片的 ID",
  })
  avatar_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    example: 69_420,
    description: "用户背景图片的 ID",
  })
  background_id?: number;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    pattern: "boolean",
    example: true,
    description: "用户是否已激活（暂未生效）",
  })
  activated?: boolean;

  @IsEnum(Role)
  @IsOptional()
  @ApiPropertyOptional({
    type: "string",
    enum: Role,
    example: Role.EDITOR,
    description:
      "角色决定了用户在系统中的权限集合和访问权限。",
  })
  public role?: Role;
}
