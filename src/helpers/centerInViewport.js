
import { executeBatchPlay } from '../utilities/photoshopActionWrapper.js';
async function centerInViewport(layers) {
    const layerIds = layers.map(layer => layer.id);
    const commands = [
        {
            _obj: "select",
            _target: [
                {
                    _name: layers[0].name,
                    _ref: "layer"
                }
            ],
            layerID: [...layerIds],
            makeVisible: false,
            selectionModifier: {
                _enum: "selectionModifierType",
                _value: "addToSelectionContinuous"
            }
        },
        {
            _obj: "select",
            _target: [
                {
                    _ref: '$Mn ',
                    _enum: '$FtOn',
                    _value: 'fitLayersOnScreen',
                },
            ]
        },
        {
            _obj: "select",
            _target: [
                {
                    _ref: "$Mn",
                    _enum: "$MnIt",
                    _value: "zoomOut",
                },
            ]
        },
        {
            _obj: "select",
            _target: [
                {
                    _ref: "$Mn",
                    _enum: "$MnIt",
                    _value: "zoomOut",
                },
            ]
        }
    ];
    await executeBatchPlay(commands, {});
}

async function centerAllBoards(creativeState) {
    await centerInViewport(getAllBoardsInState(creativeState));
}

export { centerInViewport, centerAllBoards };