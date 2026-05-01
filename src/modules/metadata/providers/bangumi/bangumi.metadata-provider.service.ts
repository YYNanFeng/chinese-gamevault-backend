import { Injectable, NotFoundException } from "@nestjs/common";
import { isNumberString } from "class-validator";
import configuration from "../../../../configuration";

import { Media } from "../../../media/media.entity";
import { MediaService } from "../../../media/media.service";
import { DeveloperMetadata } from "../../developers/developer.metadata.entity";
import { DeveloperMetadataService } from "../../developers/developer.metadata.service";
import { GameMetadata } from "../../games/game.metadata.entity";
import { GameMetadataService } from "../../games/game.metadata.service";
import { MinimalGameMetadataDto } from "../../games/minimal-game.metadata.dto";
import { GenreMetadata } from "../../genres/genre.metadata.entity";
import { GenreMetadataService } from "../../genres/genre.metadata.service";
import { MetadataService } from "../../metadata.service";
import { PublisherMetadata } from "../../publishers/publisher.metadata.entity";
import { PublisherMetadataService } from "../../publishers/publisher.metadata.service";
import { TagMetadata } from "../../tags/tag.metadata.entity";
import { TagMetadataService } from "../../tags/tag.metadata.service";
import { MetadataProvider } from "../abstract.metadata-provider.service";

const BANGUMI_API_BASE = "https://api.bgm.tv";
const BANGUMI_SUBJECT_TYPE_GAME = 4;
const USER_AGENT =
  "GameVault/BangumiProvider/1.0.0 (https://github.com/gamevault)";

interface BangumiSearchResult {
  total: number;
  data: BangumiSubject[];
}

interface BangumiSubject {
  id: number;
  type: number;
  name: string;
  name_cn: string;
  summary: string;
  date: string | null;
  images: {
    medium: string;
    large: string;
    common: string;
  } | null;
  rating: {
    score: number;
    total: number;
  };
  tags: { name: string; count: number }[];
  infobox: { key: string; value: string | { v: string; k?: string }[] }[];
  url: string;
  nsfw: boolean;
  platform: number;
}

interface BangumiPersonRelation {
  id: number;
  name: string;
  type: number;
  career: string[];
  images: {
    medium: string;
    large: string;
  } | null;
}

@Injectable()
export class BangumiMetadataProviderService extends MetadataProvider {
  readonly slug = "bangumi";
  readonly name = "Bangumi";
  readonly priority = configuration.METADATA.BANGUMI.PRIORITY;
  enabled = configuration.METADATA.BANGUMI.ENABLED;
  request_interval_ms = configuration.METADATA.BANGUMI.REQUEST_INTERVAL_MS;

  private readonly accessToken = configuration.METADATA.BANGUMI.ACCESS_TOKEN;
  private readonly ageRatingNsfw =
    configuration.METADATA.BANGUMI.AGE_RATING_NSFW;
  private readonly ageRatingSfw = configuration.METADATA.BANGUMI.AGE_RATING_SFW;

  constructor(
    metadataService: MetadataService,
    gameMetadataService: GameMetadataService,
    developerMetadataService: DeveloperMetadataService,
    publisherMetadataService: PublisherMetadataService,
    tagMetadataService: TagMetadataService,
    genreMetadataService: GenreMetadataService,
    mediaService: MediaService,
  ) {
    super(
      metadataService,
      gameMetadataService,
      developerMetadataService,
      publisherMetadataService,
      tagMetadataService,
      genreMetadataService,
      mediaService,
    );
  }

  public override async onModuleInit() {
    if (!this.accessToken) {
      this.logger.warn({
        message:
          "Bangumi 未配置 ACCESS_TOKEN，部分游戏（含 NSFW 内容）可能无法搜索或获取。请在 .env 中设置 METADATA_BANGUMI_ACCESS_TOKEN。",
      });
    }
    super.onModuleInit();
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    };
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  public override async search(
    query: string,
  ): Promise<MinimalGameMetadataDto[]> {
    const results: MinimalGameMetadataDto[] = [];

    if (isNumberString(query)) {
      try {
        const subject = await this.fetchSubject(Number(query));
        if (subject && subject.type === BANGUMI_SUBJECT_TYPE_GAME) {
          results.push(this.mapMinimalGameMetadata(subject));
        }
      } catch {
        // ignore, fall through to name search
      }
    }

    const searchResults = await this.searchSubjects(query);
    for (const subject of searchResults) {
      results.push(this.mapMinimalGameMetadata(subject));
    }

    this.logger.debug({
      message: `在 Bangumi 上找到 ${results.length} 个游戏`,
      query,
      count: results.length,
    });

    return results;
  }

