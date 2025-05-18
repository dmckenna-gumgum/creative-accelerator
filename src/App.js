import React from "react";
// import { SelectionProvider } from './contexts/SelectionContext.js';
import { PluginProvider } from './contexts/PluginContext.js';
import Plugin from "./components/Plugin.js";
function App() {
  return (
    <PluginProvider>
      {/* <SelectionProvider> */}
      <Plugin />
      {/* </SelectionProvider> */}
    </PluginProvider>
  );
}

export default App;
