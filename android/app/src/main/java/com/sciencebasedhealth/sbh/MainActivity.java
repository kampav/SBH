package com.sciencebasedhealth.sbh;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.sciencebasedhealth.sbh.plugin.WidgetDataPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetDataPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
