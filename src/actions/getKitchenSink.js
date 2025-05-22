
import { executeBatchPlay } from '../utilities/photoshopActionWrapper.js';
const bp = require('photoshop').action.batchPlay;
const { app, photoshop } = require('photoshop');
const constants = require('photoshop').constants;
const { core } = require('photoshop');
// const { XMPMeta, XMPConst } = require("uxp").xmp;
// import { DOMParser, XMLSerializer } from "xmldom";

/**
 * dumpLayerState – grab the full “appearance + metadata” package for one layer
 * in a single batchPlay round-trip.
 *
 * @param {number} layerID  – the Ps internal ID of the layer to inspect
 * @return {Object}         – a plain JS object (an ActionDescriptor in JSON)
 */
async function getKitchenSink(layer) {
    const layerID = layer.id;

    /* ----------------------------------------------
     * 1)  Tell Ps which properties we want.
     *    – ‘appearanceProps’ is the same exhaustive list I posted earlier.
     *    – ‘metaProps’ adds the bookkeeping fields you asked for.
     * ---------------------------------------------*/
    const appearanceProps = [
        'layerKind', 'opacity', 'fillOpacity', 'blendMode', 'bounds', 'boundsNoEffects',
        'layerEffects', 'layerFXVisible', 'AGMStrokeStyleInfo', 'AGMFillStyleInfo',
        'vectorMask', 'userMaskEnabled', 'userMaskOptions',
        'vectorMaskDensity', 'vectorMaskFeather',
        'layerMaskDensity', 'layerMaskFeather',
        'smartObject', 'filterFX', 'filterFXEnabled',
        'contentLayer', 'adjustment', 'textKey',
        'animationEffects', 'currentFrame', 'frameDelay',
        'clipping', 'isClippingMask', 'knockout',
        'blendInterior', 'blendFill', 'blendClip', 'blendInteriorElements'
    ];
    const metaProps = [
        /* identity & hierarchy */
        'layerID',          // unique per-document
        'parentLayerID',    // immediate group (-1 on root)
        'parentLayerName',
        'itemIndex',        // Z-order, 1 = top
        'name', 'layerKind', 'layerSection', 'group',

        /* linked-layer & SO relations */
        'linkedLayerIDs',   // array – empty when not linked  (stringID: “linkedLayerIDs”, CharID: "LnkL") :contentReference[oaicite:0]{index=0}
        'smartObject',      // already in appearanceProps but keeps link path etc.

        /* misc bookkeeping */
        'visible', 'color', 'background',
        'layerLocking',     // full lock flags block
        'protected',        // older docs still use this
        'userMaskLinked', 'vectorMaskLinked', 'pathComponents', 'vectorMask',

    ];
    const props = [...appearanceProps, ...metaProps];
    /* ----------------------------------------------
     * 2)  One ‘multiGet’ with an extendedReference
     *     fetches everything in a single call.
     * ---------------------------------------------*/
    const results = await executeBatchPlay(
        [{
            _obj: 'multiGet',
            _target: {
                _ref: [
                    { _ref: "layer", _enum: "ordinal" },
                    { _ref: "document", _enum: "ordinal" }
                ]
            },

            //  [ propertyList , elementSpecifier ]
            extendedReference: [[...props]],

            options: {
                failOnMissingProperty: false,   // quietly skip props not valid for this layer kind
                failOnMissingElement: false
            }
        }],
        { synchronousExecution: true }       // get the result immediately
    );
    // if (layer.kind === constants.LayerKind.SOLIDFILL) {
    try {
        console.log("(getKitchenSink) Getting vector info for layer ID:", layerID);
        const vectorInfo = await getVectorInfo(layer);
        results[0].vectorMask = vectorInfo[0];
    } catch (error) {
        console.error("(getKitchenSink) Error getting vector info:", error);
    }
    // }
    results[0].layerKindName = layer.kind;
    console.log("(getKitchenSink) Results:", results[0]);
    return {
        success: true,
        payload: results[0],
        count: 1,
        message: `Retrieved layer properties for layer ID: ${layerID}`
    };
}

