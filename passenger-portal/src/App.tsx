import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import About from './pages/About';
import Careers from './pages/Careers';
import Contact from './pages/Contact';
import Cookies from './pages/Cookies';
import FAQ from './pages/FAQ';
import Home from './pages/Home';
import Legal from './pages/Legal';
import News from './pages/News';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import Terms from './pages/Terms';
import TrackResult from './pages/TrackResult';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/track" element={<TrackResult />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/support" element={<Support />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/news" element={<News />} />
          <Route path="/careers" element={<Careers />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
