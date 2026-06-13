// All Passed

import { expect, test } from "playwright/test";

test.describe('Get /api/transactions/...', async () => {

    test("Get a Specific User's transaction history", async ({ request }) => {
        const response = await request.get('http://localhost:8081/api/transactions/user/6')

        expect(response.status()).toBe(200)
        const result = await response.json()

        console.log(result)
    })

});

test.describe('Post /api/transactions/...', async () => {

    test('Transfer Money between two Users', async ({ request }) => {
        const response = await request.post('http://localhost:8081/api/transactions/transfer?senderId=10&receiverId=12&amount=10.00')

        expect(response.status()).toBe(200)
        const result = await response.json()

        console.log(result)
    })

});