// src/actions/detachAndPropagateSmartObjects.js

const { app, core, action, constants } = require("photoshop");
import { executeBatchPlay } from '../utilities/photoshopActionWrapper.js';
import { findValidGroups, getLayerIndexFromParent } from '../helpers/helpers.js';
import { getLayerTransforms } from '../actions/transformLayersByType.js';

/**
 * Finds all smart object layers within a given group layer.
 * @param {object} groupLayer - The Photoshop group layer object.
 * @returns {Promise<Array<object>>} An array of smart object layers with their properties.
 */
async function getSmartObjectsInGroup(groupLayer) {
    if (!groupLayer || !groupLayer.layers || groupLayer.layers.length === 0) {
        console.warn("getSmartObjectsInGroup: Invalid group layer or no child layers.", groupLayer?.name);
        return [];
    }

    const smartObjects = [];
    for (const layer of groupLayer.layers) {
        if (layer.kind === constants.LayerKind.SMARTOBJECT) {
            const placedID = await getPlacedID(layer);
            const transform = await getLayerTransforms([layer]);
            // console.log(placedID);
            smartObjects.push({
                id: layer.id,
                name: layer.name,
                layerRef: layer,
                resourceLink: placedID,
                parent: layer.parent,
                bounds: layer.bounds,
                transform: transform[0],
                itemIndex: getLayerIndexFromParent(layer) // Store original item index for potential reordering
            });
        }
    }
    console.log('smartObjects', smartObjects);
    return smartObjects;
}

