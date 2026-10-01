import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Cabecalho from './components/Cabecalho';
import Rodape from './components/Rodape';
import Catalogo from './pages/Catalogo';
import Home from './pages/Home';

// A página do produto carrega o model-viewer (three.js), então só é baixada quando aberta.
const PaginaProduto = lazy(() => import('./pages/PaginaProduto'));

function RolarParaTopo() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <RolarParaTopo />
      <Cabecalho />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route
            path="/produto/:id"
            element={
              <Suspense fallback={<p className="p-10 text-center text-grafite-500">Carregando…</p>}>
                <PaginaProduto />
              </Suspense>
            }
          />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
      <Rodape />
    </div>
  );
}
