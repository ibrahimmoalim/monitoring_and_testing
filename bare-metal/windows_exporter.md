## Install `windows_exporter` on Windows Server

Run **PowerShell as Administrator** on the MSSQL Windows Server and execute the following commands to create the installation folder, download the installer, and set up the service:

```powershell
# Create Installation Directory
New-Item -ItemType Directory -Force -Path "C:\Program Files\windows_exporter"

# Set Directory Context
Set-Location "C:\Program Files\windows_exporter"

# Download the MSI installer (Adjust version string as needed)
$version = "0.29.2"
$url = "https://github.com/prometheus-community/windows_exporter/releases/download/v$version/windows_exporter-$version-amd64.msi"
Invoke-WebRequest -Uri $url -OutFile "windows_exporter.msi"

# Run MSI Installation enabling both default OS collectors AND MSSQL collector
Start-Process msiexec.exe -ArgumentList '/i windows_exporter.msi ENABLED_COLLECTORS="[defaults],mssql" /qn' -Wait
```


## Create the `config.yml` Configuration File

Create a configuration file to fine-tune exporter behavior, exclude noisy metrics, and monitor SQL services.

1. Open PowerShell as Administrator.
2. Create a `config.yml` in ``C:\Program Files\windows_exporter\`
3. Paste the below in that file:
```yml
telemetry:
  addr: ":9182"
  path: "/metrics"
  max-requests: 5

logger:
  level: "info"
  format: "logfmt"

collectors:
  enabled: >-
    cpu,
    cs,
    logical_disk,
    memory,
    mssql,
    net,
    os,
    service,
    system

collector:
  mssql:
    # Captures default and named MSSQL instances
  logical_disk:
    volume-exclude: "^(HarddiskVolume.*|A:|D:)"
  service:
    # Explicitly tracks MSSQL, SQL Agent, and the exporter service
    service-include: "^(MSSQLSERVER|MSSQL\\$.*|SQLSERVERAGENT|SQLAgent\\$.*|windows_exporter)$"
    use-placeholders: false
  net:
    nic-exclude: "^(Isatap.*|Local Area Connection.*|Tunneling.*)"

```


## Windows Service Commands

Point the Windows Service binary path to the `config.yml` file and manage the service using standard PowerShell commands.

### Point Service to Config File

```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\windows_exporter" -Name "ImagePath" -Value '"C:\Program Files\windows_exporter\windows_exporter.exe" --config.file="C:\Program Files\windows_exporter\config.yml"'

```

### Essential Service Management Commands

* **Restart Service:**
```powershell
Restart-Service windows_exporter
```

* **Check Service Status:**
```powershell
Get-Service windows_exporter
```

* **Stop Service:**
```powershell
Stop-Service windows_exporter
```

* **Start Service:**
```powershell
Start-Service windows_exporter
```

* **Test Local Endpoint Output:**
```powershell
(Invoke-WebRequest -UseBasicParsing http://localhost:9182/metrics).Content | Select-String "windows_mssql|windows_system"
```


## Configure Prometheus (`prometheus.yml`)

Add the Windows Server as a target in the central `prometheus.yml` configuration:

```yaml
scrape_configs:
  - job_name: 'windows_mssql_servers'
    scrape_interval: 15s
    static_configs:
      - targets: ['<windows_server_ip>:9182']
        labels:
          environment: 'production'
          role: 'mssql'

```

*Reload Prometheus after updating the configuration.*


## Setup in Grafana

1. Open **Grafana** -> **Connections** -> **Data Sources** -> Ensure the **Prometheus** source is connected and functional.
2. Go to **Dashboards** -> Click **New** -> **Import**.
3. Import the recommended Grafana Dashboard IDs for pre-configured panels:
* **Dashboard ID `14694**` (Windows Exporter Dashboard for OS, CPU, RAM, Disk, Uptime)
* **Dashboard ID `15028**` or **`11703`** (MSSQL Server Dashboard for Database metrics)
4. Select the Prometheus Data Source and click **Import**.


## How to Fix "N/A" Errors in Grafana

If panels show `N/A`, `No Data`, or `Null`, work through these four common failure points:

### Fix Renamed Metric Breaking Changes (`system_up_time`)

* **Problem:** In newer exporter versions (`v0.29+`), `windows_system_system_up_time` was renamed.
* **Fix:** Update the Grafana panel PromQL expressions:
* **Old / Broken:** `time() - windows_system_system_up_time{instance=~"$server.*"}`
* **New / Fixed:** `time() - windows_system_boot_time_timestamp_seconds{instance=~"$server.*"}`


### Fix Instance Label Regex Mismatches

* **Problem:** Variable filters like `instance=~"$server"` fail because `$server` evaluates to `sql-server-01`, but Prometheus metrics export as `sql-server-01:9182` (including the port).
* **Fix:** Update panel queries to append `:.*` or `:$port`:
* `windows_cpu_time_total{instance=~"$server"}`
* `windows_cpu_time_total{instance=~"$server:.*"}`


### Missing MSSQL Metric Namespace

* **Problem:** If MSSQL panels show `N/A`, check if the collector is actually exporting SQL counters.
* **Fix:** Run this on the Windows Server:
```powershell
(Invoke-WebRequest -UseBasicParsing http://localhost:9182/metrics).Content | Select-String "windows_mssql"
```

If empty, the SQL performance counters might be corrupt. Rebuild Windows Performance Counters in Command Prompt (Admin):
```cmd
lodctr /R
Restart-Service windows_exporter
```


### Adjust Panel Query Options (Null Values)

* **Problem:** Infrequent data causes Prometheus range gaps, returning `N/A`.
* **Fix:** In Grafana Panel settings (right sidebar):
* Expand **Standard Options** -> Change **No Value** to `0` or `N/A`.
* Expand **Graph Styles** -> Set **Connect null values** to `Always`.


### Other possible fixes

- In the Panel (right sidebar) -> **Value Options** -> **Fields** change this to **Numeric Fields**
- In the Panel (right sidebar) -> **Value Options** -> **Calculation** change this to **Last*** (this is for metrics like CPU cores, because they are values that aren't changing constantly. When set to **Last***, Grafana will only show the last value it received instead of **Mean** which is deafult in some dashboards and causes errors)
