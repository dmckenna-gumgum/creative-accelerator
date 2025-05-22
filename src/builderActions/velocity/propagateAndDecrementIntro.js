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
    const { devices, sourceSequences, sourceStep, destinationSteps, destinationSequences } = buildStep.stepActionScope;
    devices.forEach(deviceName => {
        const device = creativeState.devices[deviceName];
        sourceSequences.forEach(sequenceName => {
            const sequence = device?.sequences?.[sequenceName]
            if (!sequence) return;
            const existingSource = sequence?.artboards?.[0] != undefined ? sequence?.artboards?.[0] : false;
            const sourceName = existingSource ? existingSource.name : replaceStep(sequence.artboardNamePattern, sourceStep);
            const sourceBoard = existingSource ? existingSource.board : findValidGroups(
                activeDoc.layers,
                null,
                buildArtBoardSearchRegex([sourceName])
            )[0];
            if (sourceBoard) {
                const destinationStateSequences = destinationSequences.map(sequence => device.sequences[sequence]);
                console.log('destinationStateSequences: ', destinationStateSequences);
                const destinationNames = destinationStateSequences.flatMap(sequence => destinationSteps.map(step => replaceStep(sequence.artboardNamePattern, step)));
                console.log('destinationNames: ', destinationNames);
                plans.push({
                    deviceName,
                    sequenceName,
                    source: existingSource ? existingSource : { name: sourceName, board: sourceBoard, step: [sourceStep] },
                    destinationSequences: destinationStateSequences,
                    destinations: destinationNames.map(name => ({ name })),
                    sequence
                })

            }

        });
    });

    return plans;
}




async function propagateAndDecrementIntro(buildStep, creativeConfig) {
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
    await centerInViewport(context.createdBoards);
    return {
        success: true,
        message: `Propagated layers to velocity state boards. Instances created: ${context.stats.successfulPropagations}.`,
        payload: context.creativeState,
        count: context.stats.successfulPropagations
    };
}

async function renamePreviousBoards(sequence) {
    const boards = [];
    for (let i = 0; i < sequence.artboards.length; i++) {
        const artboard = sequence.artboards[i];
        const newStep = i + 2;
        const newName = replaceStep(sequence.artboardNamePattern, newStep);//`intro-${newStep}-panel${sequence.abbreviation}`;
        artboard.board.name = artboard.name = newName;
        artboard.step = artboard.step + 1;
        boards.push(artboard);
    }
    return boards;
}

async function executeAllActionPlans(actionPlan, context) {
    for (const plan of actionPlan) {
        const renamedBoards = await renamePreviousBoards(context.creativeState.devices[plan.deviceName].sequences[plan.sequenceName]);
        for (let i = 0; i < plan.destinationSequences.length; i++) {
            const destSequence = plan.destinationSequences[i];
            const step = 1;
            const newBoard = await cloneBoard(plan.source.board, plan.destinations[i].name, step);
            const positionResult = await positionBoard({ board: newBoard, step, deviceName: plan.deviceName });
            plan.destinationSequences[i].artboards.unshift({
                name: newBoard.name,
                board: newBoard,
                step,
            });
            //i'm just storing these so i don't have to make a whole function just to look them all up when i want to center the viewport.
            context.createdBoards.push(newBoard);
            context.stats.successfulPropagations++;
        }
    }
}

async function positionBoard({ board, step, deviceName }) {
    const { xOffset, yOffset } = LAYOUT_CONFIG[deviceName];
    const xMultiplier = step === 1 ? 1 : 1;
    const yMultiplier = step === 1 ? -1 : 1;
    const xOffsetObj = { _unit: "pixelsUnit", _value: xOffset * xMultiplier };
    const yOffsetObj = { _unit: "pixelsUnit", _value: yOffset * yMultiplier };
    return board.translate(xOffsetObj, yOffsetObj);
}


// Export the function as a named export for ES modules
export { propagateAndDecrementIntro };