async function getPlacedID(layer) {
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
 * Groups smart object layers by their shared resource link.
 * @param {Array<object>} smartObjectLayers - Array of smart object layers from getSmartObjectsInGroup.
 * @returns {Map<string, Array<object>>} A map where keys are resource links and 
 * values are arrays of smart object layers sharing that link.
 */
function groupSmartObjectsByResource(smartObjectLayers) {
    const groupedByResource = new Map();
    for (const so of smartObjectLayers) {
        if (!groupedByResource.has(so.resourceLink)) {
            groupedByResource.set(so.resourceLink, []);
        }
        groupedByResource.get(so.resourceLink).push(so);
    }
    return groupedByResource;
}

/**
 * Detaches a smart object by making a unique copy, applying original transform, and deleting the original.
 * @param {object} originalSoData - Data of the original smart object.
 * @returns {Promise<object|null>} Data of the new detached smart object or null on failure.
 */
async function _detachAndReplicateSmartObject(originalSoData, index, baseName) {
    try {
        console.log(`Detaching: ${originalSoData.name} (ID: ${originalSoData.id})`);
        // 1. Select the original smart object layer
        await executeBatchPlay([{ _obj: "select", _target: [{ _ref: "layer", _id: originalSoData.id }] }]);

        // 2. Run placedLayerMakeCopy to create a new independent smart object
        // This command creates a new SO with its own resource, usually preserving transform.
        await executeBatchPlay([{ _obj: "placedLayerMakeCopy", _target: [{ _ref: "layer", _id: originalSoData.id }] }]);

        // 3. Get the new layer (it should be active and above the original)
        // const sourceIndex = originalSoData.parent.layers.map(layer => layer.id === originalSoData.id);
        // console.log('sourceIndex', sourceIndex);
        const newLayer = originalSoData.parent.layers[originalSoData.itemIndex];
        console.log('newLayer', newLayer);
        if (!newLayer) {
            console.error("Failed to get new layer after placedLayerMakeCopy or it's not a SO.");
            // Attempt to delete original if new layer failed, to avoid leaving duplicates if possible
            await executeBatchPlay([{ _obj: "delete", _target: [{ _ref: "layer", _id: originalSoData.id }], layerID: [originalSoData.id] }]);
            return null;
        }
        console.log(`Created new SO: ${newLayer.name} (ID: ${newLayer.id}) from ${originalSoData.name}`);

        // Ensure new layer has the original name if `placedLayerMakeCopy` changed it (e.g., added "copy")
        if (newLayer.name !== originalSoData.name) {
            newLayer.name = `${baseName} || Instance: ${index}`;
        }

        // 4. Delete the original layer
        // The originalSoData.id is still valid for deletion.
        console.log(`Deleting original SO: ${originalSoData.name} (ID: ${originalSoData.id})`);
        await executeBatchPlay([{ _obj: "delete", _target: [{ _ref: "layer", _id: originalSoData.id }] }]);

        const newResourceIdentifier = await getPlacedID(newLayer);
        console.log('newResourceIdentifier', newResourceIdentifier);

        const result = {
            originalLayerId: originalSoData.id,
            originalLayerName: originalSoData.name,
            originalResourceLink: originalSoData.resourceLink,
            newLayerId: newLayer.id,
            newLayerName: newLayer.name,
            newResourceLink: newResourceIdentifier,
            parent: newLayer.parent,
            layer: newLayer,
            transform: originalSoData.transform
        };
        console.log('result', result);
        return result;
    } catch (error) {
        console.error(`Error in _detachAndReplicateSmartObject for ${originalSoData.name}:`, error);
        // Attempt to clean up by selecting the original layer if it still exists
        try {
            await executeBatchPlay([{ _obj: "select", _target: [{ _ref: "layer", _id: originalSoData.id }] }]);
        } catch (selectError) { /* ignore if original is already gone */ }
        return null;
    }
}

/**
 * Helper to replace a smart object in a target group with one based on a new source.
 * @param {object} targetSoData - The smart object in the target group to be replaced.
 * @param {object} mappingEntry - The mapping entry linking to the new source SO in the source group.
 * @param {object} targetGroupLayer - The actual layer object for the target group.
 * @returns {Promise<object|null>} Info about the new layer, or null on failure.
 */
async function _replaceSmartObjectInTarget(targetSoData, mappingEntry, targetGroupLayer) {

    console.log('mappingEntry', mappingEntry);
    console.log('targetGroupLayer', targetGroupLayer);
    try {

        const transform = await getLayerTransforms([targetSoData.layerRef]);
        targetSoData.transform = transform[0];
        console.log('targetSoData', targetSoData);
        // 1. Get a reference to the source layer (the newly detached one in the source group)
        const sourceNewSOLayerRef = [{ _ref: "layer", _id: mappingEntry.newLayerId }];

        // Check if source layer still exists
        try {
            await executeBatchPlay([{ _obj: "get", _target: sourceNewSOLayerRef }]);
        } catch (e) {
            console.error(`Source new SO layer with ID ${mappingEntry.newLayerId} not found. Skipping replacement for ${targetSoData.name}.`);
            return null;
        }

        // 2. Duplicate the sourceNewSOLayer. It will be placed above the original and selected.
        console.log('duplicating this layer: ', sourceNewSOLayerRef);
        await executeBatchPlay([{ _obj: "duplicate", _target: sourceNewSOLayerRef }]);
        const targetIndex = getLayerIndexFromParent(mappingEntry.layer);
        const duplicatedLayer = mappingEntry.parent.layers[targetIndex - 1];
        await duplicatedLayer.move(targetSoData.layerRef, constants.ElementPlacement.PLACEAFTER);


        if (targetSoData.transform) {
            const transformDescriptor = [
                {
                    _obj: 'transform',
                    _target: [{ _ref: "layer", _id: duplicatedLayer.id }],
                    freeTransformCenterState: { _enum: 'quadCenterState', _value: 'QCSAverage' },
                    width: { _unit: 'percentUnit', _value: targetSoData.transform.widthPct / mappingEntry.transform.widthPct * 100 },
                    height: { _unit: 'percentUnit', _value: targetSoData.transform.heightPct / mappingEntry.transform.heightPct * 100 },
                    angle: { _unit: 'angleUnit', _value: targetSoData.transform.rotationDeg },
                    interfaceIconFrameDimmed: { _enum: 'interpolationType', _value: 'bicubicAutomatic' },
                    _options: { dialogOptions: 'dontDisplay' }
                }
            ]
            console.log("(setLayerTransforms) Set:", transformDescriptor);
            const results = await executeBatchPlay(transformDescriptor);
            console.log("(setLayerTransforms) Result:", results);
            console.log("SET TRANSLATIONS TO MATCH PREVIOUS");
            console.log("targetSoData.transform", targetSoData.bounds);
            let xOffsetPct = { _unit: "pixelsUnit", _value: targetSoData.bounds._left - duplicatedLayer.bounds._left };
            let yOffsetPct = { _unit: "pixelsUnit", _value: targetSoData.bounds._top - duplicatedLayer.bounds._top };
            console.log("xOffsetPct", xOffsetPct);
            console.log("yOffsetPct", yOffsetPct);
            await duplicatedLayer.translate(xOffsetPct, yOffsetPct);


        } else {
            console.warn(`Skipping transform for ${duplicatedLayer.name} in ${targetGroupLayer.name} as targetSoData.transform or matrix is missing.`);
        }

        // 5. Delete the original targetSO layer
        await executeBatchPlay([{ _obj: "delete", _target: [{ _ref: "layer", _id: targetSoData.id }] }]);

        return {
            replacedLayerId: targetSoData.id,
            newPlacedLayerId: duplicatedLayer.id,
            newPlacedLayerName: duplicatedLayer.name,
            group: targetGroupLayer.name
        };

    } catch (error) {
        console.error(`Error replacing SO ${targetSoData.name} in group ${targetGroupLayer.name}:`, error);
        // Clean up: delete duplicated layer if it exists and replacement failed
        if (typeof duplicatedLayer !== 'undefined' && duplicatedLayer && duplicatedLayer.id) {
            try {
                await executeBatchPlay([{ _obj: "delete", _target: [{ _ref: "layer", _id: duplicatedLayer.id }] }]);
                console.log(`Cleaned up duplicated layer ${duplicatedLayer.name} after error.`);
            } catch (cleanupError) {
                console.error("Error during cleanup:", cleanupError);
            }
        }
        return null;
    }
}

/**
 * Main action function.
 * Detaches smart objects sharing resources within a selected group,
 * then propagates these unique smart objects to other matching groups.
 * @param {Array<Layer>} selectedLayers - Currently selected layers in Photoshop.
 */
export default async function fixDuplicateSmartObjects(selectedLayers, filterRegex) {
    if (!selectedLayers || selectedLayers.length === 0) {
        console.warn("No layers selected.");
        return { success: false, message: "No layers selected." };
    }

    let sourceGroupLayer = selectedLayers[0].parent;
    console.log(sourceGroupLayer);
    if (sourceGroupLayer.kind !== constants.LayerKind.GROUP) {
        console.warn("layer has no valid parent group.");
        return { success: false, message: "layer has no valid parent group." };
    }
    console.log(`Operating on source group: ${sourceGroupLayer.name} (ID: ${sourceGroupLayer.id})`);

    // Part 1: Handle the source group - Detach linked Smart Objects
    const smartObjectsInSourceGroup = await getSmartObjectsInGroup(sourceGroupLayer);
    if (smartObjectsInSourceGroup.length === 0) {
        console.log("No smart objects found in the source group.");
        return { success: true, message: "No smart objects in source group to process." };
    }

    const groupedSOsInSource = groupSmartObjectsByResource(smartObjectsInSourceGroup);
    const detachedMappings = [];
    let masterSOId;
    for (const [resourceLink, soArray] of groupedSOsInSource.entries()) {
        if (soArray.length > 1) {
            console.log(`Processing resource:`, soArray);
            console.log(`Found ${soArray.length} instances sharing resource: ${resourceLink}`);
            // Keep the first one, detach the rest
            const masterSO = soArray[0]; // This one is kept as is, or could also be detached if we want all new
            masterSO.baseName = masterSO.name.replace(/\s+copy\s+\d+\s*$/i, "");
            masterSOId = masterSO.name = masterSO.layerRef.name = `${masterSO.baseName} || Orphan: 0`;
            console.log(`  Keeping master: ${masterSO.name} (ID: ${masterSO.id})`);
            for (let i = 1; i < soArray.length; i++) {
                const soToDetach = soArray[i];
                const newSoInfo = await _detachAndReplicateSmartObject(soToDetach, i, masterSO.baseName);
                if (newSoInfo) {
                    detachedMappings.push(newSoInfo);
                } else {
                    console.warn(`Failed to detach ${soToDetach.name}. It might still be linked or an error occurred.`);
                    // Potentially return a partial success or error here
                }
            }
        }
    }
    console.log("Detached Smart Object Mappings from source group:", detachedMappings);

    // Part 2: Propagate changes to other valid groups
    if (detachedMappings.length === 0) {
        console.log("No smart objects were detached in the source group, so no propagation needed.");
        return { success: true, message: "No shared smart objects found to detach in the source group." };
    }

    console.log("Starting propagation to other groups...");
    // Since filterRegex is not passed from the hook, we pass null.
    // findValidGroups should handle null filterRegex (e.g., by not filtering by name).
    const otherValidGroups = findValidGroups(app.activeDocument.layers, sourceGroupLayer, filterRegex);

    if (!otherValidGroups || otherValidGroups.length === 0) {
        console.log("No other valid groups found to propagate changes to.");
    } else {
        console.log(`Found ${otherValidGroups.length} other valid groups for propagation.`);
        for (const targetGroup of otherValidGroups) { // targetGroup is { id, name, layerRef } from findValidGroups
            console.log(`Processing target group: ${targetGroup.name} (ID: ${targetGroup.id})`);
            const smartObjectsInTargetGroup = await getSmartObjectsInGroup(targetGroup);

            if (smartObjectsInTargetGroup.length === 0) {
                console.log(`No smart objects in target group ${targetGroup.name}.`);
                continue;
            }

            for (let i = 0; i < smartObjectsInTargetGroup.length; i++) {
                const targetSO = smartObjectsInTargetGroup[i];
                //for (const targetSO of smartObjectsInTargetGroup) {
                if (i === 0) {
                    targetSO.baseName = targetSO.name.replace(/\s+copy\s+\d+\s*$/i, "");
                    targetSO.name = targetSO.layerRef.name = masterSOId;//`${targetSO.baseName} || Orphan: 0`;
                    console.log(`  Keeping master: ${targetSO.name} (ID: ${targetSO.id})`);
                } else {
                    for (const mapping of detachedMappings) {
                        if (targetSO.resourceLink === mapping.originalResourceLink) {
                            console.log(`  Candidate for replacement in ${targetGroup.name}: ` +
                                `${targetSO.name} (ID: ${targetSO.id}). ` +
                                `Matches original ${mapping.originalLayerName} (Resource: ${mapping.originalResourceLink}). ` +
                                `Should be replaced with instance of new SO ID: ${mapping.newLayerId} (New Resource: ${mapping.newResourceLink})`);

                            const replacementResult = await _replaceSmartObjectInTarget(targetSO, mapping, targetGroup);
                            if (replacementResult) {
                                console.log(`    Successfully replaced ${targetSO.name} with ${replacementResult.newPlacedLayerName} in group ${targetGroup.name}`);
                            } else {
                                console.warn(`    Failed to replace ${targetSO.name} in group ${targetGroup.name}`);
                            }
                        }
                    }
                }
            }
        }
    }

    console.log("Detach and Propagate Smart Objects action finished.");
    return { success: true, message: "Smart object detachment and propagation complete." };
}