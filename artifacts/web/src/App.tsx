import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LoginPage } from "@/pages/login/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { RequestAccessPage } from "@/pages/RequestAccessPage";
import { NewExperimentPage } from "@/pages/personal/NewExperimentPage";
import { SciNoteDetailPage } from "@/pages/personal/SciNoteDetailPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/home" component={HomePage} />
      <Route path="/signup" component={RequestAccessPage} />
      <Route path="/personal/new-experiment" component={NewExperimentPage} />
      <Route path="/personal/note/:id" component={SciNoteDetailPage} />
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
