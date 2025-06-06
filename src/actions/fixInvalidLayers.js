const { app, core, action, constants } = require("photoshop");
const { LayerKind, ElementPlacement } = constants;
import { executeBatchPlay } from '../utilities/photoshopActionWrapper.js';
import { findValidGroups, getLayerIndexFromParent } from '../helpers/helpers.js';
const { AnchorPosition } = require('photoshop').constants;
// import { getLayerTransforms } from '../actions/transformLayersByType.js'; // Import if needed for rotation/skew

// --- Helper Functions ---

/**
 * Calculates the area of a layer based on its bounds.
 * @param {object} layerData - Layer data object with bounds {left, top, right, bottom}.
 * @returns {number} The area of the layer.
 */
function calculateLayerArea(layerData) {
    if (!layerData || !layerData.bounds) return 0;
    const { left, top, right, bottom } = layerData.bounds;
    return (right - left) * (bottom - top);
}

/**
 * Gathers all raster and text layers from a list of group layers.
 * @param {Array<object>} groupLayers - Array of Photoshop group layer objects.
 * @returns {Promise<Array<object>>} A flat list of layer data objects.
 */
async function getAllConvertibleLayers(groupLayers) {
    const convertibleLayersList = [];
    for (const group of groupLayers) {
        if (!group.layers || group.layers.length === 0) continue;
        for (const layer of group.layers) {
            if (layer.kind === LayerKind.NORMAL || layer.kind === LayerKind.TEXT) {
                // const transformInfo = await getLayerTransforms([layer]); // If full transform needed
                convertibleLayersList.push({
                    id: layer.id,
                    name: layer.name,
                    layerRef: layer, // Keep a direct reference
                    parentGroupId: group.id,
                    parentGroupRef: group, // Keep a direct reference to parent
                    bounds: layer.bounds,
                    kind: layer.kind,
                    // transform: transformInfo ? transformInfo[0] : null, // Store if using getLayerTransforms
                    itemIndex: getLayerIndexFromParent(layer),
                    visible: layer.visible
                });
            }
        }
    }
    return convertibleLayersList;
}

/**
 * Builds clusters of layers by name and identifies the master for each cluster.
 * @param {Array<object>} allLayers - Flat list of layer data objects.
 * @returns {Map<string, { masterLayerData: object, clusterMembers: Array<object> }>} Map for the master plan.
 */
function buildLayerClustersAndIdentifyMasters(allLayers) {
    const layersByName = new Map();
    for (const layerData of allLayers) {
        if (!layersByName.has(layerData.name)) {
            layersByName.set(layerData.name, []);
        }
        layersByName.get(layerData.name).push(layerData);
    }

    const masterPlan = new Map();
    for (const [name, clusterMembers] of layersByName.entries()) {
        if (clusterMembers.length === 0) continue; // Should not happen

        let masterLayerData = clusterMembers[0];
        if (clusterMembers.length > 1) {
            masterLayerData = clusterMembers.reduce((largest, current) =>
                calculateLayerArea(current) > calculateLayerArea(largest) ? current : largest
            );
        }
        masterPlan.set(name, { masterLayerData, clusterMembers });
    }
    return masterPlan;
}

// --- Core Photoshop Interaction Functions ---

/**
 * Converts a given layer to a Smart Object in place.
 * @param {object} layerData - The data object of the layer to convert.
 * @returns {Promise<object|null>} Data of the new smart object, or null on failure.
 */
