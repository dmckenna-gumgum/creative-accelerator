// src/actions/builderActions.js
import { executeModalAction } from '../utilities/photoshopActionWrapper.js';
import { propagateToVelocityStates } from './velocity/propagateToVelocityStates.js';

// Map of actions for each step
const stepActions = {
    0: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Process Desktop Rest States", async (context) => {
            await propagateToVelocityStates(buildStep, creativeConfig);
        });
        return result;
    },

    1: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Process Desktop Velocity States", async (context) => {
            // await propagateToVelocityStates(buildStep, creativeState);
        });
        return result;
    },

    // Continue for each step...
};

// Function to execute the action for a specific step
export const executeStepAction = async (stepId, dispatch, buildStep, creativeConfig) => {
    if (stepActions[stepId]) {
        return await stepActions[stepId](dispatch, buildStep, creativeConfig);
    }
    console.warn(`No action defined for step ${stepId}`);
    return null;
};