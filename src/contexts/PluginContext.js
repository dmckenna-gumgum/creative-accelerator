// src/contexts/PluginContext.js
import React, { createContext, useReducer } from 'react';
import { pluginReducer } from '../reducers/pluginReducer.js';
import { initialState } from '../constants/plugin.js';

export const PluginContext = createContext();

export function PluginProvider({ children }) {
    const [state, dispatch] = useReducer(pluginReducer, initialState);
    const value = { state, dispatch };

    return (
        <PluginContext.Provider value={value}>
            {children}
        </PluginContext.Provider>
    );
}