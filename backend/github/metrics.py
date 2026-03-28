import logging

from opentelemetry import metrics

_meter = metrics.get_meter("taskflow.github", version="1.0.0")

request_duration = _meter.create_histogram(
    "github.api.request.duration",
    unit="s",
    description="Duration of GitHub API requests",
)

requests_total = _meter.create_counter(
    "github.api.requests.total",
    description="Total number of GitHub API requests sent",
)

errors_total = _meter.create_counter(
    "github.api.errors.total",
    description="Total number of GitHub API request errors",
)


def record_success(
    logger: logging.Logger,
    transport: str,
    operation: str,
    elapsed: float,
    status_code: int,
) -> None:
    attrs = {"api.transport": transport, "operation": operation, "http.status_code": str(status_code)}
    request_duration.record(elapsed, attrs)
    requests_total.add(1, attrs)
    logger.info(
        "GitHub %s request completed",
        transport,
        extra={"operation": operation, "status_code": status_code, "duration_ms": round(elapsed * 1000, 2)},
    )


def record_error(
    logger: logging.Logger,
    transport: str,
    operation: str,
    elapsed: float,
    exc: Exception,
) -> None:
    attrs = {"api.transport": transport, "operation": operation, "error.type": type(exc).__name__}
    request_duration.record(elapsed, attrs)
    errors_total.add(1, attrs)
    logger.error(
        "GitHub %s request failed",
        transport,
        extra={"operation": operation, "error.type": type(exc).__name__, "duration_ms": round(elapsed * 1000, 2)},
        exc_info=True,
    )
