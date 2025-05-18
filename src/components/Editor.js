import React, { useState, useEffect, useContext } from "react";

import { useSelection } from '../hooks/useSelection.js';
import { Button } from '@swc-react/button';
import { ButtonGroup } from '@swc-react/button-group';
import { FieldLabel } from '@swc-react/field-label';
import { Tags, Tag } from '@swc-react/tags';
import { ActionButton } from '@swc-react/action-button';
import { usePhotoshopActions } from '../hooks/usePhotoshopActions.js';

function Editor() {
    const currentSelection = useSelection();

    const { selectLayersByName, propagateAsset, propagateMissing } = usePhotoshopActions();
    // console.log('editor using current selection', currentSelection);
    return (
        <div className="plugin-content plugin-flex plugin-flex--column" data-active-menu="editor">
            <div className="plugin-menu" id="editor-menu">
                <div className="plugin-menu-section plugin-flex--no-grow" style={{ minWidth: '350px' }}>
                    <h4 className="plugin-label">Restrict Edits to:</h4>
                    <div className="plugin-filters">
                        <div className="plugin-filter-cluster">
                            <FieldLabel for="vertical">
                                These sequences:
                            </FieldLabel>
                            <Tags id="stateFilters" className="plugin-filters plugin-state-filters">
                                <Tag className="plugin-tag plugin-tag--state" data-type="state" data-name="intro"
                                    data-active="false" data-filter="intro">Introduction</Tag>
                                <Tag className="plugin-tag plugin-tag--state" data-type="state"
                                    data-name="expanded" data-active="false"
                                    data-filter="expanded">Expanded</Tag>
                                <Tag className="plugin-tag plugin-tag--state" data-type="state"
                                    data-name="collapsed" data-active="false"
                                    data-filter="collapsed">Collapsed</Tag>
                            </Tags>
                        </div>
                        <div className="plugin-filter-cluster">
                            <FieldLabel for="vertical">
                                For these devices:
                            </FieldLabel>
                            <Tags id="deviceFilters" className="plugin-filters plugin-device-filters">
                                <Tag className="plugin-tag plugin-tag--device" data-type="device"
                                    data-name="desktop" data-active="false"
                                    data-filter="dt"><sp-icon-device-desktop slot="icon"
                                        size="s"></sp-icon-device-desktop>Desktop</Tag>
                                <Tag className="plugin-tag plugin-tag--device" data-type="device"
                                    data-name="mobile" data-active="false"
                                    data-filter="mb"><sp-icon-device-phone slot="icon"
                                        size="s"></sp-icon-device-phone>Mobile</Tag>
                            </Tags>
                        </div>
                        <small id="filterNote" className="plugin-filter-note plugin-filter--pillnote">Edits are
                            currently
                            unrestricted</small>
                    </div>
                </div>
                <div className="plugin-menu-section" style={{ minWidth: '250px' }}>
                    <div className="plugin-control-cluster">
                        <h4 className="plugin-label" style={{ marginBottom: '0.5rem' }}>Selection Tools</h4>

                        <ButtonGroup style={{ display: 'flex', alignItems: 'center', alignContent: 'center' }}>
                            <ActionButton id="btnAutoLink" toggles emphasized>Auto Link
                                Disabled</ActionButton>
                            <ActionButton emphasized static="secondary" treatment="outline" id="btnSelect" onClick={selectLayersByName}>
                                <sp-icon-layers slot="icon"></sp-icon-layers>
                                Select Layers by Name
                            </ActionButton>
                            <ActionButton emphasized static="secondary" treatment="outline"
                                id="btnSelectAll">
                                <sp-icon-layers slot="icon"></sp-icon-layers>
                                Select All Layers
                            </ActionButton>
                        </ButtonGroup>
                    </div>
                </div>
                <div className="plugin-menu-section">
                    <div className="plugin-control-cluster">
                        <h4 className="plugin-label" style={{ marginBottom: '0.5rem' }}>Layer Actions</h4>
                        <ButtonGroup>
                            <ActionButton emphasized static="secondary" treatment="outline" onClick={propagateAsset}
                                id="btnDuplicate">
                                <sp-icon-duplicate slot="icon"></sp-icon-duplicate>
                                Propagate Asset(s)
                            </ActionButton>
                            <ActionButton emphasized static="secondary" treatment="outline" id="btnMissing" onClick={propagateMissing}>
                                <sp-icon-wrench slot="icon"></sp-icon-wrench>
                                Fill Missing Asset(s)
                            </ActionButton>
                            <ActionButton emphasized static="secondary" treatment="outline"
                                id="btnMatchStyle">
                                <sp-icon-wrench slot="icon"></sp-icon-wrench>
                                Match Styles By Name
                            </ActionButton>
                            <ActionButton emphasized static="secondary" treatment="outline" id="btnFixSmart"
                                className="--disabled">
                                <sp-icon-wrench slot="icon"></sp-icon-wrench>
                                Replace With Smart Object
                            </ActionButton>
                            <ActionButton emphasized static="secondary" treatment="outline"
                                id="btnFixDuplicate" className="--disabled">
                                <sp-icon-wrench slot="icon"></sp-icon-wrench>
                                Fix Duplicate Smart Objects
                            </ActionButton>
                        </ButtonGroup>
                    </div>
                </div>
                <div className="plugin-menu-section">
                    <div className="plugin-control-cluster --disabled">
                        <h4 className="plugin-label" style={{ marginBottom: '0.5rem' }}>Artboard Actions --- TBD</h4>
                        <ButtonGroup>
                            <ActionButton emphasized static="secondary" treatment="outline"
                                id="btnRemoveSelected">
                                <sp-icon-wrench slot="icon"></sp-icon-wrench>
                                Remove Selected and Reorder
                            </ActionButton>
                        </ButtonGroup>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Editor;
