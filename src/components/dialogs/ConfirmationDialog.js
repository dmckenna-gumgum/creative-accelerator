import React from 'react';
import { Button } from '@swc-react/button';

/**
 * Confirmation Dialog component for yes/no decisions.
 * Works with the UXP openDialog utility.
 */
function ConfirmationDialog(props) {
    const {
        title = "Confirm",
        message = "Are you sure?",
        okText = 'OK',
        cancelText = 'Cancel',
        onClose
    } = props;

    const handleConfirm = () => {
        console.log("ConfirmationDialog - Confirmed");
        onClose(true);
    };

    const handleCancel = () => {
        console.log("ConfirmationDialog - Cancelled");
        onClose(false);
    };

    // Handle keydown events
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    return (
        <div className="dialog-content dialog-confirmation" onKeyDown={handleKeyDown}>
            <h2 className="dialog-title">{title}</h2>

            <div className="dialog-body">
                <div className="dialog-message">{message}</div>
            </div>

            <div className="dialog-footer">
                <Button variant="secondary" onClick={handleCancel}>
                    {cancelText}
                </Button>
                <Button variant="primary" onClick={handleConfirm} autoFocus>
                    {okText}
                </Button>
            </div>
        </div>
    );
}

export default ConfirmationDialog;
