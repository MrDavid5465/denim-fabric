// SidebarShell: a configuration-app layout. Applications are listed in a
// sidebar under group headings; the content area belongs to the active
// application (which may opt into MasterDetail's list | detail panes).
//
//   wide   (>= 1200px): sidebar | content. Collapsible to an icon rail.
//   medium (>= 700px):  icon rail | content; the full sidebar opens over it.
//   narrow (phone):     one screen at a time with a back bar:
//                       menu (at "/") -> application -> detail.
//
// There are no global action buttons: each application owns its own UI.
import React from 'react';
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { FontIcon, Panel, PanelType, mergeStyleSets, useTheme } from '@fluentui/react';
import type { ITheme } from '@fluentui/react';
import {
  DenimProvider,
  DenimRoutes,
  DenimShellProps,
  OPTIONAL_APPLICATION_FIELDS,
  splitShellProps,
  useDenim,
  useNav,
} from '../../denim';
import { Splash } from '../shared/Splash';
import { SettingsDialog } from '../shared/SettingsDialog';
import { FluentThemeRoot, useFluentTheme } from '../shared/theme';
import type { ThemeBuilder } from '../themes';
import DenimLogo, { IconProps } from '../shared/Logo';
import { Sidebar, TOUCH } from './Sidebar';
import {
  DEFAULT_BREAKPOINTS,
  IBackTarget,
  IBreakpoints,
  ShellLayoutContext,
  useBreakpoint,
} from './layout';

export interface SidebarShellProps extends DenimShellProps {
  /** Your product's name, at the top of the sidebar. */
  title?: string;
  /** Icon next to the title. */
  Brand?: React.FC<any>;
  /** Splash-screen logo. */
  Logo?: React.FC<IconProps>;
  /** Theme builders keyed `<mode>-<color>` plus `default`. Defaults to THEMES. */
  themes?: Record<string, ThemeBuilder>;
  /** Extra content in the sidebar footer, above Settings. */
  SidebarFooter?: React.FC<any>;
  /** Layout breakpoints in px. Default { medium: 700, wide: 1200 }. */
  breakpoints?: IBreakpoints;
  /** Shown at `/` on wide/medium screens when there is no RootComponent and no launch page. */
  welcome?: React.ReactNode;
}

type OwnProps = Omit<SidebarShellProps, keyof DenimShellProps>;

const COLLAPSED_KEY = 'denim-sidebar-collapsed';
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
};

const getShellStyles = (theme: ITheme, narrow: boolean) =>
  mergeStyleSets({
    root: {
      display: 'flex',
      flexDirection: narrow ? 'column' : 'row',
      height: '100dvh',
      width: '100%',
      overflow: 'hidden',
      background: theme.semanticColors.bodyBackground,
      color: theme.semanticColors.bodyText,
    },
    side: { flex: 'none', height: '100%' },
    main: {
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      overflow: 'auto',
      boxSizing: 'border-box',
      position: 'relative',
      // FullBleed and MasterDetail read this to cancel the padding.
      ['--denim-content-padding' as any]: narrow ? '12px' : '20px',
      padding: 'var(--denim-content-padding)',
    },
    page: { height: '100%' },
    bar: {
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      minHeight: 52,
      padding: '0 8px 0 4px',
      background: theme.palette.neutralLighterAlt,
      borderBottom: `1px solid ${theme.palette.neutralLight}`,
    },
    back: {
      minWidth: TOUCH,
      height: TOUCH,
      padding: '0 8px 0 4px',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      border: 0,
      borderRadius: 4,
      background: 'transparent',
      color: theme.palette.themePrimary,
      font: 'inherit',
      fontSize: theme.fonts.mediumPlus.fontSize,
      cursor: 'pointer',
      selectors: {
        ':hover': { background: theme.palette.neutralLighter },
        ':focus-visible': { outline: `2px solid ${theme.palette.themePrimary}`, outlineOffset: -2 },
      },
    },
    barTitle: {
      flex: 1,
      textAlign: 'right',
      fontWeight: 600,
      fontSize: theme.fonts.mediumPlus.fontSize,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      paddingRight: 8,
    },
    pills: {
      flex: 'none',
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      padding: '8px 12px',
      borderBottom: `1px solid ${theme.palette.neutralLight}`,
    },
    pill: {
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      minHeight: TOUCH,
      padding: '0 16px',
      borderRadius: TOUCH / 2,
      border: `1px solid ${theme.palette.neutralQuaternary}`,
      color: theme.palette.neutralPrimary,
      textDecoration: 'none',
      selectors: {
        ':focus-visible': { outline: `2px solid ${theme.palette.themePrimary}`, outlineOffset: 2 },
      },
    },
    pillActive: {
      background: theme.palette.themePrimary,
      borderColor: theme.palette.themePrimary,
      color: theme.palette.white,
    },
  });

