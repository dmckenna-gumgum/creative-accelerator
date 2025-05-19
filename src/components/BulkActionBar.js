import '@spectrum-web-components/icons-workflow/icons/sp-icon-add.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-delete.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-link.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-unlink.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-maximize.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-rotate-c-w.js';
import React, { memo } from 'react';
import { useSelection } from '../hooks/useSelection.js';

import { ActionButton } from '@swc-react/action-button';
import { ActionBar } from '@swc-react/action-bar';
import { usePhotoshopActions } from '../hooks/usePhotoshopActions.js';

const BulkActionBar = memo(function BulkActionBar() {
    const { linkSelectedLayers, unlinkSelectedLayers, scaleSelectedLayers, rotateSelectedLayers } = usePhotoshopActions();
    const currentSelection = useSelection();
    let feedbackMessage;
    let actionBarClasses;
    const isOpen = currentSelection.active && currentSelection.layers.length > 0;
    if (isOpen) {
        switch (currentSelection.type) {
            case 'group':
                feedbackMessage = `<span class='plugin-action-bar-pill'>${currentSelection.layers.length} Artboard${currentSelection.layers.length === 1 ? '' : 's'}</span> selected`;
                actionBarClasses = currentSelection.parentGroupCount.size === 1 ? 'selection-same-groups group-selection' : 'selection-many-groups group-selection';
                break;
            case 'layer':
                feedbackMessage = `<span class='plugin-action-bar-pill'>${currentSelection.layers.length} Layer${currentSelection.layers.length === 1 ? '' : 's'}</span> selected ${currentSelection.parentGroupCount.size === 1 ? ('In The <span class="plugin-action-bar-pill">Same Artboard</span>') : (`Across <span class='plugin-action-bar-pill'>${currentSelection.parentGroupCount.size} Artboards</span>`)}`;
                actionBarClasses = currentSelection.parentGroupCount.size === 1 ? 'selection-same-groups' : 'selection-many-groups';
                break;
            case 'mixed':
                feedbackMessage = `You've currently selected an artboard, or a mix of artboards and layers. Performing bulk actions on artboards is not supported`;
                actionBarClasses = 'mixed-selection';
                break;
            default:
                feedbackMessage = 'No layers selected';
                actionBarClasses = 'selection-same-groups';
        }
    }

    return (
        <ActionBar id="action-bar" open={isOpen} className={`plugin-action-bar ${actionBarClasses}`}>
            <p id="feedback" className="plugin-action-bar-feedback" dangerouslySetInnerHTML={{ __html: feedbackMessage }}></p>
            <ActionButton slot="buttons" id="btnLink" className="action-bar-btn --layers" label="Link" onClick={linkSelectedLayers}>
                <sp-icon-link slot="icon"></sp-icon-link>
                Link
            </ActionButton>
            <ActionButton slot="buttons" id="btnUnlink" className="action-bar-btn --layers" label="Unlink" onClick={unlinkSelectedLayers}>
                <sp-icon-unlink slot="icon"></sp-icon-unlink>
                Unlink
            </ActionButton>
            <ActionButton slot="buttons" id="btnScale" className="action-bar-btn --layers" label="Scale" onClick={scaleSelectedLayers}>
                <sp-icon-maximize slot="icon"></sp-icon-maximize>
                Scale
            </ActionButton>
            <ActionButton slot="buttons" id="btnRotate" className="action-bar-btn --layers" label="Rotate" onClick={rotateSelectedLayers}>
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
});

export default BulkActionBar;