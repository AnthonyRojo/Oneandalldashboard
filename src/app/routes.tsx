import { createBrowserRouter, Navigate } from "react-router";
import AuthPage from "./pages/AuthPage";
import MainLayout from "./layout/MainLayout";
import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import CalendarPage from "./pages/CalendarPage";
import TeamPage from "./pages/TeamPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthPage />,
  },
  {
    path: "/app",
    Component: MainLayout,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", Component: DashboardPage },
      { path: "tasks", Component: TasksPage },
      { path: "calendar", Component: CalendarPage },
      { path: "announcements", Component: AnnouncementsPage },
      { path: "analytics", Component: AnalyticsPage },
      { path: "team", Component: TeamPage },
      { path: "settings", Component: SettingsPage },
      { path: "help", Component: HelpPage },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
