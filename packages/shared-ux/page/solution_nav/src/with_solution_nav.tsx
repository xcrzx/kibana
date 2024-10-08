/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentType, ReactNode, useState } from 'react';
import classNames from 'classnames';
import { SerializedStyles } from '@emotion/serialize';
import { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template-types';
import { useIsWithinBreakpoints, useEuiTheme, useIsWithinMinBreakpoint } from '@elastic/eui';
import { SolutionNav, SolutionNavProps } from './solution_nav';
import { WithSolutionNavStyles } from './with_solution_nav.styles';

// https://reactjs.org/docs/higher-order-components.html#convention-wrap-the-display-name-for-easy-debugging
function getDisplayName(Component: ComponentType<any>) {
  return Component.displayName || Component.name || 'UnnamedComponent';
}

type TemplateProps = Pick<KibanaPageTemplateProps, 'pageSideBar' | 'pageSideBarProps'> & {
  children?: ReactNode;
};

type Props<P> = P &
  TemplateProps & {
    solutionNav: SolutionNavProps;
  };

const SOLUTION_NAV_COLLAPSED_KEY = 'solutionNavIsCollapsed';

export const withSolutionNav = <P extends TemplateProps>(WrappedComponent: ComponentType<P>) => {
  const WithSolutionNav = (props: Props<P>) => {
    const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
    const isLargerBreakpoint = useIsWithinMinBreakpoint('l');
    const [isSideNavOpenOnDesktop, setisSideNavOpenOnDesktop] = useState(
      !JSON.parse(String(localStorage.getItem(SOLUTION_NAV_COLLAPSED_KEY)))
    );

    const { solutionNav, children, ...propagatedProps } = props;
    const { euiTheme } = useEuiTheme();

    const toggleOpenOnDesktop = () => {
      setisSideNavOpenOnDesktop(!isSideNavOpenOnDesktop);
      // Have to store it as the opposite of the default we want
      localStorage.setItem(SOLUTION_NAV_COLLAPSED_KEY, JSON.stringify(isSideNavOpenOnDesktop));
    };

    // Default navigation to allow collapsing
    const { canBeCollapsed = true } = solutionNav;
    const isSidebarShrunk =
      isMediumBreakpoint || (canBeCollapsed && isLargerBreakpoint && !isSideNavOpenOnDesktop);
    const withSolutionNavStyles = WithSolutionNavStyles(euiTheme);
    const sideBarClasses = classNames(
      'kbnStickyMenu',
      {
        'kbnSolutionNav__sidebar--shrink': isSidebarShrunk,
      },
      props.pageSideBarProps?.className
    );

    const pageSideBar = (
      <SolutionNav
        isOpenOnDesktop={isSideNavOpenOnDesktop}
        onCollapse={toggleOpenOnDesktop}
        {...solutionNav}
      />
    );

    const pageSideBarProps: TemplateProps['pageSideBarProps'] & { css: SerializedStyles } = {
      paddingSize: 'none' as 'none',
      ...props.pageSideBarProps,
      minWidth: isSidebarShrunk ? euiTheme.size.xxl : undefined,
      className: sideBarClasses,
      css: withSolutionNavStyles,
    };

    return (
      <WrappedComponent
        {...{
          ...(propagatedProps as P),
          pageSideBar,
          pageSideBarProps,
        }}
      >
        {children}
      </WrappedComponent>
    );
  };

  WithSolutionNav.displayName = `WithSolutionNavBar(${getDisplayName(WrappedComponent)})`;

  return WithSolutionNav;
};
