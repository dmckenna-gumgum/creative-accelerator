import { logInitData } from '../utilities/utilities.js';
let defaultState = {};
import namingConventions from "../constants/namingConventions.js";

export const pluginReducer = (state, action) => {
    switch (action.type) {
        case 'FETCH_DATA_START':
            return { ...state, appState: 'loading' };
        case 'FETCH_DATA_SUCCESS':
            defaultState = action.payload;
            return {
                ...state,
                appState: 'loaded',
                ...action.payload // merge in fetched data
            };
        case 'FETCH_DATA_ERROR':
            return {
                ...state,
                appState: 'error',
                errorMessage: action.payload
            };
        case 'SET_ACTIVE_DOCUMENT':
            return {
                ...state,
                diagnostics: {
                    ...state.diagnostics,
                    file: {
                        fileName: action.payload.fileName,
                        filePath: action.payload.filePath
                    }
                }
            };
        case 'SET_CREATIVE_CONFIG':
            return {
                ...state,
                creativeConfig: action.payload
            };
        case 'CHANGE_SECTION':
            return { ...state, currentSection: action.payload };
        case 'SET_SELECTION':
            return { ...state, currentSelection: action.payload };
        case 'ADD_ACTIVE_FILTER':
            const exists = state.editor.activeFilters.some(
                filter => filter.type === action.payload.type && filter.name === action.payload.name
            );
            if (!exists) {
                return {
                    ...state,
                    editor: {
                        ...state.editor,
                        activeFilters: [...state.editor.activeFilters, action.payload]
                    }
                };
            }
            return state;
        case 'REMOVE_ACTIVE_FILTER':
            return {
                ...state,
                editor: {
                    ...state.editor,
                    activeFilters: state.editor.activeFilters.filter(
                        filter => !(filter.type === action.payload.type && filter.name === action.payload.name)
                    )
                }
            };
        case 'CLEAR_ACTIVE_FILTERS':
            console.log('CLEAR_ACTIVE_FILTERS');
            return {
                ...state,
                editor: {
                    ...state.editor,
                    activeFilters: []
                }
            };
        case 'TOGGLE_AUTOLINK':
            return {
                ...state,
                editor: {
                    ...state.editor,
                    autoLinkEnabled: action.payload
                }
            };
        case 'SET_FILTER_MODE':
            ///what a fucking mess. this is getting taken out asap. 
            console.log('SET_FILTER_MODE', action.payload);
            return {
                ...state,
                filterMode: action.payload,
                creativeConfig: {
                    ...state.creativeConfig,
                    devices: {
                        ...state.creativeConfig.devices,
                        desktop: {
                            ...state.creativeConfig.devices.desktop,
                            filter: namingConventions[action.payload].device.desktop,
                            sequences: {
                                ...state.creativeConfig.devices.desktop.sequences,
                                intro: {
                                    ...state.creativeConfig.devices.desktop.sequences.intro,
                                    filter: namingConventions[action.payload].state.intro
                                },
                                expanded: {
                                    ...state.creativeConfig.devices.desktop.sequences.expanded,
                                    filter: namingConventions[action.payload].state.expanded
                                },
                                collapsed: {
                                    ...state.creativeConfig.devices.desktop.sequences.collapsed,
                                    filter: namingConventions[action.payload].state.collapsed
                                }
                            }
                        },
                        mobile: {
                            ...state.creativeConfig.devices.mobile,
                            filter: namingConventions[action.payload].device.mobile,
                            sequences: {
                                ...state.creativeConfig.devices.mobile.sequences,
                                intro: {
                                    ...state.creativeConfig.devices.mobile.sequences.intro,
                                    filter: namingConventions[action.payload].state.intro
                                },
                                expanded: {
                                    ...state.creativeConfig.devices.mobile.sequences.expanded,
                                    filter: namingConventions[action.payload].state.expanded
                                },
                                collapsed: {
                                    ...state.creativeConfig.devices.mobile.sequences.collapsed,
                                    filter: namingConventions[action.payload].state.collapsed
                                }
                            }
                        }
                    }
                }
            };
        case 'NEXT_BUILD_STEP':
            const nextStepNum = Math.min(action.payload.step + 1, state.builder.steps.length - 1);
            const nextStep = { ...state.builder.steps[nextStepNum] };
            return {
                ...state,
                builder: {
                    ...state.builder,
                    currentStepNum: nextStepNum,
                    currentStep: nextStep,
                },
                creativeConfig: {
                    ...state.creativeConfig,
                    ...action.payload.creativeState
                }
            };
        case 'PREV_BUILD_STEP':
            const prevStepNum = Math.max(action.payload.step - 1, 0);
            const prevStep = { ...state.builder.steps[prevStepNum] };
            console.log(`${prevStepNum} prevStep`, prevStep);
            return {
                ...state,
                builder: {
                    ...state.builder,
                    currentStepNum: prevStepNum,
                    currentStep: prevStep
                }
            };
        case 'SET_BUILD_STEP':
            return {
                ...state,
                builder: {
                    ...state.builder,
                    currentStepNum: action.payload,
                    currentStep: { ...state.builder.steps[action.payload] }
                }
            };
        case 'UPDATE_CREATIVE_STATE':
            return {
                ...state,
                creativeConfig: {
                    ...state.creativeConfig,
                    ...action.payload
                }
            };
        case 'SET_ARTBOARD_STATE':
            console.log("(SET_ARTBOARD_STATE) Artboard state:", action.payload);
            return {
                ...state,
                experimental: {
                    ...state.experimental,
                    artboardState: action.payload
                }
            };
        case 'RESET':
            return defaultState;
        default:
            return state;
    }
}
