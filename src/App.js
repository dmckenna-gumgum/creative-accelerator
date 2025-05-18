import React from "react";
import { SelectionProvider } from './contexts/SelectionContext.js';
import Plugin from "./components/Plugin.js";
function App() {
  return (
    <SelectionProvider>
      <Plugin />
    </SelectionProvider>
  );
}

export default App;
