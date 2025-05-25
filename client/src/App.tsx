import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { NavigationBar } from "./components/layout/navigation-bar";
import TabNavigation from "@/components/layout/tab-navigation";
import { UserProvider } from "@/context/new-user-context";
import { NetworkStatusProvider } from "@/context/network-status-context";
import { SyncProvider } from "@/context/sync-context";
import OfflineIndicator from "@/components/ui/offline-indicator";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import Home from "@/pages/home";
import Twitter from "@/pages/twitter";
import LinkedIn from "@/pages/linkedin";
import YouTube from "@/pages/youtube";
import Instagram from "@/pages/instagram";
import Facebook from "@/pages/facebook";
import WhatsApp from "@/pages/whatsapp";
import Notes from "@/pages/notes";
import Journal from "@/pages/journal";
import Documentation from "@/pages/documentation";
import Profile from "@/pages/profile";
import Checkout from "@/pages/checkout";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/twitter" component={Twitter}/>
      <Route path="/linkedin" component={LinkedIn}/>
      <Route path="/youtube" component={YouTube}/>
      <Route path="/instagram" component={Instagram}/>
      <Route path="/facebook" component={Facebook}/>
      <Route path="/whatsapp" component={WhatsApp}/>
      <Route path="/notes" component={Notes}/>
      <Route path="/journal" component={Journal}/>
      <Route path="/docs" component={Documentation}/>
      <Route path="/profile" component={Profile}/>
      <Route path="/checkout" component={Checkout}/>
      <Route path="/login" component={Login}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <NetworkStatusProvider>
          <SyncProvider>
            <div className="flex flex-col h-screen w-full mx-auto bg-white shadow-sm md:shadow-md max-w-full lg:max-w-6xl xl:max-w-7xl overflow-hidden">
              <NavigationBar />
              <TabNavigation />
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <Router />
              </div>
              <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-30">
                <OfflineIndicator />
              </div>
              <Toaster />
            </div>
          </SyncProvider>
        </NetworkStatusProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
