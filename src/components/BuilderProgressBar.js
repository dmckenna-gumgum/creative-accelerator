import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

/**
 * A progress bar component that animates between progress states
 * @param {Object} props
 * @param {number} props.currentStep - The current step index
 * @param {number} props.totalSteps - The total number of steps
 */

export const BuilderProgressBar = ({ currentStep, totalSteps }) => {
    const progressBar = useRef();
    const fillRef = useRef();



    useGSAP(() => {
        const fill = fillRef.current;
        if (!fill || totalSteps <= 0) return;
        const currentScale = {
            value: parseFloat(((currentStep) / totalSteps).toFixed(5))
        };
        const targetScale = {
            value: parseFloat(((currentStep + 1) / totalSteps).toFixed(5))
        };
        gsap.to(currentScale, {
            value: targetScale.value,
            duration: 0.6,
            onUpdate: () => {
                fill.style.transform = `scaleX(${currentScale.value})`;
            },
            ease: "circ.inOut",
        });

    }, [currentStep, totalSteps]);

    return (
        <div ref={progressBar} className="plugin-progress-bar">
            <div ref={fillRef} className="plugin-progress-bar-fill"></div>
        </div>
    );
};
