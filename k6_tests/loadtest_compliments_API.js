import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
    vus: 200,
    duration: '10s'
};

export default function complimentsApiLoadTest() {
    http.get('https://api.ibrahimmoalim.dev/compliments/random', {
        tags: { name: 'Get Random Compliments' }
    });

    sleep(0.2);
}