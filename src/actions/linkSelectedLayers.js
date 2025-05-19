/**
 * Link/unlink all selected layers.
 *
 * @param {Layer[]} selectLayers   – layers whose names you want linked
 * @param {boolean} toggle – whether to link or unlink
 * @returns {Promise<{ unlinked: number, linked: number }>}
 */
const linkSelectedLayers = async (context, selectLayers, toggle) => {
    try {
        console.log(`${toggle ? 'Linking' : 'Unlinking'} Selected Layers: `, selectLayers.map(l => l.name));
        const anchorLayer = selectLayers[0];
        selectLayers.shift();
        const results = await Promise.all(selectLayers.map(async layer => {
            console.log("linking", layer.name, "to", anchorLayer.name);
            try {
                await toggle ? layer.link(anchorLayer) : layer.unlink();
                return { success: true, message: `layer ${layer.name} ${toggle ? 'linked' : 'unlinked'} successfully`, count: 1 };
            } catch (error) {
                console.error(error);
                return { success: false, message: error.message, count: 0 };
            }
        }));
        console.log(results);
        return { success: true, message: `layers ${toggle ? 'linked' : 'unlinked'} successfully`, count: selectLayers.length };
    } catch (error) {
        console.error(error);
        return { success: false, message: error.message, count: 0 };
    }

}

export default linkSelectedLayers;
