import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  ChartCandlestick,
  ChevronRight,
  CircleAlert,
  Clock3,
  Crosshair,
  LayoutDashboard,
  Play,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import { analyze, type VectorAnalysis } from "@/lib/analysis";
import { trpc } from "@/lib/trpc";
import type { Candle, MarketSnapshot, OtcAsset } from "@shared/market";

const categoryLabels: Record<OtcAsset["category"], string> = {
  forex: "Forex OTC",
  stocks: "Ações OTC",
  crypto: "Cripto OTC",
};

function priceDecimals(price: number) {
  if (price >= 1000) return 2;
  if (price >= 100) return 3;
  return 5;
}

function formatPrice(price?: number) {
  return typeof price === "number" ? price.toFixed(priceDecimals(price)) : "—";
}

function useClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 125);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export default function Home() {
  const [activeId, setActiveId] = useState(76);
  const [view, setView] = useState<"terminal" | "scanner">("terminal");
  const [filter, setFilter] = useState("");
  const assetsQuery = trpc.market.assets.useQuery(undefined, { staleTime: 60_000 });
  const assets = assetsQuery.data ?? [];
  const activeAsset = assets.find((asset) => asset.id === activeId) ?? assets[0];
  const snapshotQuery = trpc.market.snapshot.useQuery(
    { activeId: activeAsset?.id ?? 76, count: 120 },
    { refetchInterval: 1000, refetchIntervalInBackground: false, retry: 1, staleTime: 0 },
  );
  const snapshot = snapshotQuery.data;
  const analysis = useMemo(() => (snapshot ? analyze(snapshot.candles) : null), [snapshot]);
  const now = useClock();
  const seconds = new Date(now).getSeconds();
  const remaining = 60 - seconds;

  const groupedAssets = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (["forex", "stocks", "crypto"] as OtcAsset["category"][])
      .map((category) => ({
        category,
        items: assets.filter(
          (asset) =>
            asset.category === category &&
            (!needle || `${asset.label} ${asset.symbol}`.toLowerCase().includes(needle)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [assets, filter]);

  return (
    <main className="min-h-screen bg-[#080c16] text-slate-100 selection:bg-violet-400/30">
      <div className="pointer-events-none fixed inset-0 vector-grid opacity-50" />
      <div className="pointer-events-none fixed -left-40 top-0 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
      <div className="pointer-events-none fixed right-0 top-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

      <header className="relative z-10 border-b border-white/8 bg-[#0a0f1d]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="prism-logo" aria-label="Prisma IA">
              <span />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-extrabold tracking-[0.14em] text-white sm:text-base">PRISMA IA</h1>
                <span className="hidden rounded-md border border-violet-400/25 bg-violet-400/10 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-violet-200 sm:inline">VECTOR OTC</span>
              </div>
              <p className="mt-0.5 text-[10px] font-medium tracking-[0.16em] text-slate-500">PRECISÃO VISUAL DE MERCADO</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 sm:flex">
              <Waves className="size-3.5 text-cyan-300" />
              <span className="text-[11px] font-semibold text-slate-300">{snapshot?.source === "broker" ? "Feed da corretora" : "Modo simulado"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-2">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-65" /><span className="relative inline-flex size-2 rounded-full bg-emerald-300" /></span>
              <span className="text-[10px] font-bold tracking-[0.12em] text-emerald-200">ATUALIZANDO</span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] max-w-[1600px]">
        <aside className="hidden w-[256px] shrink-0 border-r border-white/8 bg-[#0b1120]/55 lg:block">
          <div className="p-4">
            <p className="px-2 text-[10px] font-bold tracking-[0.15em] text-slate-500">MÓDULOS</p>
            <nav className="mt-3 grid gap-1">
              <NavButton active={view === "terminal"} icon={<LayoutDashboard />} label="Terminal Vector" onClick={() => setView("terminal")} />
              <NavButton active={view === "scanner"} icon={<Radar />} label="Scanner de reversão" onClick={() => setView("scanner")} />
            </nav>
          </div>
          <div className="border-t border-white/8 p-4">
            <p className="px-2 text-[10px] font-bold tracking-[0.15em] text-slate-500">ATIVOS OTC</p>
            <label className="relative mt-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
              <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar ativo" className="w-full rounded-lg border border-white/8 bg-white/[0.035] py-2 pl-8 pr-3 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-violet-400/45" />
            </label>
          </div>
          <div className="max-h-[calc(100vh-290px)] overflow-y-auto px-3 pb-4">
            {groupedAssets.map((group) => (
              <section key={group.category} className="mt-3">
                <p className="px-2 pb-1.5 text-[10px] font-bold tracking-[0.13em] text-slate-600">{categoryLabels[group.category]}</p>
                {group.items.map((asset) => (
                  <button key={asset.id} onClick={() => { setActiveId(asset.id); setView("terminal"); }} className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition ${asset.id === activeAsset?.id ? "bg-violet-400/12 text-white" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}>
                    <span><span className="block text-xs font-semibold">{asset.label.replace(" OTC", "")}</span><span className="mt-0.5 block text-[10px] text-slate-600">{asset.symbol}</span></span>
                    <span className="text-[10px] font-bold text-emerald-300">{asset.payout}%</span>
                  </button>
                ))}
              </section>
            ))}
          </div>
          <div className="m-3 rounded-xl border border-violet-400/15 bg-gradient-to-br from-violet-400/10 to-cyan-400/5 p-3">
            <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-violet-300" /><span className="text-xs font-bold text-violet-100">Vector Guard</span></div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">Só libera sinal quando há reversão, proximidade e ausência de rompimento.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="border-b border-white/8 bg-[#0b1120]/35 px-4 py-2 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              <NavButton active={view === "terminal"} icon={<LayoutDashboard />} label="Terminal" onClick={() => setView("terminal")} />
              <NavButton active={view === "scanner"} icon={<Radar />} label="Scanner" onClick={() => setView("scanner")} />
              {assets.slice(0, 4).map((asset) => <button key={asset.id} onClick={() => setActiveId(asset.id)} className={`shrink-0 rounded-lg px-2.5 py-2 text-xs ${asset.id === activeAsset?.id ? "bg-violet-400/15 text-violet-100" : "text-slate-500"}`}>{asset.label.replace(" OTC", "")}</button>)}
            </div>
          </div>

          {view === "terminal" ? (
            <Terminal snapshot={snapshot} analysis={analysis} asset={activeAsset} loading={snapshotQuery.isLoading} remaining={remaining} onRefresh={() => void snapshotQuery.refetch()} />
          ) : (
            <Scanner assets={assets} onSelect={(id) => { setActiveId(id); setView("terminal"); }} />
          )}
        </section>
      </div>
    </main>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${active ? "bg-violet-400/12 text-violet-100 shadow-[inset_2px_0_0_#a78bfa]" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"}`}>{icon}<span>{label}</span></button>;
}

function Terminal({ snapshot, analysis, asset, loading, remaining, onRefresh }: { snapshot?: MarketSnapshot; analysis: VectorAnalysis | null; asset?: OtcAsset; loading: boolean; remaining: number; onRefresh: () => void }) {
  const [amount, setAmount] = useState("10");
  const [demoLog, setDemoLog] = useState<string | null>(null);
  const demoMutation = trpc.market.recordDemo.useMutation({
    onSuccess: (data) => setDemoLog(`${data.ticket} registrado para ${data.direction.toUpperCase()} em modo DEMO.`),
    onError: () => setDemoLog("Não foi possível registrar a operação demonstrativa."),
  });
  const estimated = (Number(amount) || 0) * ((asset?.payout ?? 0) / 100);
  const signalColor = analysis?.direction === "call" ? "emerald" : analysis?.direction === "put" ? "rose" : "violet";

  return <div className="p-4 sm:p-6">
    <section className="flex flex-col justify-between gap-4 rounded-2xl border border-white/8 bg-[#10182a]/75 p-4 shadow-2xl shadow-black/10 xl:flex-row xl:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/8"><ChartCandlestick className="size-5 text-cyan-200" /></div>
        <div className="min-w-0"><p className="text-[10px] font-bold tracking-[0.15em] text-slate-500">ATIVO SELECIONADO · 1 MINUTO</p><h2 className="truncate text-xl font-extrabold tracking-tight text-white">{asset?.label ?? "Carregando ativo"}</h2><p className="mt-0.5 text-xs text-slate-500">Payout <span className="font-bold text-emerald-300">{asset?.payout ?? "—"}%</span> <span className="px-1 text-slate-700">•</span> {asset?.symbol ?? ""}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Metric label="PREÇO AO VIVO" value={formatPrice(analysis?.lastPrice)} accent="text-white" />
        <Metric label="PRÓXIMA VELA" value={`00:${String(remaining).padStart(2, "0")}`} accent="text-orange-300" />
        <button onClick={onRefresh} className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-slate-400 transition hover:border-violet-300/35 hover:text-violet-200" title="Atualizar agora"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
    </section>

    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
      <div className="min-w-0 space-y-4">
        <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#10182a]/75 shadow-2xl shadow-black/10">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3"><div><p className="text-sm font-bold text-slate-200">Leitura Vector</p><p className="mt-0.5 text-[11px] text-slate-500">Linhas laranja e azul são atualizadas a cada leitura recebida.</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-bold tracking-[0.12em] ${snapshot?.source === "broker" ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-amber-300/20 bg-amber-300/10 text-amber-100"}`}>{snapshot?.source === "broker" ? "FEED DA CORRETORA" : "SIMULAÇÃO VISUAL"}</span></div>
          <div className="p-2 sm:p-4"><TradingChart candles={snapshot?.candles ?? []} analysis={analysis} /></div>
          <div className="grid gap-px border-t border-white/8 bg-white/5 sm:grid-cols-3"><LineLegend color="bg-orange-400" title="LINHA LARANJA" value={`EMA 9 · ${formatPrice(analysis?.emaOrange)}`} /><LineLegend color="bg-sky-400" title="LINHA AZUL" value={`EMA 21 · ${formatPrice(analysis?.emaBlue)}`} /><LineLegend color="bg-violet-400" title="LATÊNCIA DO FEED" value={`${snapshot?.latencyMs ?? 0} ms`} /></div>
        </section>
        <section className="grid gap-3 md:grid-cols-3"><InsightCard icon={<Crosshair />} title="REGRA DE COMPRA" text="Vela vermelha testa a linha abaixo, fica próxima e não fecha rompendo o suporte." tone="emerald" /><InsightCard icon={<Crosshair />} title="REGRA DE VENDA" text="Inverso: vela verde testa a linha acima, rejeita a resistência e não fecha rompendo." tone="rose" /><InsightCard icon={<Clock3 />} title="SEM ESPERA FIXA" text="A interface consulta imediatamente e depois a cada 1 s; nenhuma espera de 5 s é aplicada." tone="violet" /></section>
      </div>

      <div className="space-y-4">
        <section className={`overflow-hidden rounded-2xl border bg-[#10182a]/90 shadow-2xl shadow-black/10 ${signalColor === "emerald" ? "border-emerald-300/30" : signalColor === "rose" ? "border-rose-300/30" : "border-violet-300/25"}`}>
          <div className="border-b border-white/8 p-4 text-center"><p className="text-[10px] font-bold tracking-[0.16em] text-slate-500">SINAL DE REVERSÃO</p>{analysis?.signalReady ? <><div className={`mt-2 flex items-center justify-center gap-2 text-3xl font-black tracking-tight ${analysis.direction === "call" ? "text-emerald-300" : "text-rose-300"}`}>{analysis.direction === "call" ? <ArrowUpRight className="size-7" /> : <ArrowDownRight className="size-7" />}{analysis.direction.toUpperCase()}</div><p className="mt-2 text-xs font-medium text-slate-300">{analysis.pattern}</p></> : <><div className="mt-2 text-xl font-black tracking-tight text-violet-200">EM OBSERVAÇÃO</div><p className="mt-2 text-xs leading-relaxed text-slate-500">O Vector só habilita quando a vela confirma reversão sem rompimento.</p></>}</div>
          <div className="p-4"><div className="flex items-center justify-between text-xs"><span className="text-slate-500">Qualidade da estrutura</span><span className="font-bold text-white">{analysis?.confidence ?? 0}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/7"><div className={`h-full rounded-full transition-all duration-300 ${signalColor === "emerald" ? "bg-emerald-300" : signalColor === "rose" ? "bg-rose-300" : "bg-violet-300"}`} style={{ width: `${analysis?.confidence ?? 0}%` }} /></div><div className="mt-4 rounded-xl border border-white/8 bg-black/15 p-3"><div className="flex items-center gap-2"><Sparkles className="size-3.5 text-violet-300" /><span className="text-[11px] font-bold text-slate-300">{analysis?.context ?? "Aguardando feed"}</span></div><p className="mt-1.5 text-[11px] text-slate-500">{analysis?.activeLine ? `Linha ativa: ${analysis.activeLine === "orange" ? "laranja / EMA 9" : "azul / EMA 21"}` : "Nenhuma linha validada como suporte ou resistência."}</p></div></div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[#10182a]/75 p-4 shadow-2xl shadow-black/10"><p className="text-[10px] font-bold tracking-[0.15em] text-slate-500">CHECKLIST DO VECTOR</p><div className="mt-3 space-y-2">{analysis?.signalReady ? analysis.reasons.map((reason) => <Checklist key={reason} ok text={reason} />) : (analysis?.blocks ?? ["Carregando leituras do mercado."]).map((block) => <Checklist key={block} ok={false} text={block} />)}</div></section>

        <section className="rounded-2xl border border-white/8 bg-[#10182a]/75 p-4 shadow-2xl shadow-black/10"><div className="flex items-center justify-between"><p className="text-[10px] font-bold tracking-[0.15em] text-slate-500">EXECUÇÃO ASSISTIDA</p><span className="rounded-md bg-cyan-300/10 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.12em] text-cyan-200">DEMO</span></div><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[11px] text-slate-500">Entrada ($)<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-sm font-bold text-white outline-none focus:border-violet-300/45" /></label><div className="text-[11px] text-slate-500">Retorno estimado<div className="mt-1.5 rounded-lg border border-emerald-300/15 bg-emerald-300/7 px-3 py-2 text-sm font-bold text-emerald-200">+${estimated.toFixed(2)}</div></div></div><button disabled={!analysis?.signalReady || demoMutation.isPending} onClick={() => analysis && asset && demoMutation.mutate({ activeId: asset.id, direction: analysis.direction === "hold" ? "call" : analysis.direction, amount: Math.max(1, Number(amount) || 1) })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-300 px-4 py-3 text-sm font-extrabold text-[#0a0f1d] transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"><Play className="size-4 fill-current" />{demoMutation.isPending ? "Registrando..." : analysis?.signalReady ? "Registrar entrada DEMO" : "Aguardando confirmação Vector"}</button>{demoLog && <p className="mt-2 text-center text-[11px] text-cyan-200">{demoLog}</p>}<p className="mt-3 text-[10px] leading-relaxed text-slate-600">A operação demonstrativa não envia ordem real. Conexão e execução na corretora permanecem desligadas até configuração segura.</p></section>
      </div>
    </div>
  </div>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) { return <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2"><p className="text-[9px] font-bold tracking-[0.13em] text-slate-600">{label}</p><p className={`mt-0.5 font-mono text-sm font-bold ${accent}`}>{value}</p></div>; }
function LineLegend({ color, title, value }: { color: string; title: string; value: string }) { return <div className="flex items-center gap-2 bg-[#0e1525]/80 px-4 py-3"><span className={`size-2.5 rounded-full ${color}`} /><div><p className="text-[9px] font-bold tracking-[0.12em] text-slate-600">{title}</p><p className="mt-0.5 font-mono text-xs font-semibold text-slate-300">{value}</p></div></div>; }
function InsightCard({ icon, title, text, tone }: { icon: React.ReactNode; title: string; text: string; tone: "emerald" | "rose" | "violet" }) { const tones = { emerald: "border-emerald-300/15 bg-emerald-300/[0.045] text-emerald-200", rose: "border-rose-300/15 bg-rose-300/[0.045] text-rose-200", violet: "border-violet-300/15 bg-violet-300/[0.045] text-violet-200" }; return <div className={`rounded-2xl border p-3 ${tones[tone]}`}><div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em]">{icon}{title}</div><p className="mt-2 text-[11px] leading-relaxed text-slate-400">{text}</p></div>; }
function Checklist({ ok, text }: { ok: boolean; text: string }) { return <div className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed ${ok ? "border-emerald-300/12 bg-emerald-300/[0.045] text-emerald-100" : "border-white/7 bg-white/[0.02] text-slate-400"}`}>{ok ? <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-300" /> : <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" />}<span>{text}</span></div>; }

function TradingChart({ candles, analysis }: { candles: Candle[]; analysis: VectorAnalysis | null }) {
  const visible = candles.slice(-60);
  if (!visible.length) return <div className="flex h-[340px] items-center justify-center text-sm text-slate-600">Conectando o feed de velas…</div>;
  const width = 960; const height = 350; const pad = { top: 24, right: 18, bottom: 26, left: 18 };
  const orange = analysis?.lines.orange.slice(-visible.length) ?? []; const blue = analysis?.lines.blue.slice(-visible.length) ?? [];
  const values = [...visible.flatMap((candle) => [candle.high, candle.low]), ...orange, ...blue].filter(Number.isFinite);
  const max = Math.max(...values); const min = Math.min(...values); const range = max - min || 1;
  const chartW = width - pad.left - pad.right; const chartH = height - pad.top - pad.bottom;
  const y = (value: number) => pad.top + ((max - value) / range) * chartH;
  const x = (index: number) => pad.left + (index + 0.5) * (chartW / visible.length);
  const candleWidth = Math.max(3, (chartW / visible.length) * 0.58);
  const path = (series: number[]) => series.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  return <div className="relative overflow-hidden rounded-xl border border-white/6 bg-[#090e19]"><svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="Gráfico de velas com linhas laranja e azul">{[0.2, 0.4, 0.6, 0.8].map((ratio) => <line key={ratio} x1={pad.left} x2={width-pad.right} y1={pad.top + chartH * ratio} y2={pad.top + chartH * ratio} stroke="rgba(148,163,184,.11)" strokeDasharray="4 5" />)}{orange.length > 1 && <path d={path(orange)} fill="none" stroke="#fb923c" strokeWidth="2.4" strokeLinecap="round" />}{blue.length > 1 && <path d={path(blue)} fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" />}{visible.map((candle, index) => { const rising = candle.close >= candle.open; const color = rising ? "#50e3a4" : "#fb7185"; const center = x(index); const top = y(Math.max(candle.open, candle.close)); const bodyHeight = Math.max(1.5, Math.abs(y(candle.open)-y(candle.close))); return <g key={candle.time}><line x1={center} x2={center} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth="1.2" opacity=".9" /><rect x={center-candleWidth/2} y={top} width={candleWidth} height={bodyHeight} rx="1" fill={color} /></g>; })}{analysis?.signalReady && <g transform={`translate(${x(visible.length - 1)},${y(visible[visible.length - 1].high) - 18})`}><circle r="11" fill={analysis.direction === "call" ? "#34d399" : "#fb7185"} opacity=".95" /><path d={analysis.direction === "call" ? "M-4,3 L0,-4 L4,3" : "M-4,-3 L0,4 L4,-3"} fill="none" stroke="#07111f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>}</svg><div className="absolute left-3 top-3 rounded-md border border-white/10 bg-[#0b1120]/85 px-2 py-1 font-mono text-[10px] text-slate-500">60 velas · atualização viva</div></div>;
}

function Scanner({ assets, onSelect }: { assets: OtcAsset[]; onSelect: (id: number) => void }) {
  const [rows, setRows] = useState<{ asset: OtcAsset; analysis: VectorAnalysis }[]>([]);
  const scan = trpc.market.scan.useMutation({ onSuccess: (snapshots) => { setRows(snapshots.map((snapshot) => { const analysis = analyze(snapshot.candles); return analysis ? { asset: assets.find((asset) => asset.id === snapshot.assetId)!, analysis } : null; }).filter((row): row is { asset: OtcAsset; analysis: VectorAnalysis } => row !== null).sort((a, b) => Number(b.analysis.signalReady) - Number(a.analysis.signalReady) || b.analysis.confidence - a.analysis.confidence)); } });
  const run = () => scan.mutate({ activeIds: assets.slice(0, 10).map((asset) => asset.id) });
  return <div className="p-4 sm:p-6"><section className="rounded-2xl border border-white/8 bg-[#10182a]/75 p-5 shadow-2xl shadow-black/10"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-bold tracking-[0.15em] text-violet-300">MODO VECTOR</p><h2 className="mt-1 text-2xl font-extrabold text-white">Scanner de reversão sem rompimento</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Varre os ativos e prioriza somente estruturas em que uma linha esteja próxima e a vela tenha rejeitado o nível, sem rompê-lo.</p></div><button onClick={run} disabled={scan.isPending || assets.length === 0} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-300 px-4 py-3 text-sm font-extrabold text-[#0a0f1d] transition hover:bg-violet-200 disabled:opacity-50"><Radar className="size-4" />{scan.isPending ? "Varrendo..." : "Iniciar varredura"}</button></div></section><section className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-[#10182a]/75 shadow-2xl shadow-black/10">{rows.length ? <div className="divide-y divide-white/7">{rows.map(({ asset, analysis }) => <button key={asset.id} onClick={() => onSelect(asset.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"><span className={`flex size-9 items-center justify-center rounded-lg ${analysis.signalReady ? analysis.direction === "call" ? "bg-emerald-300/12 text-emerald-200" : "bg-rose-300/12 text-rose-200" : "bg-white/[0.04] text-slate-500"}`}>{analysis.direction === "call" ? <ArrowUpRight className="size-4" /> : analysis.direction === "put" ? <ArrowDownRight className="size-4" /> : <Activity className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-200">{asset.label}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{analysis.signalReady ? analysis.pattern : analysis.blocks[0] ?? "Aguardando estrutura"}</span></span><span className="hidden text-right sm:block"><span className="block text-xs font-bold text-white">{analysis.confidence}%</span><span className="text-[10px] text-slate-500">{analysis.signalReady ? analysis.direction.toUpperCase() : "OBSERVAR"}</span></span><ChevronRight className="size-4 text-slate-600" /></button>)}</div> : <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center"><Bot className="size-8 text-violet-300/65" /><p className="mt-3 text-sm font-semibold text-slate-300">Nenhuma varredura executada</p><p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">O scanner permanece conservador: uma vela verde ou vermelha sozinha não gera sinal.</p></div>}</section></div>;
}
