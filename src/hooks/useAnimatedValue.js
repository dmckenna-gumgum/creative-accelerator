import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
/**
 * Creates an RAF-driven animation function
 * @param {number} start - Starting value
 * @param {number} end - Target value
 * @param {number} duration - Duration in ms
 * @param {function} onUpdate - Callback for each animation frame
 * @param {function} onComplete - Optional callback when animation completes
 * @returns {function} - Function to cancel the animation
 */
export function animateValue(start, end, duration, onUpdate, onComplete) {
    let startTime = null;
    let animationId = null;
    gsap.registerPlugin(useGSAP);



    gsap.to(start, {
        duration: duration / 1000,
        value: end,
        onUpdate: onUpdate,
        onComplete: onComplete
    });
    // function step(timestamp) {
    //     if (!startTime) startTime = timestamp;

    //     const elapsed = timestamp - startTime;
    //     const progress = Math.min(elapsed / duration, 1);

    //     // Cubic easing out
    //     const eased = 1 - Math.pow(1 - progress, 3);
    //     const currentValue = start + (end - start) * eased;

    //     onUpdate(currentValue);

    //     if (progress < 1) {
    //         animationId = requestAnimationFrame(step);
    //     } else if (onComplete) {
    //         onComplete();
    //     }
    // }

    // animationId = requestAnimationFrame(step);

    return function cancelAnimation() {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    };
}
