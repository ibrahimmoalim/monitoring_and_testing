## prometheus_and_grafana installation via docker-compose

To get a functional monitoring stack running quickly, you’ll want to define **Prometheus** (the database), **Grafana** (the UI), and **Node Exporter** (the agent that pulls hardware metrics from your host).

### The `docker-compose.yml` File

Create a directory (e.g., `monitoring`), and make a `docker-compose.yml`.

Use `.env` for Grafana webUI user and pass:
Instead of typing your password directly in the docker-compose.yml, it is better practice to use an `.env` file:

Create a file named `.env` in your `~/monitoring` folder.

Add:

GRAFANA_USER=(username)
GRAFANA_PASS=(secure-password)

In docker-compose.yml, under section granfana-environment:
- GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_USER}
- GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASS}


---

### Critical Step: The Configuration File
Prometheus won't know what to look at unless you give it a config. In the **same folder**, create a file named `prometheus.yml`:

then run:
```bash
docker-compose up -d
 ```

>If you modify the `docker-compose.yml` later or add new services, just run
> the command above again, it'll keep the running services alone (no downtime)
> and just add the new service.

---

### How to access your new stack
1.  **Prometheus UI:** Navigate to http://localhost:9090. Click "Status" -> "Targets" to ensure the jobs are green (Up).
2.  **Grafana UI:** Navigate to http://localhost:3001.
    * **User:** `user set with .env` / **Password:** `pass set with .env`.
3.  **Connect them:** In Grafana, go to **Connections** -> **Data Sources** -> **Add Prometheus**.
    * For the URL, use http://prometheus:9090 (Docker handles the DNS for you).
4.  **Instant Dashboard:** To see your server stats immediately, go to **Dashboards** -> **New** -> **Import** and type ID `1860` (the official Node Exporter Full dashboard).


## How to use external dashboards in Grafana to monitor your servers

Grafana has a massive community library where people share their best setups, and you can "pull" them into your own instance using a unique ID.

For **Node Exporter Full** (monitors your own local computer), the most popular community ID is **1860**.

### Step-by-Step: How to Import

1.  **Open Grafana:** Go to `http://localhost:3001` (as per your compose file).
2.  **Navigate to Import:** * Click the **Dashboards** icon (the four squares) in the left sidebar.
    * Click the **New** button (blue button on the right) and select **Import**.
3.  **Enter the ID:**
    * In the box labeled "Import via grafana.com," type: **`1860`**.
    * Click **Load**.
4.  **Configure the Import:**
    * Grafana will recognize it as "Node Exporter Full."
    * **Crucial Step:** At the bottom, there will be a dropdown labeled **Prometheus** (or "Select a Prometheus data source"). Choose the Prometheus data source you connected earlier.
    * Click **Import**.

---

### Other Great Dashboards to Add
Since you have **cAdvisor** and **Jenkins**, you should definitely grab these IDs as well:

| Monitoring Target | Recommended ID | Why? |
| :--- | :--- | :--- |
| **Docker Containers** | **14282** | Visualizes everything from cAdvisor (CPU/RAM per container). |
| **Jenkins** | **9964** | Shows build health, queue times, and success rates. |
| **Alternative Node** | **11074** | A cleaner, more modern look for host metrics. |

---

### Troubleshooting "No Data" after Import
If you import the dashboard and see "N/A" or "No Data" everywhere:

1.  **Check the Variable:** At the top of the dashboard, there is usually a dropdown called **Job** or **Host**. Make sure it's set to `node-exporter`.
2.  **Datasource Name:** If the dashboard was built with a specific name for the data source (like "DS_PROMETHEUS"), it might get confused. Go to the dashboard **Settings** (gear icon) > **Variables** and ensure the `datasource` variable is pointing to your actual Prometheus instance, here are the steps:

In the dashboard, Click **edit**-> **Settings** (gear icon) (a small vertical sidebar will open) -> **Settings** (on top of that vertical bar) -> **Variables** -> Under **"Renamed or missing variables,"** you can see `DS_PROMETHEUS` sitting there looking for a home.

Because the dashboard was built by someone else, it's hard-coded to look for a data source with that specific name, but your Prometheus data source is likely just named "Prometheus."

### How to fix the `DS_PROMETHEUS` error:

1.  Click on **`New Variable`**.
2.  A configuration pane will open. Set the following:
    * **Name:** `DS_PROMETHEUS`
    * **Type:** `Datasource`
    * **Label:** (You can leave this as "Datasource")
    * **Data source type:** `Prometheus`
3.  **Crucial:** Click **Save Dashboard** at the top right, otherwise the error will return next time you load the page (tick the save this as default option if it's there).

---

### Why this fixes the graphs
Grafana dashboards use these variables like a "find and replace" tool. Right now, every graph on your screen is asking a question like: *"Hey `${DS_PROMETHEUS}`, how much RAM is Jenkins using?"* Because `${DS_PROMETHEUS}` wasn't defined, the graphs were effectively screaming into a void. Once you link that variable to your real Prometheus data, the data will flood in.

### Regarding the "Two Bars" and Host Monitoring
Now that you see the data clearly, notice in `image_37bda6.png` how the **Nodename** is a string of random characters (like `9f326a4caac1`).
* That is the **Container ID** of your Node Exporter.
* To make your dashboard look more professional and identify your Debian machine by its actual name, you can add `hostname: your-pc-name` to the `node-exporter` section of your `docker-compose.yml`.


## Add new panels to the dashboard (like OS info)

To create a reusable, professional "Host Info" panel that works across different systems follow these steps in your Grafana dashboard.

### Phase 1: Make a new panel
1.  Click edit while in the dashboard (top right)
2.  Click on the + icon
3.  Click on add Panel
4.  Give it title and description and click **Configure**
5.  On the top right Click on **visualizations**
6.  Select **Table** if the Panel will have **text info**
7.  Type **node_uname_info** in box infront of `metrics browser` in bottom left section (Query tab).
8.  **Crucial Step:** Look for the **Options** dropdown in the Query tab (it's below `metrics browser`), change `Format` from **Time series** to **Table** and `Type` from **Range** to **Instant**. This removes the multiple duplicate rows.

---

### Phase 2: Organize and Pretty the Table
1.  Click
2.  **Hide** the following (click the eye icon):
    * `Time`
    * `Value`
    * `node_uname_info` (the original metric name)
    * `version` (the long messy one)
    * `sysname` (usually just says "Linux", we already know that!)
3.  **Rename** the remaining fields:
    * `nodename` $\rightarrow$ **Hostname**
    * `System` (the one we extracted) $\rightarrow$ **OS**
    * `release` $\rightarrow$ **Kernel**
    * `machine` $\rightarrow$ **Architecture**
4.  **Drag and drop** the fields in the list to change their order (e.g., Hostname first, OS second).

---

### Phase 4: Make it a Vertical List (The "Alias" Look)
If you want the titles on the left and values on the right (like your terminal):
1.  Add one more transformation: **Transpose**.
2.  This flips the table so it’s a single column list instead of a wide row.

---

### Phase 5: Final Save
1.  Click **Apply** in the top right corner of the panel editor.
2.  Back on the main dashboard, grab the **Host info** panel by its title and drag it to the top.
3.  **MOST IMPORTANT:** Click the **Disk Icon** (Save) at the top right of the dashboard to save your changes permanently.

> [!TIP]
> To fix the **Hostname** from `9f326a4caac1` to `Debian`, remember to add `hostname: ${HOSTNAME}` to your `docker-compose.yml` and restart with `docker compose up -d`. Your new panel will update itself automatically!

**Does your table now show "Debian" in a clean column without all the extra version text?**