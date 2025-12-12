import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import Home from './pages/Home';
import TrackResult from './pages/TrackResult';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/track" element={<TrackResult />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
