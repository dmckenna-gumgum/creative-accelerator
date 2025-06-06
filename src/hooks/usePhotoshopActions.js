import { useCallback, useContext } from 'react';
import { useSelection } from './useSelection.js';
import { SelectionContext } from '../contexts/SelectionContext.js';
import { executeModalAction } from '../utilities/photoshopActionWrapper.js';
import { buildScopeRegex } from '../utilities/utilities.js';
import selectLayersByName from '../actions/selectLayersByName.js';
import propagateAsset from '../actions/propagateAsset.js';
import matchStylesByName from '../actions/matchStylesByName.js';
import { PluginContext } from '../contexts/PluginContext.js';
import linkSelectedLayers from '../actions/linkSelectedLayers.js';
import transformSelectedLayers from '../actions/transformSelectedLayers.js';
import selectAllLayers from '../actions/selectAllLayers.js';
import { useDialog, useTransformDialog } from '../hooks/useDialog.js';
import { getKitchenSink } from '../actions/getKitchenSink.js';
import { captureArtboardState, restoreArtboardState } from '../actions/captureArtboardState.js';
import fixDuplicateSmartObjects from '../actions/fixDuplicateSmartObjects.js';
import fixInvalidLayers from '../actions/fixInvalidLayers.js';

export function usePhotoshopActions() {
    const selection = useSelection();
    const { state } = useContext(PluginContext);
    const { experimental } = state;
    const { activeFilters } = state.editor;
    const { creativeConfig } = state;
    const { forceSelectionCheck } = useContext(SelectionContext);
    // Get dialog-related hooks
    const { showTransformDialog } = useTransformDialog();

    const getFilterRegex = useCallback(async () => {
        console.log('active filters', activeFilters);
        return buildScopeRegex(activeFilters);
    }, [activeFilters, creativeConfig]);

    const handleSelectLayersByName = useCallback(async (context) => {
        console.log('selection', selection);
        try {
            const filterRegex = await getFilterRegex();
            console.log('filter regex', filterRegex);
            const result = await executeModalAction("Select Layers By Name", async (context) => {
                return await selectLayersByName(context, selection.layers, filterRegex);
            });
            return result;
        } catch (error) {
            console.error('Error selecting layers by name:', error);
            throw error;
        }
    }, [selection, getFilterRegex]);

    const handleSelectAllLayers = useCallback(async (context) => {
        const filterRegex = await getFilterRegex();
        console.log('filter regex', filterRegex);
        const result = await executeModalAction("Select All Layers", async (context) => {
            return await selectAllLayers(context, selection.layers, filterRegex);
        });
        forceSelectionCheck();
        return result;
    }, [selection, getFilterRegex]);

    const handlePropagateAsset = useCallback(async (context) => {
        const filterRegex = await getFilterRegex();
        console.log('filter regex', filterRegex);
        const result = await executeModalAction("Propagate Asset", async (context) => {
            return await propagateAsset(context, selection.layers, false, filterRegex);
        });
        return result;
    }, [selection, getFilterRegex]);

    const handlePropagateMissing = useCallback(async (context) => {
        const filterRegex = await getFilterRegex();
        console.log('filter regex', filterRegex);
        const result = await executeModalAction("Propagate Missing", async (context) => {
            return await propagateAsset(context, selection.layers, true, filterRegex);
        });
        return result;
    }, [selection, getFilterRegex]);

    const handleMatchStylesByName = useCallback(async (context) => {
        const filterRegex = await getFilterRegex();
        console.log('filter regex', filterRegex);
        const result = await executeModalAction("Match Styles By Name", async (context) => {
            return await matchStylesByName(context, selection.layers, filterRegex);
        });
        return result;
    }, [selection, getFilterRegex]);

    const handleLinkSelectedLayers = useCallback(async (context) => {
        const result = await executeModalAction("Link Selected Layers", async (context) => {
            return await linkSelectedLayers(context, selection.layers, true);
        });
        return result;
    }, [selection]);

    const handleUnlinkSelectedLayers = useCallback(async (context) => {
        const result = await executeModalAction("Unlink Selected Layers", async (context) => {
            return await linkSelectedLayers(context, selection.layers, false);
        });
        return result;
    }, [selection]);

    const handleGetKitchenSink = useCallback(async (context) => {
        const result = await executeModalAction("Get Kitchen Sink", async (context) => {
            return await getKitchenSink(context, selection.layers);
        });
        return result;
    }, [selection]);

    const handleFixDuplicateSmartObjects = useCallback(async (context) => {
        const filterRegex = await getFilterRegex();
        console.log('filter regex', filterRegex);
        console.log("(handleFixDuplicateSmartObjects) Artboard state:", selection.layers);
        const result = await executeModalAction("Fix Duplicate Smart Objects", async (context) => {
            return await fixDuplicateSmartObjects(selection.layers, filterRegex);
        });
        return result;
    }, [selection]);

    const handleFixInvalidLayers = useCallback(async (context) => {
        const filterRegex = await getFilterRegex();
        console.log('filter regex', filterRegex);
        console.log("(handleFixInvalidLayers) Artboard state:", selection.layers);
        const result = await executeModalAction("Fix Invalid Layers", async (context) => {
            return await fixInvalidLayers(selection.layers, filterRegex);
        });
        return result;
    }, [selection]);

    // const handleSetVectorInfo = useCallback(async (context) => {
    //     const result = await executeModalAction("Set Vector Info", async (context) => {
    //         return await setVectorInfo(selection.layers);
    //     });
    //     return result;
    // }, [selection]);

    // const handleGetVectorInfo = useCallback(async (context) => {
    //     const result = await executeModalAction("Get Vector Info", async (context) => {
    //         return await getVectorInfo(selection.layers, true);
    //     });
    //     return result;
    // }, [selection]);

    const handleCaptureArtboardState = useCallback(async (context) => {
        const result = await executeModalAction("Capture Artboard State", async (context) => {
            return await captureArtboardState();
        });
        return result;
    }, []);

    const handleRestoreArtboardState = useCallback(async (context) => {
        console.log("(handleRestoreArtboardState) Artboard state:", experimental.artboardState);
        const result = await executeModalAction("Restore Artboard State", async (context) => {
            return await restoreArtboardState(experimental.artboardState);
        });
        return result;
    }, [experimental]);

    const handleScaleSelectedLayers = useCallback(async () => {
        try {
            // First, get the action result which includes the dialog requirement
            const actionResult = await transformSelectedLayers(null, selection.layers, 'scale');
            console.log("(Action Script) transformSelectedLayers actionResult:", actionResult);

            // If the action requires a dialog, show it and then execute the action with the dialog value
            if (actionResult && actionResult.requiresDialog && actionResult.dialogType === 'transform') {
                console.log("(Action Script) transformSelectedLayers dialogType:", actionResult.dialogType);

                // Show the dialog and get the value
                let dialogResult;
                try {
                    dialogResult = await showTransformDialog('scale');
                    console.log("Dialog result:", dialogResult);

                    // Then execute the action with the dialog value
                    if (actionResult.executeWithDialogValue && dialogResult) {
                        return await actionResult.executeWithDialogValue(dialogResult);
                    }
                } catch (error) {
                    console.error("Error showing transform dialog:", error);
                    return { success: false, message: `Error: ${error.message}`, count: 0 };
                }
            }

            return actionResult;
        } catch (error) {
            console.error('Error in handleScaleSelectedLayers:', error);
            return { success: false, message: `Error: ${error.message}`, count: 0 };
        }
    }, [selection, showTransformDialog]);

    const handleRotateSelectedLayers = useCallback(async () => {
        try {
            // First, get the action result which includes the dialog requirement
            const actionResult = await transformSelectedLayers(null, selection.layers, 'rotate');

            // If the action requires a dialog, show it and then execute the action with the dialog value
            if (actionResult && actionResult.requiresDialog && actionResult.dialogType === 'transform') {
                // Show the dialog and get the value
                let dialogResult;
                try {
                    dialogResult = await showTransformDialog('rotate');
                    console.log("Dialog result:", dialogResult);

                    // Then execute the action with the dialog value
                    if (actionResult.executeWithDialogValue && dialogResult) {
                        return await actionResult.executeWithDialogValue(dialogResult);
                    }
                } catch (error) {
                    console.error("Error showing transform dialog:", error);
                    return { success: false, message: `Error: ${error.message}`, count: 0 };
                }
            }

            return actionResult;
        } catch (error) {
            console.error('Error in handleRotateSelectedLayers:', error);
            return { success: false, message: `Error: ${error.message}`, count: 0 };
        }
    }, [selection, showTransformDialog]);

    return {
        selectLayersByName: handleSelectLayersByName,
        propagateAsset: handlePropagateAsset,
        propagateMissing: handlePropagateMissing,
        matchStylesByName: handleMatchStylesByName,
        linkSelectedLayers: handleLinkSelectedLayers,
        unlinkSelectedLayers: handleUnlinkSelectedLayers,
        getKitchenSink: handleGetKitchenSink,
        scaleSelectedLayers: handleScaleSelectedLayers,
        rotateSelectedLayers: handleRotateSelectedLayers,
        captureArtboardState: handleCaptureArtboardState,
        restoreArtboardState: handleRestoreArtboardState,
        selectAllLayers: handleSelectAllLayers,
        fixDuplicateSmartObjects: handleFixDuplicateSmartObjects,
        fixInvalidLayers: handleFixInvalidLayers,
    };
}