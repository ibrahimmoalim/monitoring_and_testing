You cannot run Faro directly as a container because **Faro is just JavaScript code** that runs inside the users' web browsers. There is no "Faro Server image" to put in a docker-compose file.

However, the docker-compose file is missing the **receiver** that catches the data Faro sends.

Faro needs an ingestion container to accept its data and route it into the Loki and Tempo containers. The modern tool for this job is **Grafana Alloy** (which replaced the old Grafana Agent).

---

### How to Add Frontend Monitoring to the Compose File

To make Faro work, you need to add Grafana Alloy to the compose stack and map it to listen for the frontend's traffic.

#### Step 1: Add Grafana Alloy to the `docker-compose.yml`

Append this service to the existing file:

```yaml
  alloy:
    image: grafana/alloy:latest
    container_name: alloy
    restart: unless-stopped
    ports:
      # Open this port so users' browsers can send Faro data here
      - "12347:12347"
    volumes:
      # Mount the configuration file we will create in Step 2
      - ./config.alloy:/etc/alloy/config.alloy:Z
    command: [ "run", "/etc/alloy/config.alloy", "--storage.path=/var/lib/alloy/data" ]
    depends_on:
      - loki
      - tempo
    networks:
      - monitoring-network

```

#### Step 2: Create the `config.alloy` File

In the same directory as the compose file, create a file named `config.alloy`. This file configures the internal receiver to catch Faro's bundle and split it between Loki and Tempo:

```alloy
// 1. Listen for incoming Faro data from browsers
faro.receiver "local_faro" {
  server {
    listen_address = "0.0.0.0"
    listen_port    = 12347
    cors_allowed_origins = ["*"] // Allows the frontend domain to connect
  }

  output {
    logs   = [loki.write.local_loki.receiver]
    traces = [otelcol.exporter.otlp.local_tempo.input]
  }
}

// 2. Route the frontend logs into the Loki container
loki.write "local_loki" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}

// 3. Route the frontend traces into the Tempo container
otelcol.exporter.otlp "local_tempo" {
  client {
    endpoint = "tempo:4317"
    tls {
      insecure = true
    }
  }
}

```

---

### Step 3: Initialize Faro in the Frontend App

Now that the backend collector pipeline is running via compose, you actually initialize Faro inside the React/Vue/Angular frontend codebase using their JavaScript SDK:

```javascript
import { initializeFaro } from '@grafana/faro-web-sdk';

const faro = initializeFaro({
  // Point this to the machine's IP or public domain where Alloy is listening
  url: 'http://localhost:12347/collect',
  app: {
    name: 'my-java-frontend',
    version: '1.0.0',
    environment: 'production'
  },
});

```

### The Result

Once this is up, any unhandled error or page lag happening on a user's screen hits **Port 12347** on the server. Alloy handles it instantly, parsing the web logs down to **Loki** and the user session traces straight to **Tempo**.

## Self-Host with Domain and Nginx

Since you have a Namecheap domain, you can use **Nginx as a Reverse Proxy**. This solves two massive headaches at once:

1. It handles **HTTPS/SSL** for free via Let's Encrypt (essential, because browsers will block the Faro data if the portfolio is HTTPS but the Faro endpoint is insecure HTTP).
2. It safely exposes only the Nginx port (`80`/`443`) to the web, keeping port `12347` protected behind the firewall.

Here is the exact battle plan to tie the Namecheap domain, Nginx, Docker Compose, and Faro together on the Debian laptop.

---

### Step 1: Update the Namecheap DNS

Log into Namecheap and add an **A Record** pointing to the laptop's public IP address (you can find the public IP by running `curl ifconfig.me` in the Debian terminal).

| Type | Host | Value |
| --- | --- | --- |
| **A Record** | `telemetry` | `YOUR_LAPTOP_PUBLIC_IP` |

*(This gives you the endpoint `telemetry.yourdomain.com`)*

---

### Step 2: Adjust the `docker-compose.yml`

Since Nginx will talk to Alloy *inside* the laptop, we don't want to expose port `12347` directly to the raw internet. Change the Alloy ports configuration in the compose file to bind only to `127.0.0.1` (localhost):

```yaml
  alloy:
    image: grafana/alloy:latest
    container_name: alloy
    restart: unless-stopped
    ports:
      # Binds ONLY to internal localhost. Nginx will talk to this.
      - "127.0.0.1:12347:12347"
    volumes:
      - ./config.alloy:/etc/alloy/config.alloy:Z
    command: [ "run", "/etc/alloy/config.alloy", "--storage.path=/var/lib/alloy/data" ]
    depends_on:
      - loki
      - tempo
    networks:
      - monitoring-network

```

---

### Step 3: Configure Nginx as the Gateway

On Debian, create a new Nginx server block configuration file:

```bash
sudo nano /etc/nginx/sites-available/telemetry.conf

```

Paste the following configuration inside. This tells Nginx to listen for requests coming to the subdomain and quietly pass them down to the Alloy container:

```nginx
server {
    listen 80;
    server_name telemetry.yourdomain.com; # Swap with the actual Namecheap domain

    location / {
        proxy_pass http://127.0.0.1:12347;
        proxy_http_version 1.1;

        # Pass along the real user IPs instead of making everything look like localhost
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Handle CORS preflight requests from the portfolio site
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}

```

Enable the configuration and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/telemetry.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

```

---

### Step 4: Secure it with Let's Encrypt (Crucial)

Run Certbot to grab a free SSL certificate for the new subdomain. This automatically rewrites the Nginx file to handle HTTPS securely.

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d telemetry.yourdomain.com

```

---

### Step 5: Update the Frontend Faro Snippet

Now, the portfolio app (or the simple client side JS code) can point exactly to the brand new, production-ready secure endpoint. It doesn't matter where the users are in the world, their data will securely find its way back to the Debian laptop:

```javascript
import { initializeFaro } from '@grafana/faro-web-sdk';

const faro = initializeFaro({
  // Point this to the real, secured Namecheap subdomain proxy!
  url: 'https://telemetry.yourdomain.com/collect',
  app: {
    name: 'portfolio-site',
    version: '1.0.0',
    environment: 'production'
  },
});

```

> 💡 **Debian Server Note:** Make sure the home router has **Port 80 and Port 443 forwarded** to the laptop's local network IP address (e.g., `192.168.1.X`), otherwise traffic from Namecheap won't be able to reach the Nginx instance!
