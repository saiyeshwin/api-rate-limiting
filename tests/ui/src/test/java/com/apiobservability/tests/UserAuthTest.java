package com.apiobservability.tests;

import com.apiobservability.pages.DashboardPage;
import com.apiobservability.pages.LoginPage;
import com.apiobservability.pages.SignupPage;
import org.testng.Assert;
import org.testng.annotations.Test;

public class UserAuthTest extends BaseTest {

    @Test(description = "TC_UI_001: Verify user registration flow through React signup form")
    public void testUserRegistrationFlow() {
        long timestamp = System.currentTimeMillis();
        String name = "UI Tester " + timestamp;
        String email = "ui_tester_" + timestamp + "@example.com";
        String password = "Password123!";

        SignupPage signupPage = new SignupPage(driver).open(baseUrl);
        signupPage.register(name, email, password);

        DashboardPage dashboardPage = new DashboardPage(driver);
        Assert.assertTrue(dashboardPage.isDashboardLoaded(), "User was not redirected to the Dashboard after successful registration.");
    }

    @Test(description = "TC_UI_002: Verify user login with valid credentials")
    public void testUserLoginValidCredentials() {
        long timestamp = System.currentTimeMillis();
        String name = "Login Tester " + timestamp;
        String email = "login_tester_" + timestamp + "@example.com";
        String password = "Password123!";

        // 1. Create account first
        new SignupPage(driver).open(baseUrl).register(name, email, password);

        // 2. Open login page and sign in
        LoginPage loginPage = new LoginPage(driver).open(baseUrl);
        loginPage.login(email, password);

        DashboardPage dashboardPage = new DashboardPage(driver);
        Assert.assertTrue(dashboardPage.isDashboardLoaded(), "User was not redirected to the Dashboard after valid login.");
    }

    @Test(description = "TC_UI_003: Verify negative authentication with invalid credentials")
    public void testUserLoginInvalidCredentialsNegative() {
        long timestamp = System.currentTimeMillis();
        String email = "nonexistent_" + timestamp + "@example.com";
        String password = "WrongPassword999!";

        LoginPage loginPage = new LoginPage(driver).open(baseUrl);
        loginPage.login(email, password);

        Assert.assertTrue(loginPage.isErrorMessageDisplayed(), "Error message was not displayed for invalid login credentials.");
        Assert.assertTrue(loginPage.getErrorMessage().contains("Invalid"), "Unexpected error message displayed: " + loginPage.getErrorMessage());
    }
}