async function convertToSmartObjectAtom(layerData) {
    try {
        await executeBatchPlay([{
            _obj: "select",
            _target: [{ _ref: "layer", _id: layerData.id }],
            makeVisible: false
        }], { commandName: `Selecting layer ${layerData.name} for SO conversion` });

        await executeBatchPlay([{ _obj: "newPlacedLayer" }],
            { commandName: `Converting ${layerData.name} to Smart Object` }
        );

        // The new SO replaces the original layer at the same index within its parent.
        const newSOLayer = layerData.parentGroupRef.layers.find(l => l.id !== layerData.id && l.name === layerData.name && l.kind === LayerKind.SMARTOBJECT && l.itemIndex === layerData.itemIndex) || layerData.parentGroupRef.layers[layerData.itemIndex];

        if (!newSOLayer || newSOLayer.kind !== LayerKind.SMARTOBJECT) {
            console.error(`Failed to find the new Smart Object for ${layerData.name} (ID: ${layerData.id}). Expected at index ${layerData.itemIndex}.`);
            // Fallback: try to find by name if index failed (e.g. if something shifted)
            const fallbackSOLayer = layerData.parentGroupRef.layers.find(l => l.name === layerData.name && l.kind === LayerKind.SMARTOBJECT);
            if (!fallbackSOLayer) {
                console.error("Fallback SO find also failed.");
                return null;
            }
            console.warn("Found SO via fallback.");
            return {
                id: fallbackSOLayer.id,
                name: fallbackSOLayer.name,
                layerRef: fallbackSOLayer,
                parentGroupId: layerData.parentGroupId,
                parentGroupRef: layerData.parentGroupRef,
                bounds: fallbackSOLayer.bounds, // Bounds will be of the new SO
                kind: fallbackSOLayer.kind,
                itemIndex: getLayerIndexFromParent(fallbackSOLayer),
                originalLayerId: layerData.id
            };
        }

        return {
            id: newSOLayer.id,
            name: newSOLayer.name,
            layerRef: newSOLayer,
            parentGroupId: layerData.parentGroupId,
            parentGroupRef: layerData.parentGroupRef,
            bounds: newSOLayer.bounds, // Bounds will be of the new SO
            kind: newSOLayer.kind,
            itemIndex: getLayerIndexFromParent(newSOLayer),
            originalLayerId: layerData.id
        };
    } catch (error) {
        console.error(`Error converting layer ${layerData.name} (ID: ${layerData.id}) to Smart Object:`, error);
        return null;
    }
}

/**
 * Replaces a target layer with an instance of a master Smart Object.
 * @param {object} targetLayerData - Data of the layer to be replaced.
 * @param {object} masterSOData - Data of the master Smart Object.
 * @returns {Promise<object|null>} Data of the new smart object instance, or null on failure.
 */
async function replaceLayerWithSOInstance(targetLayerData, masterSOData) {
    try {
        // 1. Duplicate the master SO (creates an instance)
        // const tempVisibility = masterSOData.layerRef.visible;
        // if (!tempVisibility) await masterSOData.layerRef.setVisible(true); // Must be visible to duplicate reliably

        const duplicatedInstanceRef = await masterSOData.layerRef.duplicate();
        // if (!tempVisibility) {
        //     await masterSOData.layerRef.setVisible(false);
        //     await duplicatedInstanceRef.setVisible(false); // Match master's original visibility if it was hidden
        // }
        // if (!targetLayerData.visible) await duplicatedInstanceRef.setVisible(false); // Match target's visibility
        // else await duplicatedInstanceRef.setVisible(true);

        // 2. Move the new instance to the target layer's group and position
        // Move it near the target layer first, then delete target, then re-evaluate index if needed.
        console.log('inserting inside of: ', targetLayerData.layerRef.parent);
        await duplicatedInstanceRef.move(targetLayerData.layerRef.parent, ElementPlacement.PLACEINSIDE);
        await duplicatedInstanceRef.move(targetLayerData.layerRef, ElementPlacement.PLACEBEFORE);

        // 3. Adjust transform (size and position) to match targetLayerData
        const targetBounds = targetLayerData.bounds;
        const targetWidth = targetBounds.right - targetBounds.left;
        const targetHeight = targetBounds.bottom - targetBounds.top;

        const instanceInitialBounds = duplicatedInstanceRef.bounds;
        const instanceInitialWidth = instanceInitialBounds.right - instanceInitialBounds.left;
        const instanceInitialHeight = instanceInitialBounds.bottom - instanceInitialBounds.top;

        if (targetWidth > 0 && targetHeight > 0 && instanceInitialWidth > 0 && instanceInitialHeight > 0) {
            const scaleX = (targetWidth / instanceInitialWidth) * 100;
            const scaleY = (targetHeight / instanceInitialHeight) * 100;
            await duplicatedInstanceRef.scale(scaleX, scaleY, AnchorPosition.MIDDLECENTER);
        }

        // After resize, get new bounds and translate
        const instanceResizedBounds = duplicatedInstanceRef.bounds;
        const deltaX = targetBounds.left - instanceResizedBounds.left;
        const deltaY = targetBounds.top - instanceResizedBounds.top;
        if (deltaX !== 0 || deltaY !== 0) {
            await duplicatedInstanceRef.translate(deltaX, deltaY);
        }

        // 4. Delete the original target layer
        await targetLayerData.layerRef.delete();

        return {
            id: duplicatedInstanceRef.id,
            name: duplicatedInstanceRef.name, // Name might be "Master Name copy"
            layerRef: duplicatedInstanceRef,
            parentGroupId: targetLayerData.parentGroupId,
            parentGroupRef: targetLayerData.parentGroupRef,
            bounds: duplicatedInstanceRef.bounds,
            kind: duplicatedInstanceRef.kind,
            itemIndex: getLayerIndexFromParent(duplicatedInstanceRef)
        };
    } catch (error) {
        console.error(`Error replacing layer ${targetLayerData.name} (ID: ${targetLayerData.id}) with SO instance:`, error);
        // Clean up duplicated layer if it exists and error occurred
        if (typeof duplicatedInstanceRef !== 'undefined' && duplicatedInstanceRef && duplicatedInstanceRef.isValid) {
            try { await duplicatedInstanceRef.delete(); } catch (e) { console.warn('Failed to cleanup duplicated instance on error', e); }
        }
        return null;
    }
}

