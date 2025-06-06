const { app, core, action, constants } = require("photoshop");
import { executeBatchPlay } from '../utilities/photoshopActionWrapper.js';
import { findValidGroups, getLayerIndexFromParent } from '../helpers/helpers.js';
import { getLayerTransforms } from '../actions/transformLayersByType.js';

/**
 * Finds all raster and text layers within a given group layer.
 * @param {object} groupLayer - The Photoshop group layer object.
 * @returns {Promise<Array<object>>} An array of raster and text layers with their properties.
 */
async function getRasterAndTextLayersInGroup(groupLayer) {
    if (!groupLayer || !groupLayer.layers || groupLayer.layers.length === 0) {
        console.warn("getRasterAndTextLayersInGroup: Invalid group layer or no child layers.", groupLayer?.name);
        return [];
    }

    const targetLayers = [];
    for (const layer of groupLayer.layers) {
        if (layer.kind === constants.LayerKind.NORMAL || layer.kind === constants.LayerKind.TEXT) {
            const transform = await getLayerTransforms([layer]);
            targetLayers.push({
                id: layer.id,
                name: layer.name,
                layerRef: layer,
                kind: layer.kind,
                parent: layer.parent,
                bounds: layer.bounds,
                transform: transform[0],
                itemIndex: getLayerIndexFromParent(layer),
                // Calculate area for size comparison later
                area: (layer.bounds._right - layer.bounds._left) * (layer.bounds._bottom - layer.bounds._top)
            });
        }
    }
    return targetLayers;
}

/**
 * Groups layers by their name.
 * @param {Array<object>} layers - Array of layer objects from getRasterAndTextLayersInGroup.
 * @returns {Map<string, Array<object>>} A map where keys are layer names and 
 * values are arrays of layers sharing that name.
 */
function groupByLayerName(layers) {
    const nameGroups = new Map();

    for (const layer of layers) {
        // Use the layer name as the key
        const name = layer.name;

        if (!nameGroups.has(name)) {
            nameGroups.set(name, []);
        }

        nameGroups.get(name).push(layer);
    }

    return nameGroups;
}

/**
 * Finds the largest layer in a group of layers based on area.
 * @param {Array<object>} layers - Array of layer objects sharing the same name.
 * @returns {object} The layer with the largest area.
 */
function findLargestLayer(layers) {
    if (!layers || layers.length === 0) return null;

    return layers.reduce((largest, current) => {
        return current.area > largest.area ? current : largest;
    }, layers[0]);
}

/**
 * Converts a layer to a smart object.
 * @param {object} layer - The layer to convert to a smart object.
 * @returns {Promise<object>} The converted smart object layer.
 */
async function convertToSmartObject(layer) {
    try {
        // Select the layer
        await executeBatchPlay([{
            _obj: "select",
            _target: [{ _ref: "layer", _id: layer.id }],
            makeVisible: false
        }]);

        // Convert to smart object
        const result = await executeBatchPlay([{
            _obj: "newPlacedLayer"
        }]);

        // Get the new smart object layer
        const newLayer = layer.parent.layers[layer.itemIndex];

        // Return the updated layer info
        return {
            id: newLayer.id,
            name: newLayer.name,
            layerRef: newLayer,
            originalLayerId: layer.id,
            originalLayerName: layer.name,
            parent: newLayer.parent,
            bounds: newLayer.bounds,
            transform: layer.transform,
            itemIndex: getLayerIndexFromParent(newLayer)
        };
    } catch (error) {
        console.error(`Error converting layer ${layer.name} to smart object:`, error);
        return null;
    }
}

/**
 * Gets the resource ID of a smart object layer.
 * @param {object} layer - The smart object layer.
 * @returns {Promise<string>} The resource ID of the smart object.
 */
async function getSmartObjectResourceID(layer) {
    const result = await executeBatchPlay(
        [{
            _obj: 'get',
            _target: [{ _ref: 'layer', _id: layer.id }],
            _options: { dialogOptions: 'dontDisplay' }
        }],
        { synchronousExecution: true }
    );

    const d = result[0];
    if (d.smartObject && d.smartObject.linked) {
        return d.smartObject.linked;
    }
    return d.smartObjectMore.ID;
}

/**
 * Replaces a layer with an instance of a smart object.
 * @param {object} targetLayer - The layer to replace.
 * @param {object} sourceSmartObject - The source smart object to create an instance from.
 * @returns {Promise<object|null>} The new smart object layer or null on failure.
 */
