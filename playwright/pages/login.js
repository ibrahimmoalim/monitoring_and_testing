// This class is for login page only.
// The advantage of using classes like this to organize tests
// is that now all the actions of login page are in this file
// so if anything changes in the login page later on, we only
// make changes in this one file, e.g if the locator changes
// from 'Username' to 'username_textbox', we only change it here

export class LoginPage {

    // constructor allows us to use page parameter from the .spec.js files
    constructor(page) {
        this.page = page;
        this.username_box = page.getByRole('textbox', { name: 'Username' })
        this.password_box = page.getByRole('textbox', { name: 'Password' })
        this.login_button = page.getByRole('button', { name: 'Log in' })
    }

    async gotoLoginPage(targetURL) {
        await this.page.goto(targetURL)
    }
    async fillUsername(username) {
        await this.username_box.fill(username)
    }
    async fillPassword(password) {
        await this.password_box.fill(password)
    }
    async clickLogin() {
        await this.login_button.click()
    }

    // You can put the above three methods into one
    // then only call this one method and give it inputs as args
    async login(targetURL, username, password) {

        await this.page.goto(targetURL);
        await this.username_box.fill(username)
        await this.password_box.fill(password)
        await this.login_button.click()
    }
}