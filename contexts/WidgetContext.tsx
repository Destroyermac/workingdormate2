
import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  console.log('🎨 WidgetProvider initializing...');
  
  const refreshWidget = useCallback(() => {
    if (Platform.OS === 'ios') {
      try {
        // Dynamically import and use the widget storage
        import("@bacons/apple-targets").then((AppleTargets) => {
          const ExtensionStorage = AppleTargets.ExtensionStorage;
          ExtensionStorage.reloadWidget();
          console.log('✅ Widget refreshed');
        }).catch((error) => {
          console.log('⚠️ Widget storage not available:', error);
        });
      } catch (error) {
        console.log('⚠️ Error refreshing widget:', error);
      }
    }
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
