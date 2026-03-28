import { metrics, trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const OTEL_ENDPOINT = import.meta.env.VITE_OTEL_ENDPOINT ?? 'http://localhost:4318';

export function setupTelemetry(): void {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'taskflow-frontend',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  });

  // ── Traces ────────────────────────────────────────────────────────────────
  const tracerProvider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${OTEL_ENDPOINT}/v1/traces` })
      ),
    ],
  });
  tracerProvider.register();
  trace.setGlobalTracerProvider(tracerProvider);

  // ── Metrics ───────────────────────────────────────────────────────────────
  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${OTEL_ENDPOINT}/v1/metrics` }),
        exportIntervalMillis: 30_000,
      }),
    ],
  });
  metrics.setGlobalMeterProvider(meterProvider);

  // ── Logs ──────────────────────────────────────────────────────────────────
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({ url: `${OTEL_ENDPOINT}/v1/logs` })
      ),
    ],
  });
  logs.setGlobalLoggerProvider(loggerProvider);

  // ── Auto-instrumentations ─────────────────────────────────────────────────
  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-document-load': {},
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: [/localhost/],
        },
        '@opentelemetry/instrumentation-xml-http-request': {
          propagateTraceHeaderCorsUrls: [/localhost/],
        },
        '@opentelemetry/instrumentation-user-interaction': { enabled: false },
      }),
    ],
  });
}
