import { Body, Controller, Get, Put, StreamableFile } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";

import { createReadStream, outputFile, pathExists } from "fs-extra";
import { AppConfiguration } from "../../configuration";
import { InjectGamevaultConfig } from "../../decorators/inject-gamevault-config.decorator";
import { MinimumRole } from "../../decorators/minimum-role.decorator";
import { Status } from "../status/models/status.model";
import { Role } from "../users/models/role.enum";
import { UpdateNewsDto } from "./models/update-news.dto";

@ApiBearerAuth()
@Controller("config")
@ApiTags("config")
@ApiSecurity("apikey")
export class ConfigController {
  constructor(
    @InjectGamevaultConfig() private readonly config: AppConfiguration,
  ) {}

  @Get("news")
  @ApiOkResponse({ type: () => Status })
  @ApiOperation({
    summary: "返回配置目录中的 news.md 文件",
    operationId: "getNews",
  })
  @MinimumRole(Role.GUEST)
  async getNews(): Promise<StreamableFile> {
    if (await pathExists(`${this.config.VOLUMES.CONFIG}/news.md`)) {
      return new StreamableFile(
        createReadStream(`${this.config.VOLUMES.CONFIG}/news.md`),
      );
    }
  }

  @Put("news")
  @ApiBody({ type: () => UpdateNewsDto })
  @ApiOkResponse()
  @ApiOperation({
    summary: "更新配置目录中的 news.md 文件",
    operationId: "putNews",
  })
  @MinimumRole(Role.ADMIN)
  async putNews(@Body() dto: UpdateNewsDto): Promise<void> {
    await outputFile(`${this.config.VOLUMES.CONFIG}/news.md`, dto.content);
  }
}
