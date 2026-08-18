/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import OfficeRemote from './components/OfficeRemote';
import ClassroomDisplay from './components/ClassroomDisplay';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/office" element={<OfficeRemote />} />
        <Route path="/class" element={<ClassroomDisplay />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}
