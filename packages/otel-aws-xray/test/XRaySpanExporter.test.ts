import { XRayClient } from '@aws-sdk/client-xray';
import { trace } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import {
  NodeTracerProvider,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { describe, expect, test, vi } from 'vitest';

import { XRayIdGenerator, XRaySpanExporter } from '../src/index.js';

describe('XRaySpanExporter', () => {
  test('nested spans', async () => {
    const xRayClient = new XRayClient({});
    const sendSpy = vi
      .spyOn(xRayClient, 'send')
      .mockImplementation(async () => ({
        UnprocessedTraceSegments: [],
      }));

    const provider = new NodeTracerProvider({
      resource: new Resource({
        service: 'XRaySpanExporter.test.ts',
      }),
      idGenerator: new XRayIdGenerator(),
    });

    const xRaySpanExporter = new XRaySpanExporter({ xRayClient });
    const exportSpy = vi.spyOn(xRaySpanExporter, 'export');

    provider.addSpanProcessor(new SimpleSpanProcessor(xRaySpanExporter));
    provider.register();

    // WHEN
    const tracer = trace.getTracer('test');
    await tracer.startActiveSpan('test', async (span) => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      await tracer.startActiveSpan('test child', async (span) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        span.end();
      });

      span.end();
    });

    await provider.forceFlush();

    // THEN
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TraceSegmentDocuments: expect.arrayContaining([
            expect.stringContaining('"name":"test"'),
          ]),
        },
      }),
    );
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TraceSegmentDocuments: expect.arrayContaining([
            expect.stringContaining('"name":"test child"'),
          ]),
        },
      }),
    );
    // 'test child' span should have a parent span id
    expect(exportSpy).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          name: 'test child',
          parentSpanId: expect.stringMatching(/^[0-9a-f]{16}$/),
        }),
      ],
      expect.any(Function),
    );
  });
});
