// this simulates 'vus' (virtual users (simulated users)) hitting the App
// simultaneously for a 'duration', it's like 'vus' number of people
// continuously clicking or refreshing the app at the exact same time
// for 30 seconds.

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
import { sleep } from 'k6';

export const options = {
    vus: 500, // 100 simulated users hitting the endpoint simultaneously
    duration: '30s',
};

export default function apiLoadTest() {
    http.get('http://localhost:8081/api/users');
    sleep(0.1);
}