const { constants } = require('photoshop');
const { ElementPlacement } = constants;

export default async function cloneBoard(sourceBoard, destinationName, step) {
    const placement = step === 1 ?
        ElementPlacement.PLACEBEFORE :
        ElementPlacement.PLACEAFTER;
    //i still need to pick this up at some point - we need relevant guides to be cloned to new artboards as well. 
    // const boardFrame = await getArtboardFrame(route.sourceBoard);
    // const existingGuides = await getGuidesForFrame(boardFrame);
    return sourceBoard.duplicate(sourceBoard, placement, destinationName);
    //const newGuides = await cloneGuidesForFrame(route.sourceBoard);
    // logger.log("new guides created:", newGuides);
}
