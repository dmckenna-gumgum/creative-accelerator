
import { executeBatchPlay } from '../utilities/photoshopActionWrapper.js';
const { app } = require('photoshop');

const restoreLayerState = async (layerState) => {
    console.log("(restoreLayerState) Layer state:", layerState);
    try {
        const results = await applyBasics(layerState);
        if (layerState.hasOwnProperty('vectorMask')) {
            await deleteVectorMask(layerState);
        }
        if (layerState.bounds) await fitToBounds(layerState);
        // restore vector masks before restoring transformations
        await setVectorInfo(layerState);
        // restore layer effects before restoring transformations
        if (layerState.layerEffects) await applyLayerEffects(layerState);
        // restore transformations

        return results;
    } catch (error) {
        console.error("(restoreLayerState) Error applying layer state:", error);
        throw error;
    }
}


const pct = v => ({ _unit: 'percentUnit', _value: Math.round(v / 2.55) });
const px = v => ({ _unit: 'pixelsUnit', _value: v });

const commandSelectLayer = layerState => {
    return {
        _obj: 'select',
        _target: [{ _ref: 'layer', _id: layerState.layerID }],
        layerID: [layerState.layerID],
        makeVisible: false
    }
}

const commandSetBasicProperty = (layerState, prop) => {
    return {
        _obj: 'set',
        _target: [{ _enum: 'ordinal', _ref: 'layer', _value: 'targetEnum' }],
        to: { _obj: 'layer', [prop]: layerState[prop] }
    }
}

const commandSetVisibility = layerState => {
    return {
        _obj: layerState.visible ? 'show' : 'hide',
        null: [{ _enum: 'ordinal', _ref: 'layer', _value: 'targetEnum' }]
    }
}

const commandSetPercentProperty = (layerState, prop) => {
    return {
        _obj: 'set',
        _target: [{ _enum: 'ordinal', _ref: 'layer', _value: 'targetEnum' }],
        to: { _obj: 'layer', [prop]: pct(layerState[prop]) }
    };
}

const commandSetPixelProperty = (layerState, prop) => {
    return {
        _obj: 'set',
        _target: [{ _enum: 'ordinal', _ref: 'layer', _value: 'targetEnum' }],
        to: {
            _obj: 'layer',
            [prop]: px(layerState[prop])
        }
    };
}

const commandSetEffectsVisibility = layerState => {
    return {
        _obj: 'set',
        _target: [{ _enum: 'ordinal', _ref: 'layer', _value: 'targetEnum' }],
        to: { _obj: 'layer', layerFXVisible: layerState.layerFXVisible }
    }
}

const commandSpreadObjectProperties = (layerState, propObj) => {
    return {
        _obj: propObj,
        _target: [{ _enum: 'ordinal', _ref: 'layer', _value: 'targetEnum' }],
        ...layerState[propObj]
    }
}



const basicPropsToSet = {
    name: commandSetBasicProperty,
    layerLocking: commandSpreadObjectProperties,
    visible: commandSetVisibility,
    opacity: commandSetPercentProperty,
    fillOpacity: commandSetPercentProperty,
    layerFXVisible: commandSetEffectsVisibility,
    vectorMaskDensity: commandSetPercentProperty,
    vectorMaskFeather: commandSetPixelProperty,
    color: commandSetBasicProperty,
}

async function deleteVectorMask(layerState) {
    const command = [{
        _obj: "delete",
        _target: [
            {
                _ref: "path",
                _enum: "path",
                _value: "vectorMask",
            },
            {
                _ref: "layer",
                _enum: "ordinal",
                _value: "targetEnum",
            },
        ],
        _options: {
            dialogOptions: "dontDisplay",
        },
    }];
    const results1 = await executeBatchPlay(command);
    return results1;
}


async function applyBasics(layerState) {
    try {
        const cmds = [];
        cmds.push(commandSelectLayer(layerState));

        for (const [k, v] of Object.entries(basicPropsToSet)) {
            cmds.push(v(layerState, k));
        }
        console.log('cmds', cmds);

        const results = await executeBatchPlay(cmds, {});
        return results;
    } catch (error) {
        console.error('Error applying layer state:', error);
        throw error;
    }
}

