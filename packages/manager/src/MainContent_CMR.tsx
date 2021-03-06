import * as classnames from 'classnames';
import { AccountCapability } from '@linode/api-v4/lib/account';
import { APIError } from '@linode/api-v4/lib/types';
import * as React from 'react';
import { Redirect, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { compose } from 'recompose';
import Box from 'src/components/core/Box';
import {
  makeStyles,
  Theme,
  withTheme,
  WithTheme
} from 'src/components/core/styles';

import BackupDrawer from 'src/features/Backups';
import DomainDrawer from 'src/features/Domains/DomainDrawer';
import GlobalNotifications from 'src/features/GlobalNotifications';
import Footer from 'src/features/Footer/Footer_CMR';
import {
  notificationContext,
  useNotificationContext
} from 'src/features/NotificationCenter/NotificationContext';
import ToastNotifications from 'src/features/ToastNotifications';
import TopMenu from 'src/features/TopMenu/TopMenu_CMR';
import VolumeDrawer from 'src/features/Volumes/VolumeDrawer';
import CreateVLANDialog from 'src/features/Vlans/CreateVLANDialog';
import { useDialogContext, vlanContext } from 'src/context';
import useAccountManagement from 'src/hooks/useAccountManagement';

import Grid from 'src/components/Grid';
import NotFound from 'src/components/NotFound';
import SuspenseLoader from 'src/components/SuspenseLoader';
// @cmr
import PrimaryNav_CMR from 'src/components/PrimaryNav/PrimaryNav_CMR';

import withGlobalErrors, {
  Props as GlobalErrorProps
} from 'src/containers/globalErrors.container';
import withFeatureFlags, {
  FeatureFlagConsumerProps
} from 'src/containers/withFeatureFlagConsumer.container.ts';
import { isFeatureEnabled } from 'src/utilities/accountCapabilities';

import Logo from 'src/assets/logo/logo-text.svg';

const useStyles = makeStyles((theme: Theme) => ({
  appFrame: {
    position: 'relative',
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
    backgroundColor: theme.bg.main,
    zIndex: 1
  },
  wrapper: {
    padding: theme.spacing(3),
    transition: theme.transitions.create('opacity'),
    [theme.breakpoints.down('sm')]: {
      paddingTop: theme.spacing(2),
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2)
    }
  },
  cmrWrapper: {
    padding: `${theme.spacing(3)}px 0`,
    paddingTop: 20,
    transition: theme.transitions.create('opacity'),
    [theme.breakpoints.down('sm')]: {
      paddingTop: theme.spacing(2),
      paddingLeft: 0,
      paddingRight: 0
    }
  },
  content: {
    flex: 1
  },
  fullWidthContent: {
    marginLeft: 0,
    [theme.breakpoints.up('md')]: {
      marginLeft: theme.spacing(7) + 36
    }
  },
  hidden: {
    display: 'none',
    overflow: 'hidden'
  },
  grid: {
    [theme.breakpoints.up('lg')]: {
      height: '100%'
    }
  },
  switchWrapper: {
    flex: 1,
    maxWidth: '100%',
    position: 'relative',
    '& > .MuiGrid-container': {
      maxWidth: 1280,
      width: '100%'
    },
    '&.mlMain': {
      [theme.breakpoints.up('lg')]: {
        maxWidth: '78.8%'
      }
    },
    '& .mlSidebar': {
      [theme.breakpoints.up('lg')]: {
        paddingRight: `0 !important`
      }
    }
  },
  logo: {
    '& > g': {
      fill: theme.color.black
    }
  },
  activationWrapper: {
    padding: theme.spacing(4),
    [theme.breakpoints.up('xl')]: {
      width: '50%',
      margin: '0 auto'
    }
  }
}));

interface Props {
  accountLoading: boolean;
  accountError?: APIError[];
  accountCapabilities: AccountCapability[];
  location: RouteComponentProps['location'];
  history: RouteComponentProps['history'];
  appIsLoading: boolean;
  toggleTheme: () => void;
  toggleSpacing: () => void;
  username: string;
  isLoggedInAsCustomer: boolean;
}

type CombinedProps = Props &
  GlobalErrorProps &
  WithTheme &
  FeatureFlagConsumerProps;

const Account = React.lazy(() => import('src/features/Account'));
const LinodesRoutes = React.lazy(() => import('src/features/linodes'));
const Volumes = React.lazy(() => import('src/features/Volumes'));
const Domains = React.lazy(() => import('src/features/Domains'));
const Images = React.lazy(() => import('src/features/Images'));
const Kubernetes = React.lazy(() => import('src/features/Kubernetes'));
const ObjectStorage = React.lazy(() => import('src/features/ObjectStorage'));
const Profile = React.lazy(() => import('src/features/Profile'));
const NodeBalancers = React.lazy(() => import('src/features/NodeBalancers'));
const StackScripts = React.lazy(() => import('src/features/StackScripts'));
const SupportTickets = React.lazy(() =>
  import('src/features/Support/SupportTickets')
);
const SupportTicketDetail = React.lazy(() =>
  import('src/features/Support/SupportTicketDetail')
);
const Longview = React.lazy(() => import('src/features/Longview'));
const Managed = React.lazy(() => import('src/features/Managed'));
const Dashboard = React.lazy(() => import('src/features/Dashboard_CMR'));
const Help = React.lazy(() => import('src/features/Help'));
const SupportSearchLanding = React.lazy(() =>
  import('src/features/Help/SupportSearchLanding')
);
const SearchLanding = React.lazy(() => import('src/features/Search'));
const EventsLanding = React.lazy(() =>
  import('src/features/Events/EventsLanding')
);
const AccountActivationLanding = React.lazy(() =>
  import('src/components/AccountActivation/AccountActivationLanding')
);
const Firewalls = React.lazy(() => import('src/features/Firewalls'));
const VLans = React.lazy(() => import('src/features/Vlans'));

