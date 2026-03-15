import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import NotFound from "@/pages/not-found";
import { LoginPage } from "@/pages/login/LoginPage";
import { RequestAccessPage } from "@/pages/RequestAccessPage";
import { HomePage } from "@/pages/HomePage";
import { MessagesPage } from "@/pages/messages/MessagesPage";
import MembersPage from "@/pages/team/MembersPage";
import MemberDetailPage from "@/pages/team/MemberDetailPage";
import { NewExperimentPage } from "@/pages/personal/NewExperimentPage";
import { ReinitializeExperimentPage } from "@/pages/personal/ReinitializeExperimentPage";
import { SciNoteDetailPage } from "@/pages/personal/SciNoteDetailPage";
import { ExperimentDetailPage } from "@/pages/personal/ExperimentDetailPage";
import { ExperimentWorkbenchPage } from "@/pages/personal/workbench/ExperimentWorkbenchPage";
import { TrashPage } from "@/pages/personal/trash/TrashPage";
import { MyReportsPage } from "@/pages/personal/reports/MyReportsPage";
import { TeamReportsPage } from "@/pages/team/reports/TeamReportsPage";

const queryClient = new QueryClient();

/**
 * Routes that share the authenticated app shell (sidebar always visible).
 * Add every post-login route here.
 */
function AuthenticatedRouter() {
  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/home" component={HomePage} />
        {/* Messages inbox */}
        <Route path="/home/messages" component={MessagesPage} />
        {/* Team members */}
        <Route path="/home/members/:id" component={MemberDetailPage} />
        <Route path="/home/members" component={MembersPage} />
        {/* Team reports (instructor view) */}
        <Route path="/home/reports" component={TeamReportsPage} />
        {/* Personal: my weekly reports (student side) */}
        <Route path="/personal/my-reports" component={MyReportsPage} />
        <Route path="/personal/new-experiment" component={NewExperimentPage} />
        {/* Reinitialize wizard for an existing SciNote */}
        <Route path="/personal/reinitialize/:id" component={ReinitializeExperimentPage} />
        {/* Experiment workbench — three-panel recording page for a SciNote */}
        <Route path="/personal/experiment/:id/workbench" component={ExperimentWorkbenchPage} />
        {/* Wizard-created SciNotes — detail page with full form data */}
        <Route path="/personal/experiment/:id" component={ExperimentDetailPage} />
        {/* Placeholder SciNotes — legacy stub */}
        <Route path="/personal/note/:id" component={SciNoteDetailPage} />
        {/* Trash — soft-deleted experiment records */}
        <Route path="/personal/trash" component={TrashPage} />
        <Route path="/">
          {() => {
            window.location.replace(
              import.meta.env.BASE_URL.replace(/\/$/, "") + "/login"
            );
            return null;
          }}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public routes — no sidebar */}
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={RequestAccessPage} />
      {/* All other routes get the authenticated shell */}
      <Route>
        <AuthenticatedRouter />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
