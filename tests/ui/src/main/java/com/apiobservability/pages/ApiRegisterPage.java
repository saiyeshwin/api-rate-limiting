package com.apiobservability.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.Select;

public class ApiRegisterPage extends BasePage {

    private final By apiNameInput = By.xpath("//label[contains(text(), 'API Name')]/following-sibling::input | //input[contains(@placeholder, 'Stripe')]");
    private final By methodSelect = By.xpath("//label[contains(text(), 'HTTP Method')]/following-sibling::select | //select");
    private final By endpointInput = By.xpath("//label[contains(text(), 'Target Upstream Endpoint')]/following-sibling::input | //input[contains(@placeholder, 'https://')]");
    private final By submitButton = By.cssSelector("button[type='submit']");
    private final By errorMessage = By.cssSelector(".bg-red-50 p, .bg-red-50 span");

    public ApiRegisterPage(WebDriver driver) {
        super(driver);
    }

    public void registerApi(String name, String method, String endpoint) {
        type(apiNameInput, name);
        if (method != null) {
            Select select = new Select(waitForVisibility(methodSelect));
            select.selectByValue(method);
        }
        type(endpointInput, endpoint);
        click(submitButton);
    }

    public String getErrorMessage() {
        return getText(errorMessage);
    }

    public boolean isErrorMessageDisplayed() {
        return isElementDisplayed(errorMessage);
    }
}
