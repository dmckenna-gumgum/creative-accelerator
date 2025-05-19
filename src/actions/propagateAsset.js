const { app, core } = require('photoshop');
import { getLayerContainer, findValidGroups, checkForExistingLayers, placeAtCorrectDepth, duplicateAndMoveToBottom, getLayerIndex } from '../helpers/helpers.js';

export default async function propagateAsset(executionContext, selection, missingOnly = false, filter = []) {
    const originalSelection = selection;
    if (originalSelection.length === 0) {
        await core.showAlert("Please select the layer(s) you want to propagate.");
        return { success: false, message: "No layers selected to propagate.", count: 0 };
    }

    // Get names of selected layers
    const sourceLayerNames = originalSelection.map(layer => layer.name);
    const sourceContainer = getLayerContainer(originalSelection);
    const sourceLayers = sourceContainer.layers;
    console.log(sourceContainer, filter);
    const targetContainers = findValidGroups(app.activeDocument.layers, sourceContainer, filter);
    let skippedTargets = 0;
    let successfulPropagations = 0;
    console.log(`(Modal Action) Source container: ${sourceContainer.name} (ID: ${sourceContainer.id})`);
    console.log(`(Modal Action) Target containers: ${targetContainers.map(container => container.name).join(", ")}`);

    for (const targetContainer of targetContainers) {
        console.log(`(Modal Action) Processing target: ${targetContainer.name} (ID: ${targetContainer.id})`);

        const [shouldPropagateToTarget, skippedIncrement] = missingOnly ? checkForExistingLayers(targetContainer, sourceLayerNames, skippedTargets) : [true, 0];
        skippedTargets = skippedIncrement;

        console.log(`(Modal Action) Should propagate to target: ${shouldPropagateToTarget}`);
        if (shouldPropagateToTarget) {
            for (const sourceLayer of originalSelection) {
                try {
                    // --- Duplicate Source Layer--- 
                    const [duplicatedLayer, successIncrement] = await duplicateAndMoveToBottom(sourceLayer, targetContainer, successfulPropagations);
                    successfulPropagations = successIncrement;
                    console.log(`(Modal Action) Duplicated '${sourceLayer.name}' to '${targetContainer.name}'`);

                    // --- Translate to Match Relative Position - THIS DOESN"T CURRENTLY WORK RIGHT, AND ALSO DOESN'T APPEAR NECESSARY UNLESS ARTBOARDS ARE DIFFERENT SIZES---
                    ///UPDATE: WE DO NEED THIS IF THE PROPAGATED ELEMENT IS NOT INSIDE THE BOUNDS OF THE ARTBOARD IT IS SOURCED FROM
                    //const rp = getRelativePosition(sourceLayer, sourceContainer);
                    //await matchRelativePosition(duplicatedLayer, rp, targetContainer);

                    // --- Reorder to Match Source Depth ---                       
                    try {
                        const sourceIndex = getLayerIndex(sourceLayer, sourceLayers);
                        console.log(`(Modal Action) Source index: ${sourceIndex}`);
                        if (sourceIndex === -1) {
                            console.warn(`(Modal Action) Could not find source layer index for reordering.`);
                        } else {
                            ///now convert source index to its position relative to the bottommost element rather than the top.
                            let distanceFromBottom = (sourceContainer.layers.length - 1) - sourceIndex;
                            console.log(`(Modal Action) Distance from bottom: ${distanceFromBottom}`);
                            await placeAtCorrectDepth(duplicatedLayer, targetContainer, distanceFromBottom);
                        }
                    } catch (reorderError) {
                        console.error(`(Modal Action) Error reordering layer '${duplicatedLayer.name}': ${reorderError.message}`);
                        // Potentially non-critical, continue loop
                    }
                } catch (dupOrTranslateError) {
                    console.error(`(Modal Action) Error processing layer '${sourceLayer.name}' for target '${targetContainer.name}': ${dupOrTranslateError.message}`);
                    // Decide whether to stop or continue
                    // await core.showAlert(`Failed processing '${sourceLayer.name}'. Check console.`);
                    // break; // Maybe break inner loop for this target?
                }
            }
        }
    };

    // --- Restore Original Selection ---
    try {
        // app.activeDocument.activeLayers = originalSelection;
        console.log("(Modal Action) Original layer selection restored.");
    } catch (restoreError) {
        console.warn("(Modal Action) Could not restore original selection:", restoreError);
        // Non-critical, proceed
    }

    return {
        success: true,
        count: 0//temporary
    };
}