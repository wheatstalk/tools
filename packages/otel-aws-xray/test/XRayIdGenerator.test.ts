import { describe, expect, test } from 'vitest';

import { XRayIdGenerator } from '../src/index.js';

describe('XRayIdGenerator', () => {
  const xRayIdGenerator = new XRayIdGenerator();

  test('generate trace id', () => {
    // WHEN
    const output = xRayIdGenerator.generateTraceId();
    const unpacked = XRayIdGenerator.unpackTraceId(output);

    // THEN
    expect(output).toHaveLength(32);
    expect(output).toMatch(/^[0-9a-f]{32}$/i); // OpenTelemetry compatibility
    expect(unpacked).toMatch(/^1-[a-f0-9]{8}-[a-f0-9]{24}$/); // Unpacks to X-Ray format
  });

  test('span id', () => {
    // WHEN
    const output = xRayIdGenerator.generateSpanId();

    // THEN
    expect(output).toMatch(/^[0-9a-f]{16}$/i);
  });
});
