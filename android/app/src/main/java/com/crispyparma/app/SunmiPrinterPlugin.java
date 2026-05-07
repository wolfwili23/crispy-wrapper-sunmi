package com.crispyparma.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.sunmi.peripheral.printer.InnerPrinterCallback;
import com.sunmi.peripheral.printer.InnerPrinterException;
import com.sunmi.peripheral.printer.InnerPrinterManager;
import com.sunmi.peripheral.printer.SunmiPrinterService;

@CapacitorPlugin(name = "SunmiPrinter")
public class SunmiPrinterPlugin extends Plugin {

    private SunmiPrinterService printerService = null;

    private InnerPrinterCallback innerPrinterCallback = new InnerPrinterCallback() {
        @Override
        protected void onConnected(SunmiPrinterService service) {
            printerService = service;
        }
        @Override
        protected void onDisconnected() {
            printerService = null;
        }
    };

    @Override
    public void load() {
        try {
            InnerPrinterManager.getInstance().bindService(
                    getContext(), innerPrinterCallback
            );
        } catch (InnerPrinterException e) {
            e.printStackTrace();
        }
    }

    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text", "");
        try {
            if (printerService != null) {
                printerService.printerInit(null);
                printerService.printText(text, null);
                printerService.lineWrap(3, null);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } else {
                call.reject("Sunmi service not connected");
            }
        } catch (Exception e) {
            call.reject("Print error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connected", printerService != null);
        call.resolve(ret);
    }
}