/*
 * =================================================================================
 * Project: Simple IoT World
 * Department: ETC, SB Jain Institute of Technology, Management and Research, Nagpur
 * Developed with Love by: Rohit and Team
 *
 * Microcontroller: ESP8266 (NodeMCU CP2102)
 * Sensors: DHT11 on Pin D5 (GPIO 14)
 * Actuators: 
 *   - 16x2 LCD I2C @0x27 on D1 (SCL, GPIO 5) & D2 (SDA, GPIO 4)
 *   - LED on Pin D3 (GPIO 0)
 *
 * Server Backend: Express & NodeJS (Deployable on Render)
 * =================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFiClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ---------------- HARDWARE PIN CONFIGURATION ----------------
#define DHTPIN D5          // DHT11 Data Pin connected to D5 (GPIO 14)
#define DHTTYPE DHT11      // DHT 11
#define LED_PIN D3         // External/Indicator LED connected to D3 (GPIO 0)

// I2C pins for NodeMCU: D1 = SCL (GPIO 5), D2 = SDA (GPIO 4)
// LCD I2C Address is 0x27, 16 Columns x 2 Rows
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

// ---------------- WIFI & SERVER CONFIGURATION ----------------
const char* ssid = "ESP8266";
const char* password = "12345678";

// Keep it blank as requested; paste your Render URL after deployment
// Example: "https://simple-iot-world.onrender.com" or "http://192.168.1.10:3000"
String renderUrl = ""; 

// Global Device State Variables
bool ledState = false;
String lcdServerLine1 = "SMART DISPLAY";
String lcdServerLine2 = "MyData";
float currentTemp = 0.0;
float currentHum = 0.0;

unsigned long lastServerSync = 0;
const unsigned long syncInterval = 10000; // 10 seconds

// Helper function to print cleanly on 16x2 LCD (clears leftovers)
void printLcdRow(uint8_t row, String text) {
  lcd.setCursor(0, row);
  // Pad with spaces up to 16 characters to overwrite previous line remnants
  while (text.length() < 16) {
    text += " ";
  }
  lcd.print(text.substring(0, 16));
}

void setup() {
  Serial.begin(115200);
  delay(200);

  // Initialize Hardware Pins
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Default OFF

  // Initialize Wire for I2C (D2=SDA, D1=SCL)
  Wire.begin(D2, D1);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // Initialize DHT Sensor
  dht.begin();

  // 1. Startup Sequence as specified
  printLcdRow(0, "MyProject");
  printLcdRow(1, "WELCOME");
  delay(3000); // delay(3S)

  // 2. WiFi Connecting Display
  printLcdRow(0, "CONNECTING TO");
  printLcdRow(1, "WiFi.........");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 30) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }

  // 3. Connected Confirmation
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    printLcdRow(0, "CONNECTED TO");
    printLcdRow(1, "WiFi...SUCCESS");
    delay(1500);
  } else {
    Serial.println("\nWiFi Connection Failed (Timeout)");
    printLcdRow(0, "WiFi FAILED");
    printLcdRow(1, "CHECK AP/PASS");
    delay(2000);
  }
}

// Function to Send Sensor Data (Temperature & Humidity) to Express Server
void sendDataToServer(float t, float h) {
  if (renderUrl.length() == 0) {
    Serial.println("[HTTP] Server URL is blank. Skipping POST.");
    return;
  }

  WiFiClientSecure clientSecure;
  WiFiClient clientPlain;
  HTTPClient http;

  bool isHttps = renderUrl.startsWith("https://");
  String endpoint = renderUrl + "/api/iot/data";

  if (isHttps) {
    clientSecure.setInsecure(); // Bypass SSL fingerprint verification for Render
    http.begin(clientSecure, endpoint);
  } else {
    http.begin(clientPlain, endpoint);
  }

  http.addHeader("Content-Type", "application/json");

  // Create JSON Payload
  StaticJsonDocument<200> doc;
  doc["temperature"] = t;
  doc["humidity"] = h;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  if (httpCode > 0) {
    Serial.printf("[HTTP] POST data sent. Code: %d\n", httpCode);
  } else {
    Serial.printf("[HTTP] POST failed. Error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// Function to Fetch Control Details from Server (LED & LCD Data)
void fetchControlDetails() {
  if (renderUrl.length() == 0) {
    Serial.println("[HTTP] Server URL is blank. Skipping GET.");
    return;
  }

  WiFiClientSecure clientSecure;
  WiFiClient clientPlain;
  HTTPClient http;

  bool isHttps = renderUrl.startsWith("https://");
  String endpoint = renderUrl + "/api/iot/control";

  if (isHttps) {
    clientSecure.setInsecure();
    http.begin(clientSecure, endpoint);
  } else {
    http.begin(clientPlain, endpoint);
  }

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      ledState = doc["led"] | false;
      const char* l1 = doc["line1"];
      const char* l2 = doc["line2"];

      if (l1 && strlen(l1) > 0) lcdServerLine1 = String(l1);
      if (l2 && strlen(l2) > 0) lcdServerLine2 = String(l2);

      // Actuate Physical LED on Pin D3
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);

      Serial.printf("[HTTP] Control updated -> LED: %s | L1: %s | L2: %s\n",
                    ledState ? "ON" : "OFF", lcdServerLine1.c_str(), lcdServerLine2.c_str());
    } else {
      Serial.println("[JSON] Deserialization error");
    }
  } else {
    Serial.printf("[HTTP] GET control failed. Code: %d\n", httpCode);
  }

  http.end();
}

void loop() {
  // Read DHT11 sensor readings
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  // Handle sensor read failure gracefully
  if (isnan(t) || isnan(h)) {
    Serial.println("[DHT] Failed to read from DHT11 sensor!");
    t = (currentTemp > 0) ? currentTemp : 30.0; // fallback cached
    h = (currentHum > 0) ? currentHum : 50.0;
  } else {
    currentTemp = t;
    currentHum = h;
  }

  // 1. Fetch Details from Server & Send Sensor Data Every 10 Seconds
  if (millis() - lastServerSync >= syncInterval || lastServerSync == 0) {
    lastServerSync = millis();
    if (WiFi.status() == WL_CONNECTED) {
      sendDataToServer(currentTemp, currentHum);
      fetchControlDetails();
    }
  }

  // ---------------- DISPLAY SEQUENCE ON 16x2 LCD ----------------

  // Sequence Item 1: TEMPERATURE
  // R1: TEMPERATURE
  // R2: 38 'C
  printLcdRow(0, "TEMPERATURE");
  printLcdRow(1, String((int)currentTemp) + " 'C");
  delay(2000);

  // Sequence Item 2: HUMIDITY
  // R1: HUMIDITY
  // R2: 59 %
  printLcdRow(0, "HUMIDITY");
  printLcdRow(1, String((int)currentHum) + " %");
  delay(2000);

  // Sequence Item 3: SMART DISPLAY (From Server)
  // R1: SMART DISPLAY (or Line 1)
  // R2: MyData (or Line 2)
  printLcdRow(0, lcdServerLine1.length() > 0 ? lcdServerLine1 : "SMART DISPLAY");
  printLcdRow(1, lcdServerLine2.length() > 0 ? lcdServerLine2 : "MyData");
  delay(2000);

  // Sequence Item 4: LED STATUS (From Server)
  // R1: LED STATUS
  // R2: ON/OFF
  printLcdRow(0, "LED STATUS");
  printLcdRow(1, ledState ? "ON" : "OFF");
  delay(2000);
}
