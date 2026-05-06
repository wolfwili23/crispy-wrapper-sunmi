package com.crispyparma.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.RemoteException;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;

import com.sunmi.peripheral.printer.InnerPrinterCallback;
import com.sunmi.peripheral.printer.InnerPrinterException;
import com.sunmi.peripheral.printer.InnerPrinterManager;
import com.sunmi.peripheral.printer.SunmiPrinterService;

import org.json.JSONObject;

public class SunmiPrinterBridge {

    private static final String TAG = "SunmiPrinterBridge";
    private Context mContext;
    private SunmiPrinterService printerService;
    private boolean isConnected = false;

    public SunmiPrinterBridge(Context context) {
        this.mContext = context;
        connectPrinterService();
    }

    private void connectPrinterService() {
        try {
            InnerPrinterManager.getInstance().bindService(
                mContext,
                new InnerPrinterCallback() {
                    @Override
                    protected void onConnected(
                        SunmiPrinterService service) {
                        printerService = service;
                        isConnected = true;
                        Log.d(TAG, "Printer connected");
                    }

                    @Override
                    protected void onDisconnected() {
                        printerService = null;
                        isConnected = false;
                        Log.w(TAG, "Printer disconnected");
                    }
                }
            );
        } catch (InnerPrinterException e) {
            Log.e(TAG, "Error: " + e.getMessage());
        }
    }

    private boolean checkService() {
        return isConnected && printerService != null;
    }

    @JavascriptInterface
    public String initPrinter() {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            printerService.printerInit(null);
            return buildResponse(true, "Stampante inizializzata");
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    @JavascriptInterface
    public String printText(String text) {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            printerService.printText(text + "\n", null);
            return buildResponse(true, "Testo stampato");
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    @JavascriptInterface
    public String printFormattedText(
            String text,
            int fontSize,
            boolean bold,
            int alignment) {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            printerService.setAlignment(alignment, null);
            printerService.sendRAWData(
                bold
                    ? new byte[]{0x1B, 0x45, 0x01}
                    : new byte[]{0x1B, 0x45, 0x00},
                null
            );
            setFontSize(fontSize);
            printerService.printText(text + "\n", null);
            printerService.printerInit(null);
            return buildResponse(true, "Testo formattato stampato");
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    @JavascriptInterface
    public String printDivider() {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            printerService.setAlignment(0, null);
            printerService.printText(
                "--------------------------------\n", null
            );
            return buildResponse(true, "Separatore stampato");
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    @JavascriptInterface
    public String printRow(String leftText, String rightText) {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            int totalWidth = 32;
            int rightWidth = rightText.length();
            int leftWidth = totalWidth - rightWidth - 1;
            if (leftText.length() > leftWidth) {
                leftText = leftText.substring(0, leftWidth - 2) + "..";
            }
            String padding = String.format("%-" + leftWidth + "s", leftText);
            String row = padding + " " + rightText + "\n";
            printerService.setAlignment(0, null);
            printerService.printText(row, null);
            return buildResponse(true, "Riga stampata");
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    @JavascriptInterface
    public String feedPaper(int lines) {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            printerService.lineWrap(lines, null);
            return buildResponse(true, lines + " righe avanzate");
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    @JavascriptInterface
    public String printQRCode(
            String content, int size, int errorLevel) {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            printerService.setAlignment(1, null);
            printerService.printQRCode(
                content, size, errorLevel, null
            );
            printerService.lineWrap(2, null);
            return buildResponse(true, "QR Code stampato");
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    @JavascriptInterface
    public String printImageBase64(String base64Image) {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            String base64Data = base64Image.contains(",")
                ? base64Image.split(",")[1]
                : base64Image;
            byte[] imageBytes = Base64.decode(
                base64Data, Base64.DEFAULT
            );
            Bitmap bitmap = BitmapFactory.decodeByteArray(
                imageBytes, 0, imageBytes.length
            );
            if (bitmap == null)
                return buildResponse(false, "Immagine non valida");
            int maxWidth = 384;
            if (bitmap.getWidth() > maxWidth) {
                float ratio = (float) maxWidth / bitmap.getWidth();
                int newHeight = (int) (bitmap.getHeight() * ratio);
                bitmap = Bitmap.createScaledBitmap(
                    bitmap, maxWidth, newHeight, true
                );
            }
            printerService.setAlignment(1, null);
            printerService.printBitmap(bitmap, null);
            printerService.lineWrap(1, null);
            return buildResponse(true, "Immagine stampata");
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    @JavascriptInterface
    public String cutPaper() {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            printerService.lineWrap(4, null);
            printerService.cutPaper(null);
            return buildResponse(true, "Carta tagliata");
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    @JavascriptInterface
    public String sendRawHex(String hexString) {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            byte[] rawData = hexStringToBytes(hexString);
            printerService.sendRAWData(rawData, null);
            return buildResponse(true, "Dati RAW inviati");
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    @JavascriptInterface
    public String openCashDrawer() {
        return sendRawHex("1B7000FA");
    }

    @JavascriptInterface
    public String getPrinterStatus() {
        if (!checkService())
            return buildResponse(false, "Servizio non disponibile");
        try {
            int status = printerService.updatePrinterState();
            String msg;
            switch (status) {
                case 1: msg = "OK - Pronta"; break;
                case 4: msg = "Carta esaurita"; break;
                case 5: msg = "Coperchio aperto"; break;
                case 8: msg = "Surriscaldamento"; break;
                default: msg = "Stato: " + status;
            }
            return buildResponse(true, msg);
        } catch (RemoteException e) {
            return buildResponse(false, e.getMessage());
        }
    }

    private void setFontSize(int size) throws RemoteException {
        byte sizeCmd = size >= 48 ? (byte)0x22
                     : size >= 32 ? (byte)0x11
                     : (byte)0x00;
        printerService.sendRAWData(
            new byte[]{0x1D, 0x21, sizeCmd}, null
        );
    }

    private byte[] hexStringToBytes(String hex) {
        hex = hex.replaceAll("\\s", "");
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) (
                (Character.digit(hex.charAt(i), 16) << 4)
                + Character.digit(hex.charAt(i + 1), 16)
            );
        }
        return data;
    }

    private String buildResponse(boolean success, String message) {
        try {
            JSONObject json = new JSONObject();
            json.put("success", success);
            json.put("message", message);
            json.put("timestamp", System.currentTimeMillis());
            return json.toString();
        } catch (Exception e) {
            return "{\"success\":" + success
                + ",\"message\":\"" + message + "\"}";
        }
    }
}
