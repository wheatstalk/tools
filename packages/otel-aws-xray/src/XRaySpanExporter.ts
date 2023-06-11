import type { XRayClient } from '@aws-sdk/client-xray';
import { PutTraceSegmentsCommand } from '@aws-sdk/client-xray';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';
import type { AttributeValue } from '@opentelemetry/api';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-node';

import { XRayIdGenerator } from './XRayIdGenerator.js';

export interface XRaySpanExporterOptions {
  /** AWS X-Ray client. */
  readonly xRayClient: XRayClient;
}

/**
 * Export spans to AWS X-Ray.
 */
export class XRaySpanExporter implements SpanExporter {
  private readonly xRayClient: XRayClient;

  constructor(options: XRaySpanExporterOptions) {
    this.xRayClient = options.xRayClient;
  }

  async export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> {
    const traceSegmentDocuments = spans
      .map(mapSpanToXRayDocument)
      .map((x) => JSON.stringify(x));

    try {
      const res = await this.xRayClient.send(
        new PutTraceSegmentsCommand({
          TraceSegmentDocuments: traceSegmentDocuments,
        }),
      );

      if (
        res.UnprocessedTraceSegments &&
        res.UnprocessedTraceSegments.length > 0
      ) {
        return resultCallback({
          code: ExportResultCode.FAILED,
          error: new Error('UnprocessedTraceSegments'),
        });
      }

      return resultCallback({
        code: ExportResultCode.SUCCESS,
      });
    } catch (e) {
      return resultCallback({
        code: ExportResultCode.FAILED,
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }
}

/**
 * The result of an export operation.
 * Note: The base library fails to export this type.
 */
interface ExportResult {
  code: ExportResultCode;
  error?: Error;
}

/**
 * The result code of an export operation.
 * Note: The base library fails to export this type.
 */
enum ExportResultCode {
  SUCCESS = 0,
  FAILED = 1,
}

function mapSpanToXRayDocument(span: ReadableSpan) {
  const annotations: Record<string, AttributeValue> = {};
  const metadata: Record<string, AttributeValue> = {};

  // Populate the resource attributes as annotations
  for (const [key, value] of Object.entries(span.resource)) {
    if (!value) continue;
    annotations[key] = value;
  }

  // Populate the span attributes as annotations or metadata
  for (const [key, value] of Object.entries(span.attributes)) {
    if (!value) continue;
    if (key.startsWith('annotation:')) {
      annotations[key.slice(11)] = value;
    } else {
      metadata[key] = value;
    }
  }

  return {
    trace_id: XRayIdGenerator.unpackTraceId(span.spanContext().traceId),
    id: span.spanContext().spanId,
    parent_id: span.parentSpanId,
    name: span.name,
    start_time: span.startTime[0],
    end_time: span.endTime[0],
    annotations, // These are indexed by X-Ray
    metadata, // These are extra metadata attached to the span
  };
}
