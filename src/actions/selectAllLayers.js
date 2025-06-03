const { app, core } = require('photoshop');
import { executeBatchPlay } from '../utilities/photoshopActionWrapper.js';
import { findValidGroups } from '../helpers/helpers.js';

export default async function selectAllLayers(executionContext, selection, filter = []) {
    try {
        const validGroups = findValidGroups(app.activeDocument.layers, null, filter);
        const allLayers = validGroups.flatMap(group => group.layers.map(layer => layer._id));

        const commands = [
            {
                _obj: "selectNoLayers",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]
            }
        ];

        if (allLayers.length > 0) {
            const layerRefs = allLayers.map(layer => ({ _ref: "layer", _id: layer }));
            commands.push({
                _obj: "select",
                _target: layerRefs,
                selectionModifier: { _enum: "selectionModifierType", _value: "addToSelection" },
                makeVisible: false
            });
        }

        if (commands.length > 1 || allLayers.length === 0) {
            await executeBatchPlay(commands);
        }

        return {
            success: true,
            count: allLayers.length
        };
    } catch (error) {
        console.error("Error in selectAllLayers:", error);
        return {
            success: false,
            message: `Error: ${error.message}`,
            count: 0
        };
    }
}