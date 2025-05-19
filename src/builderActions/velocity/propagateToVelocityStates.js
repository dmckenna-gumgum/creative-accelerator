// client/js/actions/selectLayersByName.js
const { app, core, constants, action } = require('photoshop');
const { batchPlay } = action;
const { ElementPlacement } = constants;

import { replaceStep, buildArtBoardSearchRegex, findInArray, pickProps } from '../../utilities/utilities.js';
import { findValidGroups, toggleHistory, duplicateBoardToBoard, convertAllLayersToSmartObjects, moveBoardAndGuide, getGuidesForFrame, getArtboardFrame } from '../../helpers/helpers.js';

const rasterizeText = true;
const rasterizeLayerStyles = false;

async function centerInViewport(layers) {
    const layerIds = layers.map(layer => layer.id);
    console.log("(Modal Action) Centering in viewport:", layerIds);
    const commands = [
        {
            "_obj": "select",
            "_target": [
                {
                    "_name": layers[0].name,
                    "_ref": "layer"
                }
            ],
            "layerID": [...layerIds],
            "makeVisible": false,
            "selectionModifier": {
                "_enum": "selectionModifierType",
                "_value": "addToSelectionContinuous"
            }
        },
        {
            "_obj": "select",
            "_target": [
                {
                    "_ref": '$Mn ',
                    "_enum": '$FtOn',
                    "_value": 'fitLayersOnScreen',
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
    await batchPlay(commands, {});
}

function sortArtboardsByStep(configs) {
    return configs.map(config => ({
        ...config,
        sequences: config.sequences.map(sequence => ({
            ...sequence,
            artboards: sequence.artboards
                .slice()
                .sort((a, b) => a.step - b.step)
        }))
    }));
}

async function cloneAndPositionArtboard(route) {
    try {
        const clonedBoards = [];
        for (let i = 0; i < route.destinationNames.length; i++) {
            try {
                const destinationName = route.destinationNames[i];
                const multiplier = (i & 1) ? -1 : 1;
                let xOffsetPct = { _unit: "pixelsUnit", _value: route.step > 0 ? route.device === 'desktop' ? -2020 : -960 : route.device === 'desktop' ? -2020 : -960 };
                let yOffsetPct = { _unit: "pixelsUnit", _value: route.step === 0 ? route.device === 'desktop' ? 817 * multiplier : 617 * multiplier : route.device === 'desktop' ? -817 * multiplier : -617 * multiplier };
                // const boardFrame = await getArtboardFrame(route.sourceBoard);
                // const existingGuides = await getGuidesForFrame(boardFrame);
                const newBoard = await route.sourceBoard.duplicate(route.sourceBoard, multiplier > 0 ? ElementPlacement.PLACEBEFORE : ElementPlacement.PLACEAFTER, destinationName);
                //const newGuides = await cloneGuidesForFrame(route.sourceBoard);
                // logger.log("new guides created:", newGuides);
                newBoard.translate(xOffsetPct, yOffsetPct);
                // await moveBoardAndGuide(newBoard, xOffsetPct, yOffsetPct, existingGuides);

                clonedBoards.push(newBoard);
                const index = i === 0 ? 1 : 3;
                route.sequenceState.artboards.push({
                    name: destinationName,
                    id: newBoard.id,
                    step: index,
                    board: newBoard
                });
                route.destinationBoards.push(newBoard);
            } catch (error) {
                console.error("(Modal Action) Error moving new board:", error);
            }
        }
        return { boards: clonedBoards, state: route.sequenceState };
    } catch (error) {
        console.error("(Modal Action) Error cloning and positioning artboard:", error);
        return [];
    }
}

function pickByName(arr, names) {
    return arr.filter(({ name }) => names.includes(name));
}

function pickSequences(data, devices, types) {
    return data
        .filter(({ device }) => devices.includes(device))
        .flatMap(item => {
            const currentDevice = item.device;
            return item.sequenceTypes
                .filter(({ name }) => types.includes(name))
                .map(sequence => ({
                    ...sequence,
                    device: currentDevice
                }));
        });
}

const propagateOnly = false;

async function propagateToVelocityStates(buildStep, creativeConfig) {

    // const sequencesToEdit = deviceTypes.map((device) => device.sequences).map(seq => pickProps(seq, action.sequences));
    // ////i'm building these actionRoutes to nomalize the data structure when sending commands to photoshop action functions
    // sequencesToEdit.forEach((sequenceTypes) => {
    //     for (const sequenceType in sequenceTypes) {
    //         const sequence = sequenceTypes[sequenceType];
    //         const sourceName = replaceStep(sequence.artboardNamePattern, 2);
    //         const sourceBoard = findValidGroups(activeDoc.layers, null, buildArtBoardSearchRegex([sourceName]))[0];
    //         const endNames = [replaceStep(sequence.artboardNamePattern, 1), replaceStep(sequence.artboardNamePattern, 3)];///clunky and does not allow for more boards yet. should revisit if that changes on the studio side.                      
    //         ///push the existing artboard into the artboards array for this device-sequenceType property
    //         sequence.artboards.push({
    //             name: sourceName,
    //             id: sourceBoard.id,
    //             step: 2,
    //             board: sourceBoard
    //         });
    //         actionRoutes.push({
    //             name: sequence.name,
    //             device: sequence.device,
    //             sourceName: sourceName,
    //             sourceBoard: sourceBoard,
    //             destinationNames: endNames,
    //             destinationBoards: [],
    //             sequenceState: sequence
    //         });
    //     }
    // });
    console.log('(Propagate To Velocity States) Build Step:', buildStep);
    console.log('(Propagate To Velocity States) Creative Config:', creativeConfig);

    /*
    const actionRoutes = [];
    let successfulPropagations = 0;
    for (const route of actionRoutes) {
        try {
            if (!propagateOnly) {
                const result = await convertAllLayersToSmartObjects(route.sourceBoard, rasterizeText, rasterizeLayerStyles);
                logger.debug("Convert and Rasterize Result:", result);
            }
            const { state, boards } = await cloneAndPositionArtboard(route);
            state.artboards = state.artboards.sort((a, b) => a.step - b.step);
            creativeState[state.device].sequences[state.name] = state;
            successfulPropagations += boards.length;

        } catch (error) {
            console.error(`Error converting or duplicating layers on ${sourceBoard.name}: ${error.message}`);
        }
    }
    try {
        const allDestinationBoards = actionRoutes.flatMap(o => o.destinationBoards);
        logger.debug("All Destination Boards:", allDestinationBoards);
        await centerInViewport(allDestinationBoards);
    } catch (error) {
        console.error("(Modal Action) Error centering cloned boards:", error);
    }
    logger.debug("Return State:", creativeState);
    let message = `Propagated layers to velocity state boards. Instances created: ${successfulPropagations}.`;
    */
    const message = 'testing';
    const payload = { test: 'test' };
    const count = 0;
    return { success: true, message: message, payload: payload, count: count };
}

// Export the function as a named export for ES modules
export { propagateToVelocityStates };
