const { executeAsModal } = require("photoshop").core;
const { batchPlay } = require("photoshop").action;



//replaces a layer's vecotrMask with another layer's vector mask. let's try to combine this with Work Path.
async function actionCommands() {
    const result = await batchPlay(
        [
            {
                _obj: "make",
                _target: [
                    {
                        _ref: "path"
                    }
                ],
                at: {
                    _ref: [
                        {
                            _ref: "path",
                            _enum: "path",
                            _value: "vectorMask"
                        },
                        {
                            _ref: "layer",
                            _enum: "ordinal",
                            _value: "targetEnum"
                        }
                    ]
                },
                using: {
                    _ref: [
                        {
                            _ref: "path",
                            _enum: "path",
                            _value: "vectorMask"
                        },
                        {
                            _ref: "layer",
                            _name: "Shape 1"
                        }
                    ]
                },
                duplicate: true,
                _options: {
                    dialogOptions: "dontDisplay"
                }
            }
        ],
        {}
    );
}

async function runModalFunction() {
    await executeAsModal(actionCommands, { "commandName": "Action Commands" });
}

await runModalFunction();





////this works to take a work path and apply it to a new layer, but that's not really what we want is it?
// const command = [
//     {
//         _obj: 'select',
//         _target: [{ _ref: 'path', _property: 'workPath' }],
//         _options: { dialogOptions: 'dontDisplay' }
//     },
//     {
//         _obj: 'make',
//         _target: [{ _ref: 'contentLayer' }], // Target for new fill/adjustment layer
//         using: {
//             _obj: 'contentLayer',
//             type: {
//                 _obj: 'solidColorLayer', // Creates a solid color fill layer
//                 color: {                 // Default color, can be customized
//                     _obj: 'RGBColor',
//                     red: 128,
//                     green: 128,
//                     blue: 128
//                 }
//             }
//             // Note: We are not explicitly providing a 'shape' or 'path' descriptor here.
//             // We rely on Photoshop's behavior to use the active path (Work Path)
//             // when creating a new solid color fill layer.
//         },
//         _options: { dialogOptions: 'dontDisplay' }
//     }
// ]
