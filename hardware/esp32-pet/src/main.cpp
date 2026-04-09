/**
 * PixelGrow ESP32 Pet Device
 *
 * Features:
 * - TFT display for pixel pet animation
 * - NFC (RC522) for task check-in
 * - WS2812 RGB LEDs for status effects
 * - Buzzer for sound effects
 * - WiFi for syncing with PixelGrow server
 * - BLE for connecting to phone
 */

#include <Arduino.h>
#include <TFT_eSPI.h>
#include <SPI.h>
#include <MFRC522.h>
#include <FastLED.h>
#include <WiFi.h>
#include <ArduinoJson.h>

// === Pin Definitions ===
#define NFC_SS_PIN   5
#define NFC_RST_PIN  4
#define BUZZER_PIN   6
#define LED_PIN      7
#define NUM_LEDS     3

// === Objects ===
TFT_eSPI tft = TFT_eSPI();
MFRC522 nfc(NFC_SS_PIN, NFC_RST_PIN);
CRGB leds[NUM_LEDS];

// === Pet State ===
struct PetState {
  String name = "FireFox";
  int level = 1;
  int hunger = 100;
  int happiness = 100;
  int energy = 100;
  unsigned long lastUpdate = 0;
};

PetState pet;

// === Function Declarations ===
void setupDisplay();
void setupNFC();
void setupLEDs();
void drawPet();
void drawStatusBars();
void checkNFC();
void updatePet();
void playSound(int frequency, int duration);
void celebrateCheckin();

void setup() {
  Serial.begin(115200);
  Serial.println("[PixelGrow Pet] Starting...");

  setupDisplay();
  setupNFC();
  setupLEDs();

  // Initial draw
  drawPet();
  drawStatusBars();

  Serial.println("[PixelGrow Pet] Ready!");
}

void loop() {
  checkNFC();
  updatePet();
  delay(100);
}

// === Display ===
void setupDisplay() {
  tft.init();
  tft.setRotation(0);
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2);

  // Title
  tft.setCursor(40, 10);
  tft.println("PixelGrow");
  tft.drawLine(0, 35, 240, 35, TFT_YELLOW);
}

void drawPet() {
  // Clear pet area
  tft.fillRect(60, 60, 120, 120, TFT_BLACK);

  // Simple pixel pet (8x8 grid, scaled up)
  // TODO: Replace with sprite sheet animation
  uint16_t petColor = TFT_ORANGE;
  int startX = 80, startY = 70, size = 10;

  // Simple fox face pattern
  int pattern[8][8] = {
    {0,0,1,0,0,0,1,0},
    {0,1,1,0,0,1,1,0},
    {1,1,1,1,1,1,1,1},
    {1,1,0,1,1,0,1,1},
    {1,1,1,1,1,1,1,1},
    {0,1,1,0,0,1,1,0},
    {0,0,1,1,1,1,0,0},
    {0,0,0,1,1,0,0,0},
  };

  for (int y = 0; y < 8; y++) {
    for (int x = 0; x < 8; x++) {
      if (pattern[y][x]) {
        tft.fillRect(startX + x * size, startY + y * size, size, size, petColor);
      }
    }
  }
}

void drawStatusBars() {
  int barY = 200;
  int barWidth = 200;
  int barHeight = 12;
  int barX = 20;

  // Hunger bar
  tft.setCursor(barX, barY);
  tft.setTextSize(1);
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.print("Hunger ");
  tft.fillRect(barX + 60, barY, barWidth - 60, barHeight, TFT_DARKGREY);
  tft.fillRect(barX + 60, barY, (barWidth - 60) * pet.hunger / 100, barHeight, TFT_GREEN);

  // Happiness bar
  barY += 20;
  tft.setCursor(barX, barY);
  tft.setTextColor(TFT_YELLOW, TFT_BLACK);
  tft.print("Happy  ");
  tft.fillRect(barX + 60, barY, barWidth - 60, barHeight, TFT_DARKGREY);
  tft.fillRect(barX + 60, barY, (barWidth - 60) * pet.happiness / 100, barHeight, TFT_YELLOW);

  // Level and name
  barY += 30;
  tft.setCursor(barX, barY);
  tft.setTextSize(2);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.print(pet.name);
  tft.print(" Lv.");
  tft.print(pet.level);
}

// === NFC ===
void setupNFC() {
  SPI.begin();
  nfc.PCD_Init();
  Serial.println("[NFC] Ready");
}

void checkNFC() {
  if (!nfc.PICC_IsNewCardPresent() || !nfc.PICC_ReadCardSerial()) {
    return;
  }

  // Read NFC tag UID
  String uid = "";
  for (byte i = 0; i < nfc.uid.size; i++) {
    uid += String(nfc.uid.uidByte[i], HEX);
  }
  Serial.println("[NFC] Card detected: " + uid);

  // Celebrate!
  celebrateCheckin();

  // TODO: Send check-in to server via WiFi/BLE

  nfc.PICC_HaltA();
}

// === LEDs ===
void setupLEDs() {
  FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(50);
  // Initial: soft warm glow
  fill_solid(leds, NUM_LEDS, CRGB(20, 15, 5));
  FastLED.show();
}

// === Pet Logic ===
void updatePet() {
  unsigned long now = millis();
  if (now - pet.lastUpdate < 60000) return; // Update every minute
  pet.lastUpdate = now;

  // Slowly decrease stats (very gentle for kids)
  if (pet.hunger > 0) pet.hunger -= 1;
  if (pet.happiness > 0) pet.happiness -= 1;

  drawStatusBars();
}

// === Effects ===
void playSound(int frequency, int duration) {
  tone(BUZZER_PIN, frequency, duration);
}

void celebrateCheckin() {
  // Flash LEDs
  for (int i = 0; i < 3; i++) {
    fill_solid(leds, NUM_LEDS, CRGB::Gold);
    FastLED.show();
    playSound(880, 100);
    delay(150);
    fill_solid(leds, NUM_LEDS, CRGB::Black);
    FastLED.show();
    delay(100);
  }
  fill_solid(leds, NUM_LEDS, CRGB(20, 15, 5));
  FastLED.show();

  // Update pet - feed it!
  pet.hunger = min(100, pet.hunger + 20);
  pet.happiness = min(100, pet.happiness + 15);

  // Show celebration on screen
  tft.fillRect(0, 260, 240, 20, TFT_BLACK);
  tft.setCursor(30, 260);
  tft.setTextSize(1);
  tft.setTextColor(TFT_GOLD, TFT_BLACK);
  tft.println("Check-in! +20 hunger +15 happy");

  drawStatusBars();
}