/**
 * Tracks this tab's history so "up" can be the browser's Back when Back
 * leads to the same place (no duplicate entries), and a push otherwise
 * (a deep link has nothing to go back to).
 */
function useGoUp() {
  const location = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();
  const stack = React.useRef<{ key: string; path: string }[]>([]);
  React.useEffect(() => {
    const s = stack.current;
    const entry = { key: location.key, path: location.pathname.replace(/\/+$/, '') || '/' };
    const at = s.findIndex(e => e.key === location.key);
    if (at >= 0) s.length = at + 1; // Back (or Forward) to a known entry
    else if (navType === 'REPLACE' && s.length) s[s.length - 1] = entry;
    else s.push(entry);
  }, [location.key, location.pathname, navType]);
  return React.useCallback(
    (to: string) => {
      const s = stack.current;
      const target = to.replace(/\/+$/, '') || '/';
      if (s.length >= 2 && s[s.length - 2].path === target) navigate(-1);
      else navigate(to);
    },
    [navigate],
  );
}

const SidebarLayout: React.FC<OwnProps> = ({
  title,
  Brand,
  Logo = DenimLogo,
  themes,
  SidebarFooter,
  breakpoints = DEFAULT_BREAKPOINTS,
  welcome,
}) => {
  const { status, RootComponent } = useDenim();
  const nav = useNav();
  const themeKey = useFluentTheme(themes);
  const layout = useBreakpoint(breakpoints);
  const goUp = useGoUp();
  const [collapsed, setCollapsed] = React.useState(readCollapsed);
  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [back, setBack] = React.useState<IBackTarget | null>(null);
  const layoutContext = React.useMemo(() => ({ layout, setBack, goUp }), [layout, goUp]);

  // The overlay only exists on medium screens.
  React.useEffect(() => {
    if (layout !== 'medium') setOverlayOpen(false);
  }, [layout]);

  const toggleCollapsed = () =>
    setCollapsed(c => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
      } catch {
        // storage unavailable: the choice just isn't remembered
      }
      return !c;
    });

  if (status !== 'ready') {
    return RootComponent ? (
      <FluentThemeRoot themeKey={themeKey} themes={themes}>
        <RootComponent />
      </FluentThemeRoot>
    ) : (
      <Splash Icon={Logo} statusText={status === 'waiting' ? 'Waiting for server…' : undefined} />
    );
  }

  return (
    <FluentThemeRoot themeKey={themeKey} themes={themes}>
      <ShellLayoutContext.Provider value={layoutContext}>
        <ShellBody
          layout={layout}
          showChrome={nav.showChrome}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          overlayOpen={overlayOpen}
          setOverlayOpen={setOverlayOpen}
          openSettings={() => setSettingsOpen(true)}
          back={back}
          title={title}
          Brand={Brand}
          SidebarFooter={SidebarFooter}
          welcome={welcome}
        />
        <SettingsDialog isOpen={settingsOpen} onDismiss={() => setSettingsOpen(false)} />
      </ShellLayoutContext.Provider>
    </FluentThemeRoot>
  );
};

interface BodyProps {
  layout: 'wide' | 'medium' | 'narrow';
  showChrome: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  overlayOpen: boolean;
  setOverlayOpen: (open: boolean) => void;
  openSettings: () => void;
  back: IBackTarget | null;
  title?: string;
  Brand?: React.FC<any>;
  SidebarFooter?: React.FC<any>;
  welcome?: React.ReactNode;
}

