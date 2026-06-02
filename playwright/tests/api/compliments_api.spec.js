import { expect, test } from '@playwright/test';


test.describe('Compliments API Test', async () => {

    test('Get a Random compliment', async ({ request }) => {

        // Returns a random compliment.
        await request.get('https://api.ibrahimmoalim.dev/compliments/randomm').then((response) => {
            expect(response.status()).toBe(200)
            return response.json()
        }).then((result) => {
            console.log(result.text)
        })
        .catch((error) => {
            console.error('error, try again')
            // to get information about the error
            console.error(error)
        })

    })

    test('Get All Compliments', async ({ request }) => {

        // Returns all compliments.
        await request.get('https://api.ibrahimmoalim.dev/compliments').then((response) => {
            expect(response.status()).toBe(200)
            return response.json()
        }).then((result) => {
            console.log(result)
        })

    })

    test('Get a Specific Compliment by ID', async ({ request }) => {

        // Returns a specific compliment by ID (Get all compliments first to see all IDs).
        const response = await request.get('https://api.ibrahimmoalim.dev/compliments/69d146a97ba8b2d3cec70457')

        expect(response.status()).toBe(200)
        const result = await response.json()

        console.log(result.text)
        expect(result.text).toContain('smile')

    })

})
