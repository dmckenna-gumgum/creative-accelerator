const { app } = require('photoshop');
import { findGroupsWithFailures, getLayersByName } from "../helpers/helpers.js";
import applyLayerStyleToMatchingLayers from "./applyLayerStyleToMatchingLayers.js";
/**
 * Copy every layer-style (FX) from `sourceLayer`
 * to every other layer with the same `.name`.
 *
 * @param {Layer} sourceLayer – the layer whose styles you want to clone
 */
export default async function matchStylesByName(executionContext, sourceLayers, filter = []) {
    const sourceLayer = sourceLayers[0];
    if (sourceLayers.length > 1) {
        console.warn("Can only match styles for one layer at a time.");
        return { success: false, message: "Can only match styles for one layer at a time." };
    }
    const { validGroups } = findGroupsWithFailures(app.activeDocument.layers, null, filter);
    const targetLayers = getLayersByName([sourceLayer.name], validGroups);
    const result = await applyLayerStyleToMatchingLayers(sourceLayer, targetLayers);
    return { success: true, message: `Matched styles for ${result.length} layers`, result: result };
}