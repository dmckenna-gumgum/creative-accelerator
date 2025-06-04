// src/contexts/SelectionContext.js
import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { PluginContext } from './PluginContext.js';
import { initialState } from '../constants/plugin.js';
import { sameIdSet, getSelectionViability, parentGroupCount } from '../utilities/utilities.js';
const { app, action } = require("photoshop");

// Initial state for selection
const initialSelectionState = initialState.currentSelection ?? {
    layers: [],
    type: 'layer',
    viable: false,
    identical: false,
    parentGroupCount: 0
};

// Create context
export const SelectionContext = createContext();

// Provider component
export function SelectionProvider({ children }) {
    const { state, dispatch } = useContext(PluginContext);
    const selectionRef = useRef(state.currentSelection);
    const sectionRef = useRef(state.currentSection);
    const isPolling = useRef(false);
    const pollingIdRef = useRef(null);
    const POLLING_INTERVAL = 200; // Poll every 200ms   

    useEffect(() => {
        sectionRef.current = state.currentSection
        selectionRef.current = state.currentSelection;
    }, [state.currentSelection, state.currentSection]);

    const checkForSelectionChanges = useCallback(async () => {
        pollingIdRef.current = null;
        try {
            const doc = app.activeDocument;
            if (!doc || doc.activeLayers.length === 0) {
                setNoSelection();
                return;
            }

            await processSelection(doc.activeLayers);
        } catch (err) {
            console.error('(SelectionContext) Poll error:', err);
            setNoSelection();
        }
    }, []);

    const processSelection = useCallback(async (layers) => {
        const prev = selectionRef.current;
        //i'm trying to do this in a way where I understand if it's not-identical through easier comparisons first, and then harder comparisons if it
        //passes the easier checks. sameIdSet is somewhat expensive, so I don't want to run it unless I have to.
        const selectionIdentical =
            //if they don't have equal lengths, they can't be identical
            (layers.length !== prev.layers.length) ? false :
                //if they have equal lengths of 1, check if the first layer id is the same
                (layers.length !== 1 && prev.layers.length !== 1 && layers[0].id !== prev.layers[0].id) ? false :
                    //if they have equal lengths of more than 1, check if both layer id sets match.
                    !(sameIdSet(prev.layers, layers)) ? false : true;
        if (selectionIdentical) {
            //they're identical, restart the poll and return 
            startSelectionPolling();
            return;
        }
        const { viable, type } = getSelectionViability(layers);
        const groupCount = parentGroupCount(layers);
        const newSelection = {
            layers: [...layers],
            type,
            viable,
            identical: false,
            parentGroupCount: groupCount,
            //things that use this selection should stop using it if it's not active. Active should only be valid when the user is in the editor section.
            //eventually maybe other sections will want access to the selection, but for now it should only be used in the editor mode.
            active: sectionRef.current === 'editor'
        };
        // Set selection in state
        dispatch({
            type: 'SET_SELECTION',
            payload: newSelection
        });
        startSelectionPolling();
    }, [state.currentSelection]);

    const forceSelectionCheck = useCallback(async () => {
        try {
            const layers = app.activeDocument?.activeLayers || [];
            if (layers.length === 0) {
                setNoSelection();
                return;
            }
            await processSelection(layers);
        } catch (error) {
            console.error("Error during forced selection check:", error);
            setNoSelection();
        }
    }, [processSelection]);

    const setNoSelection = () => {
        dispatch({
            type: 'SET_SELECTION',
            payload: initialSelectionState
        });
        stopSelectionPolling(); // Stop polling when nothing is selected
    }

    const startSelectionPolling = () => {
        if (pollingIdRef.current) return;
        isPolling.current = true;
        pollingIdRef.current = setTimeout(async () => await checkForSelectionChanges(), POLLING_INTERVAL);
    };

    const stopSelectionPolling = () => {
        isPolling.current = false;
        if (pollingIdRef.current) {
            clearTimeout(pollingIdRef.current);
            pollingIdRef.current = null;
        }
    };

    // Handler for selection changes
    const handleSelectionChange = async () => {
        stopSelectionPolling();
        try {
            const layers = app.activeDocument.activeLayers;
            if (layers.length === 0) {
                setNoSelection();
                return;
            }
            await processSelection(layers);
        } catch (error) {
            console.error("Error processing selection:", error);
        }
    }

    useEffect(() => {
        if (state.currentSection !== 'editor') {
            // console.log('(SelectionContext) Not in editor section, skipping selection setup');
            // Make sure polling is stopped when not in editor
            stopSelectionPolling();
            return;
        }
        const listener = action.addNotificationListener(
            [{ event: "select" }],
            handleSelectionChange
        );
        if (app.activeDocument && app.activeDocument.activeLayers.length > 0) {
            //run an initial handle if there is a selection already when the plugin loads.
            handleSelectionChange();
        }
        return () => {
            setNoSelection();
            action.removeNotificationListener([{ event: "select" }], handleSelectionChange);
        };
    }, [state.currentSection]);

    // 1. memoise the dispatcher so the reference is stable
    const setSelection = useCallback(
        (newSelection) =>
            dispatch({ type: 'SET_SELECTION', payload: newSelection }),
        [dispatch]
    );
    // 2. memoise the whole context value;
    const contextValue = useMemo(
        () => ({
            selection: state.currentSelection,
            setSelection,
            forceSelectionCheck
        }),
        [state.currentSelection, setSelection, forceSelectionCheck]
    );

    return (
        <SelectionContext.Provider value={contextValue}>
            {children}
        </SelectionContext.Provider>
    );
}