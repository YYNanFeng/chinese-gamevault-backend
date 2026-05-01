import {
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  Headers,
  Logger,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Request,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";

import { FileInterceptor } from "@nestjs/platform-express";
import bytes from "bytes";
import configuration from "../../configuration";
import { DisableApiIf } from "../../decorators/disable-api-if.decorator";
import { MinimumRole } from "../../decorators/minimum-role.decorator";
import { UserIdGameIdDto } from "../progresses/models/user-id-game-id.dto";
import { GamevaultUser } from "../users/gamevault-user.entity";
import { Role } from "../users/models/role.enum";
import { SavefileService } from "./savefile.service";

@Controller("savefiles")
@ApiTags("savefile")
@ApiBearerAuth()
@ApiSecurity("apikey")
export class SavefileController {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly savefileService: SavefileService) {}

  @Post("/user/:user_id/game/:game_id")
  @ApiOperation({
    summary: "上传存档文件到服务器",
    description:
      "仅管理员或与存档关联的用户可以上传游戏存档文件。存档文件必须为 .zip 格式。安装 ID 可选，用于多设备跟踪。",
    operationId: "postSavefileByUserIdAndGameId",
  })
  @ApiHeader({
    name: "X-Installation-Id",
    description:
      "Optional installation identifier (UUID v4 format) for multi-device save management and uninstall-detection",
    required: false,
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "The save file to upload",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  @MinimumRole(Role.USER)
  @DisableApiIf(
    configuration.SERVER.DEMO_MODE_ENABLED || !configuration.SAVEFILES.ENABLED,
  )
  postSavefileByUserIdAndGameId(
    @Param() params: UserIdGameIdDto,
    @Request() req: { user: GamevaultUser },
    @Headers("X-Installation-Id") installationId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: configuration.SAVEFILES.MAX_SIZE,
            message: `文件超过了最大允许大小 ${bytes(
              configuration.SAVEFILES.MAX_SIZE,
              {
                unit: "MB",
                thousandsSeparator: ".",
              },
            )}。`,
          }),
          new FileTypeValidator({ fileType: "application/zip" }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.savefileService.upload(
      Number(params.user_id),
      Number(params.game_id),
      file,
      req.user.username,
      installationId,
    );
  }

  @Get("/user/:user_id/game/:game_id")
  @ApiOperation({
    summary: "从服务器下载存档文件",
    description: "仅管理员或与存档关联的用户可以下载游戏存档文件。",
    operationId: "getSaveFileByUserIdAndGameId",
  })
  @ApiOkResponse({
    type: () => Buffer,
    description: "The requested save file",
  })
  @ApiOkResponse({ type: () => StreamableFile })
  @DisableApiIf(
    configuration.SERVER.DEMO_MODE_ENABLED || !configuration.SAVEFILES.ENABLED,
  )
  @MinimumRole(Role.USER)
  async getSaveFileByUserIdAndGameId(
    @Param() params: UserIdGameIdDto,
    @Request() req: { user: GamevaultUser },
  ): Promise<StreamableFile> {
    return await this.savefileService.download(
      Number(params.user_id),
      Number(params.game_id),
      req.user.username,
    );
  }

  @Delete("/user/:user_id/game/:game_id")
  @ApiOperation({
    summary: "从服务器删除存档文件",
    description: "仅管理员或与存档关联的用户可以删除游戏存档文件。",
    operationId: "deleteSaveFileByUserIdAndGameId",
  })
  @DisableApiIf(
    configuration.SERVER.DEMO_MODE_ENABLED || !configuration.SAVEFILES.ENABLED,
  )
  @MinimumRole(Role.USER)
  async deleteSaveFileByUserIdAndGameId(@Param() params: UserIdGameIdDto) {
    await this.savefileService.delete(
      Number(params.user_id),
      Number(params.game_id),
    );
  }
}
