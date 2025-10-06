import React, { useEffect, useState } from "react";
// 🔧 Componentes locais (substituem shadcn/ui para build na Vercel sem alias "@/")
const Card = ({ className = "", children }) => (
  <div className={`rounded-xl border bg-white shadow ${className}`}>{children}</div>
);
const CardContent = ({ className = "", children }) => (
  <div className={className}>{children}</div>
);
const Button = ({ className = "", children, ...props }) => (
  <button className={`px-3 py-2 border rounded-md hover:opacity-90 active:opacity-80 ${className}`} {...props}>{children}</button>
);
const Toggle = ({ pressed, onPressedChange, children }) => (
  <button
    aria-pressed={pressed}
    onClick={() => onPressedChange && onPressedChange(!pressed)}
    className={`px-3 py-2 border rounded-md ${pressed ? "bg-gray-900 text-white" : "bg-white"}`}
  >
    {children}
  </button>
);
import { Loader2, Map, RefreshCw, ZoomIn, ZoomOut, Accessibility, MousePointerClick } from "lucide-react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

/**
 * Landing – Igual ao layout de referência
 * --------------------------------------
 * - Mapa do Brasil por ESTADOS, com cor única e contornos internos (estilo da imagem)
 * - Painel de indicadores à direita em cartões
 * - Acessibilidade e testes de sanidade
 * - Fallback seguro: se o GeoJSON de UFs não carregar, usa REGIÕES embutidas
 */

// Paleta para ficar bem próximo do mock
const MAP_FILL = "#66B4A4";      // teal esverdeado
const MAP_FILL_HOVER = "#7CC9B8"; // hover
const MAP_FILL_PRESS = "#58A695"; // pressed
const MAP_STROKE = "#FFFFFF";     // contorno branco para lembrar o layout
const MAP_STROKE_EMPH = "#000000"; // contorno preto quando alto contraste

// GeoJSON de UFs (leve e público). Se falhar, usamos REGIONS_FC embutido
const STATES_URL = "https://cdn.jsdelivr.net/gh/fititnt/gis-dataset-brasil@master/geojson/state/BR-2019-state.geojson";

// REGIÕES OFFLINE (fallback)
const REGIONS_FC = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { id: "N", name: "Norte" }, geometry: { type: "Polygon", coordinates: [[[-74, 1], [-66, 5], [-60, 5], [-51, 3], [-50, -2], [-52, -6], [-60, -8], [-67, -10], [-73, -5], [-74, 1]]] } },
    { type: "Feature", properties: { id: "NE", name: "Nordeste" }, geometry: { type: "Polygon", coordinates: [[[-46, -2], [-41, -2], [-35, -6], [-34, -10], [-38, -13], [-42, -12], [-46, -10], [-50, -8], [-50, -2], [-46, -2]]] } },
    { type: "Feature", properties: { id: "CO", name: "Centro-Oeste" }, geometry: { type: "Polygon", coordinates: [[[-60, -8], [-52, -6], [-50, -8], [-49, -14], [-54, -17], [-59, -16], [-60, -12], [-60, -8]]] } },
    { type: "Feature", properties: { id: "SE", name: "Sudeste" }, geometry: { type: "Polygon", coordinates: [[[-50, -20], [-42, -18], [-39, -20], [-41, -24], [-46, -25], [-50, -23], [-50, -20]]] } },
    { type: "Feature", properties: { id: "S", name: "Sul" }, geometry: { type: "Polygon", coordinates: [[[-58, -23], [-54, -31], [-50, -33], [-47, -31], [-51, -28], [-54, -25], [-58, -23]]] } }
  ]
};

// Mock de dados
const mockFetchIndicators = async (scope, id) => {
  await new Promise((r) => setTimeout(r, 150));
  const base = { pib: 3.2, inflacao: 4.5, divida: 78.5, desemprego: 7.8, setorExterno: 30.1, atualizadoEm: new Date().toISOString() };
  if (scope === "country") return { nome: "Brasil", ...base };
  if (scope === "region") return { nome: { N: "Norte", NE: "Nordeste", CO: "Centro-Oeste", SE: "Sudeste", S: "Sul" }[id] || id, ...base };
  if (scope === "state") return { nome: id, ...base };
  return base;
};

// Testes leves
if (typeof window !== "undefined") {
  (async () => {
    const br = await mockFetchIndicators("country");
    console.assert(br && br.nome === "Brasil", "[TEST] país OK");
    const rn = await mockFetchIndicators("state", "RN");
    console.assert(rn && rn.nome === "RN", "[TEST] UF OK");
  })();
}

const StatRow = ({ label, desc, value, big }) => (
  <div className="flex items-center justify-between rounded-2xl border bg-white/80 backdrop-blur px-4 py-3 shadow-sm">
    <div>
      <div className="font-semibold text-gray-900 text-lg lg:text-xl">{label}</div>
      <div className="text-sm text-gray-500">{desc}</div>
    </div>
    <div className={`font-bold ${big ? "text-3xl lg:text-4xl" : "text-2xl"}`}>{value}</div>
  </div>
);

