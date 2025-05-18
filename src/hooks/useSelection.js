import { useContext } from "react";
import { SelectionContext } from "../contexts/SelectionContext.js";

export function useSelection() {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context.selection; // Return just the selection part
}