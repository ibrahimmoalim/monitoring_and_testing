k6 is a modern, developer-friendly, exceptionally fast Load `Testing Tool` written in JavaScript/Go. You can install it on Debian.

- Install `k6`
```bash
wget https://github.com/grafana/k6/releases/download/v0.51.0/k6-v0.51.0-linux-amd64.tar.gz && \
tar -xvzf k6-v0.51.0-linux-amd64.tar.gz && \
sudo mv ./k6-v0.51.0-linux-amd64/k6 /usr/bin/k6 && \
rm -rf k6-v0.51.0-linux-amd64* && \
k6 version
```

- Create a test script called `loadtest.js`

- Check [loadtest.js](https://github.com/ibrahimmoalim/monitoring_and_testing/blob/main/k6_tests/loadtest.js) for more info.