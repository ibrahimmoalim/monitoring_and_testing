## Distributed Tracing Setup Guide

---

### Step 1: `application.properties`

**`application.properties`**: Make sure the custom console logging layout explicitly matches the agent's key format:
```properties
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} [traceId=%X{trace_id:-} spanId=%X{span_id:-}] - %msg%n

```

---

### Step 2: Download the OpenTelemetry Java Agent

If you ever need to download the agent fresh or update it, run this command from the terminal:

```bash
wget https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar

```

This saves the compiled `opentelemetry-javaagent.jar` to the directory the `wget` was run (currently located at `/home/ibrahim/opentelemetry-javaagent.jar`).

---

### Step 3: Run the Application

Navigate to the core project directory (where `pom.xml` is located) and execute this exact multi-line command to start the backend API (if the ..javaagent.jar is not in `home/` then change that second line accordingly):

```bash
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-javaagent:/home/ibrahim/opentelemetry-javaagent.jar \
  -Dotel.exporter.otlp.endpoint=http://localhost:4318 \
  -Dotel.service.name=WalletApp \
  -Dotel.metrics.exporter=none \
  -Dotel.logs.exporter=none"

```

---

## Explaining the Tempo query in Grafana

### 1. The Left Panel: Trace Search Results

* This is a list of every single event captured by Tempo.
* You can see the `GET /api/users` requests alongside automated background requests like `GET /actuator/prometheus` (which Prometheus triggers when scraping metrics).
* Each line shows a unique **Trace ID**—the global tracker ID assigned to that specific user action.

### 2. The Right Panel: Visualizing a Single Request

You clicked on Trace ID `ca83d839ee172e07c78d54745bf9f81e`. This displays a breakdown of the transaction timeline:

* **Total Duration (9.65ms):** The entire lifecycle—from the moment the curl command hit the server to the moment the JSON data was sent back—took less than 10 milliseconds.
* **The Waterfall Breakdown (Spans):**
* **`WalletApp: GET /api/users` (Top Bar):** This represents the parent span. It wraps around everything the server did during those 9.65ms.
* **`UserRepository.findAll()` (6.21ms):** Inside the Java application, Spring Data spent 6.21ms invoking the database call wrapper.
* **`SELECT demo_casher_db.users` (691.85µs):** This is the core database trace. The Java Agent intercepted the MySQL JDBC driver and recorded that the actual SQL query inside the containerized MySQL instance took **691.85 microseconds** (less than 1 millisecond) to execute.
* **`Transaction.commit` (565.81µs):** This shows the exact amount of time Hibernate spent closing and committing the database transaction loop safely.


### Why is this data valuable?

If the mobile application ever feels sluggish while loading a wallet balance, you won't have to guess why. You can open this panel, locate the trace, and instantly check the breakdown: if the top bar is long but the database bar is short, the bottleneck is inside the Java business logic. If the database bar consumes 90% of the timeline, the MySQL container requires an index optimization or a query rewrite.
