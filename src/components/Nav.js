import '@spectrum-web-components/icons-workflow/icons/sp-icon-magic-wand.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-edit.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-application-delivery.js';

import React, { memo, useContext } from 'react';
import { SideNav, SideNavItem } from '@swc-react/sidenav';
import { PluginContext } from '../contexts/PluginContext.js';

function Nav() {
    const { state, dispatch } = useContext(PluginContext);
    const handleNavChange = (e) => {
        dispatch({
            type: 'CHANGE_SECTION',
            payload: e.target.value
        });
    };

    return (
        <div className="plugin-nav">
            <SideNav
                className="plugin-sidenav"
                value={state.currentSection}
                onchange={handleNavChange}>
                <SideNavItem value="builder" label="Build Assistant">
                    <sp-icon-magic-wand slot="icon"></sp-icon-magic-wand>
                </SideNavItem>
                <SideNavItem value="editor" label="Editor">
                    <sp-icon-edit slot="icon"></sp-icon-edit>
                </SideNavItem>
                <SideNavItem value="production" label="Production">
                    <sp-icon-application-delivery slot="icon"></sp-icon-application-delivery>
                </SideNavItem>
            </SideNav>
        </div>
    );
}

export default memo(Nav);