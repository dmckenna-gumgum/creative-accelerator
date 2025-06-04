import { useState, useEffect, useCallback } from 'react';
const { app, action } = require("photoshop");

export const useActiveDocumentChange = () => {
    const [, setEventTrigger] = useState(0);

    const handlePhotoshopEventTrigger = useCallback(() => {
        setEventTrigger(trigger => trigger + 1);
    }, []);

    useEffect(() => {
        const relevantEvents = [
            { event: "open" },
            { event: "close" },
            { event: "newDocument" },
            { event: "select" },
        ];

        const listenerCallback = () => {
            handlePhotoshopEventTrigger();
        };

        action.addNotificationListener(relevantEvents, listenerCallback);

        handlePhotoshopEventTrigger();

        return () => {
            action.removeNotificationListener(relevantEvents, listenerCallback);
        };
    }, [handlePhotoshopEventTrigger]);

    return app.activeDocument;
};
