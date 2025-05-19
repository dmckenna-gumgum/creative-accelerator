// Dialog types
export const DIALOG_TYPES = {
    INPUT: 'input',
    CONFIRMATION: 'confirmation',
    ALERT: 'alert'
};

// Initial state for the dialog
const initialState = {
    isOpen: false,
    type: null,
    title: '',
    message: '',
    labelText: '',
    defaultValue: '',
    okText: 'OK',
    cancelText: 'Cancel',
    onConfirm: () => { },
    onCancel: () => { },
    inputType: 'text' // Can be 'text', 'number', etc.
};

export { initialState };