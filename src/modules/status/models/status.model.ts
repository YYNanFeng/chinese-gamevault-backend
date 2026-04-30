import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import configuration from "../../../configuration";
import { AuthenticationMethod } from "./authentication-method.enum";
import { RegistrationFields } from "./registration-fields.enum";
import { StatusEnum } from "./status.enum";

export class StatusEntry {
  @ApiProperty({
    description: "协议条目的时间戳",
    example: "2021-01-01T00:00:00.000Z",
  })
  timestamp: Date;

  @ApiProperty({
    description: "设置的状态",
    type: "string",
    enum: StatusEnum,
    example: StatusEnum.UNHEALTHY,
  })
  status: StatusEnum;
  @ApiProperty({
    description: "状态设置的原因",
    example: "Database disconnected.",
  })
  reason: string;

  constructor(status: StatusEnum, reason: string) {
    this.timestamp = new Date();
    this.status = status;
    this.reason = reason;
  }
}

export class Status {
  @ApiProperty({
    description: "服务器当前状态",
    type: "string",
    enum: StatusEnum,
    example: StatusEnum.HEALTHY,
  })
  status: StatusEnum;

  @ApiProperty({
    description: "服务器版本",
    example: "1.0.0",
  })
  version?: string;

  @ApiProperty({
    description: "是否启用用户注册",
    example: true,
  })
  registration_enabled?: boolean;

  @ApiProperty({
    description: "必填的注册字段列表",
    type: "string",
    enum: RegistrationFields,
    example: [RegistrationFields.BIRTH_DATE, RegistrationFields.EMAIL],
    isArray: true,
  })
  required_registration_fields?: RegistrationFields[];

  @ApiProperty({
    description: "可用的认证方式列表",
    type: "string",
    enum: AuthenticationMethod,
    example: [AuthenticationMethod.BASIC, AuthenticationMethod.SSO],
    isArray: true,
  })
  available_authentication_methods?: AuthenticationMethod[];

  @ApiPropertyOptional({
    description: "服务器运行时间（秒）（仅管理员可见）",
    example: 300,
  })
  uptime?: number;

  @ApiPropertyOptional({
    description: "服务器状态协议（仅管理员可见）",
    type: () => StatusEntry,
    isArray: true,
  })
  protocol?: StatusEntry[];

  constructor(epoch: Date, protocol: StatusEntry[] = []) {
    this.status = StatusEnum.HEALTHY;
    this.version = configuration.SERVER.VERSION;
    this.registration_enabled = !configuration.SERVER.REGISTRATION_DISABLED;

    this.required_registration_fields = [
      configuration.USERS.REQUIRE_BIRTH_DATE ||
      configuration.PARENTAL.AGE_RESTRICTION_ENABLED
        ? RegistrationFields.BIRTH_DATE
        : null,
      configuration.USERS.REQUIRE_EMAIL ? RegistrationFields.EMAIL : null,
      configuration.USERS.REQUIRE_FIRST_NAME
        ? RegistrationFields.FIRST_NAME
        : null,
      configuration.USERS.REQUIRE_LAST_NAME
        ? RegistrationFields.LAST_NAME
        : null,
    ].filter(Boolean);

    this.available_authentication_methods = [
      configuration.AUTH.BASIC_AUTH.ENABLED ? AuthenticationMethod.BASIC : null,
      configuration.AUTH.OAUTH2.ENABLED ? AuthenticationMethod.SSO : null,
    ].filter(Boolean);

    this.uptime = Math.floor((Date.now() - epoch.getTime()) / 1000);
    this.protocol = protocol;
  }
}
