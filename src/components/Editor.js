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

function Editor() {
    const currentSelection = useSelection();
    const { state, dispatch } = useContext(PluginContext);
    const { creativeConfig } = state;
    const { activeFilters, autoLinkEnabled } = state.editor;
    const { toggleAutoLink, processSelectionChange } = useAutoLink();
    const { selectLayersByName, propagateAsset, propagateMissing, matchStylesByName, selectAllLayers, fixDuplicateSmartObjects } = usePhotoshopActions();
    // console.log('editor using current selection', currentSelection);

    useEffect(() => {
        if (currentSelection) {
            processSelectionChange(currentSelection, activeFilters);
        }
    }, [currentSelection, processSelectionChange, activeFilters]);

    // Handler for toggling filters
    const handleFilterToggle = (type, name, value, isActive) => {
        console.log('toggling filter', type, name, value, isActive);
        if (isActive) {
            // Remove the filter if it's already active
            dispatch({
                type: 'REMOVE_ACTIVE_FILTER',
                payload: { type, name }
            });
        } else {
            // Add the filter if it's not active
            dispatch({
                type: 'ADD_ACTIVE_FILTER',
                payload: { type, name, value }
            });
        }
    };

    // Check if a filter is active
    const isFilterActive = (type, name) => {
        return activeFilters && activeFilters.some(filter =>
            filter.type === type && filter.name === name
        );
    };

    const renderTag = (key, type, name, value, isActive) => {
        return (
            <Tag
                key={key}
                className={`plugin-tag plugin-tag--${type} ${isActive ? 'plugin-tag--active' : ''}`}
                data-type={type}
                data-name={name}
                data-active={isActive.toString()}
                data-filter={value}
                onClick={() => handleFilterToggle(type, key, value, isActive)}
            >
                {(type === 'device' && (key === 'desktop' ?
                    <sp-icon-device-desktop slot="icon" size="s"></sp-icon-device-desktop> :
                    <sp-icon-device-phone slot="icon" size="s"></sp-icon-device-phone>
                ))}

                {key.charAt(0).toUpperCase() + key.slice(1)}
            </Tag>
        )
    }

    // Generate device filter tags based on the creativeConfig
    const renderDeviceFilters = () => {
        if (!creativeConfig || !creativeConfig.devices) return null;
        return Object.entries(creativeConfig.devices).map(([deviceKey, deviceObj]) => {
            const isActive = isFilterActive('device', deviceKey);
            const type = "device"
            return renderTag(deviceKey, type, deviceKey, deviceObj.filter, isActive);
        });
    };

    const renderSequenceFilters = () => {
        if (!creativeConfig || !creativeConfig.devices) return null;
        // Get unique sequence types from all devices
        const sequenceTypes = new Set();
        Object.values(creativeConfig.devices).forEach(deviceObj => {
            if (deviceObj.sequences) {
                Object.keys(deviceObj.sequences).forEach(seq => sequenceTypes.add(seq));
            }
        });
        return Array.from(sequenceTypes).map(seqType => {
            // Use the first device's sequence for the filter value as example
            const deviceKey = Object.keys(creativeConfig.devices)[0];
            const deviceObj = creativeConfig.devices[deviceKey];
            const sequence = deviceObj.sequences && deviceObj.sequences[seqType];
            if (!sequence) return null;
            const isActive = isFilterActive('state', seqType);
            const type = "state"
            return renderTag(seqType, type, seqType, sequence.filter, isActive);
        });
    };

    // Generate filter note text based on active filters
    // const getFilterNote = () => {
    //     if (!activeFilters || activeFilters.length === 0) {
    //         return "Edits are currently unrestricted";
    //     }

    //     const deviceFilters = activeFilters.filter(f => f.type === 'device');
    //     const stateFilters = activeFilters.filter(f => f.type === 'state');

    //     const deviceText = deviceFilters.length > 0
    //         ? `Device: ${deviceFilters.map(f => f.name).join(', ')}`
    //         : '';

    //     const stateText = stateFilters.length > 0
    //         ? `State: ${stateFilters.map(f => f.name).join(', ')}`
    //         : '';

    //     return [deviceText, stateText].filter(t => t !== '').join(' | ');
    // };

    return (
        <div className="plugin-content plugin-flex plugin-flex--column" data-active-menu="editor">
            <div className="plugin-menu" id="editor-menu">
                <div className="plugin-menu-section plugin-flex--no-grow" style={{ minWidth: '350px' }}>
                    <h4 className="plugin-label"><span className={activeFilters.length > 0 ? 'plugin-filter-light plugin-filter-light--on' : 'plugin-filter-light plugin-filter-light--off'}></span>{activeFilters.length > 0 ? 'Actions Filters Active' : 'Actions Filters Inactive'}</h4>
                    <div className="plugin-filters">
                        <div className="plugin-filter-cluster">
                            <FieldLabel for="vertical">
                                These sequences:
                            </FieldLabel>
                            <Tags id="stateFilters" className="plugin-filters plugin-state-filters">
                                {renderSequenceFilters()}
                            </Tags>
                        </div>
                        <div className="plugin-filter-cluster">
                            <FieldLabel for="vertical">
                                For these devices:
                            </FieldLabel>
                            <Tags id="deviceFilters" className="plugin-filters plugin-device-filters">
                                {renderDeviceFilters()}
                            </Tags>
                        </div>
                        {/* <small id="filterNote" className="plugin-filter-note plugin-filter--pillnote">
                            {getFilterNote()}
                        </small> */}
                    </div>
                </div>
                <div className="plugin-menu-section" style={{ minWidth: '250px' }}>
                    <div className="plugin-control-cluster">
                        <h4 className="plugin-label" style={{ marginBottom: '0.5rem' }}>Selection Tools</h4>

                        <ButtonGroup style={{ display: 'flex', alignItems: 'center', alignContent: 'center' }}>
                            <ActionButton id="btnAutoLink" toggles emphasized onClick={toggleAutoLink}>
                                {autoLinkEnabled ? <sp-icon-link slot="icon"></sp-icon-link> : <sp-icon-unlink slot="icon"></sp-icon-unlink>}
                                Auto Link {autoLinkEnabled ? 'Enabled' : 'Disabled'}
                            </ActionButton>
                            <ActionButton emphasized static="secondary" treatment="outline" id="btnSelect" onClick={selectLayersByName}>
                                <sp-icon-layers slot="icon"></sp-icon-layers>
                                Select Layers by Name
                            </ActionButton>
                            <ActionButton emphasized static="secondary" treatment="outline"
                                id="btnSelectAll" onClick={selectAllLayers}>
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
                            <ActionButton emphasized static="secondary" treatment="outline" onClick={matchStylesByName}
                                id="btnMatchStyle">
                                <sp-icon-wrench slot="icon"></sp-icon-wrench>
                                Match Styles By Name
                            </ActionButton>
                            {/* <ActionButton emphasized static="secondary" treatment="outline" id="btnFixSmart"
                                className="--disabled">
                                <sp-icon-wrench slot="icon"></sp-icon-wrench>
                                Replace With Smart Object
                            </ActionButton> */}
                            <ActionButton emphasized static="secondary" treatment="outline"
                                id="btnFixDuplicate" onClick={fixDuplicateSmartObjects}>
                                <sp-icon-wrench slot="icon"></sp-icon-wrench>
                                Fix Duplicate Smart Objects
                            </ActionButton>
                        </ButtonGroup>
                    </div>
                </div>
                {/* <div className="plugin-menu-section">
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
                </div> */}
            </div>
        </div>
    );
}

export default Editor;
