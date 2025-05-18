const { core, action, app } = require('photoshop');
const { batchPlay } = action;
import { toggleHistory } from '../helpers/helpers.js';

// Wrapper for modal execution with history and error handling
export async function executeModalAction(actionName, actionFn) {
    try {
        return await core.executeAsModal(async (executionContext) => {
            await toggleHistory(executionContext.hostControl, "suspend", app.activeDocument?.id, actionName);

            try {
                const result = await actionFn(executionContext);
                return result;
            } catch (error) {
                console.error(`Error in "${actionName}" action:`, error);
                return { success: false, error };
            } finally {
                await toggleHistory(executionContext.hostControl, "resume", app.activeDocument?.id);
            }
        }, { commandName: actionName });
    } catch (error) {
        console.error(`Error in "${actionName}" action:`, error);
        return { success: false, error };
    }
}

// Helper for common batch play operations
export async function executeBatchPlay(commands, options = {}) {
    const defaultOptions = {
        synchronousExecution: true,
        modalBehavior: "execute"
    };

    try {
        return await batchPlay(commands, { ...defaultOptions, ...options });
    } catch (error) {
        console.error("BatchPlay error:", error);
        throw error;
    }
}