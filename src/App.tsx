import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SeriesListPage } from './pages/SeriesListPage';
import { SeriesDetailPage } from './pages/SeriesDetailPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { CopyDetailPage } from './pages/CopyDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SeriesListPage />} />
        <Route path="/series/:seriesId" element={<SeriesDetailPage />} />
        <Route path="/series/:seriesId/issues/:issueId" element={<IssueDetailPage />} />
        <Route path="/series/:seriesId/issues/:issueId/copies/:copyId" element={<CopyDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
