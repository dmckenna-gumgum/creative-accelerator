
const { app, core, photoshop, action } = require('photoshop');
import { executeBatchPlay } from '../utilities/photoshopActionWrapper.js';
import { captureLayerState } from '../actions/captureLayerState.js';
import { restoreLayerState } from '../actions/restoreLayerState.js';

const captureArtboardState = async () => {
    const allLayers = app.activeDocument.layers
    const results = await Promise.all(allLayers.map(async (layer) => {
        return await captureLayerState(layer);
    }));
    const layerState = results.map(result => result.payload);
    console.log("(captureArtboardState) Layer state:", layerState);
    return layerState;
}

const restoreArtboardState = async (layerState) => {
    console.log("(restoreArtboardState) Layer state:", layerState);
    const restoredState = await restoreLayerState(layerState[0]);
    // const results = await Promise.all(layerState.map(async (layer) => {
    //     return await restoreLayerState(layer);
    // }));
    // const restoredState = results.map(result => result.payload);
    console.log("(restoreArtboardState) Restored layer state:", restoredState);
    return restoredState;
}

export { captureArtboardState, restoreArtboardState };