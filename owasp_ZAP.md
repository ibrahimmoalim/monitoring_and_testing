## How ZAP Attacks the App (The Target Flow)

Even though ZAP does not have direct access to the Dockerized MySQL database, it attacks it *indirectly*. Because the `SecurityConfig` uses `.anyRequest().permitAll()`, ZAP will map the actual fintech endpoints via the OpenAPI blueprint and fire malicious payloads right through them.

Here is exactly how a SQL Injection attack strings its way through the environment:

```
[ OWASP ZAP Container (Port 8085) ]
       │
       │  1. Sends HTTP request with payload (e.g., Name: "Admin' OR '1'='1")
       ▼
[ Java API on Debian Host (Port 8081) ]
       │
       │  2. Processes request & constructs a database query without input validation
       ▼
[ MySQL Container inside Docker (Port 3306) ]
       │
       │  3. Executes the injected SQL string -> Bypasses check or returns raw database error
       ▼
[ Java API on Debian Host (Port 8081) ]
       │
       │  4. Returns a "500 Internal Server Error" containing database syntax exceptions
       ▼
[ OWASP ZAP Container (Port 8085) ] ──> 5. Parses response and flags "HIGH RISK: SQL Injection"

```

---

## Java Application & Properties Setup

### pom.xml

Ensure you have the Springdoc library added so the endpoints can be discovered automatically:

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.5</version>
</dependency>

```

### SecurityConfig.java

The security configuration is perfectly primed for this setup. It allows ZAP to pull the schema definitions while keeping the rest of the endpoints globally open for dynamic testing:

```java
package com.demo.wallet.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@SuppressWarnings("squid:S4502")
@Configuration
public class SecurityConfig {

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Stateless REST API (no cookies)
            .authorizeHttpRequests(auth -> auth
                // Allow anyone (including ZAP) to view the API blueprint mappings
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // Allow all requests for staging environment active scans
                .anyRequest().permitAll()
            );
        return http.build();
    }
}

```

### application.properties

For a dedicated staging server environment, configure the values to explicitly activate Swagger/OpenAPI documentation generation and live SQL monitoring:

```properties
# Enable OpenAPI blueprint mapping for OWASP ZAP scans
# Make sure the 2 below lines are set to false in production
# DAST is only done in staging

springdoc.api-docs.enabled=true
springdoc.swagger-ui.enabled=true
springdoc.api-docs.path=/v3/api-docs
springdoc.swagger-ui.path=/swagger-ui.html

# turn this to false in production. If the app is processing
# thousands of wallet transactions under a k6 load test, printing
# every single raw SQL query to the console will flood the log
# files, slow down the application's throughput, and potentially
# leak users' sensitive financial inputs into the raw log data.
spring.jpa.show-sql=true

```

> ⚠️ **Production Note:** When you move this file over to the production server ecosystem, you will change these exact keys to `false` to shut down the attack footprint and optimize log performance.

---

## Docker Compose

Add `owasp-zap` configuration block to the existing stack.

```yaml
services:
  # ... the existing prometheus, sonarqube, grafana containers ...

  owasp-zap:
    image: ghcr.io/zaproxy/zaproxy:stable
    container_name: owasp-zap
    restart: unless-stopped
    ports:
      - "8085:8080"  # Webswing browser UI dashboard
      - "8090:8090"  # ZAP internal connection proxy
    volumes:
      # Mounts the current host directory to pass reports seamlessly out of Docker
      - .:/zap/wrk/:rw
    extra_hosts:
      # Bridges the container network gap back to the un-dockerized Java API on host port 8081
      - "host.docker.internal:host-gateway"
    command: zap-webswing.sh
    networks:
      - monitoring-network

```

---

## Execution Plan

### Boot the Staging Stack

1. Start the local or containerized infrastructure:
```bash
docker compose up -d

```


2. Fire up the backend Java application:
```bash
mvn spring-boot:run
```


*Quick check:* Open a browser and head to:
```
http://localhost:8081/swagger-ui.html
```
You should see the real fintech API endpoint definitions map out visually.

### Access the ZAP Web Interface

Open the web browser and navigate to the designated ZAP port:

```
http://localhost:8085/zap/

```

The complete desktop GUI engine will initialize right inside the browser session.

### Load the Real Endpoints

1. In the top navigation bar of the ZAP interface, click **Import** $\rightarrow$ **Import an OpenAPI Definition**.
2. For the Definition File or URL:
```
http://<host-private-ip-addr>:8081/v3/api-docs
```
> http://192.168.1.x:8081/v3/api-docs (found with: `ip addr` command)
3. For Target URL:
```
http://host.docker.internal:8081
```
4. Click **Import**. ZAP will read the system mappings, and the specific fintech endpoints will populate instantly under the left-side **Sites** tree.

### Launch the Attack

1. Right-click the API's root address inside the ZAP **Sites** tree.
2. Navigate to **Attack** $\rightarrow$ **Active Scan**.
3. Select **Start Scan**.

ZAP will begin aggressively injecting payloads (XSS, SQL Injection variations) into all parameters found across the routes. You can flip over to the running Java terminal or check the Adminer database state to watch the structural impact of these requests in real time.

### Extract The Reports

Once the scan finishes, look at the **Alerts** panel at the bottom left of the ZAP browser interface to analyze the discovered vulnerabilities. To get a permanent file version, click **Report** in the top menu bar $\rightarrow$ **Give it Report Title like `wallet_app_owasp_report-<year-month-day>`** $\rightarrow$ **Report Name: `wallet_app_owasp_report-<year-month-day>.html`** $\rightarrow$ **Set the Report Directory to be `/zap/wrk`** (which is the directory in the ZAP container mapped to hosts dir where docker-compose file is) $\rightarrow$ **Generate Report** to export a clean HTML breakdown straight onto the host machine directory via the shared container mount.
