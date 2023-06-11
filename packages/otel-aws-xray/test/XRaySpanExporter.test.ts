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
    provider.addSpanProcessor(new SimpleSpanProcessor(xRaySpanExporter));
    provider.register();

    // WHEN
    const tracer = trace.getTracer('test');
    await tracer.startActiveSpan('test', async (span) => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      await tracer.startActiveSpan('test child', async (span) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const res = await fetch('https://www.example.com');
        if (!res.ok) {
          throw new Error('not ok');
        }
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
  });
});
