const buildStepConfig = [
    {
        id: 0,
        title: "Design Desktop Rest States",
        directions: "Start by building the designs for the desktop rest states of your Velocity. Velocity Ads have two device sizes, and each device size has an expanded and a collapsed rest state. Once you've completed these two boards click next and I'll convert any remaining raster or text layers to smart objects and move to the next step.",
        advanceActionScope: {
            actionName: "propagateToVelocityStates",
            sourceStep: 2,
            destinationSteps: [1, 3],
            sequences: ["expanded", "collapsed"],
            devices: ["desktop"],
        }
    },
    {
        id: 1,
        title: "Design Desktop Velocity States",
        directions: "Start by building the designs for the rest state of your Velocity. Velocity Ads have two sizes, and each size has two rest states. Once you've completed these four boards click next and I'll convert any remaining raster or text layers to smart objects and move to the next step.",
        advanceActionScope: {
            actionName: "propagateToNewDevice",
            sourceStep: 2,
            destinationSteps: [2],
            sequences: ["expanded", "collapsed"],
            from: "desktop",
            to: ["mobile"]
        }
    },
    {
        id: 2,
        title: "Design Mobile Rest States",
        directions: "Start by building the designs for the desktop rest states of your Velocity. Velocity Ads have two device sizes, and each device size has an expanded and a collapsed rest state. Once you've completed these two boards click next and I'll convert any remaining raster or text layers to smart objects and move to the next step.",
        advanceActionScope: {
            actionName: "propagateToVelocityStates",
            sourceStep: 2,
            destinationSteps: [1, 3],
            sequences: ["expanded", "collapsed"],
            devices: ["mobile"],
        }
    },
    {
        id: 3,
        title: "Design Mobile Velocity States",
        directions: "Now let's design how your add will look when it reacts to user scroll behavior. The top boards represent how your ad will look when the user is scrolling downwards. The boards on the bottom represent how your add will look when the user is scrolling upwards. Once you're done click next.",
        advanceActionScope: {
            actionName: "propagateToNewIntroSequence",
            sourceSequences: ["expanded"],
            sourceStep: 2,
            destinationSteps: [1],
            destinationSequences: ["intro"],
            devices: ["desktop"],
        }
    },
    {
        id: 4,
        title: "Design Desktop Intro Sequence",
        directions: "Now we'll create the desktop intro animation. It's best to storyboard this in reverse: from the expanded rest state. Click the plus button to the right to clone and add a descending artboard in this sequence.",
        stepActionScope: {
            actionName: "createIntroBoard",
            sourceSequences: ["intro"],
            sourceStep: 1,
            destinationSteps: [1],
            destinationSequences: ["intro"],
            devices: ["desktop"],
        },
        advanceActionScope: {
            actionName: "propagateToNewIntroSequence",
            sourceSequences: ["expanded"],
            sourceStep: 2,
            destinationSteps: [1],
            destinationSequences: ["intro"],
            devices: ["mobile"],
        }
    },
    {
        id: 5,
        title: "Design Mobile Intro Sequence",
        directions: "Now we'll do the same for the mobile size.  Click the plus button to the right to clone and add a descending artboard in this sequence.  When you're done, hit next and we'll finalize this project for animating.",
        stepActionScope: {
            actionName: "createIntroBoard",
            sourceSequences: ["intro"],
            sourceStep: 1,
            destinationSteps: [1],
            destinationSequences: ["intro"],
            devices: ["mobile"],
        },
        advanceActionScope: {
            actionName: "finalizeProject"
        }
    },
    {
        id: 6,
        title: "Prepare for Production",
        directions: "You're almost done! Click finish and Studio Companion will do its best to prep your file for Studio. If you'd prefer to do this manually, click on the Production tab on the left and we'll provide some tools to make that process easier.",
        advanceActionScope: {
            actionName: "openStudioAndFinder"
        }
    }
];

export default buildStepConfig;