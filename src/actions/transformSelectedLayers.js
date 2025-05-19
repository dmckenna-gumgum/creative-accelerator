const { app, core, action, constants } = require('photoshop');
const { batchPlay } = action;
import { transformLayersByType } from './transformLayersByType.js';
import { toggleHistory } from '../helpers/helpers.js';
import { showTransformDialog } from '../utilities/dialogs.js';
import { executeModalAction } from '../utilities/photoshopActionWrapper.js';

/**
 * Applies an additive scale or rotation transformation individually to each selected layer.
 * Uses the direct dialog utility functions to prompt for input values.
 * 
 * @param {Object} executionContext - The Photoshop execution context
 * @param {Array} selectedLayers - Array of selected layers
 * @param {string} transformType - 'scale' or 'rotate'
 * @returns {Promise<{success: boolean, message: string, count: number}>} Result object
 */
const transformSelectedLayers = async (executionContext, selectedLayers, transformType) => {
    console.log(`(Action Script) transformSelectedLayers started. Type: ${transformType}`);

    try {
        // Show the transform dialog directly
        const dialogResult = await showTransformDialog(transformType);
        console.log("(Action Script) transformSelectedLayers dialogResult:", JSON.stringify(dialogResult));

        // Handle dialog dismissal
        if (!dialogResult || dialogResult.dismissed) {
            console.log("(Action Script) Dialog was dismissed or returned no value");
            return { success: true, message: "Transformation cancelled by user.", count: 0 };
        }

        // Parse the input value - be explicit about accessing the value property
        if (dialogResult.value === undefined || dialogResult.value === null) {
            console.error("(Action Script) Dialog result missing value property:", dialogResult);
            return { success: false, message: "No value returned from dialog.", count: 0 };
        }

        const value = parseFloat(dialogResult.value);
        console.log(`(Action Script) Parsed value from dialog: ${value}`);

        if (typeof value !== 'number' || isNaN(value)) {
            console.error("(Action Script) Invalid value received from dialog:", dialogResult.value);
            await core.showAlert(`Invalid input: '${dialogResult.value}'. Please enter a number.`);
            return { success: false, message: "Invalid numeric value.", count: 0 };
        }

        console.log(`(Action Script) Transforming ${selectedLayers.length} layer(s): [${selectedLayers.map(layer => layer.name).join(', ')}]`);

        // Execute the transformation within a modal context
        const result = await executeModalAction(`Transform Layers (${transformType})`, async (modalContext) => {
            // Calculate scale and rotation values
            console.log(`(Action Script) Calculating scale and rotation values for ${transformType}: ${value}`);
            let scale = transformType === 'scale' ? value / 100 : 1;
            let rotation = transformType === 'scale' ? 0 : value;

            // Apply the transformation to selected layers
            const results = await transformLayersByType(
                selectedLayers,
                scale,
                rotation
            );

            // Re-select the layers
            selectedLayers.forEach(l => l.selected = true);

            return {
                success: true,
                payload: results,
                count: results.length,
                message: `Applied ${transformType} to ${results.length} layer(s).`
            };
        });

        return result;
    } catch (error) {
        console.error("(Action Script) Error in transformSelectedLayers:", error);
        return { success: false, message: `Error: ${error.message || error}`, count: 0 };
    }
};

export default transformSelectedLayers;