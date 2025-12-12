import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import TrackResult from './pages/TrackResult';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/track" element={<TrackResult />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
