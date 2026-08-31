package com.apiobservability.tests;

import com.apiobservability.pages.DashboardPage;
import com.apiobservability.pages.SignupPage;
import org.testng.Assert;
import org.testng.annotations.Test;

public class DashboardTest extends BaseTest {

    @Test(description = "TC_UI_004: Verify dashboard summary cards and navigation elements render properly")
    public void testDashboardMetricsRendering() {
        long timestamp = System.currentTimeMillis();
        String name = "Dash Tester " + timestamp;
        String email = "dash_tester_" + timestamp + "@example.com";
        String password = "Password123!";

        // Register and authenticate
        new SignupPage(driver).open(baseUrl).register(name, email, password);

        DashboardPage dashboardPage = new DashboardPage(driver);
        Assert.assertTrue(dashboardPage.isDashboardLoaded(), "Dashboard failed to load.");
        Assert.assertTrue(dashboardPage.isSummaryCardsDisplayed(), "Dashboard summary metrics cards (Total, Healthy, Gateway Calls, Violations) were not displayed.");
    }
}
