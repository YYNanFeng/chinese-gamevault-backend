import { Injectable, NotFoundException } from "@nestjs/common";

import { GameMetadata } from "../../games/game.metadata.entity";
import { MinimalGameMetadataDto } from "../../games/minimal-game.metadata.dto";
import { MetadataProvider } from "../abstract.metadata-provider.service";

@Injectable()
export class RawgLegacyMetadataProviderService extends MetadataProvider {
  readonly enabled = false;
  readonly priority = -10;
  readonly slug = "rawg-legacy";
  readonly name = "RAWG (Legacy)";
  readonly noopMessage =
    "RAWG (Legacy) 元数据源不支持此功能。它仅用于兼容性目的。";

  public override async register() {
    this.metadataService.registerProvider(this);
  }

  public override async search(
    query: string,
  ): Promise<MinimalGameMetadataDto[]> {
    this.logger.debug({
      message: this.noopMessage,
      operation: "search",
      query,
    });
    return [];
  }

  public override async getByProviderDataIdOrFail(
    provider_data_id: string,
  ): Promise<GameMetadata> {
    this.logger.debug({
      message: this.noopMessage,
      operation: "getByProviderDataIdOrFail",
      provider_data_id,
    });
    throw new NotFoundException({
      message: this.noopMessage,
    });
  }
}
