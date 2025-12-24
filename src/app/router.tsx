import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import Login from "../pages/Login";
import Projects from "../pages/Projects";
import CreateRun from "../pages/CreateRun";
import Hooks from "../pages/Hooks";
import Result from "../pages/Result";
import History from "../pages/History";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Projects />
      </ProtectedRoute>
    ),
  },
  {
    path: "/create",
    element: (
      <ProtectedRoute>
        <CreateRun />
      </ProtectedRoute>
    ),
  },
  {
    path: "/hooks",
    element: (
      <ProtectedRoute>
        <Hooks />
      </ProtectedRoute>
    ),
  },
  {
    path: "/result",
    element: (
      <ProtectedRoute>
        <Result />
      </ProtectedRoute>
    ),
  },
  {
    path: "/history",
    element: (
      <ProtectedRoute>
        <History />
      </ProtectedRoute>
    ),
  },
]);
