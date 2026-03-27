import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
//import Dashboard from './pages/Dashboard';
import AppraisalPage from './pages/AppraisalPage';
import UserManagementPage from './pages/UserManagementPage';
import StudentManagementPage from './pages/StudentManagementPage';
import BaselinePage from './pages/BaselinePage';
//import BaselineDashboard from './pages/BaselineDashboard';
import CompetencyManagementPage from './pages/CompetencyManagementPage';
import ActivitiesPage from './pages/ActivitiesPage';
//import ActivitiesDashboard from './pages/ActivitiesDashboard';
import ClassObservationPage from "./pages/ClassObservationPage";
import PASAPage from "./pages/PASAPage";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
        <Route index element={<UserManagementPage />} />
          
          <Route path="users" element={<UserManagementPage />} />
          <Route path="students" element={<StudentManagementPage />} />
          <Route path="appraisal" element={<AppraisalPage />} />
          <Route path="baseline" element={<BaselinePage />} />
          
          <Route path="competencies" element={<CompetencyManagementPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          
          
          <Route path="/observation" element={<ClassObservationPage />} />
          
          
          <Route path="/pasa" element={<PASAPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;