async function applyLayerEffects(layerState) {
    await executeBatchPlay([{
        _obj: 'set',
        _target: [
            { _ref: 'property', _property: 'layerEffects' },
            { _ref: 'layer', _id: layerState.layerID }
        ],
        to: layerState.layerEffects,
        _options: { dialogOptions: 'dontDisplay' }
    }], {});
}

async function fitToBounds(layerState) {
    const { layerID, bounds: tgt } = layerState;

    /* ---- a. Grab the *current* bounds ---------------------------- */
    const [{ bounds: cur }] = await executeBatchPlay([{
        _obj: 'get',
        _target: [{ _ref: 'layer', _id: layerID }],
        _options: { dialogOptions: 'dontDisplay' }
    }], {});

    /* ---- b. Translate if needed ---------------------------------- */
    const dx = tgt.left._value - cur.left._value;
    const dy = tgt.top._value - cur.top._value;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        await executeBatchPlay([{
            _obj: 'move',
            _target: [{ _ref: 'layer', _id: layerID }],
            to: { _obj: 'offset', horizontal: dx, vertical: dy },
            _options: { dialogOptions: 'dontDisplay' }
        }], {});
    }

    /* ---- c. Scale (width / height) ------------------------------- */
    const sx = (tgt.width._value / cur.width._value) * 100;
    const sy = (tgt.height._value / cur.height._value) * 100;

    if (Math.abs(sx - 100) > 0.1 || Math.abs(sy - 100) > 0.1) {
        await executeBatchPlay([{
            _obj: 'transform',
            _target: [{ _ref: 'layer', _id: layerID }],
            link: true,             // keep proportions if you like
            width: { _unit: 'percentUnit', _value: sx },
            height: { _unit: 'percentUnit', _value: sy },
            freeTransformCenterState: { _enum: 'quadCenterState', _value: 'QCSAverage' },
            _options: { dialogOptions: 'dontDisplay' }
        }], {});
    }
}

const setVectorInfo = async (layerState) => {

    const layerID = layerState.layerID;
    // const command = [{
    //     _obj: "delete",
    //     _target: [
    //         {
    //             _ref: "path",
    //             _enum: "path",
    //             _value: "vectorMask",
    //         },
    //         {
    //             _ref: "layer",
    //             _enum: "ordinal",
    //             _value: "targetEnum",
    //         },
    //     ],
    //     _options: {
    //         dialogOptions: "dontDisplay",
    //     },
    // }];
    // const results1 = await executeBatchPlay(command);
    // console.log("(setVectorInfo) Results 1:", results1);
    const command2 = [{
        _obj: "set",
        _target: [
            {
                _ref: "path",
                _property: "workPath",
            },
            {
                _ref: "layer",
                _id: layerID,
            },
        ],
        to: layerState.vectorMask.pathContents,
        _options: {
            dialogOptions: "silent",
        },
    }];
    // const results1 = await bp(command1, { modalBehavior: "execute", synchronousExecution: true });
    const results2 = await executeBatchPlay(command2);
    console.log("(setVectorInfo) Results 2:", results2);
    // get result immediately

    const command3 = [
        {
            _obj: "make",
            _target: [
                {
                    _ref: "path",
                },
                {
                    _ref: "layer",
                    _enum: "ordinal",
                    _value: "targetEnum",
                },
            ],
            at: {
                _ref: "path",
                _enum: "path",
                _value: "vectorMask",
            },
            using: {
                _ref: "path",
                _enum: "ordinal",
                _value: "targetEnum",
            },
            _options: {
                dialogOptions: "dontDisplay",
            },
        },
    ];
    const results3 = await executeBatchPlay(command3);
    console.log("(setVectorInfo) Results 3:", results3);
    //}

    const workPath = app.activeDocument.pathItems.find(
        (i) => i.name === "Work Path"
    );
    if (workPath) {
        await workPath.remove();
    } else {
        console.warn("couldn't find work path, removing pathItems[1]");
        await app.activeDocument.pathItems[1].remove();
    }
}


export { restoreLayerState, setVectorInfo };