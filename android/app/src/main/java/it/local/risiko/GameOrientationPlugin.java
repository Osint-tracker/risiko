package it.local.risiko;

import android.content.pm.ActivityInfo;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "GameOrientation")
public class GameOrientationPlugin extends Plugin {
    @PluginMethod public void set(PluginCall call) {
        String mode = call.getString("mode", "portrait");
        if (!mode.equals("portrait") && !mode.equals("landscape")) {
            call.reject("Orientamento non valido");
            return;
        }
        getActivity().runOnUiThread(() -> {
            getActivity().setRequestedOrientation(mode.equals("landscape")
                ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                : ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
            call.resolve();
        });
    }
}
