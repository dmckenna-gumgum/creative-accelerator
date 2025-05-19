import React from 'react';
import { Button } from '@swc-react/button';

/**
 * Alert Dialog component for simple notifications with only an OK button.
 * Works with the UXP openDialog utility.
 */
function AlertDialog(props) {
    const {
        title = "Alert",
        message = "",
        okText = 'OK',
        onClose
    } = props;

    const handleConfirm = () => {
        console.log("AlertDialog - Confirmed");
        onClose();
    };

    // Handle keydown events
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            handleConfirm();
        }
    };

    return (
        <div className="dialog-content dialog-alert" onKeyDown={handleKeyDown}>
            <h2 className="dialog-title">{title}</h2>

            <div className="dialog-body">
                <div className="dialog-message">{message}</div>
            </div>

            <div className="dialog-footer">
                <Button variant="primary" onClick={handleConfirm} autoFocus>
                    {okText}
                </Button>
            </div>
        </div>
    );
}

export default AlertDialog;