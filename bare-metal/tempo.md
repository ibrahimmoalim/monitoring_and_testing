# Install and Configure Tempo

## User Creation

Create a dedicated system user and group for Tempo with no login shell:

```bash
sudo useradd --system --no-create-home --shell /bin/false tempo
```


## Download & Installation

Download the official 64-bit Linux binary release for Grafana Tempo, unzip it, and move it into the system binary path:

```bash
# Download and extract the Tempo release package
wget https://github.com/grafana/tempo/releases/download/v2.4.1/tempo_2.4.1_linux_amd64.tar.gz

tar -xvzf tempo_2.4.1_linux_amd64.tar.gz

# Move binary to executable path and make it executable
sudo mv tempo /usr/local/bin/
sudo chmod +x /usr/local/bin/tempo
```


## Directory Creation & Ownership

Create the configuration and storage directories, then transfer ownership to the `tempo` user:

```bash
# Create configuration directory
sudo mkdir -p /etc/tempo

# Create storage directory structure
# wal: As soon as the applications send spans/traces to Tempo (via gRPC
# port 4317 or HTTP port 4318), Tempo immediately writes them to disk
# inside the WAL folder before doing any heavy processing (this is for
# crash protection and high perfomance)
# blocks: The permanent (or long-term) local storage for indexed, compressed trace blocks.
# Periodically (or when the WAL reaches a size limit, e.g., 1–5 minutes), Tempo flushes the
# buffered data out of the WAL, batches it, compresses it into immutable block files,
# and moves it into the blocks/ directory (When you search for traces in Grafana, Tempo
# looks through these compressed blocks in /var/lib/tempo/blocks to find your trace IDs.).
sudo mkdir -p /var/lib/tempo/wal
sudo mkdir -p /var/lib/tempo/blocks

# Assign ownership of the data and configuration directories to tempo user
sudo chown -R tempo:tempo /etc/tempo
sudo chown -R tempo:tempo /var/lib/tempo
```


## Configuration File (`/etc/tempo/tempo.yml`)

```yaml
# This sets up Tempo to receive tracing data via OpenTelemetry protocol

# Configures the internal operation web server for Tempo
server:
  # The port used for Tempo's API and dashboard troubleshooting
  http_listen_port: 3200

multitenancy_enabled: false

# The Distributor is the entry point for traces entering Tempo
distributor:
  receivers:
    # OpenTelemetry Protocol (the industry standard for tracing)
    otlp:
      protocols:
        # Enables trace ingestion over HTTP (default port 4318)
        http:
          endpoint: 0.0.0.0:4318
        # Enables trace ingestion over high-performance gRPC (default port 4317)
        # gRPC stands for Google Remote Procedure Call. It is a high-performance,
        # open-source framework developed by Google to help different applications
        # (or microservices) talk to each other. Instead of text, gRPC translates data
        # into a compact binary format. Because tracing tools like Tempo have to process
        # millions of tiny data packets every second from your applications, gRPC (port 4317)
        # is preferred over HTTP (port 4318) because it uses drastically less CPU
        # and network bandwidth.
        grpc:
          endpoint: 0.0.0.0:4317

# Defines where the actual trace data is stored
storage:
  trace:
    # Uses the container's local file system instead of cloud storage like AWS S3
    backend: local
    wal:
      path: /var/lib/tempo/wal
    local:
      path: /var/lib/tempo/blocks

```

## Firewall
```bash
# Allow OTLP HTTP port through the firewall
sudo firewall-cmd --permanent --add-port=4318/tcp

# Reload firewall to apply changes
sudo firewall-cmd --reload
```

## Systemd Service File (`/etc/systemd/system/tempo.service`)

Updated unit file configured to execute as the unprivileged `tempo` user:

```ini
[Unit]
Description=Grafana Tempo Distributed Tracing Engine
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=tempo
Group=tempo
ExecStart=/usr/local/bin/tempo -config.file=/etc/tempo/tempo.yml
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```


## SELinux & Port Permissions (`semanage` & `restorecon`)

To allow Grafana to query Tempo and ensure SELinux allows the unprivileged process access to its paths on RHEL:

```bash
# Allow Grafana (http_port_t) to initiate outbound TCP connections to Tempo on port 3200
sudo semanage port -a -t http_port_t -p tcp 3200

# Fix SELinux file labeling on binary, config, and data paths
sudo restorecon -v /usr/local/bin/tempo
sudo restorecon -v /etc/tempo/tempo.yml
sudo restorecon -R -v /var/lib/tempo
```


## Service Launch

Reset systemd counters, reload, and start/enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl reset-failed tempo.service
sudo systemctl enable --now tempo.service
sudo systemctl status tempo.service
```
