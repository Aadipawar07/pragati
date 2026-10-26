import { Route, Routes } from "react-router-dom";
import MarketingLayout from "@/layouts/MarketingLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Study from "@/pages/Study";
import Learn from "@/pages/Learn";
import Roadmap from "@/pages/Roadmap";
import Vault from "@/pages/Vault";
import DocumentViewer from "@/pages/DocumentViewer";
import { Practice, Test, Results, Exam } from "@/pages/Assessment";
import Memory from "@/pages/Memory";
import { Career, CareerRoadmap, Projects, ProjectWorkspace } from "@/pages/Career";
import { Mentor, Knowledge, MindMap, Resources } from "@/pages/PhaseTwo";
import { CommandCenter, Notifications, Today } from "@/pages/StudentOS";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Landing />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/study" element={<Study />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/vault/document/:id" element={<DocumentViewer />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/practice/test/:id" element={<Test />} />
        <Route path="/practice/results/:id" element={<Results />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/career" element={<Career />} />
        <Route path="/career/roadmap" element={<CareerRoadmap />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectWorkspace />} />
        <Route path="/mentor" element={<Mentor />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/mindmap" element={<MindMap />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/command" element={<CommandCenter />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/today" element={<Today />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
