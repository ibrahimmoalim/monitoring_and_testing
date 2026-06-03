Drop SonarQube right into the Docker Compose setup. It fits perfectly alongside the existing observability stack.

However, there is one major catch with SonarQube in Docker: **It requires an external database (like PostgreSQL) to store its analysis history.** While it has an embedded database for quick evaluations, SonarQube will actively block you from migrating or updating it later if you don't use a dedicated database container.

Since there's already a robust setup, add both **SonarQube** and its companion **PostgreSQL database** cleanly to the file.

---

### Updated the monitoring/`docker-compose.yml`

Add the following two services right under the `tempo` service inside the `services:` block:

```yaml
  sonarqube-db:
    image: postgres:16-alpine
    container_name: sonarqube-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=sonar
      - POSTGRES_PASSWORD=${SONAR_DB_PASS:-sonar_secure_password}
      - POSTGRES_DB=sonar
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
      - SONAR_JDBC_USERNAME=sonar
      - SONAR_JDBC_PASSWORD=${SONAR_DB_PASS:-sonar_secure_password}
      - SONAR_JDBC_URL=jdbc:postgresql://sonarqube-db:5432/sonar
    ports:
      - "9000:9000"
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    ulimits:
      # 'nofile (Number of Open Files)', It tells the Linux kernel how many system
      # file descriptors (which include open files, network sockets, and pipes) this
      # specific container is allowed to keep open at the exact same time.
      nofile:
        # soft cap (minimum), default is 1024 which is too low for Elasticsearch
        soft: 65536
        # hard cap (max), Setting both soft and hard to 65536 locks the configuration
        # in place, ensuring SonarQube always has an abundant, stable pool of file
        # allocations to handle large codebases.
        hard: 65536
    deploy:
      resources:
        # Tells Docker that if SonarQube tries to consume more than 2.5GB of RAM,
        # throttle it immediately so the host stays completely stable.
        limits:
          memory: 2.5G
        # Tells Docker to guarantee SonarQube has 1.5GB to start up comfortably.
        reservations:
          memory: 1.5G
    networks:
      - monitoring-network

```

### Don't forget the Volumes!

Scroll all the way down to the root `volumes:` block and make sure you add the new persistent storage locations:

```yaml
volumes:
  prometheus_data:
  grafana_data:
  loki_data:
  tempo_data:
  sonarqube_db_data:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:

```

---

### ⚠️ Critical Debian System Prerequisite

SonarQube uses an embedded **Elasticsearch** instance under the hood for code searching. Elasticsearch requires more virtual memory maps than Linux allocates by default. On Debian, **SonarQube will crash on startup** if you don't adjust this host setting.

Before running `docker compose up`, open the terminal and run:

```bash
sysctl vm.max_map_count

```
If you get a number higher than 262144, you don't need to change anything.

If the number is lower than 262144, add this to the system config:

```bash
echo "vm.max_map_count=262144" | sudo tee /etc/sysctl.d/99-sonarqube.conf
```
```bash
sudo systemctl restart systemd-sysctl
```

---

### How to Use It

1. Spin up the updated stack:
```bash
docker compose up -d

```


2. Open the browser and head to `http://localhost:9000`.
3. Log in with the default credentials:
* **Username:** `admin`
* **Password:** `admin`
*(It will immediately prompt you to change this password).*


4. Create a "Manually" managed project

---

Click the first option: **"Follows the instance’s default"** (which is set to *Previous version*).

Because your version right now is `0.0.1-SNAPSHOT` (from your `pom.xml`), this just tells SonarQube that everything you scan right now is baseline code, and any changes you make in future commits will be flagged as "New Code".

Once you select that, the **"Create project"** button at the bottom will light up. Click it.

---

After clicking "Create project", SonarQube will take you to a screen asking **"How do you want to analyze your repository?"**

