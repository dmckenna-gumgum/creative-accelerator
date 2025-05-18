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
        case 'CHANGE_SECTION':
            return { ...state, currentSection: action.payload };
        case 'SET_SELECTION':
            return { ...state, currentSelection: action.payload };
        case 'RESET':
            return defaultState;
        default:
            return state;
    }
}