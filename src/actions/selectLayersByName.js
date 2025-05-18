const { app, core } = require('photoshop');
import { executeBatchPlay } from '../utilities/photoshopActionWrapper.js';
import { findMatchingLayerNames } from '../helpers/helpers.js';

export default async function selectLayersByName(executionContext, selection) {

    const currentlySelectedLayers = selection;
    if (!selection || selection.length === 0) {
        const message = "No layers are currently selected. Please select one or more layers first.";
        await core.showAlert(message);
        return { success: false, message: message };
    }

    const scopeOfSearch = app.activeDocument.layers; ///add filters here
    const targetNames = new Set(currentlySelectedLayers.map(layer => layer.name));
    const matchingLayers = findMatchingLayerNames(scopeOfSearch, targetNames, []);

    const commands = [
        {
            _obj: "selectNoLayers",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]
        }
    ];

    if (matchingLayers.length > 0) {
        const layerRefs = matchingLayers.map(layer => ({ _ref: "layer", _id: layer.id }));
        commands.push({
            _obj: "select",
            _target: layerRefs,
            selectionModifier: { _enum: "selectionModifierType", _value: "addToSelection" },
            makeVisible: false
        });
    }

    if (commands.length > 1 || matchingLayers.length === 0) {
        await executeBatchPlay(commands);
    }

    return {
        success: true,
        count: matchingLayers.length
    };
}