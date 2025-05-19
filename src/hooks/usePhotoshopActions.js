import { useCallback, useContext } from 'react';
import { useSelection } from './useSelection.js';
import { executeModalAction } from '../utilities/photoshopActionWrapper.js';
import { buildScopeRegex } from '../utilities/utilities.js';
import selectLayersByName from '../actions/selectLayersByName.js';
import propagateAsset from '../actions/propagateAsset.js';
import matchStylesByName from '../actions/matchStylesByName.js';
import { PluginContext } from '../contexts/PluginContext.js';

export function usePhotoshopActions() {
    const selection = useSelection();
    const { state } = useContext(PluginContext);
    const { activeFilters } = state.editor;
    const { creativeConfig } = state;

    const getFilterRegex = useCallback(async () => {
        console.log('active filters', activeFilters);
        if (!activeFilters || activeFilters.length === 0 || !creativeConfig) {
            return null;
        }

        //const filterValues = activeFilters.map(filter => filter.value);
        return buildScopeRegex(activeFilters);
    }, [activeFilters, creativeConfig]);

    const handleSelectLayersByName = useCallback(async (context) => {
        console.log('selection', selection);
        try {
            const filterRegex = await getFilterRegex();
            console.log('filter regex', filterRegex);
            const result = await executeModalAction("Select Layers By Name", async (context) => {
                return await selectLayersByName(context, selection.layers, filterRegex);
            });
            return result;
        } catch (error) {
            console.error('Error selecting layers by name:', error);
            throw error;
        }
    }, [selection, getFilterRegex]);

    const handlePropagateAsset = useCallback(async (context) => {
        const filterRegex = getFilterRegex();
        console.log('filter regex', filterRegex);
        const result = await executeModalAction("Propagate Asset", async (context) => {
            return await propagateAsset(context, selection.layers, false, filterRegex);
        });
        return result;
    }, [selection, getFilterRegex]);

    const handlePropagateMissing = useCallback(async (context) => {
        const filterRegex = getFilterRegex();
        console.log('filter regex', filterRegex);
        const result = await executeModalAction("Propagate Missing", async (context) => {
            return await propagateAsset(context, selection.layers, true, filterRegex);
        });
        return result;
    }, [selection, getFilterRegex]);

    const handleMatchStylesByName = useCallback(async (context) => {
        const filterRegex = getFilterRegex();
        console.log('filter regex', filterRegex);
        const result = await executeModalAction("Match Styles By Name", async (context) => {
            return await matchStylesByName(context, selection.layers, filterRegex);
        });
        return result;
    }, [selection, getFilterRegex]);

    return {
        selectLayersByName: handleSelectLayersByName,
        propagateAsset: handlePropagateAsset,
        propagateMissing: handlePropagateMissing,
        matchStylesByName: handleMatchStylesByName
    };
}