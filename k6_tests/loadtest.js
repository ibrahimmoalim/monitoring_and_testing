// The connection between k6 and Prometheus is entirely push-based.
// Because the k6 command uses --out experimental-prometheus-rw, k6 acts as a client that actively uploads data directly to Prometheus. Adding any scrape targets or job configs for k6 inside the prometheus.yml is not required.
// for the push-based connection to work, the prometheus service inside docker-compose must have
// '--web.enable-remote-write-receiver' under command:

// This uploads results to prometheus so you can view them in grafana using dashboard 18030 (k6 Prometheus (Native Histograms))
// K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true k6 run --out experimental-prometheus-rw=http://localhost:9090/api/v1/write --vus 5 --duration 10s loadtest.js

//'vus' (virtual users): simulates virtual users hitting the App
// simultaneously for a 'duration', it's like a number of people
// continuously clicking or refreshing the app at the exact same time
// for 30 seconds (if duration is set to 30s).

// When the test is over (if the vus was 250 and duration 30s) you'll see something like:
// running (0m30.1s), 000/250 VUs, 54818 complete and 0 interrupted iterations
// default ✓ [======================================] 250 VUs  30s

// This means 250 VUs managed to hit the server a total of 54,818 times
// in 30 seconds, because the VUs loop continuosly

// If all requests were successful, you'll see:
// http_req_failed................: 0.00%  ✓ 0   ✗ 54818

// This means Out of 54,818 total attempts, 0% failed. Every single
// request returned a successful HTTP status code (like a 200 OK).
// The app didn't crash or drop connections under this load.


import http from 'k6/http';
import exec from 'k6/execution';
import { sleep } from 'k6';

export const options = {
    vus: 100, // 100 simulated users hitting the endpoint simultaneously
    duration: '30s'
};


export default function apiLoadTest() {

    // get all users
    http.get('http://localhost:8081/api/users', {
        // this name will show up in the dashboard
        // instead of URL
        tags: { name: 'Get Wallet App Users' }
    });
    // wait for 0.1s and send another req
    sleep(0.1);

    // creates a unique username like: "demo_user_vu5_iter42"
    const uniqueUsername = `demo_user_vu${exec.vu.idInTest}_iter${exec.vu.iterationInInstance}`;

    // register users
    const url = 'http://localhost:8081/api/users/register';

    const payload = JSON.stringify({
        username: uniqueUsername,
        password: `${uniqueUsername}@walletApp`
    })

    const params = {
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer <access-token>'
        },
        tags: { name: 'Register a User' }
    };

    http.post(url, payload, params);
    sleep(0.2);
}

// To delete all test users from the DataBase so you can test again without getting a 'username already exists' error
// for register endpoint (because these unique usernames will start with vu1_iter_0 and so on each time)
// You can target all test users with a single database command.
// Look at the left sidebar in the Adminer interface and click on SQL command.
// Paste the following query into the text box and click Execute:
// DELETE FROM users WHERE username LIKE 'demo_user_vu%';
// It instantly deletes every single row where the username starts with demo_user_vu across all pages
// in a fraction of a second, without touching any other data.