const Panel = ({ titulo, loading, data, onRefresh }) => (
  <Card className="w-full lg:w-[480px] 2xl:w-[560px] rounded-3xl shadow-lg">
    <CardContent className="p-5 lg:p-7 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">{titulo}</h2>
        <Button variant="ghost" size="icon" aria-label="Atualizar" onClick={onRefresh}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        </Button>
      </div>
      {loading || !data ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-100 rounded-2xl" />
          <div className="h-16 bg-gray-100 rounded-2xl" />
          <div className="h-16 bg-gray-100 rounded-2xl" />
          <div className="h-16 bg-gray-100 rounded-2xl" />
          <div className="h-16 bg-gray-100 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-3">
          <StatRow label="PIB" desc="Taxa de crescimento anual" value={`${data.pib.toFixed(1)}%`} big />
          <StatRow label="Inflação" desc="Índice de Preços ao Consumidor" value={`${data.inflacao.toFixed(1)}%`} />
          <StatRow label="Dívida Pública" desc="Relação dívida/PIB" value={`${data.divida.toFixed(1)}%`} />
          <StatRow label="Desemprego" desc="Taxa de desemprego" value={`${data.desemprego.toFixed(1)}%`} />
          <StatRow label="Setor Externo" desc="Balança comercial (US$ bi)" value={`US$ ${data.setorExterno.toFixed(1)} bi`} />
        </div>
      )}
      {data && (
        <div className="text-xs text-gray-500 pt-1">Atualizado em: {new Date(data.atualizadoEm).toLocaleString("pt-BR")}</div>
      )}
    </CardContent>
  </Card>
);

export default function App() {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1.1);
  const [geoData, setGeoData] = useState(null); // UFs

  const fetchData = async () => {
    setLoading(true);
    const res = await mockFetchIndicators("country");
    setData(res);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Carregamento de UFs com fallback para regiões
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(STATES_URL);
        if (!resp.ok) throw new Error("Falha ao baixar UFs");
        const json = await resp.json();
        if (!cancelled) setGeoData(json);
      } catch (e) {
        console.warn("[MAP] Falha ao carregar UFs, usando REGIÕES de fallback", e);
        if (!cancelled) setGeoData(REGIONS_FC);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={`${largeText ? "text-[18px] lg:text-base" : "text-base"} ${highContrast ? "bg-black text-white" : "bg-gray-50 text-gray-900"} min-h-screen`}>
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight">Indicadores econômicos do Brasil</h1>
            <p className="text-gray-600 mt-2 max-w-2xl">Mapa por estados (contornos internos) + painel de dados.</p>
          </div>
          <div className="flex items-center gap-3">
            <Toggle pressed={largeText} onPressedChange={setLargeText}><Accessibility className="h-4 w-4 mr-2"/>Fonte grande</Toggle>
            <Toggle pressed={highContrast} onPressedChange={setHighContrast}>Alto contraste</Toggle>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
          {/* MAPA */}
          <Card className="rounded-3xl shadow-lg">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Map className="h-4 w-4" />
                  <span>Brasil</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(1, z - 0.2))} aria-label="Diminuir zoom"><ZoomOut className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(8, z + 0.2))} aria-label="Aumentar zoom"><ZoomIn className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border bg-white/80">
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: 700, center: [-54, -15] }} width={820} height={540}>
                  <ZoomableGroup center={[-52, -15]} zoom={zoom}>
                    {geoData ? (
                      <Geographies geography={geoData}>
                        {({ geographies }) =>
                          geographies.map((geo) => (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              style={{
                                default: { fill: highContrast ? "#ADD8E6" : MAP_FILL, outline: "none", stroke: highContrast ? MAP_STROKE_EMPH : MAP_STROKE, strokeWidth: 1 },
                                hover: { fill: highContrast ? "#87CEFA" : MAP_FILL_HOVER, outline: "none", stroke: highContrast ? MAP_STROKE_EMPH : MAP_STROKE },
                                pressed: { fill: highContrast ? "#4682B4" : MAP_FILL_PRESS, outline: "none", stroke: highContrast ? MAP_STROKE_EMPH : MAP_STROKE }
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={`Ver dados de ${(geo.properties && (geo.properties.SIGLA_UF || geo.properties.NM_ESTADO || geo.properties.name)) || "UF"}`}
                            />
                          ))
                        }
                      </Geographies>
                    ) : (
                      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">Carregando mapa…</text>
                    )}
                  </ZoomableGroup>
                </ComposableMap>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <MousePointerClick className="h-4 w-4" />
                <span>Clique em um estado para interagir (opcional). Estilo visual igual ao mock.</span>
              </div>
            </CardContent>
          </Card>

          {/* PAINEL DE INDICADORES */}
          <div className="space-y-4">
            <Panel titulo={`Indicadores do Brasil`} loading={loading} data={data} onRefresh={fetchData} />
          </div>
        </section>

        <footer className="mt-10 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Indicadores do Brasil — MVP. Dados demonstrativos.
        </footer>
      </main>
    </div>
  );
}
