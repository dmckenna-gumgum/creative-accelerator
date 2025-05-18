import { sameIdSet, getSelectionViability, parentGroupCount, diffArraysByIds } from "../utilities/utilities.js"
const { app, action, constants } = require("photoshop");
const { LayerKind } = constants;

/**
 * Selection Service - Handles layer selection state and events
 */
const SelectionService = (() => {
    // Private state
    const state = {
        selection: {
            layers: [],
            type: 'layer',
            viable: true,
            identical: true,
            sameGroup: true,
            parentGroupCount: 0
        },
        enabled: false,
        lastSelection: {
            layers: [],
            viable: true,
            identical: true,
            sameGroup: true,
            parentGroupCount: 0
        },
        selectionPoll: null,
        listener: null,
        callbacks: new Set(),  // Using a Set for callbacks to avoid duplicates
        pollingRate: 100
    };

    // Create state handler for proxy
    const stateHandler = {
        set(target, property, value) {
            const oldValue = target[property];
            target[property] = value;
            return true;
        },
        get(target, property) {
            return target[property];
        }
    };

    // Bind the selectHandler to preserve context
    const selectHandler = async (event) => {
        stopSelectionPoll();
        state.selection.layers = app.activeDocument.activeLayers;
        state.selection.identical = state.lastSelection.layers.length > 0
            ? sameIdSet(state.selection.layers, state.lastSelection.layers)
            : false;

        return state.enabled ? await selectionProcessor(event, 'selectHandler') :
            console.log("(SelectionService) Selection is disabled");
    };

    const create = () => {
        action.addNotificationListener([{ event: "select" }], selectHandler);
        return true;
    };

    const destroy = () => {
        state.listener = null;
        action.removeNotificationListener([{ event: "select" }], selectHandler);
    };

    const startSelectionPoll = () => {
        console.log("(SelectionService) Starting selection poll");
        state.selection.layers = app.activeDocument.activeLayers;
        state.selection.identical = state.lastSelection.layers.length > 0
            ? sameIdSet(state.selection.layers, state.lastSelection.layers)
            : true;

        state.selection.identical === true ?
            state.selectionPoll = setTimeout(startSelectionPoll, state.pollingRate) :
            // If they're not identical, process the selection
            state.selectionPoll = setTimeout(() => {
                selectionProcessor('select', 'pollingCycle');
            }, state.pollingRate);
    };

    const stopSelectionPoll = () => {
        clearTimeout(state.selectionPoll);
    };

    const setListening = async (enabled) => {
        state.enabled = enabled;
        if (state.enabled) {
            return {
                success: true,
                message: "(SelectionService) Listener enabled successfully",
                listening: state.enabled,
                listener: state.listener
            };
        } else {
            stopSelectionPoll();
            return {
                success: true,
                message: "(SelectionService) Listener disabled successfully",
                listening: state.enabled,
                listener: state.listener
            };
        }
    };

    const handleDeselect = async () => {
        // No layers selected, reset selection state
        state.selection = {
            layers: [],
            viable: true,
            type: 'layer',
            identical: false,
            sameGroup: true,
            parentGroupCount: 0
        };

        // Notify all callbacks
        notifyCallbacks();

        stopSelectionPoll();
        state.lastSelection = { ...state.selection };

        return {
            success: true,
            message: "(SelectionService) Selection reset"
        };
    };

    const notifyCallbacks = () => {
        // Notify all registered callbacks with current selection state
        state.callbacks.forEach(callback => {
            try {
                callback(state.selection);
            } catch (error) {
                console.error("Error in selection callback:", error);
            }
        });
    };

    const selectionProcessor = async (event, trigger = 'selectHandler') => {
        console.log("(SelectionService) Selection Processor Triggered by: ", trigger);
        if (state.selection.layers.length === 0) {
            return handleDeselect();
        } else {
            try {
                const { viable, type } = getSelectionViability(state.selection.layers);
                state.selection.viable = viable;
                state.selection.type = type;
                state.selection.parentGroupCount = parentGroupCount(state.selection.layers);

                // Notify callbacks about selection change
                notifyCallbacks();

                // Get selection changes (to expose to potential subscribers)
                const selectionChanges = diffArraysByIds(state.selection.layers, state.lastSelection.layers);

                // Update last selection and start polling again
                state.lastSelection = { ...state.selection };
                startSelectionPoll();

                return {
                    success: true,
                    message: "(SelectionService) Selection changed successfully",
                    selectionChanges
                };
            } catch (error) {
                console.error("(SelectionService) Error processing selection:", error);
                return {
                    success: false,
                    message: error.message
                };
            }
        }
    };

    // Initialize the module with options
    const initialize = (options = {}) => {
        console.log('SelectionService initialized', options);
        state.enabled = options.enableListener || false;
        state.listener = create();

        return {
            getSelection: () => ({ ...state.selection }),
            getSelectionChanges: () => {
                return diffArraysByIds(state.selection.layers, state.lastSelection.layers);
            },
            isEnabled: () => state.enabled,
            setListening,
            subscribe: (callback) => {
                if (typeof callback === 'function') {
                    state.callbacks.add(callback);
                    return true;
                }
                return false;
            },
            unsubscribe: (callback) => {
                return state.callbacks.delete(callback);
            }
        };
    };

    // Public API
    return {
        initialize,
        destroy,
        startSelectionPoll,
        stopSelectionPoll,
        setListening,
        subscribe: (callback) => {
            // Convenience method to allow direct subscription without initializing
            if (typeof callback === 'function') {
                state.callbacks.add(callback);
                return true;
            }
            return false;
        },
        unsubscribe: (callback) => {
            return state.callbacks.delete(callback);
        }
    };
})();

export { SelectionService };