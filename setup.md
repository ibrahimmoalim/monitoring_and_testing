To split the massive configuration into logical, modular pieces, break it down into **three distinct Docker Compose files**:

1. `docker-compose.monitoring.yml` (Prometheus, Grafana, Alertmanager, Node Exporter, Loki, Promtail, Tempo, Blackbox Exporter)
2. `docker-compose.sast.yml` (SonarQube & SonarQube-DB)
3. `docker-compose.dast.yml` (OWASP ZAP)

To make sure these three files can still talk to each other seamlessly (for instance, if Grafana needs to look at something, or if you want to expand internal communications later), use an **external, pre-created Docker network**.

---

### Step 1: Create the Shared Network

Before running the containers, you need to manually create the network once in the terminal so all independent compose files can hook into it:

```bash
docker network create --subnet=172.18.0.0/16 monitoring-testing

```

---

### File 1: `docker-compose.monitoring.yml`

This file contains the core observability stack (Metrics, Logs, Traces, Alerts).

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./node_alerts.yml:/etc/prometheus/node_alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
      - '--web.external-url=http://localhost:9090/'
      - '--web.enable-remote-write-receiver'
    ports:
      - "127.0.0.1:9090:9090"
    networks:
      monitoring-testing:
        ipv4_address: 172.18.0.50

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_USER}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASS}
    networks:
      - monitoring-testing

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    restart: unless-stopped
    ports:
      - "127.0.0.1:9093:9093"
    configs:
      - source: alertmanager_config
        target: /etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--web.external-url=http://localhost:9093'
    networks:
      - monitoring-testing

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
      - /run:/run:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "127.0.0.1:9100:9100"
    networks:
      - monitoring-testing

  loki:
    image: grafana/loki:3.0.0
    container_name: loki
    ports:
      - "127.0.0.1:3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    networks:
      - monitoring-testing

  promtail:
    image: grafana/promtail:3.0.0
    container_name: promtail
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/log:/var/log
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped
    depends_on:
      - loki
    networks:
      - monitoring-testing

  tempo:
    image: grafana/tempo:2.4.1
    container_name: tempo
    volumes:
      - ./tempo-config.yml:/etc/tempo.yaml
      - tempo_data:/var/tempo
    command: [ "--config.file=/etc/tempo.yaml" ]
    ports:
      - "127.0.0.1:3200:3200"
      - "127.0.0.1:4317:4317"
      - "127.0.0.1:4318:4318"
    restart: unless-stopped
    networks:
      - monitoring-testing

  blackbox-exporter:
    image: prom/blackbox-exporter:latest
    container_name: blackbox-exporter
    restart: unless-stopped
    ports:
      - "127.0.0.1:9115:9115"
    volumes:
      - ./blackbox.yml:/etc/blackbox_exporter/config.yml
    networks:
      - monitoring-testing

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
  tempo_data:

networks:
  monitoring-testing:
    external: true

configs:
  alertmanager_config:
    content: |
      global:
        resolve_timeout: 5m
      route:
        group_by: ['alertname', 'instance']
        group_wait: 30s
        group_interval: 5m
        repeat_interval: 4h
        receiver: 'gmail-notifications'
      receivers:
      - name: 'gmail-notifications'
        email_configs:
        - to: '${GMAIL}'
          from: '${GMAIL}'
          smarthost: 'smtp.gmail.com:587'
          auth_username: '${GMAIL}'
          auth_password: '${GMAIL_PASS}'
          auth_identity: '${GMAIL}'
          send_resolved: true

```

---

### File 2: `docker-compose.sast.yml`

This file isolates the Static Application Security Testing framework (SonarQube).

```yaml
services:
  sonarqube-db:
    image: postgres:16-alpine
    container_name: sonarqube-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - sonarqube_db_data:/var/lib/postgresql/data
    networks:
      - monitoring-testing

  sonarqube:
    image: sonarqube:community
    container_name: sonarqube
    restart: unless-stopped
    depends_on:
      - sonarqube-db
    environment:
      - SONAR_JDBC_USERNAME=${SONAR_JDBC_USERNAME}
      - SONAR_JDBC_PASSWORD=${SONAR_JDBC_PASSWORD}
      - SONAR_JDBC_URL=${SONAR_JDBC_URL}
    ports:
      - "127.0.0.1:9000:9000"
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    deploy:
      resources:
        limits:
          memory: 2.5G
        reservations:
          memory: 1.5G
    networks:
      - monitoring-testing



networks:
  monitoring-testing:
    external: true

```

---

### File 3: `docker-compose.dast.yml`

This file isolates the Dynamic Application Security Testing framework (OWASP ZAP).

```yaml
services:
  owasp-zap:
    image: ghcr.io/zaproxy/zaproxy:stable
    container_name: owasp-zap
    restart: unless-stopped
    ports:
      - "127.0.0.1:8085:8080"
      - "127.0.0.1:8090:8090"
    volumes:
      - .:/zap/wrk/:rw
    extra_hosts:
      - "host.docker.internal:host-gateway"
    command: zap-webswing.sh
    networks:
      - monitoring-testing

networks:
  monitoring-testing:
    external: true

```

---

### Quick Management Commands

Because the files use non-default names, you just need to pass the `-f` flag when managing them.

* **To spin everything up:**
```bash
docker compose -f docker-compose.monitoring.yml up -d
docker compose -f docker-compose.sast.yml up -d
docker compose -f docker-compose.dast.yml up -d

```

* **To take down just SAST:**
```bash
docker compose -f docker-compose.sast.yml down

```
