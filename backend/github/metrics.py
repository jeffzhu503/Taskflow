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
