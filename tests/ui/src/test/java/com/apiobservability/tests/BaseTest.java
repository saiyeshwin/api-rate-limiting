package com.apiobservability.tests;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;

import java.io.File;
import java.nio.file.Files;
import java.time.Duration;

public abstract class BaseTest {
    protected WebDriver driver;
    protected String baseUrl;

    @BeforeMethod
    public void setUp() {
        baseUrl = System.getProperty("baseUrl", System.getenv().getOrDefault("BASE_URL", "http://127.0.0.1:5000"));
        boolean isHeadless = Boolean.parseBoolean(System.getProperty("headless", System.getenv().getOrDefault("HEADLESS", "true")));

        ChromeOptions options = new ChromeOptions();
        
        if (isHeadless) {
            options.addArguments("--headless=new");
        }
        
        options.addArguments("--disable-gpu");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--window-size=1920,1080");
        options.addArguments("--start-maximized");
        options.addArguments("--remote-allow-origins=*");
        options.addArguments("--disable-extensions");
        options.addArguments("--disable-software-rasterizer");
        options.addArguments("--ignore-certificate-errors");
        options.addArguments("--no-first-run");
        options.addArguments("--no-default-browser-check");

        // Isolate browser profile per test run to prevent lock contention on Linux
        try {
            File tempProfile = Files.createTempDirectory("chrome-profile-").toFile();
            tempProfile.deleteOnExit();
            options.addArguments("--user-data-dir=" + tempProfile.getAbsolutePath());
        } catch (Exception ignored) {
        }

        // Selenium 4 native driver management automatically resolves Chrome & matching ChromeDriver
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
