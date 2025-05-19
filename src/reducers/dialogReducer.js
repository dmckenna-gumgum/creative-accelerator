export const dialogReducer = (state, action) => {
    switch (action.type) {
        case 'OPEN_DIALOG':
            return {
                ...state,
                isOpen: true,
                ...action.payload
            };
        case 'CLOSE_DIALOG':
            return {
                ...state,
                isOpen: false
            };
        default:
            return state;
    }
}