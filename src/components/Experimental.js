import React, { useState, useEffect, useContext } from "react";

import { useSelection } from '../hooks/useSelection.js';
import { useAutoLink } from '../hooks/useAutoLink.js';
import { Button } from '@swc-react/button';
import { ButtonGroup } from '@swc-react/button-group';
import { FieldLabel } from '@swc-react/field-label';
import { Tags, Tag } from '@swc-react/tags';
import { ActionButton } from '@swc-react/action-button';
import { usePhotoshopActions } from '../hooks/usePhotoshopActions.js';
import { PluginContext } from '../contexts/PluginContext.js';



function Experimental() {
    const currentSelection = useSelection();
    const { state, dispatch } = useContext(PluginContext);
    const { creativeConfig } = state;
    const { activeFilters, autoLinkEnabled } = state.editor;
    const { toggleAutoLink, processSelectionChange } = useAutoLink();
    const { captureArtboardState, restoreArtboardState, getKitchenSink, getVectorInfo, setVectorInfo } = usePhotoshopActions();
    // console.log('editor using current selection', currentSelection);

    const handleSaveState = async () => {
        const savedState = await captureArtboardState();
        console.log("(handleSaveState) Saved state:", savedState);
        dispatch({
            type: 'SET_ARTBOARD_STATE',
            payload: savedState
        });
    }

    return (
        <div className="plugin-menu plugin-menu--experimental plugin-flex--flex-column" id="experimental-menu">
            <div className="plugin-menu-section" style={{ minWidth: '250px' }}>
                <div className="plugin-control-cluster">
                    <h4 className="plugin-label" style={{ marginBottom: '0.5rem' }}>State Management</h4>

                    <ButtonGroup style={{ display: 'flex', alignItems: 'center', alignContent: 'center' }}>
                        <ActionButton emphasized static="secondary" treatment="outline" onClick={handleSaveState}
                            id="btnSaveState">
                            <sp-icon-layers slot="icon"></sp-icon-layers>
                            Save State
                        </ActionButton>
                        <ActionButton emphasized static="secondary" treatment="outline" onClick={restoreArtboardState}
                            id="btnRestoreState">
                            <sp-icon-layers slot="icon"></sp-icon-layers>
                            Restore State
                        </ActionButton>

                        <ActionButton emphasized static="secondary" treatment="outline"
                            id="btnSelectAll" onClick={getKitchenSink}>
                            <sp-icon-layers slot="icon"></sp-icon-layers>
                            Kitchen Sink
                        </ActionButton>


                        {/* <ActionButton emphasized static="secondary" treatment="outline"
                            id="btnSelectAll" onClick={getVectorInfo}>
                            <sp-icon-layers slot="icon"></sp-icon-layers>
                            Get Vector
                        </ActionButton>
                        <ActionButton emphasized static="secondary" treatment="outline"
                            id="btnSelectAll" onClick={setVectorInfo}>
                            <sp-icon-layers slot="icon"></sp-icon-layers>
                            Set Vector
                        </ActionButton> */}
                    </ButtonGroup>
                </div>
            </div>
        </div>
    );
}

export default Experimental;
