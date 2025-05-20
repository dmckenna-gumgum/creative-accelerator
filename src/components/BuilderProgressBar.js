import React, { useEffect } from 'react';

/**
 * A progress bar component that animates between progress states
 * @param {Object} props
 * @param {number} props.currentStep - The current step index
 * @param {number} props.totalSteps - The total number of steps
 */
export const BuilderProgressBar = ({ currentStep, totalSteps }) => {
    useEffect(() => {
        // Get progress bar fill element
        const fill = document.querySelector('.plugin-progress-bar-fill');
        if (!fill) return;

        // Calculate target percentage
        const targetWidth = ((currentStep + 1) / totalSteps) * 100;

        // Get current width
        const currentWidth = parseFloat(fill.style.width || '0');

        // Animation variables
        let start = null;
        let rafId = null;

        // Animation function
        function animate(timestamp) {
            if (!start) start = timestamp;
            const elapsed = timestamp - start;
            const duration = 300;
            const progress = Math.min(elapsed / duration, 1);

            // Simple easing
            const value = currentWidth + (targetWidth - currentWidth) * progress;

            // Update width
            fill.style.width = `${value}%`;

            if (progress < 1) {
                rafId = requestAnimationFrame(animate);
            }
        }

        // Start animation
        rafId = requestAnimationFrame(animate);

        // Cleanup
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [currentStep, totalSteps]);

    return (
        <div className="plugin-progress-bar">
            <div className="plugin-progress-bar-fill" style={{ width: '0%' }}></div>
        </div>
    );
};
