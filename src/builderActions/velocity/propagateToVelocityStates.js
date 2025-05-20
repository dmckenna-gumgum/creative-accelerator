const { app, core, constants, action } = require('photoshop');
const { ElementPlacement } = constants;

import { replaceStep, buildArtBoardSearchRegex, getAllBoardsInState } from '../../utilities/utilities.js';
import { executeBatchPlay } from '../../utilities/photoshopActionWrapper.js';
import { findValidGroups, convertAllLayersToSmartObjects } from '../../helpers/helpers.js';
import cloneBoard from '../../helpers/cloneBoard.js';
import { centerInViewport } from '../../helpers/centerInViewport.js';
import { LAYOUT_CONFIG } from '../../constants/layoutConfig.js';

function createActionPlans({ buildStep, activeDoc, creativeState, createdBoards }) {
    const plans = [];
    const { devices, sequences } = buildStep.advanceActionScope;

    devices.forEach(deviceName => {
        const device = creativeState.devices[deviceName];

        sequences.forEach(sequenceName => {
            const sequence = device?.sequences?.[sequenceName];
            if (!sequence) return;

            //find source board that everything will be cloned from
            const sourceName = replaceStep(sequence.artboardNamePattern, buildStep.advanceActionScope.sourceStep);
            const sourceBoard = findValidGroups(
                activeDoc.layers,
                null,
                buildArtBoardSearchRegex([sourceName])
            )[0];

            if (sourceBoard) {
                const destinationNames = buildStep.advanceActionScope.destinationSteps.map(step => replaceStep(sequence.artboardNamePattern, step));
                createdBoards.push(sourceBoard);
                const artboardEntry = {
                    name: sourceName,
                    board: sourceBoard,
                    step: 2
                }
                plans.push({
                    deviceName,
                    sequenceName,
                    source: artboardEntry,
                    destinations: destinationNames.map(name => ({ name })),
                    sequence
                });

                //hard coding the index on these because i want them in the same order they're shown visually in photoshop, it will probably matter for something else at some point maybe?
                creativeState.devices[deviceName].sequences[sequenceName].artboards[2] = artboardEntry;
            }
        });
    });

    return plans;
}


async function propagateToVelocityStates(buildStep, creativeConfig) {
    const context = {
        activeDoc: app.activeDocument,
        creativeState: { ...creativeConfig },
        buildStep,
        stats: { successfulPropagations: 0 },
        rasterizeText: true,
        rasterizeLayerStyles: false,
        createdBoards: []
    };
    const actionPlan = createActionPlans(context);
    const results = await executeAllActionPlans(actionPlan, context);
    //center all boards in viewport
    await centerInViewport(context.createdBoards);
    return {
        success: true,
        message: `Propagated layers to velocity state boards. Instances created: ${context.stats.successfulPropagations}.`,
        payload: context.creativeState,
        count: context.stats.successfulPropagations
    };
}

async function executeAllActionPlans(plans, context) {
    const results = [];

    for (const plan of plans) {
        await convertAllLayersToSmartObjects(plan.source.board, context.rasterizeText, context.rasterizeLayerStyles);
        for (let i = 0; i < plan.destinations.length; i++) {
            const dest = plan.destinations[i];
            const step = i === 0 ? 1 : 3;

            try {
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
                context.creativeState.devices[plan.deviceName].sequences[plan.sequenceName].artboards[step] = artboardEntry;
                context.stats.successfulPropagations++;

            } catch (error) {
                console.error(`Failed to clone ${plan.source.name} to ${dest.name}:`, error);
            }
        }

        results.push(plan);
    }

    return results;
}

async function positionBoard({ board, step, deviceName }) {
    const { xOffset, yOffset } = LAYOUT_CONFIG[deviceName];
    const yMultiplier = step === 1 ? -1 : 1;

    const xOffsetObj = { _unit: "pixelsUnit", _value: xOffset };
    const yOffsetObj = { _unit: "pixelsUnit", _value: yOffset * yMultiplier };

    return board.translate(xOffsetObj, yOffsetObj);
}

export { propagateToVelocityStates };
