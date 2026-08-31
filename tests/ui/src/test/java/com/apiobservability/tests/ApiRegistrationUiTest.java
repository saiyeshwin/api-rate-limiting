package com.apiobservability.tests;

import com.apiobservability.pages.ApiRegisterPage;
import com.apiobservability.pages.DashboardPage;
import com.apiobservability.pages.SignupPage;
import org.testng.Assert;
import org.testng.annotations.Test;

public class ApiRegistrationUiTest extends BaseTest {

    @Test(description = "TC_UI_005: Create new API endpoint through UI form and verify appearance in list")
    public void testCreateNewApiEndpointThroughUi() {
        long timestamp = System.currentTimeMillis();
        String userEmail = "api_creator_" + timestamp + "@example.com";
        String apiName = "E2E Test API " + timestamp;
        String endpointUrl = "https://jsonplaceholder.typicode.com/todos/1";

        // 1. Authenticate user
        new SignupPage(driver).open(baseUrl).register("API Creator", userEmail, "Password123!");

        // 2. Navigate to Register API form from Dashboard
        DashboardPage dashboardPage = new DashboardPage(driver);
        ApiRegisterPage registerPage = dashboardPage.clickRegisterApi();

        // 3. Fill and submit API configuration
        registerPage.registerApi(apiName, "GET", endpointUrl);

        // 4. Verify API appears in Dashboard list
        Assert.assertTrue(dashboardPage.isDashboardLoaded(), "Dashboard did not reload after API registration.");
        Assert.assertTrue(dashboardPage.isApiPresentInList(apiName), "The newly created API '" + apiName + "' was not found in the Dashboard list.");
    }
}
