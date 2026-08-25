import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Access from "./pages/Access";
import Dashboard from "./pages/Dashboard";
import ElectionResearch from "./pages/ElectionResearch";
import ElectionCandidates from "./pages/ElectionCandidates";
import ElectionCandidateProfile from "./pages/ElectionCandidateProfile";
import ProfileReview from "./pages/ProfileReview";
import ImportHistory from "./pages/ImportHistory";
import ImportWizard from "./pages/ImportWizard";
import LeadDetails from "./pages/LeadDetails";
import Leads from "./pages/Leads";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/acesso"} component={Access} />
      <Route path={"/"} component={Dashboard} />
      <Route path={"/leads"} component={Leads} />
      <Route path={"/leads/:id"}>{params => <LeadDetails id={Number(params.id)} />}</Route>
      <Route path={"/importar"} component={ImportWizard} />
      <Route path={"/importacoes"} component={ImportHistory} />
      <Route path={"/coleta-eleitoral"} component={ElectionResearch} />
      <Route path={"/base-eleitoral"} component={ElectionCandidates} />
      <Route path={"/candidaturas/:id"}>{params => <ElectionCandidateProfile id={Number(params.id)} />}</Route>
      <Route path={"/revisar-perfis"} component={ProfileReview} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
