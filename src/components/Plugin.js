//Adobe Spectrum Web Components
import '@spectrum-web-components/icons-workflow/icons/sp-icon-add.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-duplicate.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-wrench.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-delete.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-link.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-unlink.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-layers.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-maximize.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-rotate-c-w.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-magic-wand.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-edit.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-application-delivery.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-duplicate.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-education.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-device-phone.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-device-desktop.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-beaker.js';
import '@spectrum-web-components/icons-ui/icons/sp-icon-arrow500.js';
import { Theme } from '@swc-react/theme';
import { ButtonGroup } from '@swc-react/button-group';
import { OverlayTrigger } from '@swc-react/overlay';
import { DialogBase } from '@swc-react/dialog';

//React
import React, { useState, useEffect, useRef, useContext, Fragment } from "react";

//Local
import { PluginContext } from '../contexts/PluginContext.js';
import { SelectionProvider } from '../contexts/SelectionContext.js';
import Nav from './Nav.js';
import Editor from "./Editor.js"
import Builder from "./Builder.js";
import Production from "./Production.js";
import Experimental from "./Experimental.js";
import BulkActionBar from "./BulkActionBar.js";
import { getCreativeConfig } from "../constants/creativeConfigs.js";
import { logInitData, addDebugListeners } from '../utilities/utilities.js';

//Photoshop Stuff
const { versions, host, storage } = require('uxp');
const { arch, platform } = require('os');
const { app } = require("photoshop");
const eventDebug = false;
let initlogged = false;

function getManifestOnLoad(dispatch) {
    useEffect(() => {
        const fetchInitialData = async () => {
            dispatch({ type: 'FETCH_DATA_START' });
            try {
                const pluginFolder = await storage.localFileSystem.getPluginFolder();
                const manifestFile = await pluginFolder.getEntry('manifest.json');
                const text = await manifestFile.read();
                if (manifestFile === null) {
                    throw new Error(`Unable to read manifest`);
                }
                const currentPlatform = platform();
                const currentArch = arch();
                const data = JSON.parse(text);
                dispatch({
                    type: 'FETCH_DATA_SUCCESS',
                    payload: {
                        diagnostics: {
                            plugin: { ...data },
                            host: {
                                name: host.name,
                                version: host.version,
                                os: currentPlatform,
                                arch: currentArch
                            },
                            version: {
                                uxp: versions.uxp,
                                photoshop: versions.photoshop,
                                os: currentPlatform,
                                arch: currentArch
                            },
                            file: {
                                fileName: app.activeDocument.name,
                                filePath: app.activeDocument.path,
                            }
                        }
                    }
                });
            } catch (error) {
                console.error("Error fetching initial data:", error);
                dispatch({
                    type: 'FETCH_DATA_ERROR',
                    payload: error.message
                });
            }
        };
        fetchInitialData();
    }, [dispatch]);
}

function Plugin() {
    const { state, dispatch } = useContext(PluginContext);
    const creativeConfig = getCreativeConfig('velocity');
    const initialized = useRef(false);
    getManifestOnLoad(dispatch);

    const onAppInit = (state, isLoaded) => {
        useEffect(() => {
            if (isLoaded && !initialized.current) {
                logInitData(state);
                dispatch({
                    type: 'SET_CREATIVE_CONFIG',
                    payload: creativeConfig
                });
                eventDebug && addDebugListeners();
                initialized.current = true;
            }
        }, [isLoaded, state]);
    }
    onAppInit(state, state.appState === 'loaded');

    const renderSection = () => {
        switch (state.currentSection) {
            case 'builder':
                return <Builder />;
            case 'editor':
                return <Editor />;
            case 'production':
                return <Production />;
            case 'experimental':
                return <Experimental />;
            default:
                return <Builder />;
        }
    };
    return (
        <Theme theme="spectrum" scale="medium" color="darkest">
            <div className="plugin-container">
                <div className="plugin-header">
                    <h2 id="plugin-title" className="plugin-title">{state.currentSection.charAt(0).toUpperCase() + state.currentSection.slice(1)}</h2>
                    <div className="plugin-history" id="buildHistory">
                        <span className="plugin-history-label">Revert To Step:</span>
                        <ButtonGroup id="buildHistoryButtons" size="s"></ButtonGroup>
                    </div>
                </div>
                {state.appState === 'loaded' && (
                    <SelectionProvider>
                        <div className="plugin-main">
                            <Nav />
                            {renderSection()}
                        </div>
                        <BulkActionBar />
                    </SelectionProvider>
                )}
                <OverlayTrigger placement="bottom">
                    <DialogBase underlay className="dialog-container">
                    </DialogBase>
                </OverlayTrigger>
            </div>
        </Theme>
    );
}

export default Plugin;