// --- Main Orchestration Functions ---

async function collectAndIdentify(validGroups) {
    console.log("Starting Pass 1: Collecting layers and identifying masters...");
    const allConvertible = await getAllConvertibleLayers(validGroups);
    if (allConvertible.length === 0) {
        console.log("No convertible (raster or text) layers found.");
        return new Map();
    }
    console.log(`Collected ${allConvertible.length} convertible layers.`);
    const plan = buildLayerClustersAndIdentifyMasters(allConvertible);
    console.log(`Pass 1 complete. ${plan.size} unique layer names identified for consolidation.`);
    console.log('master plan: ', plan);
    return plan;
}

async function convertAndReplaceInstances(masterPlan) {
    console.log("Starting Pass 2: Converting masters and replacing instances...");
    const createdMasterSOs = new Map();

    for (const [name, planData] of masterPlan.entries()) {
        const { masterLayerData, clusterMembers } = planData;

        console.log(`Processing cluster: "${name}". Master layer ID: ${masterLayerData.id}`);
        const masterSO = await convertToSmartObjectAtom(masterLayerData);
        console.log('masterSO: ', masterSO);
        if (masterSO) {
            createdMasterSOs.set(name, masterSO);
            console.log(`Master SO created for "${name}" (New ID: ${masterSO.id})`);

            // The masterLayerData.layerRef is now the SO itself.
            // Iterate clusterMembers to replace non-master layers.
            for (const member of clusterMembers) {
                if (member.id === masterLayerData.id) { // This was the original master, now an SO.
                    continue;
                }
                console.log(`Replacing instance layer "${member.name}" (ID: ${member.id})`);
                await replaceLayerWithSOInstance(member, masterSO);
            }
        } else {
            console.warn(`Failed to convert master layer for cluster "${name}". Skipping this cluster.`);
        }
    }
    console.log(`Pass 2 complete. ${createdMasterSOs.size} master Smart Objects processed.`);
    return createdMasterSOs;
}

/**
 * Main action function.
 * @param {Array<object>} selectedLayers - Currently selected layers (not strictly used if filterRegex is broad).
 * @param {RegExp} filterRegex - Regular expression to filter groups to process.
 */
export default async function fixInvalidLayers(selectedLayers, filterRegex) {

    const allDocLayers = app.activeDocument.layers;
    const validGroups = findValidGroups(allDocLayers, null, filterRegex); // sourceContainer is null to search all groups

    if (!validGroups || validGroups.length === 0) {
        console.warn("No valid groups found matching the filter criteria.");
        return { success: false, message: "No valid groups found matching the filter criteria." };
    }
    console.log(`Found ${validGroups.length} valid groups to process.`);

    let masterPlan;
    masterPlan = await collectAndIdentify(validGroups);

    if (!masterPlan || masterPlan.size === 0) {
        console.log("No layers identified for consolidation after Pass 1.");
        return { success: true, message: "No layers to consolidate." };
    }
    await convertAndReplaceInstances(masterPlan);

    console.log("Consolidate Layers to Smart Objects action finished.");
    return { success: true, message: "Layers consolidated successfully." };
}