  public override async getByProviderDataIdOrFail(
    provider_data_id: string,
  ): Promise<GameMetadata> {
    const subject = await this.fetchSubject(Number(provider_data_id));

    if (!subject) {
      throw new NotFoundException(
        `在 Bangumi 上未找到 ID 为 ${provider_data_id} 的游戏。`,
      );
    }

    let persons: BangumiPersonRelation[] = [];
    try {
      persons = await this.fetchSubjectPersons(subject.id);
    } catch (error) {
      this.logger.warn({
        message: `获取 Bangumi 游戏 ${subject.id} 的关联人物失败`,
        error,
      });
    }

    return this.mapGameMetadata(subject, persons);
  }

  private async searchSubjects(query: string): Promise<BangumiSubject[]> {
    const url = `${BANGUMI_API_BASE}/v0/search/subjects`;
    const body = {
      keyword: query,
      sort: "match",
      filter: {
        type: [BANGUMI_SUBJECT_TYPE_GAME],
      },
    };

    const headers = this.getAuthHeaders();
    headers["Content-Type"] = "application/json";

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      this.logger.warn({
        message: `Bangumi 搜索请求失败: ${response.status}`,
        query,
      });
      return [];
    }

    const data = (await response.json()) as BangumiSearchResult;
    return data.data || [];
  }

  private async fetchSubject(id: number): Promise<BangumiSubject | null> {
    const url = `${BANGUMI_API_BASE}/v0/subjects/${id}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Bangumi API 返回 ${response.status}`);
    }

    return (await response.json()) as BangumiSubject;
  }

  private async fetchSubjectPersons(
    subjectId: number,
  ): Promise<BangumiPersonRelation[]> {
    const url = `${BANGUMI_API_BASE}/v0/subjects/${subjectId}/persons`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data as BangumiPersonRelation[];
  }

  private mapMinimalGameMetadata(
    subject: BangumiSubject,
  ): MinimalGameMetadataDto {
    return {
      provider_slug: this.slug,
      provider_data_id: subject.id.toString(),
      title: subject.name_cn || subject.name,
      description: subject.summary || undefined,
      release_date: subject.date ? new Date(subject.date) : undefined,
      cover_url: subject.images?.large || subject.images?.common || undefined,
    } as MinimalGameMetadataDto;
  }

  private async mapGameMetadata(
    subject: BangumiSubject,
    persons: BangumiPersonRelation[],
  ): Promise<GameMetadata> {
    const developers = this.extractDevelopers(subject, persons);
    const publishers = this.extractPublishers(subject);
    const genres = this.extractGenres(subject);
    const tags = this.extractTags(subject);
    const websites = this.extractWebsites(subject);
    const screenshots = this.extractScreenshots(subject);
    const ageRating = this.extractAgeRating(subject);

    const title = subject.name_cn || subject.name;

    let cover: Media | undefined = undefined;
    let background: Media | undefined = undefined;

    try {
      if (subject.images?.large || subject.images?.common) {
        cover = await this.downloadImage(
          subject.images.large || subject.images.common,
        );
      }
    } catch (error) {
      this.logger.warn({
        message: `下载 Bangumi 游戏 ${subject.id} 封面失败`,
        error,
      });
    }

    if (cover) {
      background = cover;
    }

    return {
      provider_slug: this.slug,
      provider_data_id: subject.id.toString(),
      provider_data_url: subject.url,
      title,
      release_date: subject.date ? new Date(subject.date) : undefined,
      description: subject.summary || undefined,
      rating: subject.rating?.score > 0 ? subject.rating.score * 10 : undefined,
      early_access: this.detectEarlyAccess(subject),
      age_rating: ageRating,
      developers,
      publishers,
      genres,
      tags,
      cover,
      background,
      url_screenshots: screenshots.length > 0 ? screenshots : undefined,
      url_websites: websites.length > 0 ? websites : undefined,
    } as GameMetadata;
  }

  private extractAgeRating(subject: BangumiSubject): number | undefined {
    if (this.ageRatingNsfw <= 0 && this.ageRatingSfw <= 0) return undefined;

    return subject.nsfw ? this.ageRatingNsfw : this.ageRatingSfw;
  }

  private detectEarlyAccess(subject: BangumiSubject): boolean {
    const earlyAccessKeywords = [
      "抢先体验",
      "Early Access",
      "early access",
      "抢先",
      "EA",
    ];
    for (const info of subject.infobox || []) {
      if (info.key === "别名" || info.key === "游戏类型") continue;
      const values = this.parseInfoValue(info.value);
      for (const v of values) {
        if (earlyAccessKeywords.some((kw) => v.includes(kw))) return true;
      }
    }
    for (const tag of subject.tags || []) {
      if (earlyAccessKeywords.some((kw) => tag.name.includes(kw))) return true;
    }
    return false;
  }

  private extractDevelopers(
    subject: BangumiSubject,
    persons: BangumiPersonRelation[],
  ): DeveloperMetadata[] {
    const developerNames = new Set<string>();

    for (const info of subject.infobox || []) {
      if (info.key === "开发") {
        const values = this.parseInfoValue(info.value);
        values.forEach((v) => developerNames.add(v));
      }
    }

    for (const person of persons) {
      if (person.career?.includes("producer")) {
        developerNames.add(person.name);
      }
    }

    return Array.from(developerNames).map(
      (name) =>
        ({
          provider_slug: this.slug,
          name,
        }) as DeveloperMetadata,
    );
  }

  private extractPublishers(subject: BangumiSubject): PublisherMetadata[] {
    const publisherNames = new Set<string>();

    for (const info of subject.infobox || []) {
      if (info.key === "发行") {
        const values = this.parseInfoValue(info.value);
        values.forEach((v) => publisherNames.add(v));
      }
    }

    return Array.from(publisherNames).map(
      (name) =>
        ({
          provider_slug: this.slug,
          name,
        }) as PublisherMetadata,
    );
  }

  private extractGenres(subject: BangumiSubject): GenreMetadata[] {
    const genreNames = new Set<string>();

    for (const info of subject.infobox || []) {
      if (info.key === "游戏类型") {
        const values = this.parseInfoValue(info.value);
        values.forEach((v) => {
          v.split(/[/、,，]/).forEach((g) => {
            const trimmed = g.trim();
            if (trimmed) genreNames.add(trimmed);
          });
        });
      }
    }

    return Array.from(genreNames).map(
      (name) =>
        ({
          provider_slug: this.slug,
          name,
        }) as GenreMetadata,
    );
  }

  private extractTags(subject: BangumiSubject): TagMetadata[] {
    return (subject.tags || [])
      .filter((tag) => tag.count > 0)
      .slice(0, 20)
      .map(
        (tag) =>
          ({
            provider_slug: this.slug,
            name: tag.name,
          }) as TagMetadata,
      );
  }

  private extractWebsites(subject: BangumiSubject): string[] {
    const websites: string[] = [subject.url];

    for (const info of subject.infobox || []) {
      if (
        info.key === "网站" ||
        info.key === "官网" ||
        info.key === "官方网站"
      ) {
        if (typeof info.value === "string") {
          const urlMatch = info.value.match(/https?:\/\/[^\s"')\]]+/);
          if (urlMatch) websites.push(urlMatch[0]);
        } else if (Array.isArray(info.value)) {
          for (const item of info.value) {
            if (item.v) {
              const urlMatch = item.v.match(/https?:\/\/[^\s"')\]]+/);
              if (urlMatch) websites.push(urlMatch[0]);
            }
          }
        }
      }
    }

    return [...new Set(websites)];
  }

  private extractScreenshots(subject: BangumiSubject): string[] {
    const screenshots: string[] = [];
    for (const info of subject.infobox || []) {
      if (info.key === "截图" || info.key === "画面") {
        if (typeof info.value === "string") {
          const urlMatch = info.value.match(/https?:\/\/[^\s"')\]]+/);
          if (urlMatch) screenshots.push(urlMatch[0]);
        } else if (Array.isArray(info.value)) {
          for (const item of info.value) {
            if (item.v) {
              const urlMatch = item.v.match(/https?:\/\/[^\s"')\]]+/);
              if (urlMatch) screenshots.push(urlMatch[0]);
            }
          }
        }
      }
    }
    return screenshots;
  }

  private parseInfoValue(
    value: string | { v: string; k?: string }[],
  ): string[] {
    if (typeof value === "string") return [value];
    if (Array.isArray(value))
      return value.map((item) => item.v).filter(Boolean);
    return [];
  }

  private async downloadImage(url: string): Promise<Media | undefined> {
    if (!url) return undefined;
    try {
      return await this.mediaService.downloadByUrl(url);
    } catch (error) {
      this.logger.error(`下载 Bangumi 图片失败: ${url}`, error);
      return undefined;
    }
  }
}
