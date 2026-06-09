import { expect, test } from '@playwright/test';


test.describe('Compliments API Test', async () => {

    // const admin_key = process.env.ADMIN_KEY;

    test('Get a Random compliment', async ({ request }) => {

        // Returns a random compliment.
        await request.get('https://api.ibrahimmoalim.dev/compliments/random').then((response) => {
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

        expect(result).toMatchObject({
            // ensure _id exist and is a string
            _id: expect.any(String),
            // ensure text exist and is a string type
            text: expect.any(String),
            // ensure _v (version) exist and is number
            __v: expect.any(Number)
        })

        console.log(result.text)
        expect(result.text).toContain('smile')

    })

    // Test Post endpoint
    // Put endpoint is similar to Post
    // (change from request.post to request.put)
    // and expect a 200 status code instead of 201
    // since put just modifies data, not create new data.
    // test('Post a Compliment', async ({ request }) => {

    //     const response = await request.post('https://api.ibrahimmoalim.dev/compliments', {
    //         // input admin key if required
    //         headers: {
    //             "x-api-key": admin_key
    //         },
    //         data: {
    //             "text": "I bet you are the favorite part of someone's day right now."
    //         }
    //     })

    //     const result = await response.json()
    //     console.log(result.text)

    //     // expect a 201 (request created new resource)
    //     expect(response.status()).toBe(201);
    //     expect(response.ok()).toBeTruthy();
    //     expect(result.text).toContain('favorite');

    // })

    // Test Delete endpoint (delete a specific compliment by ID)
    // test('Delete a Compliment by ID', async ({ request }) => {

    //     const response = await request.delete('https://api.ibrahimmoalim.dev/compliments/6a1ebd95a26ee5649f4858d5', {
    //         headers: {
    //             "x-api-key": admin_key
    //         }
    //     })

    //     expect(response.status()).toBe(200);
    //     expect(response.ok()).toBeTruthy();

    // })

})
