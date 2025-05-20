// client/js/actions/selectLayersByName.js
const { app, core, constants, action } = require('photoshop');
const { ElementPlacement } = constants;

import { replaceStep, buildArtBoardSearchRegex, getAllBoardsInState } from '../../utilities/utilities.js';
import { executeBatchPlay } from '../../utilities/photoshopActionWrapper.js';
import { findValidGroups, convertAllLayersToSmartObjects, duplicateAndMoveToBottom } from '../../helpers/helpers.js';
import cloneBoard from '../../helpers/cloneBoard.js';
import { centerInViewport } from '../../helpers/centerInViewport.js';
import { LAYOUT_CONFIG } from '../../constants/layoutConfig.js';

function createActionPlans({ buildStep, activeDoc, creativeState, createdBoards }) {
    const plans = [];
    const { devices, sequences } = buildStep.advanceActionScope;
    const fromDevice = creativeState.devices[buildStep.advanceActionScope.from];
    console.log(fromDevice);
    const toDevices = buildStep.advanceActionScope.to.map(deviceName => creativeState.devices[deviceName]);
    toDevices.forEach(device => {
        sequences.forEach(sequenceName => {
            try {
                const sequence = device?.sequences?.[sequenceName];
                if (!sequence) return;
                //find source board that everything will be cloned from
                const sourceName = replaceStep(fromDevice.sequences[sequenceName].artboardNamePattern, buildStep.advanceActionScope.sourceStep);
                const sourceBoard = findValidGroups(
                    activeDoc.layers,
                    null,
                    buildArtBoardSearchRegex([sourceName])
                )[0];
                if (sourceBoard) {
                    const sourceEntry = {
                        name: sourceName,
                        board: sourceBoard,
                        step: 2
                    }
                    ///////for now, the starting mobile boards will already exist in the PSD but eventually I'll create them instead. Need to figure out the guide duplication logic first.
                    // Generate the names for the destination boards, this needs to be improved because we can't assume they'll only be 1 and 3 boards. 
                    const destinationNames = buildStep.advanceActionScope.destinationSteps.map(step => replaceStep(sequence.artboardNamePattern, step));
                    const destinationBoards = findValidGroups(
                        activeDoc.layers,
                        null,
                        buildArtBoardSearchRegex(destinationNames)
                    );
                    const destinationEntries = destinationBoards.map(board => {
                        return {
                            name: destinationNames.shift(),
                            board,
                            step: 2
                        }
                    });
                    //hard coding the index on these because i want them in the same order they're shown visually in photoshop, it will probably matter for something else at some point maybe?
                    sequence.artboards = [...destinationEntries];
                    createdBoards.push(...destinationEntries.map(entry => { return { name: entry.name, id: entry.board.id } }));
                    plans.push({
                        device,
                        sequence,
                        source: sourceEntry,
                        destinations: destinationEntries,
                        sequence
                    });
                }
            } catch (error) {
                console.error(`Failed to create action plan for ${deviceName} ${sequenceName}:`, error);
            }
        });
    });

    return plans;
}

async function PropagateToNewDevice(buildStep, creativeConfig) {
    const context = {
        activeDoc: app.activeDocument,
        creativeState: { ...creativeConfig },
        buildStep,
        stats: { successfulPropagations: 0 },
        rasterizeText: true,
        rasterizeLayerStyles: false,
        createdBoards: []
    };
    const actionPlans = createActionPlans(context);
    await executeAllActionPlans(actionPlans, context);
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
        console.log(plan, 'passing to converter: ', plan.source.board, context.rasterizeText, context.rasterizeLayerStyles);
        await convertAllLayersToSmartObjects(plan.source.board, context.rasterizeText, context.rasterizeLayerStyles);

        for (let i = 0; i < plan.destinations.length; i++) {
            const dest = plan.destinations[i];
            for (const sourceLayer of plan.source.board.layers) {
                const targetContainer = dest.board;
                await duplicateAndMoveToBottom(sourceLayer, targetContainer, 0);
                targetContainer.visible = true;
                targetContainer.selected = true;
                context.stats.successfulPropagations++;
            }
        }

        results.push(plan);

    }

    return results;
}

// Export the function as a named export for ES modules
export { PropagateToNewDevice };
