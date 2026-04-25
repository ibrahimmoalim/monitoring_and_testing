This setup covers the "Hybrid Monitoring" architecture: using **Ansible** to deploy exporters to remote cloud instances, and **Docker + SSH Tunnels** to bring those metrics back to your local Prometheus safely through a firewall.

---

## 1. Ansible Setup
This phase handles the remote installation on your EC2/Linode instances.

### `ansible.cfg`
Place this in your project root. It ensures Ansible uses your SSH aliases and finds the inventory automatically.
```ini
[defaults]
inventory = ./inventory
host_key_checking = False
interpreter_python = /usr/bin/python3.10

```

### `inventory`
List your servers using the aliases defined in your `~/.ssh/config`.
```ini
[remote_servers]
semaphore ansible_python_interpreter=/usr/bin/python3.10
# Add more hosts here as needed
```

### `playbook.yml`
The automation to install and enable the exporter.
```yaml
---
- hosts: remote_servers
  become: true
  tasks:
    - name: Install Node Exporter
      apt:
        update_cache: true
        name: prometheus-node-exporter
        state: present

    - name: Ensure Node Exporter is running
      service:
        name: prometheus-node-exporter
        state: started
        enabled: true
```

---

## 2. SSH Configuration & Tunnels
This bridges the remote port 9100 to your local machine.

### `~/.ssh/config`
Edit your local SSH config to enable port forwarding automatically.
```text
Host semaphore
    HostName <YOUR_EC2_IP>
    User ubuntu
    IdentityFile ~/.ssh/id_rsa
    # Bind to * so Docker gateway can see the tunnel
    LocalForward *:9101 localhost:9100
```

### Start the Tunnel
Run this in a terminal to keep the connection alive in the background:
```bash
ssh -f -N semaphore
```

---

## 3. Docker & Networking
This setup allows Prometheus (inside Docker) to talk to the SSH tunnels (on your Debian Host).

### `docker-compose.yml`
```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    ports:
      - "9090:9090"

  # ... grafana, cadvisor, etc.
```

---

## 4. Prometheus Configuration
Add the remote target using the Docker bridge.

### `prometheus.yml`
```yaml
  - job_name: 'remote-nodes'
    static_configs:
      - targets: ['host.docker.internal:9101']
        labels:
          instance: 'aws-ec2-production'
```

---

## 5. Host Firewall (UFW)
Crucial step to allow the Docker container to talk to the Host's port 9101.

```bash
# Allow the Docker network bridge to access the tunnel port
sudo ufw allow in on docker0 to any port 9101 comment 'Prometheus Tunnel'
```

---

## 6. Verification Commands
* **Check Tunnel Binding:** `sudo ss -tulpn | grep 9101` (Should show `0.0.0.0:9101`).
* **Test Metric Flow:** `curl -I http://localhost:9101/metrics`.
* **Inside Docker Test:** `docker exec prometheus wget -qO- http://host.docker.internal:9101/metrics`.
