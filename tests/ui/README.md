# 🌐 Selenium WebDriver (Java + TestNG) UI Automation Suite

This directory contains the **End-to-End Browser UI Automation Test Suite** for the **API Observability & Rate-Limiting Platform** frontend, built using **Selenium WebDriver 4**, **Java 17**, **TestNG**, **WebDriverManager**, and the **Page Object Model (POM)** pattern.

---

## 🏗 Architecture & Project Structure

```
tests/ui/
├── pom.xml                                      # Maven dependencies & Surefire test runner plugin
├── testng.xml                                   # TestNG suite xml configuration
├── README.md                                    # Setup, local run, and CI instructions
└── src/
    ├── main/java/com/apiobservability/pages/   # Page Object Model (POM) Page Classes
    │   ├── BasePage.java                        # Common wait wrappers & element actions
    │   ├── LoginPage.java                       # Login page POM
    │   ├── SignupPage.java                      # Signup page POM
    │   ├── DashboardPage.java                   # Dashboard page POM
    │   └── ApiRegisterPage.java                 # API registration form POM
    └── test/java/com/apiobservability/tests/   # TestNG Test Classes
        ├── BaseTest.java                        # WebDriver initialization & headless Chrome lifecycle
        ├── UserAuthTest.java                    # Registration, Valid Login & Negative Auth tests
        ├── DashboardTest.java                   # Dashboard summary metrics verification
        └── ApiRegistrationUiTest.java           # End-to-end API registration & list verification
```

---

## 📋 UI Test Scenarios

| Test ID | Test Class | Scenario Description | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **`TC_UI_001`** | `UserAuthTest` | User registration flow via React signup form | Account created, session stored, redirected to Dashboard |
| **`TC_UI_002`** | `UserAuthTest` | User login with valid credentials | Authenticated and redirected to Dashboard |
| **`TC_UI_003`** | `UserAuthTest` | Negative login with invalid credentials | Error banner displayed; user stays on login page |
| **`TC_UI_004`** | `DashboardTest` | Dashboard metrics and summary card rendering | Total APIs, Healthy APIs, Calls, and Violations cards visible |
| **`TC_UI_005`** | `ApiRegistrationUiTest` | Register new API endpoint via UI form | Form validates, saves endpoint, and appears in Dashboard list |

---

## 🛠 Prerequisites

1. **Java JDK 17+** installed (`java -version`).
2. **Apache Maven 3.8+** installed (`mvn -version`).
3. **Google Chrome** installed (WebDriverManager will automatically manage the matching ChromeDriver).

---

## 🚀 Running the UI Tests Locally

### 1. Ensure the Application is Running

Open two terminal windows:

```bash
# Terminal 1: Backend Server (Port 5000)
cd server
npm start

# Terminal 2: React Frontend (Port 3000)
cd client
npm run dev
```

### 2. Execute Selenium TestNG Suite

In the `tests/ui/` directory:

```bash
cd tests/ui

# Run in Headless mode (Default)
mvn clean test

# Run in Visible Chrome browser window
mvn clean test -Dheadless=false

# Run against custom base URL
mvn clean test -DbaseUrl=http://localhost:3000
```

---

## 📊 Viewing the TestNG HTML Report

After the test run completes, open the generated HTML report:

```bash
# Surefire TestNG Report
start target/surefire-reports/index.html          # Windows
open target/surefire-reports/index.html           # macOS

# Emailable Summary Report
start target/surefire-reports/emailable-report.html
```
