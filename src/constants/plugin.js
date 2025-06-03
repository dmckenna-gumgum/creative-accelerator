import buildStepConfig from "./buildSteps.js"
const defaultBuildStep = 0;

const initialState = {
    currentSection: "editor", //"editor", "builder", "experimental", eventually..."production"
    appState: 'unloaded', // 'unloaded', 'loading', 'loaded', 'error'
    errorMessage: '',
    creativeConfig: null, // Will store the currently loaded creative config at top level
    currentSelection: {
        layers: [],
        type: 'layer',
        viable: true,
        identical: true,
        sameGroup: true,
        parentGroupCount: 0,
        active: false
    },
    editor: {
        activeFilters: [],
        autoLinkEnabled: false
    },
    builder: {
        currentStepNum: defaultBuildStep,
        currentStep: buildStepConfig[defaultBuildStep],
        steps: buildStepConfig,

    },
    production: {},
    experimental: {
        artboardState: null
    },
    diagnostics: {}
}

export { initialState };
