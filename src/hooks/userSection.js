import React, { useContext } from "react";
import { PluginContext } from "../contexts/PluginContext.js"

export function useSection() {
    const { state } = useContext(PluginContext);
    return state.currentSection;
}
