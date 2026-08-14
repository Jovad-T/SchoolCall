/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import TeacherRemote from './components/TeacherRemote';
import ClassroomDisplay from './components/ClassroomDisplay';
import Admin from './components/Admin';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/teacher" element={<TeacherRemote />} />
        <Route path="/class" element={<ClassroomDisplay />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </HashRouter>
  );
}
