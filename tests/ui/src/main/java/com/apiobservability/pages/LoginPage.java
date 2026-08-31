package com.apiobservability.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class LoginPage extends BasePage {

    private final By emailInput = By.cssSelector("input[type='email']");
    private final By passwordInput = By.cssSelector("input[type='password']");
    private final By signInButton = By.cssSelector("button[type='submit']");
    private final By errorMessage = By.cssSelector(".bg-red-50 span, .bg-red-50 p");
    private final By signUpLink = By.cssSelector("a[href='/signup']");
    private final By headerTitle = By.xpath("//h2[contains(text(), 'Sign in to your account')]");

    public LoginPage(WebDriver driver) {
        super(driver);
    }

    public LoginPage open(String baseUrl) {
        driver.get(baseUrl + "/login");
        waitForVisibility(headerTitle);
        return this;
    }

    public void login(String email, String password) {
        type(emailInput, email);
        type(passwordInput, password);
        click(signInButton);
    }

    public String getErrorMessage() {
        return getText(errorMessage);
    }

    public boolean isErrorMessageDisplayed() {
        return isElementDisplayed(errorMessage);
    }

    public SignupPage clickSignUpLink() {
        click(signUpLink);
        return new SignupPage(driver);
    }
}
