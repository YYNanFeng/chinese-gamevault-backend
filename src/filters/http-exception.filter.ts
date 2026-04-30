import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class LoggingExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(this.constructor.name);

  /** Handles exceptions that occur during request processing. */
  catch(error: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const httpStatusCode =
      error instanceof HttpException ? error.getStatus() : 500;
    if (error instanceof HttpException) {
      if (httpStatusCode >= 400 && httpStatusCode < 500) {
        this.logger.warn({
          message: `${error.name} occurred.`,
          path: request.url,
          response: error.getResponse(),
          error,
        });
      } else {
        this.logger.error({
          message: `${error.name} occurred.`,
          path: request.url,
          response: error.getResponse(),
          error,
        });
      }
      response.status(httpStatusCode).json(error.getResponse());
    } else {
      // All other unhandled Exceptions
      this.logger.error({
        message: `Unhandled ${error.name} occurred.`,
        path: request.url,
        error,
      });
      response.status(httpStatusCode).json({
        message:
          "未处理的服务器错误。请检查服务器日志以获取更多详情。",
        error: "未处理的服务器错误",
        statusCode: httpStatusCode,
      });
    }
  }
}