const ShellBody: React.FC<BodyProps> = ({
  layout,
  showChrome,
  collapsed,
  onToggleCollapsed,
  overlayOpen,
  setOverlayOpen,
  openSettings,
  back,
  title,
  Brand,
  SidebarFooter,
  welcome,
}) => {
  const theme = useTheme();
  const nav = useNav();
  const { RootComponent } = useDenim();
  const narrow = layout === 'narrow';
  const s = React.useMemo(() => getShellStyles(theme, narrow), [theme, narrow]);
  const { goUp } = React.useContext(ShellLayoutContext)!;

  const routes = (
    <DenimRoutes
      welcome={welcome ?? <h1>Choose an application from the menu.</h1>}
      wrap={content => <div className={s.page}>{content}</div>}
    />
  );

  // Kiosk routes and landing pages: content only.
  if (!showChrome) {
    return <div className={s.root}><main className={s.main}>{routes}</main></div>;
  }

  const sidebarProps = { title, Brand, onOpenSettings: openSettings, Footer: SidebarFooter };

  if (narrow) {
    const app = nav.activeApp;
    // The menu is its own screen on a phone: "/" (and any non-application
    // URL) shows it, unless the app has a RootComponent for "/".
    if (!app && !RootComponent) {
      return (
        <div className={s.root}>
          <Sidebar variant="screen" {...sidebarProps} />
        </div>
      );
    }
    const target = back ?? { label: 'Menu', to: '/' };
    const links = app?.links ?? [];
    return (
      <div className={s.root}>
        <div className={s.bar}>
          <button type="button" className={s.back} onClick={() => goUp(target.to)}>
            <FontIcon iconName="ChevronLeft" aria-hidden style={{ width: 24, textAlign: 'center', fontSize: 14 }} />
            <span>{target.label}</span>
          </button>
          <span className={s.barTitle}>{app?.name}</span>
        </div>
        {app && !back && links.length > 1 && (
          <div className={s.pills} role="navigation" aria-label={`${app.name} pages`}>
            {links.map(l => {
              const active = nav.isLinkActive(app, l.path);
              return (
                <Link
                  key={l.path}
                  to={nav.linkUrl(app, l)}
                  className={`${s.pill} ${active ? s.pillActive : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {l.text}
                </Link>
              );
            })}
          </div>
        )}
        <main className={s.main}>{routes}</main>
      </div>
    );
  }

  const rail = layout === 'medium' || collapsed;
  return (
    <div className={s.root}>
      <div className={s.side} style={{ width: rail ? 60 : 264 }}>
        <Sidebar
          variant={rail ? 'rail' : 'full'}
          {...sidebarProps}
          onToggle={layout === 'medium' ? () => setOverlayOpen(true) : onToggleCollapsed}
          toggleLabel={rail ? 'Expand menu' : 'Collapse menu'}
        />
      </div>
      <main className={s.main}>{routes}</main>
      {layout === 'medium' && (
        <Panel
          isOpen={overlayOpen}
          isLightDismiss
          hasCloseButton={false}
          type={PanelType.customNear}
          customWidth="300px"
          onDismiss={() => setOverlayOpen(false)}
          onRenderNavigation={() => null}
          // The sidebar is the whole panel: no Fluent header strip, and the
          // sidebar (not the panel) scrolls, so its footer stays on screen.
          styles={{
            commands: { display: 'none' },
            navigation: { display: 'none' },
            contentInner: { height: '100%' },
            scrollableContent: { height: '100%', overflow: 'hidden' },
            content: { padding: 0, height: '100%' },
          }}
          aria-label="Menu"
        >
          <Sidebar
            variant="full"
            {...sidebarProps}
            onToggle={() => setOverlayOpen(false)}
            toggleLabel="Close menu"
            onNavigate={() => setOverlayOpen(false)}
            onOpenSettings={() => {
              setOverlayOpen(false);
              openSettings();
            }}
          />
        </Panel>
      )}
    </div>
  );
};

/**
 * The sidebar shell. Takes every <DenimProvider> prop plus its own. When the
 * app list comes from the backend it also selects `group` and `icon`
 * (pass `applicationFields=""` if your backend lacks them).
 */
export const SidebarShell: React.FC<SidebarShellProps> = props => {
  const [core, own] = splitShellProps(props);
  return (
    <DenimProvider applicationFields={OPTIONAL_APPLICATION_FIELDS} {...core}>
      <SidebarLayout {...own} />
    </DenimProvider>
  );
};

export default SidebarShell;
