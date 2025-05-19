const creativeConfigs = [
  {
    name: 'velocity',
    devices: {
      desktop: {
        device: 'desktop',
        abbreviation: ':dt',
        filter: ':dt',
        dimensions: {
          height: 450,
          width: 1920
        },
        tile: {},
        sequences: {
          intro: {
            device: 'desktop',
            name: 'intro',
            abbreviation: ':dt',
            filter: "intro-",
            artboards: [],   ///artboard schema: {step: mirrors array index (int), board: Layer (object), id: board.id (int)}
            maxSteps: 2,
            artboardNamePattern: 'intro-${step}-panel:dt',
          },
          expanded: {
            device: 'desktop',
            name: 'expanded',
            abbreviation: ':dt',
            filter: "-expanded",
            artboards: [],
            maxSteps: 3,
            artboardNamePattern: 'morph-${step}-expanded-panel:dt',
          },
          collapsed: {
            device: 'desktop',
            name: 'collapsed',
            abbreviation: ':dt',
            filter: "-collapsed",
            artboards: [],
            maxSteps: 3,
            artboardNamePattern: 'morph-${step}-collapsed-panel:dt',
          }
        }
      },
      mobile: {
        device: 'mobile',
        abbreviation: ':mb',
        filter: ':mb',
        dimensions: {
          height: 450,
          width: 860
        },
        sequences: {
          intro: {
            device: 'mobile',
            name: 'intro',
            abbreviation: ':mb',
            filter: "intro-",
            artboards: [],
            maxSteps: 100,
            artboardNamePattern: 'intro-${step}-panel:mb',
          },
          expanded: {
            device: 'mobile',
            name: 'expanded',
            abbreviation: ':mb',
            filter: "-expanded",
            artboards: [],
            maxSteps: 3,
            artboardNamePattern: 'morph-${step}-expanded-panel:mb',
          },
          collapsed: {
            device: 'mobile',
            name: 'collapsed',
            abbreviation: ':mb',
            filter: "-collapsed",
            artboards: [],
            maxSteps: 3,
            artboardNamePattern: 'morph-${step}-collapsed-panel:mb',
          },
        }
      }
    },
  },
  {
    name: 'hangtime',
    devices: {
      mobile: {
        device: 'mobile',
        abbreviation: '',
        sequenceTypes: {
          main: {
            device: 'mobile',
            name: 'main',
            abbreviation: 'md',
            artboards: [],
            maxSteps: 100,
            artboardNamePattern: '${*}-${step}',
          }
        }
      }
    }
  }
];

/**
 * Returns a creative configuration based on the specified type
 * @param {string} type - The type of configuration to retrieve (e.g., 'creative', 'ad')
 * @returns {Object|null} The matching configuration or null if not found
 */
const getCreativeConfig = (name) => {
  return creativeConfigs.find(config => config.name === name) || { name: 'unknown' };
};

export { getCreativeConfig };
