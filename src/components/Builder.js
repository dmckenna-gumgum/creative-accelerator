import React, { useState, useEffect } from "react";
import { Button } from '@swc-react/button';
import { FieldLabel } from '@swc-react/field-label';

function Builder() {

    // Move to next step
    const handleNextStep = () => {
        if (currentStep < totalSteps) {
            handleStepChange(currentStep + 1);
        }
    };

    // Move to previous step
    const handlePrevStep = () => {
        if (currentStep > 1) {
            handleStepChange(currentStep - 1);
        }
    };

    return (
        <div className="plugin-menu plugin-menu--build plugin-flex--flex-column" id="build-menu">
            <div className="plugin-step-section">
                <div className="plugin-progress-component">
                    <h5 className="plugin-step-note"><span className="plugin-step-number">Step 1:</span> <span
                        className="plugin-step-name">Design Desktop Rest States</span></h5>
                    <div className="plugin-progress-bar">
                        <div className="plugin-progress-bar-fill"></div>
                    </div>
                </div>
            </div>
            <div className="plugin-step-section plugin-step-section--fixed">
                <Button variant="secondary" treatment="outline" className="plugin-step-button" id="btnPrev">
                    <sp-icon-arrow500 slot="icon" style={{ transform: 'scale(-1,1)' }}></sp-icon-arrow500>
                    Previous
                </Button>
                <p className="plugin-step-text">Start by building the designs for the rest state of your
                    Velocity. Velocity Ads have two sizes, and each size has two rest states. Once you've
                    completed these four boards click next and I'll convert any remaining raster or text
                    layers to smart objects and move to the next step.</p>
                <div className="plugin-step-sub-ui">
                    <Button static="accent" label="Icon only" icon-only id="btnAddStep" size="xl"
                        className="plugin-sub-step-button">

                    </Button>
                    <FieldLabel>Add Another Intro Step</FieldLabel>
                </div>
                <Button variant="secondary" treatment="outline" className="plugin-step-button" id="btnNext"
                    style={{ flexDirection: 'row-reverse' }}>
                    Next
                    <sp-icon-arrow500 slot="icon"
                        style={{ margin: '0 0.5rem 0 0' }}></sp-icon-arrow500>
                </Button>
            </div>
        </div>
    );
}

export default Builder;
