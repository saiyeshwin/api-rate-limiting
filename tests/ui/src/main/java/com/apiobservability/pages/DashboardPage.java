package com.apiobservability.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class DashboardPage extends BasePage {

    private final By dashboardHeader = By.xpath("//h1[contains(text(), 'Dashboard')] | //h1[contains(text(), 'API Observability')]");
    private final By totalApisCard = By.xpath("//p[contains(text(), 'Total APIs')]");
    private final By healthyApisCard = By.xpath("//p[contains(text(), 'Healthy APIs')]");
    private final By gatewayCallsCard = By.xpath("//p[contains(text(), 'Gateway Calls')]");
    private final By violationsCard = By.xpath("//p[contains(text(), 'Violations')]");
    private final By registerApiButton = By.xpath("//a[contains(@href, '/apis/register')] | //a[contains(., 'Register API')]");
    private final By navbarElement = By.cssSelector("nav");

    public DashboardPage(WebDriver driver) {
        super(driver);
    }

    public DashboardPage open(String baseUrl) {
        driver.get(baseUrl + "/");
        waitForVisibility(dashboardHeader);
        return this;
    }

    public boolean isDashboardLoaded() {
        return isElementDisplayed(dashboardHeader) && isElementDisplayed(navbarElement);
    }

    public String getTotalApisCount() {
        return getText(totalApisCard);
    }

    public boolean isSummaryCardsDisplayed() {
        return isElementDisplayed(totalApisCard) &&
               isElementDisplayed(healthyApisCard) &&
               isElementDisplayed(gatewayCallsCard) &&
               isElementDisplayed(violationsCard);
    }

    public ApiRegisterPage clickRegisterApi() {
        click(registerApiButton);
        return new ApiRegisterPage(driver);
    }

    public boolean isApiPresentInList(String apiName) {
        By apiNameLocator = By.xpath("//*[contains(text(), '" + apiName + "')]");
        return isElementDisplayed(apiNameLocator);
    }
}
