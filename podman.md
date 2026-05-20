Because Podman runs without a central root daemon (rootless) and has strict security layers, it handles volumes, host permissions, and the system kernel differently than Docker.

Here is the exact breakdown of what will trip up Podman in the docekr-compose file, followed by the corrected configuration.

---

### The 4 Things That Will Break in Podman

#### 1. The `/var/run/docker.sock` Error (Promtail)

Promtail is trying to read Docker container logs by mounting `/var/run/docker.sock`. Under rootless Podman, that socket doesn't exist there, and containers don't have permission to read it anyway. Podman has its own systemd socket (`/run/user/1000/podman/podman.sock`), but a much cleaner approach for Podman is to let Promtail read the standard Linux system journal or local container log directories directly.

#### 2. Rootless Volume Permission Denials (Grafana, Prometheus, SonarQube)

When Docker mounts a volume like `./prometheus.yml`, it forces root ownership. When rootless Podman mounts it, the container thinks it is root, but the host system sees it as the local user. This causes `Permission Denied` crashes on startup for databases like Postgres and Prometheus. You must append the `:Z` flag to the local volume mounts so Podman automatically adjusts the SELinux/user permissions.

#### 3. Kernel Metrics Blocked (cAdvisor & Node-Exporter)

`privileged: true` and mounting host paths like `/sys` and `/proc` work flawlessly in Docker because Docker runs as the root user of the machine. In rootless Podman, the user doesn't have rights to look deep into the kernel's memory (`/dev/kmsg`). To fix this, you must run Podman-compose as `root` (using `sudo podman-compose`), OR adjust the containers to run inside the host's namespaces.

#### 4. The Docker-specific Internal Host

Prometheus uses `host.docker.internal` to talk to things running on the main machine. Podman uses `host.containers.internal`.

---

### The Modified `podman-compose.yml`

Here is the updated compose file optimized for Podman.

```yaml
services:

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    # Podman equivalent to host.docker.internal
    extra_hosts:
      - "host.containers.internal:host-gateway"
    restart: unless-stopped
    volumes:
      # Added :Z flag for SELinux/User permission mapping
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:Z
      - ./node_alerts.yml:/etc/prometheus/node_alerts.yml:Z
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
      - '--web.external-url=http://localhost:9090/'
    ports:
      - "127.0.0.1:9090:9090"
    networks:
      - monitoring-network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_USER}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASS}
    networks:
      - monitoring-network

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
      - monitoring-network

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    # Tells Podman to use the host's actual network and process loop
    # so it can actually see the Debian machine's real RAM and CPU.
    pid: host
    network_mode: host
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
      - "9100:9100"

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.47.0
    container_name: cadvisor
    restart: unless-stopped
    privileged: true
    # Required for cAdvisor to see other container processes under Podman
    pid: host
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      # Pointed to podman's storage directory instead of docker
      - /var/lib/containers/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    devices:
      - /dev/kmsg
    ports:
      - "8083:8080"
    networks:
      - monitoring-network

  loki:
    image: grafana/loki:3.0.0
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml:Z
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    networks:
      - monitoring-network

  promtail:
    image: grafana/promtail:3.0.0
    container_name: promtail
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml:Z
      # Swapped out docker.sock for the standard local container log paths
      - /var/lib/containers/storage/overlay-containers:/var/log/pods:ro
      - /var/log:/var/log:ro
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped
    depends_on:
      - loki
    networks:
      - monitoring-network

  tempo:
    image: grafana/tempo:2.4.1
    container_name: tempo
    volumes:
      - ./tempo-config.yml:/etc/tempo.yaml:Z
      - tempo_data:/var/tempo
    command: [ "--config.file=/etc/tempo.yaml" ]
    ports:
      - "127.0.0.1:3200:3200"
      - "127.0.0.1:4317:4317"
      - "127.0.0.1:4318:4318"
    restart: unless-stopped
    networks:
      - monitoring-network

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
      - monitoring-network

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
      - "9000:9000"
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    # Podman-compose safely ignores or passes deployment resource limits directly to cgroups v2
    deploy:
      resources:
        limits:
          memory: 2.5G
        reservations:
          memory: 1.5G
    networks:
      - monitoring-network

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
  tempo_data:
  sonarqube_db_data:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:

networks:
  monitoring-network:
    driver: bridge

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

### Recommendations for Execution

Because you are using tools that peer directly into the Debian host kernel (cAdvisor and Node-Exporter), you have two choices for how to launch this:

1. **The Root Approach (Easiest / Identical to Docker):**
Run the command with `sudo`:
```bash
sudo podman-compose up -d
```

This grants cAdvisor and Node-Exporter the exact kernel visibility they need to collect the machine data without crashing.
2. **The Rootless Approach (Best Security practice):**
If you want to run it completely rootless (`podman-compose up -d`), you will likely need to remove the `cadvisor` service entirely, as cAdvisor fundamentally relies on root-level access to `/dev/kmsg` and system namespaces to calculate hardware utilization. Node-Exporter will still work fine thanks to the `pid: host` and `network_mode: host` modifications.