async function replaceWithSmartObjectInstance(targetLayer, sourceSmartObject) {
    try {
        // Get the resource ID of the source smart object
        const resourceID = await getSmartObjectResourceID(sourceSmartObject.layerRef);

        // Duplicate the source smart object
        await executeBatchPlay([{
            _obj: "duplicate",
            _target: [{ _ref: "layer", _id: sourceSmartObject.layerRef.id }]
        }]);

        // Get the duplicated layer
        const duplicatedLayer = sourceSmartObject.parent.layers[getLayerIndexFromParent(sourceSmartObject.layerRef) - 1];

        // Move the duplicated layer to the target layer's position
        await duplicatedLayer.move(targetLayer.layerRef, constants.ElementPlacement.PLACEAFTER);

        // Apply the target layer's transform to match its dimensions
        if (targetLayer.transform) {
            // Calculate relative scaling
            const widthRatio = targetLayer.transform.widthPct / sourceSmartObject.transform.widthPct;
            const heightRatio = targetLayer.transform.heightPct / sourceSmartObject.transform.heightPct;

            const transformDescriptor = [
                {
                    _obj: 'transform',
                    _target: [{ _ref: "layer", _id: duplicatedLayer.id }],
                    freeTransformCenterState: { _enum: 'quadCenterState', _value: 'QCSAverage' },
                    width: { _unit: 'percentUnit', _value: widthRatio * 100 },
                    height: { _unit: 'percentUnit', _value: heightRatio * 100 },
                    angle: { _unit: 'angleUnit', _value: targetLayer.transform.rotationDeg - sourceSmartObject.transform.rotationDeg },
                    interfaceIconFrameDimmed: { _enum: 'interpolationType', _value: 'bicubicAutomatic' },
                    _options: { dialogOptions: 'dontDisplay' }
                }
            ];

            await executeBatchPlay(transformDescriptor);

            // Position the layer correctly
            let xOffset = { _unit: "pixelsUnit", _value: targetLayer.bounds._left - duplicatedLayer.bounds._left };
            let yOffset = { _unit: "pixelsUnit", _value: targetLayer.bounds._top - duplicatedLayer.bounds._top };
            await duplicatedLayer.translate(xOffset, yOffset);
        }

        // Rename the layer to match the original with instance numbering
        duplicatedLayer.name = `${targetLayer.name} || Instance`;

        // Delete the original layer
        await executeBatchPlay([{
            _obj: "delete",
            _target: [{ _ref: "layer", _id: targetLayer.id }]
        }]);

        // Return the new layer info
        return {
            id: duplicatedLayer.id,
            name: duplicatedLayer.name,
            layerRef: duplicatedLayer,
            originalLayerId: targetLayer.id,
            originalLayerName: targetLayer.name,
            resourceID: resourceID,
            parent: duplicatedLayer.parent,
            bounds: duplicatedLayer.bounds,
            transform: targetLayer.transform,
            itemIndex: getLayerIndexFromParent(duplicatedLayer)
        };
    } catch (error) {
        console.error(`Error replacing layer ${targetLayer.name} with smart object instance:`, error);
        return null;
    }
}

/**
 * Creates a detached smart object instance.
 * @param {object} sourceSmartObject - The source smart object.
 * @param {number} instanceIndex - The index for naming the instance.
 * @returns {Promise<object|null>} The new detached smart object or null on failure.
 */
async function createDetachedSmartObjectInstance(sourceSmartObject, instanceIndex) {
    try {
        // Select the source smart object
        await executeBatchPlay([{
            _obj: "select",
            _target: [{ _ref: "layer", _id: sourceSmartObject.layerRef.id }]
        }]);

        // Create a detached copy
        await executeBatchPlay([{
            _obj: "placedLayerMakeCopy",
            _target: [{ _ref: "layer", _id: sourceSmartObject.layerRef.id }]
        }]);

        // Get the new layer (it should be active and above the original)
        const newLayer = sourceSmartObject.parent.layers[sourceSmartObject.itemIndex - 1];
        if (!newLayer) {
            console.error("Failed to get new layer after placedLayerMakeCopy.");
            return null;
        }

        // Rename with instance index
        const baseName = sourceSmartObject.name.replace(/\s+\|\|\s+Instance.*$/i, "");
        newLayer.name = `${baseName} || Instance: ${instanceIndex}`;

        // Return the new layer info
        return {
            id: newLayer.id,
            name: newLayer.name,
            layerRef: newLayer,
            originalLayerId: sourceSmartObject.id,
            originalLayerName: sourceSmartObject.name,
            parent: newLayer.parent,
            bounds: newLayer.bounds,
            transform: sourceSmartObject.transform,
            itemIndex: getLayerIndexFromParent(newLayer),
            baseName: baseName
        };
    } catch (error) {
        console.error(`Error creating detached smart object instance:`, error);
        return null;
    }
}

/**
 * Processes a single group, converting raster and text layers to smart objects.
 * @param {object} groupLayer - The group layer to process.
 * @returns {Promise<Map<string, Array<object>>>} A map of name clusters to smart object instances.
 */
