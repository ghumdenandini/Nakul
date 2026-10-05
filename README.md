# Simple IoT World 🌍⚡

A complete, production-ready IoT Web Application and ESP8266 Firmware system designed for real-time sensor monitoring, remote LCD display messaging, and actuator control.

---

## 🛠️ Tech Stack & Hardware Specs

### Web Application
- **Frontend**: HTML5, Tailwind CSS, Vanilla JS, Chart.js (Real-time telemetry), Custom SVG Gauges, CSS Glassmorphism
- **Backend**: Express.js & Node.js
- **Database**: Lightweight JSON File Storage (`data/*.json`)
- **Theme**: Red Gradient Aesthetics (Ruby, Crimson, Coral) with **Light / Dark Mode Toggle**
- **Timezone**: **Asia/Kolkata (+5:30)** for timestamps & date formatting (`DD-MM-YYYY`, `HH:MM AM/PM`)
- **Cloud Deployment**: Configured and optimized for **Render** (Free tier Web Service)

### Hardware Details
- **Microcontroller**: ESP8266 (NodeMCU CP2102)
- **Sensors**: DHT11 Temperature & Humidity Sensor (Pin `D5` / GPIO 14)
- **Display**: 16x2 Character LCD with I2C Backpack `@0x27` (`D1` SCL / GPIO 5, `D2` SDA / GPIO 4)
- **Actuators**: External LED on Pin `D3` (GPIO 0)

---

## 🔌 Hardware Wiring & Pin Mapping

| Peripheral | Component Pin | NodeMCU Pin | GPIO | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **DHT11 Sensor** | VCC | 3.3V / 3V3 | - | Power |
| | GND | GND | - | Ground |
| | DATA (Out) | **D5** | GPIO 14 | Digital Input |
| **16x2 I2C LCD** | VCC | VIN (5V) / 3.3V | - | Display Power |
| | GND | GND | - | Ground |
| | SCL | **D1** | GPIO 5 | I2C Clock |
| | SDA | **D2** | GPIO 4 | I2C Data |
| **LED** | Anode (+) | **D3** | GPIO 0 | Active HIGH (Use 220Ω resistor) |
| | Cathode (-) | GND | - | Ground |

---

## 🚀 Running the Web Application Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Express Server**:
   ```bash
   npm start
   ```

3. **Open in Browser**:
   Navigate to:
   ```
   http://localhost:3000
   ```

4. **Test the Application**:
   - Register a new user (Name: `Ashish`, Email: `ashish@example.com`, Password: `password123`).
   - The dashboard will load with "Welcome Ashish".
   - Click **"Simulate ESP Reading"** to test live gauge updates, real-time Chart.js graph plotting, and table pagination without physical hardware!

---

## ☁️ How to Deploy on Render

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Simple IoT World"
   git branch -M main
   git remote add origin https://github.com/<your-username>/simple-iot-world.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Log in to your [Render Dashboard](https://dashboard.render.com).
   - Click **"New +"** and select **"Web Service"**.
   - Connect your GitHub repository.
   - Configure the following settings:
     - **Name**: `simple-iot-world`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
     - **Plan**: `Free`
   - Click **"Deploy Web Service"**.

3. **Copy your Live URL**:
   Once deployed, Render gives you a public HTTPS URL like:
   ```
   https://simple-iot-world.onrender.com
   ```

---

## 💻 ESP8266 Firmware Setup (Arduino IDE)

The Arduino sketch is located in [`esp8266/SimpleIoTWorld.ino`](file:///c:/Users/Nandini%20ghumde/OneDrive/Desktop/VAC/esp8266/SimpleIoTWorld.ino).

### 1. Required Libraries
Install the following via Arduino IDE **Tools -> Manage Libraries...**:
1. `ArduinoJson` (by Benoit Blanchon, v6 or v7)
2. `LiquidCrystal_I2C` (by Frank de Brabander or Marco Schwartz)
3. `DHT sensor library` (by Adafruit)
4. `Adafruit Unified Sensor` (by Adafruit)

### 2. Configure WiFi & Render URL
Open `SimpleIoTWorld.ino` and locate lines 37-43:
```cpp
const char* ssid = "ESP8266";
const char* password = "12345678";

// Paste your Render URL here:
String renderUrl = "https://your-app-name.onrender.com";
```
*(Leave `renderUrl = ""` for offline mode or put your computer's local IP `http://192.168.x.x:3000` for testing).*

### 3. Uploading to NodeMCU
1. Connect your NodeMCU CP2102 via micro-USB cable.
2. Select **Board**: `NodeMCU 1.0 (ESP-12E Module)`.
3. Select the correct **COM Port**.
4. Click **Upload**.

---

## 🖥️ Screen & Cycle Behavior

### Startup Sequence
- Row 1: `MyProject`
- Row 2: `WELCOME`
- *(delay 3 seconds)*
- Row 1: `CONNECTING TO`
- Row 2: `WiFi.........`
- Once connected:
  - Row 1: `CONNECTED TO`
  - Row 2: `WiFi...SUCCESS`

### Main Loop (Every ~10 Seconds)
1. **Reads DHT11** & sends temperature and humidity to `/api/iot/data`.
2. **Fetches Control Details** from `/api/iot/control` (updates LED on `D3` and LCD text).
3. **LCD 16x2 Alternating Display Cycle**:
   - `R1: TEMPERATURE` | `R2: <temp> 'C` (delay 2s)
   - `R1: HUMIDITY` | `R2: <hum> %` (delay 2s)
   - `R1: SMART DISPLAY` (or custom line 1) | `R2: MyData` (or custom line 2) (delay 2s)
   - `R1: LED STATUS` | `R2: ON / OFF` (delay 2s)

---

## ✨ Features Checklist
- [x] Page 1: Login & Registration (Name, Email, Password)
- [x] Header: "Simple IoT World" + "Welcome <Name>" (e.g. Welcome Ashish)
- [x] Header: Real-time **ONLINE / OFFLINE Status indicator badge** for ESP8266
- [x] Header: **Light / Dark Theme Toggle** with persistent localStorage setting
- [x] Tab 1 Section 1: Colorful circular SVG gauges & seek bars for Temperature & Humidity
- [x] Tab 1 Section 1: Real-time Chart.js graph tracking telemetry
- [x] Tab 1 Section 2: Saved records table with pagination (`# | Temperature | Humidity | Time | Date | Action`)
- [x] Timezone: **Asia/Kolkata (+5:30)** formatting
- [x] Tab 2: 16x2 LCD Text controller (2 text fields max 16 chars + Save button + live preview)
- [x] Tab 3: Innovative 3D Cyber LED Switch to remotely trigger Pin D3
- [x] Footer: "Developed with Love ❤️ by Rohit and Team. Department of ETC, SB Jain, Nagpur"
- [x] Node.js Express backend deployable on **Render**
- [x] Complete Arduino firmware sketch (`SimpleIoTWorld.ino`)

---

Developed with ❤️ by **Rohit and Team**, Department of ETC, SB Jain Institute of Technology, Management and Research, Nagpur.