///XMP ENCODING STUFF - WILL IMPLEMENT AS ITS OWN STUFF LATER
/** 1 – read the active document’s XMP block */
// function getDocumentXMP() {
//     return bp(
//         [{
//             _obj: "get",
//             _target: {
//                 _ref: [
//                     { _property: "XMPMetadataAsUTF8" },
//                     { _ref: "document", _enum: "ordinal", _value: "targetEnum" }
//                 ]
//             }
//         }],
//         { synchronousExecution: true }
//     )[0].XMPMetadataAsUTF8;
// }

// function injectArbitraryData(xmpPacket, fragmentXML) {
//     const NS_RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
//     let xmp = new XMPMeta(xml);

//     const xmlData = OBJtoXML(fragmentXML);
//     console.log('xmlData', xmlData);
//     const NS = "http://studio-accelerator/1.0/";
//     const PREFIX = "studio";

//     XMPMeta.registerNamespace(NS, PREFIX);
//     xmp.setProperty(NS, "studiodata", xmlData);
//     return xmp.serialize();
// }

// function OBJtoXML(obj) {
//     var xml = '';
//     for (var prop in obj) {
//         xml += obj[prop] instanceof Array ? '' : "<" + prop + ">";
//         if (obj[prop] instanceof Array) {
//             for (var array in obj[prop]) {
//                 xml += "<" + prop + ">";
//                 xml += OBJtoXML(new Object(obj[prop][array]));
//                 xml += "</" + prop + ">";
//             }
//         } else if (typeof obj[prop] == "object") {
//             xml += OBJtoXML(new Object(obj[prop]));
//         } else {
//             xml += obj[prop];
//         }
//         xml += obj[prop] instanceof Array ? '' : "</" + prop + ">";
//     }
//     var xml = xml.replace(/<\/?[0-9]{1,}>/g, '');
//     return xml
// }


// async function setDocumentXMP(xml) {
//     await core.executeAsModal(async () => {
//         await bp(
//             [{
//                 _obj: "set",
//                 _target: [
//                     { _property: "XMPMetadataAsUTF8" },
//                     { _ref: "document", _enum: "ordinal", _value: "targetEnum" }
//                 ],
//                 to: {
//                     _obj: "XMPMetadataAsUTF8",
//                     XMPMetadataAsUTF8: xml          // the whole string
//                 }
//             }],
//             {}
//         );
//     }, { commandName: "Write XMP data" });
// }

// const writeToXMP = async (data) => {
//     console.log('data', data);
//     const xmp = await getDocumentXMP();
//     const convertedData = OBJtoXML(data);
//     console.log('convertedData', convertedData);
//     const updatedXMP = injectArbitraryData(xmp, convertedData);
//     console.log('updatedXMP', updatedXMP);
//     const result = await setDocumentXMP(updatedXMP);
//     console.log('result', result);
//     return result;
// }

const getVectorInfo = async (layer) => {
    const layerID = layer.id;
    const vectorInfo = await executeBatchPlay(
        [{
            _obj: 'get',
            _target: [
                { _enum: 'path', _ref: 'path', _value: 'vectorMask' },
                { _ref: 'layer', _id: layerID }
            ],
            _options: { dialogOptions: 'dontDisplay' }
        }],
        { synchronousExecution: true }
    );
    console.log("(getVectorInfo) Vector Info:", vectorInfo);
    return vectorInfo;
}

const setVectorInfo = async (layer) => {

    const layerID = layer.id;
    console.log('setting path to:');
    // console.log(...dataHolder.pathContents.pathComponents);
    // if (dataHolder !== null) {

    // console.log("(getVectorInfo) Vector Info To Set:", dataHolder.pathContents);
    // const currentVectorData = await getVectorInfo(layers, false);
    // console.log("(setVectorInfo) Current Vector Data:", currentVectorData);
    // const merged = [...currentVectorData[0].pathContents.pathComponents, ...dataHolder.pathContents.pathComponents];

    // dataHolder.pathContents.pathComponents = merged;
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
    console.log("(setVectorInfo) Results 1:", results1);
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
        to: testPath,
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

const runBp = async (command) => {
    try {
        const results = await bp(command, { modalBehavior: "execute", synchronousExecution: false });
        // console.log("(setVectorInfo) Results:", results);
        return results;
    } catch (error) {
        console.error("(setVectorInfo) Error setting vector info:", error);
    }
}



export { getKitchenSink, getVectorInfo };