const MainContent: React.FC<CombinedProps> = props => {
  const classes = useStyles();

  const NotificationProvider = notificationContext.Provider;
  const contextValue = useNotificationContext();

  const VlanContextProvider = vlanContext.Provider;
  const vlanContextValue = useDialogContext();

  const [, toggleMenu] = React.useState<boolean>(false);
  const { account } = useAccountManagement();

  const showFirewalls = isFeatureEnabled(
    'Cloud Firewall',
    Boolean(props.flags.firewalls),
    account.data?.capabilities ?? []
  );

  const showVlans = isFeatureEnabled(
    'Vlans',
    Boolean(props.flags.vlans),
    account?.data?.capabilities ?? []
  );

  /**
   * this is the case where the user has successfully completed signup
   * but needs a manual review from Customer Support. In this case,
   * the user is going to get 403 errors from almost every single endpoint.
   *
   * So in this case, we'll show something more user-friendly
   */
  if (props.globalErrors.account_unactivated) {
    return (
      <div
        style={{
          backgroundColor: props.theme.bg.main,
          minHeight: '100vh'
        }}
      >
        <div className={classes.activationWrapper}>
          <Box
            style={{
              display: 'flex'
            }}
          >
            <Logo width={150} height={87} className={classes.logo} />
          </Box>
          <Switch>
            <Route
              exact
              strict
              path="/support/tickets"
              component={SupportTickets}
            />
            <Route
              path="/support/tickets/:ticketId"
              component={SupportTicketDetail}
              exact
              strict
            />
            <Route exact path="/support" component={Help} />
            <Route component={AccountActivationLanding} />
          </Switch>
        </div>
      </div>
    );
  }

  /**
   * otherwise just show the rest of the app.
   */
  return (
    <div
      className={classnames({
        [classes.appFrame]: true,
        /**
         * hidden to prevent some jankiness with the app loading before the splash screen
         */
        [classes.hidden]: props.appIsLoading
      })}
    >
      <VlanContextProvider value={vlanContextValue}>
        {/* @cmr */}
        <PrimaryNav_CMR
          closeMenu={() => toggleMenu(false)}
          isCollapsed={false}
          toggleTheme={props.toggleTheme}
        />
        <NotificationProvider value={contextValue}>
          <div className={classes.content}>
            <TopMenu
              isLoggedInAsCustomer={props.isLoggedInAsCustomer}
              username={props.username}
            />
            <main className={classes.cmrWrapper} id="main-content" role="main">
              <Grid container spacing={0} className={classes.grid}>
                <Grid item className={classes.switchWrapper}>
                  <GlobalNotifications />
                  <React.Suspense fallback={<SuspenseLoader />}>
                    <Switch>
                      <Route path="/linodes" component={LinodesRoutes} />
                      <Route path="/volumes" component={Volumes} />
                      <Redirect path="/volumes*" to="/volumes" />
                      <Route path="/nodebalancers" component={NodeBalancers} />
                      <Route path="/domains" component={Domains} />
                      <Route path="/managed" component={Managed} />
                      <Route path="/longview" component={Longview} />
                      <Route exact strict path="/images" component={Images} />
                      <Redirect path="/images*" to="/images" />
                      <Route path="/stackscripts" component={StackScripts} />
                      <Route path="/object-storage" component={ObjectStorage} />
                      <Route path="/kubernetes" component={Kubernetes} />
                      <Route path="/account" component={Account} />
                      <Route
                        exact
                        strict
                        path="/support/tickets"
                        component={SupportTickets}
                      />
                      <Route
                        path="/support/tickets/:ticketId"
                        component={SupportTicketDetail}
                        exact
                        strict
                      />
                      <Route path="/profile" component={Profile} />
                      <Route exact path="/support" component={Help} />
                      <Route path="/dashboard" component={Dashboard} />
                      <Route path="/search" component={SearchLanding} />
                      <Route
                        exact
                        strict
                        path="/support/search/"
                        component={SupportSearchLanding}
                      />
                      <Route path="/events" component={EventsLanding} />
                      {showFirewalls && (
                        <Route path="/firewalls" component={Firewalls} />
                      )}
                      {showVlans && <Route path="/vlans" component={VLans} />}
                      <Redirect exact from="/" to="/dashboard" />
                      <Route component={NotFound} />
                    </Switch>
                  </React.Suspense>
                </Grid>
              </Grid>
            </main>
          </div>
        </NotificationProvider>
        <Footer desktopMenuIsOpen={false} />
        <ToastNotifications />
        <DomainDrawer />
        <VolumeDrawer />
        <BackupDrawer />
        <CreateVLANDialog />
      </VlanContextProvider>
    </div>
  );
};

export default compose<CombinedProps, Props>(
  React.memo,
  withGlobalErrors(),
  withTheme,
  withFeatureFlags
)(MainContent);
