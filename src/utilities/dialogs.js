import React from 'react';
import ReactDOM from "react-dom/client";
// import { showDialog } from './openDialog.js';
import InputDialog from '../components/dialogs/InputDialog.js';
import ConfirmationDialog from '../components/dialogs/ConfirmationDialog.js';
import AlertDialog from '../components/dialogs/AlertDialog.js';
/**
 * Shows any React element inside a <dialog>.
 * Returns a Promise that resolves when the dialog is closed.
 *
 * @param {React.ReactElement} jsx - Your dialog's root element.
 * @returns {Promise<{dismissed: boolean, value: string|null}>} Result object with dialog data
 */
export function showDialog(jsx) {
    return new Promise((resolve) => {
        // 1. Create a host <dialog>
        const host = document.createElement("dialog");

        // Make sure we have a valid container
        const container = document.querySelector(".dialog-container") || document.body;
        container.appendChild(host);

        // Add class for styling
        host.className = "uxp-dialog";

        // 2. React-18 root *just* for this dialog
        const root = ReactDOM.createRoot(host);

        function handleClose(data) {
            console.log("Dialog closed with data:", JSON.stringify(data));

            // Ensure we always return a consistent object structure
            const result = data || { dismissed: true, value: null };
            console.log("Dialog result:", JSON.stringify(result));

            // Clean up React and DOM
            root.unmount();   // destroy React tree
            host.remove();    // remove <dialog> from DOM

            // Resolve with the result data
            resolve(result);
        }

        // Clone the element and pass the onClose handler
        const element = React.cloneElement(jsx, { onClose: handleClose });

        // Render the component and show the dialog
        root.render(element);
        host.showModal();
    });
}
/**
 * Show an input dialog and get a value from the user
 * @param {Object} options Dialog options
 * @param {string} options.title Dialog title
 * @param {string} options.labelText Label for the input field
 * @param {string} options.defaultValue Default value for the input
 * @param {string} options.inputType Type of input (text, number, etc)
 * @param {string} options.okText Text for confirm button
 * @param {string} options.cancelText Text for cancel button
 * @returns {Promise<{dismissed: boolean, value: string|null}>} Result object
 */
export async function showInputDialog(options = {}) {
    console.log("Opening input dialog:", options);
    try {
        // Show dialog and wait for result
        const result = await showDialog(
            <InputDialog {...options} />
        );

        return result || { dismissed: true, value: null };
    } catch (error) {
        console.error("Error showing input dialog:", error);
        return { dismissed: true, value: null };
    }
}

/**
 * Show a confirmation dialog with Yes/No buttons
 * @param {Object} options Dialog options
 * @param {string} options.title Dialog title
 * @param {string} options.message Dialog message
 * @param {string} options.okText Text for confirm button
 * @param {string} options.cancelText Text for cancel button
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
export async function showConfirmationDialog(options = {}) {
    console.log("Opening confirmation dialog:", options);
    try {
        // Show dialog and wait for result
        const result = await showDialog(
            <ConfirmationDialog {...options} />
        );

        return result === true;
    } catch (error) {
        console.error("Error showing confirmation dialog:", error);
        return false;
    }
}

/**
 * Show an alert dialog with just an OK button
 * @param {Object} options Dialog options
 * @param {string} options.title Dialog title
 * @param {string} options.message Dialog message
 * @param {string} options.okText Text for confirm button
 * @returns {Promise<void>}
 */
export async function showAlertDialog(options = {}) {
    console.log("Opening alert dialog:", options);
    try {
        // Show dialog
        await showDialog(
            <AlertDialog {...options} />
        );
    } catch (error) {
        console.error("Error showing alert dialog:", error);
    }
}

/**
 * Show a transform dialog for scale or rotate operations
 * @param {string} transformType The type of transform ('scale' or 'rotate')
 * @returns {Promise<{dismissed: boolean, value: string|null}>} Result object
 */
export async function showTransformDialog(transformType) {
    const isScale = transformType === 'scale';

    const options = {
        title: isScale ? 'Scale Layers Additively' : 'Rotate Layers Additively',
        labelText: isScale ? 'Amount (%)' : 'Angle (°)',
        defaultValue: isScale ? '100' : '0',
        inputType: 'number',
        okText: 'Apply',
        cancelText: 'Cancel'
    };

    // Call showInputDialog and grab the result
    const result = await showInputDialog(options);

    // Log the result for debugging
    console.log(`Transform dialog result: ${JSON.stringify(result)}`);

    // Important: ensure we're passing back the expected shape
    return {
        dismissed: result?.dismissed === true,
        value: result?.value || null
    };
}
