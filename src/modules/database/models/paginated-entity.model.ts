import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Paginated } from "nestjs-paginate";
import { Column, SortBy } from "nestjs-paginate/lib/helper";

export class Metadata<T> {
  @ApiProperty({ example: 50, description: "每页条目数" })
  itemsPerPage: number;
  @ApiProperty({ example: 5000, description: "总条目数" })
  totalItems: number;
  @ApiProperty({ example: 5, description: "当前页码" })
  currentPage: number;
  @ApiProperty({ example: 12, description: "总页数" })
  totalPages: number;
  @ApiProperty({ description: "查询应用的排序方式" })
  sortBy: SortBy<T>;
  @ApiPropertyOptional({
    description: "查询应用的搜索字段",
    type: () => String,
    isArray: true,
  })
  searchBy: Column<T>[];
  @ApiPropertyOptional({ description: "搜索关键词" })
  search: string;
  @ApiPropertyOptional({ description: "选择字段字符串" })
  select: string[];
  @ApiPropertyOptional({
    description: "查询应用的过滤条件",
  })
  filter?: {
    [column: string]: string | string[];
  };
}

export class Links {
  @ApiPropertyOptional({
    example:
      "http://localhost:8080/games?limit=5&page=1&sortBy=title:DESC&search=i&filter.early_access=$not:true",
    description: "第一页",
  })
  first?: string;
  @ApiPropertyOptional({
    example:
      "http://localhost:8080/games?limit=5&page=1&sortBy=title:DESC&search=i&filter.early_access=$not:true",
    description: "上一页",
  })
  previous?: string;
  @ApiProperty({
    example:
      "http://localhost:8080/games?limit=5&page=2&sortBy=title:DESC&search=i&filter.early_access=$not:true",
    description: "当前页",
  })
  current: string;
  @ApiPropertyOptional({
    example:
      "http://localhost:8080/games?limit=5&page=3&sortBy=title:DESC&search=i&filter.early_access=$not:true",
    description: "下一页",
  })
  next?: string;
  @ApiPropertyOptional({
    example:
      "http://localhost:8080/games?limit=5&page=3&sortBy=title:DESC&search=i&filter.early_access=$not:true",
    description: "最后一页",
  })
  last?: string;
}

export class PaginatedEntity<T> implements Paginated<T> {
  data: T[];
  @ApiProperty({ description: "列表的元数据", type: () => Metadata })
  meta: Metadata<T>;
  @ApiProperty({ description: "相关查询的链接", type: () => Links })
  links: Links;
}
