const { app } = require("photoshop");

/**
 * LinkProcessor - Handles linking and unlinking layers based on selection state
 * This is separated from the SelectionService to maintain separation of concerns
 */
const LinkProcessor = (() => {
    // Private state
    const _state = {
        linkedLayers: [],
        autoLink: false,
        selectionFilters: null
    };

    // Utility functions - replace with actual implementation as needed
    const LinkByArrayOfLayers = async (newLayers, unselectedLayers, existingLayers, selectionFilters) => {
        console.log("LinkProcessor: Linking layers", {
            newLayers,
            unselectedLayers,
            existingLayers,
            selectionFilters
        });

        // Implement your link functionality here
        // This is a placeholder that you'll replace with your actual implementation
        return {
            success: true,
            message: "Linked layers successfully"
        };
    };

    const UnlinkAllLayers = async (layers) => {
        console.log("LinkProcessor: Unlinking all layers", layers);

        // Implement your unlink functionality here
        // This is a placeholder that you'll replace with your actual implementation
        return {
            success: true,
            message: "Unlinked layers successfully"
        };
    };

    // Public methods
    const startAutoLink = async (selectionService) => {
        if (_state.autoLink !== true) {
            _state.autoLink = true;

            // If we have a current selection, link it immediately
            const currentSelection = selectionService.getSelection();
            if (currentSelection.layers.length > 0 && currentSelection.viable) {
                // Process the current selection as if all layers are newly selected
                const result = await processSelection(currentSelection, 'autolinkEnabled');
                return {
                    success: true,
                    message: "AutoLink started successfully",
                    result
                };
            }

            return { success: true, message: "AutoLink started successfully" };
        } else {
            return { success: true, message: "AutoLink was already started" };
        }
    };

    const stopAutoLink = async () => {
        if (_state.autoLink !== false) {
            _state.autoLink = false;
            // Unlink all layers when autoLink is disabled
            const result = await UnlinkAllLayers(_state.linkedLayers);
            _state.linkedLayers = [];

            return {
                success: true,
                message: "AutoLink stopped successfully",
                unlinkResult: result
            };
        } else {
            return { success: true, message: "AutoLink was already stopped" };
        }
    };

    const setAutoLink = async (autoLink, selectionService) => {
        if (autoLink !== _state.autoLink) {
            return autoLink ? startAutoLink(selectionService) : stopAutoLink();
        } else {
            return {
                success: true,
                message: `AutoLink state is already set to ${autoLink}`
            };
        }
    };

    const setSelectionFilters = (filters) => {
        _state.selectionFilters = filters;
        return {
            success: true,
            message: `Selection filters updated successfully: ${_state.selectionFilters}`
        };
    };

    const processSelection = async (selection, trigger = 'selectionChanged') => {
        console.log("LinkProcessor: Processing selection", { selection, trigger });

        if (!_state.autoLink || !selection.viable) {
            return {
                success: true,
                message: `Selection processing skipped (autoLink: ${_state.autoLink}, viable: ${selection.viable})`
            };
        }

        try {
            // For a complete implementation, you'd need to track the previous selection
            // This is a simplified example that assumes all selected layers are new
            const result = await LinkByArrayOfLayers(
                selection.layers, // Treating all as new layers for simplicity
                [], // No unselected layers for this example
                [], // No existing layers for this example
                _state.selectionFilters
            );

            _state.linkedLayers = [...selection.layers];

            return {
                success: true,
                message: "Selection processed successfully",
                result
            };
        } catch (error) {
            console.error("Error processing selection in LinkProcessor:", error);
            return {
                success: false,
                message: error.message
            };
        }
    };

    // Initialize the module with options
    const initialize = (options = {}) => {
        _state.autoLink = options.autoLink || false;
        _state.selectionFilters = options.selectionFilters || null;

        return {
            isAutoLinkEnabled: () => _state.autoLink,
            setAutoLink,
            setSelectionFilters,
            processSelection,
            getLinkedLayers: () => [..._state.linkedLayers]
        };
    };

    // Public API
    return {
        initialize,
        LinkByArrayOfLayers,
        UnlinkAllLayers
    };
})();

export { LinkProcessor };