async function processInitialGroup(groupLayer) {
    // Get all raster and text layers in the group
    const layers = await getRasterAndTextLayersInGroup(groupLayer);
    console.log('layers', layers);
    // Group layers by name
    const nameGroups = groupByLayerName(layers);
    console.log('nameGroups', nameGroups);
    // Process each name group
    const smartObjectsByName = new Map();

    for (const [name, layersWithSameName] of nameGroups.entries()) {
        // Skip if only one layer with this name (no need to convert)
        if (layersWithSameName.length <= 1) continue;

        // Find the largest layer to use as the master
        const masterLayer = findLargestLayer(layersWithSameName);

        // Convert the master layer to a smart object
        const masterSmartObject = await convertToSmartObject(masterLayer);
        if (!masterSmartObject) {
            console.warn(`Failed to convert master layer ${masterLayer.name} to smart object.`);
            continue;
        }

        // Set the base name for the smart object
        masterSmartObject.baseName = masterSmartObject.name;
        masterSmartObject.name = masterSmartObject.layerRef.name = `${masterSmartObject.baseName} || Instance: 0`;

        // Initialize the array for this name in the result map
        smartObjectsByName.set(name, [masterSmartObject]);

        // Replace other layers with instances of the master
        for (let i = 0; i < layersWithSameName.length; i++) {
            // Skip the master layer
            if (layersWithSameName[i].id === masterLayer.id) continue;

            // Replace with smart object instance
            const instance = await replaceWithSmartObjectInstance(layersWithSameName[i], masterSmartObject);
            if (instance) {
                // Create a detached instance if in the same group as the master
                // This ensures each instance has its own resource ID
                const detachedInstance = await createDetachedSmartObjectInstance(instance, i);
                if (detachedInstance) {
                    smartObjectsByName.get(name).push(detachedInstance);
                }
            }
        }
    }

    return smartObjectsByName;
}

/**
 * Processes other groups based on the smart objects created in the initial group.
 * @param {Array<object>} groupsToProcess - Array of group layers to process.
 * @param {Map<string, Array<object>>} referenceSmartObjects - Map of name to smart object instances from the initial group.
 * @returns {Promise<void>}
 */
async function processOtherGroups(groupsToProcess, referenceSmartObjects) {
    for (const group of groupsToProcess) {
        // Get all raster and text layers in this group
        const layers = await getRasterAndTextLayersInGroup(group);

        // Group layers by name
        const nameGroups = groupByLayerName(layers);

        // Process each name group
        for (const [name, layersWithSameName] of nameGroups.entries()) {
            // Skip if no reference smart objects for this name
            if (!referenceSmartObjects.has(name)) continue;

            const referenceSOs = referenceSmartObjects.get(name);

            // Process each layer with this name
            for (let i = 0; i < layersWithSameName.length; i++) {
                const layer = layersWithSameName[i];

                // If we have a reference smart object for this index, use it
                if (i < referenceSOs.length) {
                    const refSO = referenceSOs[i];
                    await replaceWithSmartObjectInstance(layer, refSO);
                } else {
                    // If we've run out of reference smart objects, use the first one
                    // and create a detached instance
                    const instance = await replaceWithSmartObjectInstance(layer, referenceSOs[0]);
                    if (instance) {
                        const detachedInstance = await createDetachedSmartObjectInstance(instance, i);
                        if (detachedInstance) {
                            // Add this new instance to the reference collection for future groups
                            referenceSOs.push(detachedInstance);
                        }
                    }
                }
            }
        }
    }
}

/**
 * Main action function.
 * Converts raster and text layers with the same name to smart objects across groups.
 * Uses the largest layer in each name cluster as the master.
 * @param {Array<Layer>} selectedLayers - Currently selected layers in Photoshop.
 * @param {RegExp|null} filterRegex - Optional regex to filter which groups to process.
 * @returns {Promise<object>} Result object with success status and message.
 */
export default async function convertLayersToSmartObjects(selectedLayers, filterRegex) {
    if (!selectedLayers || selectedLayers.length === 0) {
        console.warn("No layers selected.");
        return { success: false, message: "No layers selected." };
    }

    // Get the parent group of the selected layer
    let sourceGroupLayer = selectedLayers[0].parent;
    if (sourceGroupLayer.kind !== constants.LayerKind.GROUP) {
        console.warn("Selected layer has no valid parent group.");
        return { success: false, message: "Selected layer has no valid parent group." };
    }

    // Process the initial group
    console.log(`Processing initial group: ${sourceGroupLayer.name}`);
    const smartObjectsByName = await processInitialGroup(sourceGroupLayer);

    if (smartObjectsByName.size === 0) {
        console.log("No raster or text layers with duplicate names found in the source group.");
        return { success: true, message: "No raster or text layers with duplicate names found in the source group." };
    }

    console.log(`Created smart objects for ${smartObjectsByName.size} name clusters in the source group.`);

    // Find other valid groups to process
    const groupsToProcess = findValidGroups(app.activeDocument.layers, sourceGroupLayer, filterRegex);
    if (!groupsToProcess || groupsToProcess.length === 0) {
        console.log("No other valid groups found to process.");
        return { success: true, message: "Smart objects created in source group. No other groups to process." };
    }

    console.log(`Found ${groupsToProcess.length} other groups to process.`);

    // Process other groups
    await processOtherGroups(groupsToProcess, smartObjectsByName);

    console.log("Convert Layers to Smart Objects action completed.");
    return { success: true, message: "Raster and text layers converted to smart objects across groups." };
}