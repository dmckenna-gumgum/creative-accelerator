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
                resourceID: placedID,
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

/**
 * Retrieves the placed ID (resource link) of a smart object layer.
 * For linked smart objects, it returns the link path.
 * For embedded smart objects, it returns the internal ID.
 * @param {object} layer - The Photoshop smart object layer object.
 * @returns {Promise<string|null>} The resource ID string or null if not found.
 */
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
 * Detaches a smart object by making a unique copy, applying original transform, and deleting the original.
 * @param {object} originalSoData - Data of the original smart object.
 * @returns {Promise<object|null>} Data of the new detached smart object or null on failure.
 */
async function _detachAndReplicateSmartObject(originalSoData, index, baseName) {
    try {
        // console.log(`Detaching: ${originalSoData.name} (ID: ${originalSoData.id})`);
        // Select the original smart object layer
        await executeBatchPlay([{ _obj: "select", _target: [{ _ref: "layer", _id: originalSoData.id }] }]);

        // Run placedLayerMakeCopy to create a new independent smart object
        // This command creates a new SO with its own resource, usually preserving transform.
        await executeBatchPlay([{ _obj: "placedLayerMakeCopy", _target: [{ _ref: "layer", _id: originalSoData.id }] }]);

        // Get the new layer (it should be active and above the original)
        const newLayer = originalSoData.parent.layers[originalSoData.itemIndex];
        if (!newLayer) {
            console.error("Failed to get new layer after placedLayerMakeCopy or it's not a SO.");
            // Attempt to delete original if new layer failed, to avoid leaving duplicates if possible
            await executeBatchPlay([{ _obj: "delete", _target: [{ _ref: "layer", _id: originalSoData.id }], layerID: [originalSoData.id] }]);
            return null;
        }
        // console.log(`Created new SO: ${newLayer.name} (ID: ${newLayer.id}) from ${originalSoData.name}`);

        // Ensure new layer has the original name if `placedLayerMakeCopy` changed it (e.g., added "copy")
        if (newLayer.name !== originalSoData.name) {
            newLayer.name = `${baseName} || Instance: ${index}`;
        }

        // Delete the original layer
        // The originalSoData.id is still valid for deletion.
        // console.log(`Deleting original SO: ${originalSoData.name} (ID: ${originalSoData.id})`);
        await executeBatchPlay([{ _obj: "delete", _target: [{ _ref: "layer", _id: originalSoData.id }] }]);

        const newResourceIdentifier = await getPlacedID(newLayer);
        // console.log('newResourceIdentifier', newResourceIdentifier);

        const result = {
            originalLayerId: originalSoData.id,
            originalLayerName: originalSoData.name,
            originalResourceID: originalSoData.resourceID,
            newLayerId: newLayer.id,
            newLayerName: newLayer.name,
            newResourceID: newResourceIdentifier,
            parent: newLayer.parent,
            layer: newLayer,
            transform: originalSoData.transform
        };
        // console.log('result', result);
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
 * This is pretty messy right now but i don't have any ambition to clean it up. 
 * There's also a bug in here that sometimes causes detached isntances to inherit the wrong transform props.
 * Still trying to figure out how to replicate it reliably. 
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
                    //this needs to counteract whatever rotational angle it inherited from the source. i had a stroke thinking about this.
                    angle: { _unit: 'angleUnit', _value: targetSoData.transform.rotationDeg - mappingEntry.transform.rotationDeg },
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
 * Groups smart object layers by their shared resource link.
 * @param {Array<object>} smartObjectLayers - Array of smart object layers from getSmartObjectsInGroup.
 * @returns {Map<string, Array<object>>} A map where keys are resource links and 
 * values are arrays of smart object layers sharing that link.
 */
function groupByResourceID(smartObjectLayers) {
    const groupedByResource = new Map();
    for (const so of smartObjectLayers) {
        if (!groupedByResource.has(so.resourceID)) {
            groupedByResource.set(so.resourceID, []);
        }
        groupedByResource.get(so.resourceID).push(so);
    }
    return groupedByResource;
}


/**
 * Structures a master smart object's properties to mirror the schema returned by _detachAndReplicateSmartObject.
 * This is used for smart objects that are kept as 'masters' and don't undergo the full detachment process,
 * ensuring consistent data structure for all items in a fixed cluster.
 * This whole step wouldn't be necessary if i detached masters, but for some reason i enjoy pain so I made it more complicated than it needed to be.
 * @param {object} masterSmartObject - The smart object data (enriched with properties like id, name, layerRef, resourceID, parent, bounds, transform, itemIndex, baseName).
 * @returns {object} An object with properties mirroring the output of _detachAndReplicateSmartObject.
 */
function setMasterObjectProps(masterSmartObject) {
    const result = {
        ...masterSmartObject,
        originalLayerId: masterSmartObject.id,
        originalLayerName: masterSmartObject.name,
        originalResourceID: masterSmartObject.resourceID,
        newLayerId: masterSmartObject.id,
        newLayerName: masterSmartObject.name,
        newResourceID: masterSmartObject.resourceID,
        parent: masterSmartObject.parent,
        layer: masterSmartObject,
        transform: masterSmartObject.transform
    };
    return result;
}


/**
 * Processes the initial group of smart objects, detaching duplicates within each cluster.
 * It identifies smart objects sharing the same resource ID and makes them unique.
 * The first smart object in a cluster is typically kept (renamed), and subsequent ones are detached.
 * @param {Map<string, Array<object>>} clusters - A Map where keys are resource IDs and values are arrays of smart object data sharing that resource.
 * @returns {Promise<Map<string, Array<object>>>} A Map where keys are original resource IDs and values are arrays of the now-unique (detached or master) smart object data objects.
 */
async function fixInitialGroup(clusters) {
    const groupedByPreviouslySharedResource = new Map();
    for (const [resourceID, siblingArray] of clusters.entries()) {
        // if (siblingArray.length > 1) {
        groupedByPreviouslySharedResource.set(resourceID, []);

        // console.log(`Processing resource:`, soArray);
        //Considering refactoring this to just detach the masters too. It really shouldn't matter to the user and the extra complexity
        //involved in not doing it makes this whole thing require extra steps and functions to ensure there aren't bugs....TBD
        const masterSmartObject = siblingArray[0]; // This one is kept as is, or could also be detached if we want all new
        masterSmartObject.baseName = masterSmartObject.name.replace(/\s+copy\s+\d+\s*$/i, "");
        masterSmartObject.name = masterSmartObject.layerRef.name = `${masterSmartObject.baseName} || Instance: 0`;
        console.log('masterSmartObject', masterSmartObject);
        const fixedMasterObject = setMasterObjectProps(masterSmartObject);
        groupedByPreviouslySharedResource.get(resourceID).push(fixedMasterObject);
        // console.log(`  Keeping master: ${masterSmartObject.name} (ID: ${masterSmartObject.id})`);
        for (let i = 1; i < siblingArray.length; i++) {
            const toDetach = siblingArray[i];
            const newSoInfo = await _detachAndReplicateSmartObject(toDetach, i, masterSmartObject.baseName);
            if (newSoInfo) {
                groupedByPreviouslySharedResource.get(resourceID).push(newSoInfo);
            } else {
                console.warn(`Failed to detach ${toDetach.name}. It might still be linked or an error occurred.`);
                // Potentially return a partial success or error here
            }
        }


    }
    //}
    return groupedByPreviouslySharedResource;
}

/**
 * Iterates through other specified groups and applies smart object fixes based on the initially fixed clusters.
 * For each group, it identifies its smart objects and calls fixSmartObjectsFromReferenceCluster.
 * @param {Array<object>} groupsToFix - An array of group layer data objects (e.g., { id, name, layerRef }) to process.
 * @param {Map<string, Array<object>>} fixedSmartObjectClusters - The Map of already fixed smart object clusters from the source group.
 *                                                              Each key is an original resourceID, and the value is an array of new, unique SO data objects.
 * @returns {Promise<void>} Resolves when all specified groups have been processed.
 */
async function fixOtherGroups(groupsToFix, fixedSmartObjectClusters) {
    for (const groupToFix of groupsToFix) {
        ///loop through all valid groups and find smart objects that match the initial smart object, and replace those
        //with parallel copies of the new sets of smart objects. 
        // console.log(`Processing valid group: ${groupToFix.name} (ID: ${groupToFix.id})`);
        const smartObjectsInTargetGroup = await getSmartObjectsInGroup(groupToFix);
        if (smartObjectsInTargetGroup.length === 0) {
            console.log(`No smart objects in target group ${groupToFix.name}.`);
            continue;
        }
        const newFixedCluster = await fixSmartObjectsFromReferenceCluster(smartObjectsInTargetGroup, fixedSmartObjectClusters, groupToFix);
    }
}

/**
 * Fixes smart objects within a specific target group based on a reference cluster of already fixed smart objects.
 * It groups the smart objects in the target group by their resource IDs.
 * If a resource ID in the target group is new (not in fixedCluster), its instances are detached to become new masters.
 * If a resource ID matches one in fixedCluster, its instances are either replaced (to match the corresponding fixed master) 
 * or, if they are 'extra' instances, they are detached to become new unique masters.
 * @param {Array<object>} smartObjectsToFix - An array of smart object data from the current target group.
 * @param {Map<string, Array<object>>} fixedCluster - The reference Map of fixed smart object clusters. 
 *                                                    This map is updated by this function if new master instances are created.
 * @param {object} targetGroup - The group layer data object where fixes are being applied.
 * @returns {Promise<void>} Resolves when smart objects in the target group have been processed.
 */
async function fixSmartObjectsFromReferenceCluster(smartObjectsToFix, fixedCluster, targetGroup) {
    const toFixCluster = groupByResourceID(smartObjectsToFix);
    console.log('comparing fixed cluster to unfixed cluster');
    console.log('fixedCluster', fixedCluster);
    console.log('toFixCluster', toFixCluster);
    for (const [resourceID, toFixArray] of toFixCluster.entries()) {
        //first check if this resource ID entry in the toFixCluster Map exists in the fixedCluster Map.
        // If it doesn't we need to add it so that it's used when looping through subsequent groups
        if (!fixedCluster.has(resourceID)) {
            fixedCluster.set(resourceID, []);
            ///and then fill it with newly detached smart objects of this resource ID
            for (let i = 0; i < toFixArray.length; i++) {
                const toFix = toFixArray[i];
                if (i === 0) {
                    //this is the master smart object, we need to get the base name and set it as the name for the first fixed smart object
                    //Considering refactoring this to just detach the masters too. It really shouldn't matter to the user and the extra complexity
                    //involved in not doing it makes this whole thing require extra steps and functions to ensure there aren't bugs....TBD
                    const masterSmartObject = toFixArray[0];
                    masterSmartObject.baseName = masterSmartObject.name.replace(/\s+copy\s+\d+\s*$/i, "");
                    masterSmartObject.name = masterSmartObject.layerRef.name = `${masterSmartObject.baseName} || Instance: 0`;
                    const fixedMasterObject = setMasterObjectProps(masterSmartObject);
                    fixedCluster.get(resourceID).push(fixedMasterObject);
                } else {
                    ///then the rest can use that as the basis for the detachAndReplication.
                    const newSoInfo = await _detachAndReplicateSmartObject(toFix, i, toFixArray[0].baseName);
                    fixedCluster.get(resourceID).push(newSoInfo);
                }
            }
        } else {
            // const fixedSiblingArray = fixedCluster.get(resourceID);
            //otherwise just start converting indexes of the toFixCluster value array to the corresponding entry in the fixedCluster value array.
            const fixedSiblingArray = fixedCluster.get(resourceID);
            for (let i = 0; i < toFixArray.length; i++) {
                const toFix = toFixArray[i];
                ///if this index exists in the fixedSiblingArray, use it as the basis for a replacement
                if (i in fixedSiblingArray) {
                    const fromRef = fixedSiblingArray[i];
                    const replacementResult = await _replaceSmartObjectInTarget(toFix, fromRef, targetGroup);
                } else {
                    ///otherwise do a normal detachAndReplicate and use the 0 index of the fixedSiblingArray as the basis for the base name
                    const newSoInfo = await _detachAndReplicateSmartObject(toFix, i, fixedSiblingArray[0].baseName);
                    fixedCluster.get(resourceID).push(newSoInfo);
                }
            }
        }
    }
    return fixedCluster;
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

    //for now, just get the parent of the selected layer, fix that group, then move on to fixing the rest from there.
    let sourceGroupLayer = selectedLayers[0].parent;
    if (sourceGroupLayer.kind !== constants.LayerKind.GROUP) {
        console.warn("layer has no valid parent group.");
        return { success: false, message: "layer has no valid parent group." };
    }

    //get all smart objects in the source group.
    const smartObjectsInSourceGroup = await getSmartObjectsInGroup(sourceGroupLayer);
    if (smartObjectsInSourceGroup.length === 0) {
        console.log("No smart objects found in the source group.");
        return { success: true, message: "No smart objects in source group to process." };
    }

    //group the smart objects by resource ID.
    const smartObjectClusters = groupByResourceID(smartObjectsInSourceGroup);
    // console.log('smartObjectClusters', smartObjectClusters);
    //then detach duplicates within each cluster and return an array of distinct smart objects
    const fixedSmartObjectClusters = await fixInitialGroup(smartObjectClusters);
    if (fixedSmartObjectClusters.length === 0) {
        console.log("No smart objects were detached in the source group, so no propagation needed.");
        return { success: true, message: "No shared smart objects found to detach in the source group." };
    }
    console.log('These are the clusters of smart objects that were previously linked but are now distinct:', fixedSmartObjectClusters)

    //now prepare to propagate these updates to all other groups. 
    //find all other valid groups that qualify according to the selected filters.
    const groupsToFix = findValidGroups(app.activeDocument.layers, sourceGroupLayer, filterRegex);
    if (!groupsToFix || groupsToFix.length === 0) {
        console.log("No other valid groups found to propagate changes to.");
        return { success: true, message: "No other valid groups found to propagate changes to." };
    }
    const fixedResults = await fixOtherGroups(groupsToFix, fixedSmartObjectClusters);
    console.log('fixedResults', fixedResults)

    console.log("Detach and Propagate Smart Objects action finished.");
    return { success: true, message: "Smart object detachment and propagation complete." };
}
