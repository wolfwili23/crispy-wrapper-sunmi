package com.crispyparma.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.sunmi.peripheral.printer.IWoyouService;

@CapacitorPlugin(name = "SunmiPrinter")
public class SunmiPrinterPlugin extends Plugin {

    private IWoyouService woyouService;

    private ServiceConnection connService = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            woyouService = IWoyouService.Stub.asInterface(service);
        }
        @Override
        public void onServiceDisconnected(ComponentName name) {
            woyouService = null;
        }
    };

    @Override
    public void load() {
        Intent intent = new Intent();
        intent.setPackage("woyou.aidlservice.jiuiv5");
        intent.setAction("woyou.aidlservice.jiuiv5.IWoyouService");
        getContext().bindService(intent, connService, Context.BIND_AUTO_CREATE);
    }

    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text", "");
        try {
            if (woyouService != null) {
                woyouService.printerInit();
                woyouService.printText(text);
                woyouService.feedPaper(3);
                woyouService.cutPaper();
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } else {
                call.reject("Sunmi service not connected");
            }
        } catch (RemoteException e) {
            call.reject("Print error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connected", woyouService != null);
        call.resolve(ret);
    }
}