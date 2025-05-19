let defaultState = {};

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
            // Check if the filter already exists
            const exists = state.editor.activeFilters.some(
                filter => filter.type === action.payload.type && filter.name === action.payload.name
            );

            // If it doesn't exist, add it
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
            return {
                ...state,
                editor: {
                    ...state.editor,
                    activeFilters: []
                }
            };
        case 'RESET':
            return defaultState;
        default:
            return state;
    }
}