import { executeBatchPlay } from '../utilities/photoshopActionWrapper.js';

/**
 * Copy every layer-style (FX) from `sourceLayer`
 * to every other layer with the same `.name`.
 *
 * @param {Layer} sourceLayer – the layer whose styles you want to clone
 */
export default async function applyLayerStyleToMatchingLayers(sourceLayer, targetLayers) {
    const layerEffects = await getLayerStyle(sourceLayer);
    if (!layerEffects) {
        console.warn("Source layer has no layer styles.");
        return;
    }

    if (!targetLayers.length) {
        console.info("No other layers share that name.");
        return;
    }
    try {
        const cmds = targetLayers.map(layer => buildSetCommand(layer, layerEffects));
        await executeBatchPlay(cmds, { synchronousExecution: false });
        console.log("Applying Layer Effects:", Object.entries(layerEffects).filter(([_, effect]) => {
            if (!effect || typeof effect !== 'object') return false;
            if (!Array.isArray(effect)) {
                return effect.enabled === true;
            }
            return effect.some((e) => e && e.enabled === true);
        }).map(([key]) => key).join(', '), `to ${targetLayers.length} layer(s).`);
        return { success: true, message: `Applied styles to ${targetLayers.length} layer(s).`, results: targetLayers };
    } catch (error) {
        console.error(error);
        return { success: false, message: error.message };
    }
}

const buildSetCommand = (layer, layerEffects) => ({
    _obj: "set",
    _target: [
        { _ref: "property", _property: "layerEffects" },
        { _ref: "layer", _id: layer.id }
    ],
    to: layerEffects
});


const getLayerStyle = async (layer) => {
    try {
        const fxCommand = {
            _obj: "get",
            _target: [
                { _property: "layerEffects" },
                { _ref: "layer", _id: layer.id }
            ]
        }
        const rawResults = await executeBatchPlay([fxCommand], { synchronousExecution: true });
        const result = await rawResults[0]['layerEffects'];
        return result;
    } catch (error) {
        console.error(`Error getting layer style: ${error}`);
        return error;
    }
}