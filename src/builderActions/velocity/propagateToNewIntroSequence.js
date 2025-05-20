// client/js/actions/selectLayersByName.js
const { app, core, constants, action } = require('photoshop');
const { ElementPlacement } = constants;

import { replaceStep, buildArtBoardSearchRegex, getAllBoardsInState } from '../../utilities/utilities.js';
import { executeBatchPlay } from '../../utilities/photoshopActionWrapper.js';
import { findValidGroups, convertAllLayersToSmartObjects, duplicateAndMoveToBottom } from '../../helpers/helpers.js';
import { centerInViewport } from '../../helpers/centerInViewport.js';
import cloneBoard from '../../helpers/cloneBoard.js';
import { LAYOUT_CONFIG } from '../../constants/layoutConfig.js';

function createActionPlans({ buildStep, activeDoc, creativeState, createdBoards }) {
    const plans = [];
    const { devices, sourceSequences, sourceStep, destinationSteps, destinationSequences } = buildStep.advanceActionScope;
    devices.forEach(deviceName => {
        const device = creativeState.devices[deviceName];

        sourceSequences.forEach(sequenceName => {
            const sequence = device?.sequences?.[sequenceName];
            if (!sequence) return;

            //these should be in-state by this step, but just in case, fall back to searching for them in the document.
            const existingSource = sequence?.artboards?.[sourceStep] != undefined ? sequence?.artboards?.[sourceStep] : false;
            const sourceName = existingSource ? existingSource.name : replaceStep(sequence.artboardNamePattern, sourceStep);
            const sourceBoard = existingSource ? existingSource.board : findValidGroups(
                activeDoc.layers,
                null,
                buildArtBoardSearchRegex([sourceName])
            )[0];
            if (sourceBoard) {
                createdBoards.push(sourceBoard);
                const artboardEntry = {
                    name: sourceName,
                    board: sourceBoard,
                    step: [sourceStep]
                }
                const destinationSequence = buildStep.advanceActionScope.destinationSequences.map(sequence => device.sequences[sequence]);
                const destinationNames = destinationSequence.flatMap(sequence => destinationSteps.map(step => replaceStep(sequence.artboardNamePattern, step)));
                console.log('destinationNames: ', destinationNames);
                plans.push({
                    deviceName,
                    sequenceName,
                    source: artboardEntry,
                    destinationSequences: buildStep.advanceActionScope.destinationSequences,
                    destinations: destinationNames.map(name => ({ name })),
                    sequence
                });
                //hard coding the index on these because i want them in the same order they're shown visually in photoshop, it will probably matter for something else at some point maybe?
                // creativeState.devices[deviceName].sequences[sequenceName].artboards.push(artboardEntry);
            }
        });
    });

    return plans;
}


function renamePreviousBoards(sequence) {
    console.log('rename these boards: ', sequence);
    const boards = [];
    for (let i = 0; i < sequence.artboards.length; i++) {
        console.log('i: ', i);
        const artboard = sequence.artboards[i];
        console.log('artboard: ', artboard);
        const newStep = i + 1;
        console.log('newStep: ', newStep);
        const newName = `intro-${newStep}-panel${sequence.abbreviation}`;
        console.log('newName: ', newName);
        artboard.board.name = artboard.name = newName;
        artboard.step = artboard.step + 1;
        boards.push(artboard);
    }
    return boards;
}

async function propagateToNewIntroSequence(buildStep, creativeConfig) {
    const context = {
        activeDoc: app.activeDocument,
        creativeState: { ...creativeConfig },
        buildStep,
        stats: { successfulPropagations: 0 },
        rasterizeText: true,
        rasterizeLayerStyles: false,
        createdBoards: [],
    };
    const actionPlan = createActionPlans(context);
    const result = await executeAllActionPlans(actionPlan, context);
    console.log('creativeState: ', context.creativeState);
    await centerInViewport(context.createdBoards);
    return {
        success: true,
        message: `Propagated layers to velocity state boards. Instances created: ${context.stats.successfulPropagations}.`,
        payload: context.creativeState,
        count: context.stats.successfulPropagations
    };
}

async function executeAllActionPlans(actionPlan, context) {
    console.log('state at time of execution: ', context.creativeState);
    for (const plan of actionPlan) {
        console.log('plan: ', plan);
        for (let i = 0; i < plan.destinations.length; i++) {
            const dest = plan.destinations[i];
            console.log('destination: ', dest);
            const step = 1;
            const newBoard = await cloneBoard(plan.source.board, dest.name, step);
            const positionResult = await positionBoard({ board: newBoard, step, deviceName: plan.deviceName });
            dest.board = newBoard;
            dest.step = step;
            //i'm just storing these so i don't have to make a whole function just to look them all up when i want to center the viewport.
            context.createdBoards.push(newBoard);

            const artboardEntry = {
                name: dest.name,
                board: newBoard,
                step,
            }
            ///pushing this here for the sake of consistency, but it's really only needed in the creativeState so we can save it to the config
            plan.sequence.artboards.push(artboardEntry);
            context.creativeState.devices[plan.deviceName].sequences[plan.destinationSequences[i]].artboards.push(artboardEntry);

            context.stats.successfulPropagations++;
        }
    }
}

async function positionBoard({ board, step, deviceName }) {
    const { xOffset, yOffset } = LAYOUT_CONFIG[deviceName];
    const xMultiplier = step === 1 ? 2.05 : 1;
    const yMultiplier = step === 1 ? 1 : 1;

    const xOffsetObj = { _unit: "pixelsUnit", _value: xOffset * xMultiplier };
    const yOffsetObj = { _unit: "pixelsUnit", _value: yOffset * yMultiplier };

    return board.translate(xOffsetObj, yOffsetObj);
}


// Export the function as a named export for ES modules
export { propagateToNewIntroSequence };