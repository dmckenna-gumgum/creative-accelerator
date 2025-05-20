// src/actions/builderActions.js
import { executeModalAction } from '../utilities/photoshopActionWrapper.js';
import { propagateToVelocityStates } from './velocity/propagateToVelocityStates.js';
import { PropagateToNewDevice } from './velocity/propagateToNewDevice.js';
import { propagateToNewIntroSequence } from './velocity/propagateToNewIntroSequence.js';
import { propagateAndDecrementIntro } from './velocity/propagateAndDecrementIntro.js';

const placeholderFuncion = async (buildStep, creativeConfig) => { return { success: true, message: `testing step ${buildStep.id}`, payload: buildStep, count: 1 } };

// Map of actions for each step
const stepActions = {
    0: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Build Desktop Velocity States", async (context) => {
            return await propagateToVelocityStates(buildStep, creativeConfig);
        });
        return result;
    },

    1: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Build Mobile Rest States", async (context) => {
            return await PropagateToNewDevice(buildStep, creativeConfig);
        });
        return result;
    },

    2: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Build Mobile Velocity States", async (context) => {
            return await propagateToVelocityStates(buildStep, creativeConfig);
        });
        return result;
    },

    3: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Build Desktop Intro Sequence", async (context) => {
            return await propagateToNewIntroSequence(buildStep, creativeConfig);
        });
        return result;
    },

    4: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Build Mobile Intro Sequence", async (context) => {
            return await propagateToNewIntroSequence(buildStep, creativeConfig);
        });
        return result;
    },


    5: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Process Desktop Velocity States", async (context) => {
            return await placeholderFuncion(buildStep, creativeConfig);
        });
        return result;
    },


    6: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Process Desktop Velocity States", async (context) => {
            return await placeholderFuncion(buildStep, creativeConfig);
        });
        return result;
    },


    7: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Process Desktop Velocity States", async (context) => {
            return await placeholderFuncion(buildStep, creativeConfig);
        });
        return result;
    },

    8: async (dispatch, buildStep, creativeConfig) => {
        const result = await executeModalAction("Process Desktop Velocity States", async (context) => {
            return await placeholderFuncion(buildStep, creativeConfig);
        });
        return result;
    },

    // Continue for each step...
};



// Function to execute the action for a specific step
export const executeStepAction = async (stepId, dispatch, buildStep, creativeConfig) => {
    if (stepActions[stepId]) {
        const stepActionResult = await stepActions[stepId](dispatch, buildStep, creativeConfig);
        console.log('executed step action result', stepActionResult);
        return stepActionResult;
    }
    console.warn(`No action defined for step ${stepId}`);
    return null;
};

export const executeSubStepAction = async (stepId, dispatch, buildStep, creativeConfig) => {
    const result = await executeModalAction("Build Intro Substep", async (context) => {
        console.log("running substep", buildStep, creativeConfig, true);
        return await propagateAndDecrementIntro(buildStep, creativeConfig, true);
    });
    return result;
};