// src/contexts/SelectionContext.js
import React, { createContext, useReducer, useContext, useEffect, useRef } from 'react';
import { pluginReducer } from '../reducers/pluginReducer.js';
import { sameIdSet, getSelectionViability, parentGroupCount } from '../utilities/utilities.js';
const { app, action } = require("photoshop");

// Initial state for selection
const initialSelectionState = {
    layers: [],
    type: 'layer',
    viable: false,
    identical: false,
    parentGroupCount: 0
};

// Create context
const SelectionContext = createContext();

// Polling constants

// Provider component
export function SelectionProvider({ children }) {
    const [selection, dispatch] = useReducer(pluginReducer, initialSelectionState);
    const [pollingId, setPollingId] = React.useState(null);
    const POLLING_INTERVAL = 200; // Poll every 200ms   
    const isPolling = useRef(false);

    const checkForSelectionChanges = () => {
        console.log('(SelectionContext) Checking for selection changes');
        try {
            if (!app.activeDocument) {
                console.log('(SelectionContext) No active document, stopping polling');
                setNoSelection();
                return;
            }
            if (app.activeDocument.activeLayers.length === 0) {
                console.log('(SelectionContext) No active layers, stopping polling');
                setNoSelection();
                return;
            }
            processSelection(app.activeDocument.activeLayers);
        } catch (error) {
            console.error('(SelectionContext) Error during polling:', error);
            setNoSelection();
        }
    };

    const processSelection = async (layers) => {
        console.log('(SelectionContext) Processing selection:', layers.length);
        const selectionIdentical = selection.layers.length > 0 ? sameIdSet(selection.layers, layers) : true;
        if (selectionIdentical === true) {
            console.log('(SelectionContext) Selection is identical, restarting poll');
            //they're identical, restart the poll and return 
            startSelectionPolling();
            return;
        }
        const { viable, type } = getSelectionViability(layers);
        const groupCount = parentGroupCount(layers);
        const newSelection = {
            layers,
            type,
            viable,
            identical: false,
            parentGroupCount: groupCount
        };

        // Set selection in state
        dispatch({
            type: 'SET_SELECTION',
            payload: newSelection
        });
        startSelectionPolling();
    }

    const setNoSelection = () => {
        dispatch({
            type: 'SET_SELECTION',
            payload: initialSelectionState
        });
        stopSelectionPolling(); // Stop polling when nothing is selected
    }

    const startSelectionPolling = () => {
        isPolling.current = true;
        const id = setTimeout(checkForSelectionChanges, POLLING_INTERVAL);
        setPollingId(id);
    };

    const stopSelectionPolling = () => {
        isPolling.current = false;
        if (pollingId) clearTimeout(pollingId);
        setPollingId(null);
    };

    // Handler for selection changes
    const handleSelectionChange = async () => {
        try {
            stopSelectionPolling();
            const layers = app.activeDocument.activeLayers;
            console.log('(SelectionContext) Selection changed:', layers);
            processSelection(layers);
        } catch (error) {
            console.error("Error processing selection:", error);
        }
    }

    useEffect(() => {
        const listener = action.addNotificationListener(
            [{ event: "select" }],
            handleSelectionChange
        );
        handleSelectionChange();
        return () => {
            setNoSelection();
            action.removeNotificationListener([{ event: "select" }], handleSelectionChange);
        };
    }, []);

    // Value to be provided
    const contextValue = {
        selection,
        setSelection: (newSelection) => dispatch({
            type: 'SET_SELECTION',
            payload: newSelection
        })
    };

    return (
        <SelectionContext.Provider value={contextValue}>
            {children}
        </SelectionContext.Provider>
    );
}

// Custom hook for consuming the context
export function useSelection() {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
}