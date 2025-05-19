import { useRef, useContext } from "react";
import { PluginContext } from '../contexts/PluginContext.js';
import { diffArraysByIds, buildScopeRegex } from '../utilities/utilities.js';
import { findGroupsWithFailures } from '../helpers/helpers.js';
import { executeModalAction, executeBatchPlay } from '../utilities/photoshopActionWrapper.js';
const { app, action, core } = require("photoshop");
const { batchPlay } = action;

/**
 * Custom hook for handling auto-linking of layers based on selection changes
 */
export function useAutoLink() {
    const prevSelectionRef = useRef({ layers: [] });
    const prevFiltersRef = useRef([]);
    const prevAutoLinkRef = useRef(false);
    const { state, dispatch } = useContext(PluginContext);
    const { activeFilters, autoLinkEnabled } = state.editor;

    /**
     * Toggle the auto-link feature on/off
     */
    const toggleAutoLink = () => {
        dispatch({
            type: 'TOGGLE_AUTOLINK',
            payload: !autoLinkEnabled
        });
    };


    /**
     * Process selection change and link/unlink layers as needed
     * @param {Array} currentSelection - Current selected layers
     */
    const processSelectionChange = async (currentSelection, activeFilters) => {
        //if autolink is neither on, nor was on last time a selection changed, then there should be nothing to link or unlink and we can return early. 
        if (!autoLinkEnabled && !prevAutoLinkRef.current) {
            return;
        }
        ///if autolink is enabled, but the user deselects stuff. OR if autolink was disabled, but was active last time, then unlink everything that autolink was responsible for linking. 
        if ((autoLinkEnabled && (!currentSelection || currentSelection.layers.length === 0)) || (prevAutoLinkRef.current && !autoLinkEnabled)) {
            prevAutoLinkRef.current = false;
            const result = await executeModalAction("Unlink Selected Layers", async (context) => {
                return await unlinkAllLayers(prevSelectionRef.current.layers);
            });
            return result;
        }

        try {

            const prevSelection = prevSelectionRef.current || { layers: [] };
            const { onlyA: newLayers, onlyB: unselectedLayers, both: existingLayers } = diffArraysByIds(currentSelection.layers, prevSelection.layers);

            ///this might be a faster comparison method, but i'll confirm later. 
            // Extract just the layer objects needed for processing
            // const toLink = currentSelection.layers;
            // console.log(currentSelection.layers, prevSelection.layers);
            // const toUnlink = prevSelection.layers.filter(
            //     prevLayer => !currentSelection.layers.some(currLayer => currLayer.id === prevLayer.id)
            // );
            // const toUnchange = prevSelection.layers.filter(
            //     prevLayer => currentSelection.layers.some(currLayer => currLayer.id === prevLayer.id)
            // );

            // Update ref with current selection for next change
            prevSelectionRef.current = { ...currentSelection };
            prevAutoLinkRef.current = autoLinkEnabled;

            // Only proceed if we have layers to link or unlink
            if (newLayers.length === 0 && unselectedLayers.length === 0 && existingLayers.length === 0) return;


            const result = await executeModalAction("Link Selected Layers", async (context) => {
                // return await linkByArrayOfLayers(toLink, toUnlink, toUnchange, activeFilters);
                return await linkByArrayOfLayers(newLayers, unselectedLayers, existingLayers, await buildScopeRegex(activeFilters));
            });
        } catch (error) {
            console.error("Error in auto-link process:", error);
        }
    };

    /**
     * Link and unlink layers based on arrays and filters
     */
    const linkByArrayOfLayers = async (toLink, toUnlink, toUnchange, filters = null) => {
        try {
            // Find valid and invalid groups based on filters
            const { validGroups, invalidGroups } =
                filters === null || filters.length === 0
                    ? { validGroups: app.activeDocument.layers, invalidGroups: [] }
                    : await findGroupsWithFailures(app.activeDocument.layers, null, filters);

            console.log("(AutoLink) Valid Groups:", validGroups.map(group => group.name),
                "Invalid Groups:", invalidGroups.map(group => group.name));

            const namesToLink = toLink.map(l => l.name);
            const namesToUnlink = toUnlink.map(l => l.name);
            const namesToCheck = toUnchange.map(l => l.name);

            // Process linking in valid groups
            const linkResults = await processLinkLayers([...namesToLink, ...namesToCheck], validGroups);

            // Process unlinking in invalid groups
            const unlinkResults = await processUnlinkLayers([...namesToCheck, ...namesToUnlink], invalidGroups);
            return {
                success: true,
                message: "AutoLink completed successfully",
                results: { unlinked: unlinkResults, linked: linkResults }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    /**
     * Process unlinking of layers
     */
    const processUnlinkLayers = async (unlinkNames, invalidBoards) => {
        const layersToUnlink = getLayersByName(unlinkNames, invalidBoards);
        const unlinkResults = await Promise.all(layersToUnlink.map(async layer => {
            await layer.unlink();
            return { id: layer.id, name: layer.name, artboard: layer.parent.name };
        }));
        return { unlinked: unlinkResults };
    };

    /**
     * Process linking of layers
     */
    const processLinkLayers = async (selectNames, validBoards) => {
        const layersToLink = getLayersByName(selectNames, validBoards);

        try {
            const linkResults = await Promise.all(layersToLink.map(async layer => {
                await layer.unlink(); // Ensure clean linking
                await layer.link(layersToLink[0]);
                return { id: layer.id, name: layer.name, artboard: layer.parent.name };
            }));
            return { linked: linkResults };
        } catch (error) {
            console.error("Error linking layers:", error);
            return { success: false, message: error.message };
        }
    };

    /**
     * Helper: Get layers by name from container
     */
    const getLayersByName = (names, containers) => {
        if (!Array.isArray(containers)) {
            containers = [containers];
        }

        const allLayers = [];
        for (const container of containers) {
            const collectLayers = (layers, acc = []) => {
                if (!layers) return acc;

                layers.forEach(layer => {
                    acc.push(layer);
                    if (layer.layers && layer.layers.length) {
                        collectLayers(layer.layers, acc);
                    }
                });
                return acc;
            };

            allLayers.push(...collectLayers(Array.isArray(container) ? container : [container]));
        }

        return allLayers.filter(layer => names.includes(layer.name));
    };

    const unlinkAllLayers = async (layers) => {
        const namesToUnlink = layers.map(l => l.name);
        const layerCheckForUnlink = getLayersByName(namesToUnlink, app.activeDocument.layers);
        const unlinkResults = await Promise.all(layerCheckForUnlink.map(async layer => {
            await layer.unlink();
            return { id: layer.id, name: layer.name, artboard: layer.parent.name };
        }));
        return unlinkResults;
    }


    return {
        toggleAutoLink,
        processSelectionChange
    };
}
