package com.apiobservability.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class SignupPage extends BasePage {

    private final By nameInput = By.cssSelector("input[type='text']");
    private final By emailInput = By.cssSelector("input[type='email']");
    private final By passwordInput = By.cssSelector("input[type='password']");
    private final By createAccountButton = By.cssSelector("button[type='submit']");
    private final By errorMessage = By.cssSelector(".bg-red-50 span, .bg-red-50 p");
    private final By signInLink = By.cssSelector("a[href='/login']");
    private final By headerTitle = By.xpath("//h2[contains(text(), 'Create a new account')]");

    public SignupPage(WebDriver driver) {
        super(driver);
    }

    public SignupPage open(String baseUrl) {
        driver.get(baseUrl + "/signup");
        waitForVisibility(headerTitle);
        return this;
    }

    public void register(String name, String email, String password) {
        type(nameInput, name);
        type(emailInput, email);
        type(passwordInput, password);
        click(createAccountButton);
    }

    public String getErrorMessage() {
        return getText(errorMessage);
    }

    public boolean isErrorMessageDisplayed() {
        return isElementDisplayed(errorMessage);
    }

    public LoginPage clickSignInLink() {
        click(signInLink);
        return new LoginPage(driver);
    }
}
