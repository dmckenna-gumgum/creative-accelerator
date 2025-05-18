import { useCallback } from 'react';
import { useSelection } from './useSelection.js';
import { executeModalAction } from '../utilities/photoshopActionWrapper.js';
import selectLayersByName from '../actions/selectLayersByName.js';
import propagateAsset from '../actions/propagateAsset.js';

export function usePhotoshopActions() {
    const selection = useSelection();
    const handleSelectLayersByName = useCallback(async (context) => {
        const result = await executeModalAction("Select Layers By Name", async (context) => {
            return await selectLayersByName(context, selection.layers);
        });
        return result;
    }, [selection]);

    const handlePropagateAsset = useCallback(async (context) => {
        const result = await executeModalAction("Propagate Asset", async (context) => {
            return await propagateAsset(context, selection.layers, false, []);
        });
        return result;
    }, [selection]);

    const handlePropagateMissing = useCallback(async (context) => {
        const result = await executeModalAction("Propagate Missing", async (context) => {
            return await propagateAsset(context, selection.layers, true, []);
        });
        return result;
    }, [selection]);

    return {
        selectLayersByName: handleSelectLayersByName,
        propagateAsset: handlePropagateAsset,
        propagateMissing: handlePropagateMissing,
    };
}