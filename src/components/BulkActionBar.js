import '@spectrum-web-components/icons-workflow/icons/sp-icon-add.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-delete.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-link.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-unlink.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-maximize.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-rotate-c-w.js';
import { ActionButton } from '@swc-react/action-button';
import { ActionBar } from '@swc-react/action-bar';

import React, { memo, useEffect, useState } from 'react';
// import { SelectionService } from '../services/SelectionService.js';

function BulkActionBar() {
    // Local state to track selection and button states
    /*
    const [selectionState, setSelectionState] = useState({
        layers: [],
        viable: true,
        type: 'layer',
        identical: true,
        sameGroup: true,
        parentGroupCount: 0
    });

    const [feedbackMessage, setFeedbackMessage] = useState('Initializing...');

    useEffect(() => {
        // Initialize both services
        const selectionServiceInstance = SelectionService.initialize({
            enableListener: true
        });

        // Subscribe to selection changes
        const selectionCallback = (selection) => {
            setSelectionState(selection);

            // Update feedback message based on selection
            if (selection.layers.length === 0) {
                setFeedbackMessage('No layers selected');
            } else if (!selection.viable) {
                setFeedbackMessage(`Selection not viable for operations`);
            } else {
                setFeedbackMessage(`${selection.layers.length} ${selection.type}(s) selected`);
            }
        };

        selectionServiceInstance.subscribe(selectionCallback);

        // Clean up on component unmount
        return () => {
            selectionServiceInstance.unsubscribe(selectionCallback);
            SelectionService.destroy();
        };
    }, []);

    // Handle link button click
    const handleLinkClick = async () => {
    };

    // Handle unlink button click
    const handleUnlinkClick = async () => {
    };

    // Toggle auto-link feature
    const toggleAutoLink = async () => {
    };
    */

    return (
        <ActionBar id="action-bar" open className="plugin-action-bar selection-same-groups">
            <p id="feedback" className="plugin-action-bar-feedback">Loading...</p>
            <ActionButton slot="buttons" id="btnLink" className="action-bar-btn --layers" label="Link">
                <sp-icon-link slot="icon"></sp-icon-link>
                Link
            </ActionButton>
            <ActionButton slot="buttons" id="btnUnlink" className="action-bar-btn --layers" label="Unlink">
                <sp-icon-unlink slot="icon"></sp-icon-unlink>
                Unlink
            </ActionButton>
            <ActionButton slot="buttons" id="btnScale" className="action-bar-btn --layers" label="Scale">
                <sp-icon-maximize slot="icon"></sp-icon-maximize>
                Scale
            </ActionButton>
            <ActionButton slot="buttons" id="btnRotate" className="action-bar-btn --layers" label="Rotate">
                <sp-icon-rotate-c-w slot="icon"></sp-icon-rotate-c-w>
                Rotate
            </ActionButton>
            <ActionButton slot="buttons" id="btnDeleteSelected" className="action-bar-btn --layers --artboards"
                label="Delete Selected">
                <sp-icon-delete slot="icon"></sp-icon-delete>
                Delete
            </ActionButton>
            <ActionButton slot="buttons" id="btnClonePrev" className="action-bar-btn --artboards"
                label="Clone Decrement">
                <sp-icon-add slot="icon"></sp-icon-add>
                Clone Decrement
            </ActionButton>
            <ActionButton slot="buttons" id="btnCloneNext" className="action-bar-btn --artboards"
                label="Clone Increment">
                <sp-icon-add slot="icon"></sp-icon-add>
                Clone Increment
            </ActionButton>
        </ActionBar>
    );
}

export default memo(BulkActionBar);