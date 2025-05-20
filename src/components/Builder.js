import React, { useContext } from "react";
import { Button } from '@swc-react/button';
import { FieldLabel } from '@swc-react/field-label';
import { PluginContext } from '../contexts/PluginContext.js';
import { executeStepAction, executeSubStepAction } from '../builderActions/builderActions.js';
import { BuilderProgressBar } from './BuilderProgressBar.js';

function Builder() {
    const { state, dispatch } = useContext(PluginContext);
    const { creativeConfig } = state;
    const { currentStep, currentStepNum, steps } = state.builder;


    const handleNextStep = async () => {
        const result = await executeStepAction(currentStepNum, dispatch, currentStep, creativeConfig);
        console.log('step results', result);
        if (result.success) {
            dispatch({
                type: 'NEXT_BUILD_STEP',
                payload: { step: currentStepNum, creativeState: result.payload }
            });
        }
    };

    const handleSubStep = async () => {
        const result = await executeSubStepAction(currentStepNum, dispatch, currentStep, creativeConfig);
        console.log('substep results', result);
        if (result.success && result.payload) {
            dispatch({
                type: 'UPDATE_CREATIVE_STATE',
                payload: result.payload
            });
        }
    };

    const handlePrevStep = async () => {
        dispatch({
            type: 'PREV_BUILD_STEP',
            payload: { step: currentStepNum }
        });
    };
    return (
        <div className="plugin-menu plugin-menu--build plugin-flex--flex-column" id="build-menu">
            <div className="plugin-step-section">
                <div className="plugin-progress-component">
                    <h5 className="plugin-step-note"><span className="plugin-step-number">Step {currentStepNum + 1}:  </span><span
                        className="plugin-step-name">{currentStep.title}</span></h5>
                    <BuilderProgressBar
                        currentStep={currentStepNum}
                        totalSteps={steps.length}
                    />
                </div>
            </div>
            <div className="plugin-step-section plugin-step-section--fixed">
                <Button variant="secondary" treatment="outline" className="plugin-step-button" id="btnPrev" onClick={handlePrevStep}>
                    <sp-icon-arrow500 slot="icon" style={{ transform: 'scale(-1,1)' }}></sp-icon-arrow500>
                    Previous
                </Button>
                <p className="plugin-step-text">{currentStep.directions}</p>
                {
                    currentStep.stepActionScope && <div className="plugin-step-sub-ui">
                        <Button static="accent" label="Icon only" icon-only id="btnAddStep" size="xl"
                            className="plugin-sub-step-button" onClick={handleSubStep}>
                            <sp-icon-add slot="icon"></sp-icon-add>
                        </Button>
                        <FieldLabel>Add Another Intro Step</FieldLabel>
                    </div>
                }
                <Button variant="secondary" treatment="outline" className="plugin-step-button" id="btnNext"
                    style={{ flexDirection: 'row-reverse' }} onClick={handleNextStep}>
                    Next
                    <sp-icon-arrow500 slot="icon"
                        style={{ margin: '0 0 0 0.5rem' }}></sp-icon-arrow500>
                </Button>
            </div>
        </div>
    );
}

export default Builder;
