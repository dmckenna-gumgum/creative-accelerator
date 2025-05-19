import React from "react";
import { PluginProvider } from './contexts/PluginContext.js';
import Plugin from "./components/Plugin.js";

function App() {
    return (
        <PluginProvider>
            <Plugin />
        </PluginProvider>
    );
};

export default App;
