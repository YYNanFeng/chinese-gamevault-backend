import { ApiPropertyOptional } from "@nestjs/swagger";
import { Column, Entity, Index, ManyToOne } from "typeorm";

import { DatabaseEntity } from "../database/database.entity";
import { GamevaultUser } from "../users/gamevault-user.entity";

@Entity()
export class Media extends DatabaseEntity {
  @Column({ nullable: true })
  @ApiPropertyOptional({
    example:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Grand_Theft_Auto_logo_series.svg",
    description: "媒体的原始来源 URL",
    pattern: "url",
  })
  source_url?: string;

  @Column({ unique: true, nullable: true })
  @Index({ unique: true })
  @ApiPropertyOptional({
    example: "/media/6e6ae60b-7102-4501-ba69-62bd6419b2e0.jpg",
    description: "媒体在文件系统上的路径",
  })
  file_path?: string;

  @Column()
  @ApiPropertyOptional({
    example: "image/jpeg",
    description: "文件系统上媒体的媒体类型",
  })
  type: string;

  @ManyToOne(() => GamevaultUser, (user) => user.uploaded_media, {
    nullable: true,
  })
  @ApiPropertyOptional({
    description: "媒体的上传者",
    type: () => GamevaultUser,
  })
  uploader?: GamevaultUser;
}
