import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@swc-react/button';
import { Dialog } from '@swc-react/dialog';
import { Textfield } from '@swc-react/textfield';
import { FieldLabel } from '@swc-react/field-label';
/**
 * Input Dialog component that allows users to enter text or numeric values.
 * Works with the UXP openDialog utility.
 */
function InputDialog(props) {
    const {
        title = "Input",
        labelText = "Value:",
        defaultValue = "",
        okText = 'OK',
        cancelText = 'Cancel',
        onClose,
        inputType = 'text'
    } = props;

    const [value, setValue] = useState(defaultValue || '');
    const [isValid, setIsValid] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const inputRef = useRef(null);

    // Focus the input field when the dialog opens
    useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => {
                inputRef.current.focus();
            }, 100);
        }
    }, []);

    const validateInput = (val) => {
        if (val === '') {
            setIsValid(false);
            setErrorMessage('This field is required');
            return false;
        }

        if (inputType === 'number') {
            const numValue = parseFloat(val);
            if (isNaN(numValue)) {
                setIsValid(false);
                setErrorMessage('Please enter a valid number');
                return false;
            }
        }

        setIsValid(true);
        setErrorMessage('');
        return true;
    };

    const handleChange = (e) => {
        const newValue = e.target.value;
        console.log("InputDialog - Value changed to:", newValue);
        setValue(newValue);
        validateInput(newValue);
    };

    const handleConfirm = () => {
        if (validateInput(value)) {
            console.log("InputDialog - Confirming with value:", value);
            onClose({ dismissed: false, value });
        }
    };

    const handleCancel = () => {
        console.log("InputDialog - Cancelling dialog");
        onClose({ dismissed: true, value: null });
    };

    // Handle Enter key to confirm and Escape to cancel
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && isValid) {
            e.preventDefault();
            handleConfirm();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    return (
        <Dialog size="s" className="dialog-content dialog-input">
            <h2 slot="heading">{title}</h2>

            <div className="dialog-body">
                <FieldLabel for="dialogInput">{labelText}</FieldLabel>
                <Textfield
                    id="dialogInput"
                    ref={inputRef}
                    value={value}
                    oninput={handleChange}
                    onKeyDown={handleKeyDown}
                    type={inputType}
                    invalid={!isValid}
                    className="dialog-input"
                />

                {!isValid && (
                    <div className="dialog-error">{errorMessage}</div>
                )}
            </div>

            {/* <div slot="footer" className="dialog-footer"> */}
            <Button variant="secondary" treatment="outline" slot="button" onClick={handleCancel}>
                {cancelText}
            </Button>
            <Button treatment="solid" slot="button" onClick={handleConfirm} disabled={!isValid}>
                {okText}
            </Button>
            {/* </div> */}
        </Dialog>
    );
}

export default InputDialog;