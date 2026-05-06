/**
 * printerStore.js — Singleton condiviso per lo stato della stampante.
 * Permette a PrinterSettings di salvare il dispositivo connesso
 * e a OrderManagement di usarlo automaticamente quando stampa.
 */

const store = {
  btDevice: null,    // Web Bluetooth GATT device
  usbDevice: null,   // WebUSB device
  serialPort: null,  // Web Serial API port (Sunmi interno / stampante seriale)
};

export function setPrinterDevice(type, device) {
  store[type] = device;
}

export function getPrinterDevice(type) {
  return store[type];
}

export function clearPrinterDevice(type) {
  store[type] = null;
}

export function getActivePrinterDevice() {
  return { btDevice: store.btDevice, usbDevice: store.usbDevice, serialPort: store.serialPort };
}