1. Select **Locally** (since you are running it on your own Debian machine and not a CI/CD pipeline like GitHub Actions or GitLab).
2. It will ask you to **Generate a token**. Give it a name (like `wallet-api-token`), click generate, and **copy that token string immediately** (it looks like a long string of letters and numbers). If you lose it, you have to generate a new one.
3. Select **Maven** as your build tool on the next toggle.

---

SonarQube will then display a customized copy-pasteable command. Go to your Debian terminal, clear any running processes, navigate to your root project directory, and execute the analysis command.

It will look exactly like this:

```bash
mvn clean verify sonar:sonar \
  -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml \
  -Dsonar.projectKey=wallet-api \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=SONARQUBE_TOKEN_HERE
```

### What happens next?

Maven will download the SonarQube scanner, compile your Java classes, analyze your security configuration (and flag that CSRF issue if it's still there!), and stream the metrics data right back to your dashboard. Once the terminal says `BUILD SUCCESS`, refresh your browser window at `http://localhost:9000` to view your complete interactive security report.

## Security Report in The SonarQube UI

Here is exactly how to read this SAST scan dashboard, what those grades mean, and how to find out how to fix them.

---

### Why does it say "Passed" if there are 22 issues?

By default, SonarQube's standard **"Quality Gate"** (the rulebook that decides if code passes or fails) only evaluates **New Code**—meaning changes you made *today*. Since this is your very first baseline scan, all your code is treated as "historical overall code." It passes the gate by default because SonarQube doesn't want to block your build over things that were already sitting in the repository.

However, looking at the **Overall Code** tab, your baseline code actually has some technical debt you need to address.

---

### Breaking Down the Key Terms

#### 🔴 Security (2 Open Issues - Grade: D)

This means SonarQube found 2 definitive security vulnerabilities in your code. A grade of **D** means at least one of these vulnerabilities is considered **Major** or **Critical** (highly exploitable).

> *Hint: This is almost certainly where your CSRF or similar security configurations are being flagged.*

#### 🟡 Reliability (6 Open Issues - Grade: C)

These are **Bugs**. Code that compiles perfectly fine but is highly likely to misbehave or crash at runtime. For example: a potential `NullPointerException`, a logic condition that is always true, or a resource (like a database connection) that isn't being closed properly.

#### 🟢 Maintainability (14 Open Issues - Grade: A)

These are **Code Smells**. They aren't security risks or system-crashing bugs, but they represent messy or unoptimized code. Examples include leaving unused imports, variable names that don't match naming conventions, or leaving commented-out code snippets behind. An **A** grade here means your code smell density is very low for a project this size.

#### ⭕ Coverage (0.0% - 72 lines to cover)

**Code Coverage** measures how much of your actual business logic is executed when your automated unit tests run.

* Right now it says **0.0%** because while you have test files under `src/test/java/`, those files are either empty or you haven't written actual test methods that invoke your `WalletService` or controllers yet. SonarQube is tracking that you have 72 lines of execution logic completely unverified by tests.

#### 🔴 Security Hotspot (1 Hotspot - Grade: E)

A Hotspot is *not* a definitive bug yet. It highlights a piece of code that uses a security-sensitive API (like cryptography or user authentication mechanisms) that a human needs to manually review. A grade of **E** means it is a critical piece of architecture—like a password hashing function—that needs you to look at it and verify it's safe.

---

### How to See the Issues and Fix Them

You don't have to guess what these 22 issues are; SonarQube tells you the exact line of code and provides code remediation examples.

1. In your browser dashboard, click directly on the number **`2`** under Security, or click the **Issues** tab at the very top of the SonarQube page.
2. Click on any issue in the list. SonarQube will open a code viewer highlighting your own file.
3. Look for a small tab on the issue window named **"Why is this an issue?"** or **"How can I fix it?"**. SonarQube provides a beautifully detailed tab comparing "Noncompliant Code Example" vs "Compliant Solution" specifically tailored for Spring Boot!
