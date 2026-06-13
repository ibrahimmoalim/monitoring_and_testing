// All Passed

import { expect, test } from "playwright/test";

test.describe('Get /api/users/...', async () => {

    test('Get All Users', async ({ request }) => {
        const response = await request.get('http://localhost:8081/api/users')

        expect(response.status()).toBe(200)
        const result = await response.json()

        console.log(result)

    })

    test("Get a Specific User's Balance", async ({ request }) => {
        const response = await request.get('http://localhost:8081/api/users/10/balance')

        expect(response.status()).toBe(200)
        const result = await response.json()

        console.log(result)

    })

});

test.describe('Post /api/users/...', async () => {

    test('Register a new User', async ({ request }) => {

        const response = await request.post('http://localhost:8081/api/users/register', {
            data: {
                "username": "test_user5",
                "password": "testuser123"
            }
        })

        expect(response.status()).toBe(200)
        const result = await response.json()

        console.log(result)
    })

    test('Login an existing User', async ({ request }) => {

        const response = await request.post('http://localhost:8081/api/users/login', {
            data: {
                "username": "test_user5",
                "password": "testuser123"
            }
        })

        expect(response.status()).toBe(200)
        const result = await response.json()

        console.log(result)
    })


});

test.describe('Put /api/users/...', async () => {

    test('Change Password of a User', async ({ request }) => {

        const response = await request.put('http://localhost:8081/api/users/619/change-password', {
            data: {
                "currentPassword": "testuser123",
                "newPassword": "testuser1233"
            }
        })

        expect(response.status()).toBe(200)
        const result = await response.text()

        console.log(result)
    })

});