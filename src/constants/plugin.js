const initialState = {
    currentSection: "builder",
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
    },
    builder: {},
    production: {},
    diagnostics: {}
}

export { initialState };
