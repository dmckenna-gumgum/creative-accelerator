import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import React from 'react';
import InputDialog from '../components/dialogs/InputDialog.js';
import ConfirmationDialog from '../components/dialogs/ConfirmationDialog.js';
import AlertDialog from '../components/dialogs/AlertDialog.js';

const fs = require('uxp').storage.localFileSystem;

/**
 * UXP Dialog Manager - Handles the creation and rendering of React components 
 * inside native UXP dialogs
 */
class UXPDialogManager {
    constructor() {
        this.activeDialogs = {};
    }

    /**
     * Initialize the dialog manager
     */
    async initialize() {
        console.log('Initializing UXP Dialog Manager');

        // Pre-create dialog elements in the DOM
        this.createDialogElements();
        return true;
    }

    /**
     * Creates all the dialog DOM elements needed
     */
    createDialogElements() {
        const dialogs = [
            { id: 'inputDialogContainer', type: 'input' },
            { id: 'confirmationDialogContainer', type: 'confirmation' },
            { id: 'alertDialogContainer', type: 'alert' }
        ];

        // Create dialog elements if they don't exist
        for (const dialog of dialogs) {
            if (!document.getElementById(dialog.id)) {
                // Create dialog element
                const dialogEl = document.createElement('dialog');
                dialogEl.id = dialog.id;
                dialogEl.className = 'uxp-dialog';

                // Create root element for React to render into
                const rootEl = document.createElement('div');
                rootEl.id = `${dialog.type}-dialog-root`;
                dialogEl.appendChild(rootEl);

                // Add dialog to the document
                document.body.appendChild(dialogEl);
                console.log(`Created ${dialog.id} element`);
            }
        }
    }

    /**
     * Shows an input dialog with React content
     * @param {Object} options Dialog options
     * @returns {Promise<{dismissed: boolean, value: any}>}
     */
    async showInputDialog(options) {
        return this.showDialog('input', InputDialog, options);
    }

    /**
     * Shows a confirmation dialog with React content
     * @param {Object} options Dialog options
     * @returns {Promise<boolean>}
     */
    async showConfirmationDialog(options) {
        return this.showDialog('confirmation', ConfirmationDialog, options);
    }

    /**
     * Shows an alert dialog with React content
     * @param {Object} options Dialog options
     * @returns {Promise<void>}
     */
    async showAlertDialog(options) {
        return this.showDialog('alert', AlertDialog, options);
    }

    /**
     * Shows a dialog with React content
     * @param {string} type Type of dialog ('input', 'confirmation', 'alert')
     * @param {React.Component} Component React component to render
     * @param {Object} options Dialog options
     * @returns {Promise<any>}
     */
    async showDialog(type, Component, options) {
        try {
            // Get dialog element
            const dialogId = `${type}DialogContainer`;
            const dialog = document.getElementById(dialogId);

            if (!dialog) {
                console.error(`Dialog element #${dialogId} not found`);
                return { dismissed: true, value: null };
            }

            // Get root element
            const rootId = `${type}-dialog-root`;
            const root = dialog.querySelector(`#${rootId}`);

            if (!root) {
                console.error(`Root element #${rootId} not found in dialog`);
                return { dismissed: true, value: null };
            }

            // Return a Promise that resolves when the dialog is closed
            return new Promise((resolve) => {
                // Create dialog result handlers
                const dialogOptions = {
                    ...options,
                    onConfirm: (value) => {
                        console.log(`${type} dialog confirmed:`, value);
                        this.closeDialog(type, dialog, root);
                        if (type === 'confirmation') {
                            resolve(true);
                        } else if (type === 'alert') {
                            resolve();
                        } else {
                            resolve({ dismissed: false, value });
                        }
                    },
                    onCancel: () => {
                        console.log(`${type} dialog cancelled`);
                        this.closeDialog(type, dialog, root);
                        if (type === 'confirmation') {
                            resolve(false);
                        } else {
                            resolve({ dismissed: true, value: null });
                        }
                    }
                };

                // Try to load the DialogWrapper component
                try {
                    // Use a dynamic import for the DialogWrapper
                    import('../components/dialogs/DialogWrapper.js').then(module => {
                        const DialogWrapper = module.default;

                        // Render with wrapper
                        ReactDOM.render(
                            <DialogWrapper
                                dialogType={type}
                                isOpen={true}
                            >
                                <Component {...dialogOptions} />
                            </DialogWrapper>,
                            root
                        );

                        // Show the dialog
                        dialog.showModal();
                        console.log(`${type} dialog opened with wrapper`);

                        // Handle keyboard events
                        this.setupKeyboardHandling(type, dialog, dialogOptions);
                    }).catch(error => {
                        // Fallback if DialogWrapper can't be loaded
                        console.warn("Error loading DialogWrapper:", error);
                        this.renderWithoutWrapper(type, Component, dialogOptions, root, dialog, resolve);
                    });
                } catch (error) {
                    // Fallback for environments where dynamic imports aren't supported
                    console.warn("Dynamic import not supported:", error);
                    this.renderWithoutWrapper(type, Component, dialogOptions, root, dialog, resolve);
                }
            });
        } catch (error) {
            console.error(`Error showing ${type} dialog:`, error);
            return type === 'confirmation' ? false : { dismissed: true, value: null };
        }
    }

    /**
     * Renders a component without the DialogWrapper (fallback)
     */
    renderWithoutWrapper(type, Component, dialogOptions, root, dialog, resolve) {
        // Render directly without wrapper
        ReactDOM.render(
            <Component {...dialogOptions} />,
            root
        );

        // Show the dialog
        dialog.showModal();
        console.log(`${type} dialog opened (without wrapper)`);

        // Handle keyboard events
        this.setupKeyboardHandling(type, dialog, dialogOptions);
    }

    /**
     * Sets up keyboard event handling for dialog
     */
    setupKeyboardHandling(type, dialog, dialogOptions) {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                document.removeEventListener('keydown', handleKeyDown);
                dialogOptions.onCancel();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        // Store active dialog
        this.activeDialogs[type] = {
            dialog,
            handleKeyDown,
            onCancel: dialogOptions.onCancel
        };
    }

    /**
     * Closes a dialog and cleans up resources
     * @param {string} type Type of dialog
     * @param {HTMLElement} dialog Dialog element
     * @param {HTMLElement} root Root element for React
     */
    closeDialog(type, dialog, root) {
        try {
            // Unmount React component
            ReactDOM.unmountComponentAtNode(root);

            // Close dialog
            dialog.close();

            // Remove event listener
            if (this.activeDialogs[type]?.handleKeyDown) {
                document.removeEventListener('keydown', this.activeDialogs[type].handleKeyDown);
            }

            // Remove from active dialogs
            delete this.activeDialogs[type];

            console.log(`${type} dialog closed`);
        } catch (error) {
            console.error(`Error closing ${type} dialog:`, error);
        }
    }
}

// Create a singleton instance
const dialogManager = new UXPDialogManager();

export default dialogManager;
