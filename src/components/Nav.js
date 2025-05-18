import '@spectrum-web-components/icons-workflow/icons/sp-icon-magic-wand.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-edit.js';
import '@spectrum-web-components/icons-workflow/icons/sp-icon-application-delivery.js';

import React, { memo } from 'react';
import { SideNav, SideNavItem } from '@swc-react/sidenav';

function Nav({ currentSection, onSectionChange }) {
    const handleNavChange = (e) => {
        console.log('Nav Change', e.target.value);
        onSectionChange && onSectionChange(e.target.value);
    };

    return (
        <div className="plugin-nav">
            <SideNav
                className="plugin-sidenav"
                value={currentSection}
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