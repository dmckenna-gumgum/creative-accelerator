import { escapeRegex } from "../utilities/utilities.js";

const namingConventions = {
    legacy: {
        device: {
            desktop: ':dt',
            mobile: ':mb'
        },
        state: {
            intro: `intro-`,
            expanded: `morph-[1-3]`,
            collapsed: `morph-[4-6]`,
        }
    },
    current: {
        device: {
            desktop: ':dt',
            mobile: ':mb'
        },
        state: {
            intro: escapeRegex('intro-'),
            expanded: escapeRegex('-expanded'),
            collapsed: escapeRegex('-collapsed'),
        }
    }
}
export default namingConventions;