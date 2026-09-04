package com.apiobservability.tests;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;

import java.time.Duration;

public abstract class BaseTest {
    protected WebDriver driver;
    protected String baseUrl;

    @BeforeMethod
    public void setUp() {
        baseUrl = System.getProperty("baseUrl", System.getenv().getOrDefault("BASE_URL", "http://127.0.0.1:3000"));
        boolean isHeadless = Boolean.parseBoolean(System.getProperty("headless", System.getenv().getOrDefault("HEADLESS", "true")));

        ChromeOptions options = new ChromeOptions();
        
        if (isHeadless) {
            options.addArguments("--headless=new");
        }
        
        options.addArguments("--disable-gpu");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--window-size=1920,1080");
        options.addArguments("--remote-allow-origins=*");
        options.addArguments("--disable-extensions");
        options.addArguments("--disable-software-rasterizer");
        options.addArguments("--ignore-certificate-errors");

        try {
            WebDriverManager.chromedriver().setup();
        } catch (Exception e) {
            System.out.println("WebDriverManager setup notice (relying on built-in Selenium Manager): " + e.getMessage());
        }

        driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
        driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(30));
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown() {
        if (driver != null) {
            try {
                driver.quit();
            } catch (Exception ignored) {
            }
        }
    }
}
