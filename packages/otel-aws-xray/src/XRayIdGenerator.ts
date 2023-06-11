import type { IdGenerator } from '@opentelemetry/sdk-trace-node';
import { randomBytes } from 'crypto';

/**
 * Generate trace and span IDs for X-Ray.
 */
export class XRayIdGenerator implements IdGenerator {
  /**
   * Unpacks a packed trace ID and formats it for XRay.
   */
  static unpackTraceId(traceId: string): string {
    const nowHex = traceId.slice(0, 8);
    const uniqueHex = traceId.slice(8);
    return `1-${nowHex}-${uniqueHex}`;
  }

  /**
   * Generate a trace ID.
   * @see https://docs.aws.amazon.com/xray/latest/devguide/xray-api-segmentdocuments.html
   */
  generateTraceId(): string {
    const nowHex = Math.floor(Date.now() / 1000).toString(16);
    const uniqueHex = randomBytes(12).toString('hex');
    // Pack the timestamp and unique ID into a single string. Together, these
    // amount to 32 digits, which is what OpenTelemetry wants.
    return `${nowHex}${uniqueHex}`;
  }

  /**
   * Generate a span ID.
   */
  generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }
}
