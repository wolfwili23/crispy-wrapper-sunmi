package com.sunmi.peripheral.printer;

interface IWoyouService {
    void printerInit();
    void printerSelfChecking();
    String getPrinterSerialNo();
    String getPrinterVersion();
    String getServiceVersion();
    void printText(String text);
    void printTextWithFont(String text, String typeface, float fontsize);
    void printBarCode(String data, int symbology, int height, int width, int textposition);
    void printQRCode(String data, int modulesize, int errorlevel);
    void printRawData(in byte[] rawPrintData);
    void sendRAWData(in byte[] bytes);
    void setAlignment(int alignment);
    void setFontName(String typeface);
    void setFontSize(float fontsize);
    void feedPaper(int lines);
    void cutPaper();
    int getPrinterStatus();
}