import React from 'react';
import { showInputDialog, showConfirmationDialog, showAlertDialog, showTransformDialog } from '../utilities/dialogs.js';
import { useCallback } from 'react';

/**
 * Custom hook that provides dialog functionality.
 * This is a simple wrapper around the dialog utility functions.
 */
export function useDialog() {
    // Return the dialog utility functions directly
    return {
        openInputDialog: showInputDialog,
        openConfirmationDialog: showConfirmationDialog,
        openAlertDialog: showAlertDialog,
        closeDialog: () => console.log('No need to explicitly close dialog with utility approach')
    };
}

/**
 * Custom hook for handling transform dialogs (scale, rotate)
 */
export function useTransformDialog() {
    /**
     * Shows a dialog for scale or rotation transformation input
     * @param {string} transformType - The type of transformation ('scale' or 'rotate')
     * @returns {Promise<{dismissed: boolean, value: string|null}>} Result of the dialog
     */
    const showDialog = useCallback(async (transformType) => {
        console.log(`Showing transform dialog for ${transformType}`);
        return await showTransformDialog(transformType);
    }, []);

    return { showTransformDialog: showDialog };
}
