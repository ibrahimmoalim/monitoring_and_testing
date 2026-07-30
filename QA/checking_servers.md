## Security Checks
- check RHEL servers with `getenforce` and `sestatus`, to see if SELinux is enforced or not

### why is it terrible to not have SELinux in enforcing mode?

#### Auditor Issues for fintech
In an enterprise fintech company, auditors fall into three main categories:

* **External Regulatory Auditors (The most dangerous to fail):**
* **PCI Qualified Security Assessors (QSAs):** If your fintech processes credit card data, an accredited QSA tests your environment annually against PCI-DSS standards. Disabling SELinux directly violates hardening rules (Requirement 2 & 7), which can mean losing your ability to process card payments or facing severe fines.
* **SOC 2 / ISO 27001 Auditors:** Third-party accounting/security firms (like Deloitte, PwC, EY, KPMG, or specialized security auditors) hired to certify your operational security so enterprise clients will trust you with their financial data.

* **Internal Security & Compliance Teams:**
* Your company’s own Information Security (InfoSec) or Governance, Risk, and Compliance (GRC) departments. They run automated vulnerability scanners (like Qualys, Tenable, or OpenSCAP) across the infrastructure. A server with SELinux set to `permissive` or `disabled` will show up as a high-severity risk on their dashboard.


* **Client / Partner Auditors:**
* Enterprise clients (like major banks or payment networks) often reserve the right to audit your security posture before doing business with you.


#### Does Red Hat monitor or audit their customers?

It is vital to separate **Security Monitoring** from **Subscription Licensing**:

| Type of Check | Does Red Hat do this? | Details |
| --- | --- | --- |
| **Security Configuration** *(e.g., Is SELinux enabled? Are firewalls on?)* | **NO** | Red Hat has no visibility into your internal security configs unless you explicitly submit a support bundle (`sosreport`) while opening a ticket. They do not remotely monitor your OS settings. |
| **Subscription Compliance** *(e.g., Did you pay for 100 RHEL servers but are running 500?)* | **YES** | Red Hat (like Microsoft or Oracle) periodically conducts **Subscription Audits** or reviews. They check if you are paying for the correct number of core/socket entitlements for active systems. |


#### Why this matters

If Red Hat doesn't care about your SELinux settings, why is it such a problem?

Because **Red Hat's default security guarantee relies on SELinux.** When a major Linux vulnerability (CVE) is discovered, Red Hat’s security advisories often state: *"The impact of this critical RCE is mitigated because SELinux prevents process escape in standard RHEL builds."*

If an attacker breaches that server, your company cannot blame Red Hat—and when your internal InfoSec team or external PCI auditor discovers that a core production box was running without SELinux, the sysadmins who disabled it will be held directly accountable.


### How to fix SELinux not set to enforcing for nearly 2 years
Nearly **two full years** without real SELinux protection in a live fintech environment is a major incident waiting to happen.

If it’s set to `disabled` in the config file (meaning it requires a reboot to change) or running in `permissive` for almost two years, you are sitting on two major risks: **operational landmines** and **compliance liability**.

#### The Operational Landmine (Technical Debt)

Because it has been off or non-enforcing for 702 days:

* **File context labeling is heavily drift-damaged.** Every file, directory, software package, database context, or configuration created over the last 23 months has either been created with default/wrong labels or missing SELinux tags entirely.
* **If someone re-enables SELinux blindly today, the system will almost certainly crash or fail to boot.** Essential services (databases, web servers, API gateways) will fail because their execution contexts won't match their files.

#### The Active Security & Audit Exposure

* **Zero Containment:** If a web shell or remote code execution (RCE) exploit hits that server today, the attacker can freely move laterally across local storage, read configuration secrets, and access network sockets. standard Linux DAC permissions won't save you if a service process gets compromised.
* **Audit Fail:** If PCI-DSS 4.0, SOC 2, or ISO 27001 auditors run `sestatus` or inspect `/etc/selinux/config`, **702 days of uptime in Permissive/Disabled mode** proves it wasn't just a temporary maintenance toggle—it’s an unaddressed structural policy violation.

#### How to Fix This Safely (Remediation Plan)

Do **not** simply set `SELINUX=enforcing` in `/etc/selinux/config` and reboot. You need a staged migration strategy.

```
+-------------------------------------------------------------+
| Step 1: Transition Config to Permissive Mode                |
| Set /etc/selinux/config -> SELINUX=permissive & reboot      |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Step 2: Relabel the File System                             |
| Run `fixfiles -F onboot` -> triggers full relabel on reboot |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Step 3: Capture & Fix Policy Denials                        |
| Audit logs via `ausearch -m AVC` & generate needed rules     |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Step 4: Lock In Enforcing Mode                              |
| Set `setenforce 1` & update config to SELINUX=enforcing     |
+-------------------------------------------------------------+
```

##### Transition to `permissive` (If currently `disabled`)

If the `/etc/selinux/config` is set to `disabled`, you must bring it to `permissive` mode first so the kernel loads the SELinux infrastructure.

1. Edit `/etc/selinux/config` to set `SELINUX=permissive`.
2. Schedule a maintenance window to reboot the system.

##### Trigger a Complete Filesystem Relabel

Because the system spent nearly two years creating unlabeled files, you must force a full relabel.

1. Run the Red Hat recommended relabel command:
```bash
sudo fixfiles -F onboot

```


2. Reboot the server. During boot, the system will scan and apply correct security contexts to every file on disk. *(Note: On large storage volumes, this relabeling process can add several minutes to boot time).*

##### Audit Denials While in Permissive Mode

Run your production workloads normally while in `permissive` mode. System activity will run without being blocked, but SELinux will log every action it *would* have blocked.

* Inspect logged denials:
```bash
sudo ausearch -m AVC -ts recent

```


* If custom applications trigger legitimate denials, generate targeted policies instead of disabling SELinux:
```bash
sudo ausearch -c 'your_app' | audit2allow -M your_app_policy
sudo semodule -i your_app_policy.pp

```



##### Flip to `enforcing`

Once the audit logs stop generating unexpected Access Vector Cache (AVC) denials:

1. Enable enforcement dynamically:
```bash
sudo setenforce 1

```


2. Update `/etc/selinux/config` permanently:
```text
SELINUX=enforcing
```

### Root Cause Prevention

Servers don't stay in permissive mode for 700 days by accident,a sysadmin or dev likely turned it off during a deployment issue and forgot to turn it back on.

To prevent this from recurring:

* **Infrastructure as Code:** Enforce `SELINUX=enforcing` via Ansible/Puppet/Salt so configuration drift is corrected automatically.
* **CI/CD Pipeline Compliance:** Audit base images and running VMs with tools like OpenSCAP or CIS Benchmarks to flag non-enforcing systems automatically in your monitoring tool.