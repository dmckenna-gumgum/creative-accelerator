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
import { Theme } from '@swc-react/theme';
import { ButtonGroup } from '@swc-react/button-group';

//React
import React, { useState, useEffect, useRef, useReducer, Fragment } from "react";

//Local
import Nav from './Nav.js';
import Editor from "./Editor.js";
import Builder from "./Builder.js";
import BulkActionBar from "./BulkActionBar.js";
import { getCreativeConfig } from "../constants/creativeConfigs.js";
import { pluginReducer } from '../reducers/pluginReducer.js';
import { initialState } from '../constants/plugin.js';
import { logInitData, addDebugListeners } from '../utilities/utilities.js';

//Photoshop Stuff
const { versions, host, storage } = require('uxp');
const { arch, platform } = require('os');
const { app, action, constants, core } = require("photoshop");
const { LayerKind } = constants;
const eventDebug = false;

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
    const [state, dispatch] = useReducer(pluginReducer, initialState);
    const [creativeState, setCreativeState] = useState(() => getCreativeConfig('velocity'));
    const initialized = useRef(false);
    getManifestOnLoad(dispatch);

    const onAppInit = (state, isLoaded) => {
        useEffect(() => {
            if (isLoaded && !initialized.current) {
                logInitData(state);
                eventDebug && addDebugListeners();
                initialized.current = true;
            }
        }, [isLoaded, state]);
    }
    onAppInit(state, state.appState === 'loaded');

    const handleNavChange = (value) => {
        dispatch({ type: 'CHANGE_SECTION', payload: value });
    };
    return (
        <Theme theme="spectrum" scale="medium" color="darkest">
            <div className="plugin-container">
                <div className="plugin-header">
                    <h2 id="plugin-title" className="plugin-title">Loading...</h2>
                    <div className="plugin-history" id="buildHistory">
                        <span className="plugin-history-label">Revert To Step:</span>
                        <ButtonGroup id="buildHistoryButtons" size="s"></ButtonGroup>
                    </div>
                </div>
                {state.appState === 'loaded' && (
                    <Fragment>
                        <div className="plugin-main">
                            <Nav currentSection={state.currentSection} onSectionChange={handleNavChange} />
                            {state.currentSection === "builder" && <Builder />}
                            {state.currentSection === "editor" && <Editor />}
                        </div>
                        <BulkActionBar />
                    </Fragment>
                )}
            </div>
        </Theme>
    );
}

export default Plugin;