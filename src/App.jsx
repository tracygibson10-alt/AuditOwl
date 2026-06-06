import { useState } from 'react'

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url) return
    
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const response = await fetch('http://localhost:3001/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const result = await response.json()
      if (result.success) {
        setReport(result.data)
      } else {
        setError(result.error || 'Failed to generate audit')
      }
    } catch (err) {
      setError('Could not connect to audit engine. Make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center selection:bg-indigo-500 selection:text-white pb-20">
      {/* Navigation */}
      <nav className="w-full max-w-7xl px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setReport(null)}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold text-white">🦉</span>
          </div>
          <span className="text-2xl font-bold tracking-tight">AuditOwl</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
        </div>
        <button className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all">
          Sign In
        </button>
      </nav>

      {/* Hero / Input Section */}
      {!report ? (
        <main className="flex-1 w-full max-w-7xl px-6 py-12 md:py-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">AI-Powered CRO Audits</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl">
            Turn your visitors into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">loyal customers.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12">
            Get a comprehensive, AI-powered audit of your website's conversion rates and SEO in seconds. Actionable insights without the expensive consultant.
          </p>

          {/* Audit Input */}
          <div className="w-full max-w-2xl bg-slate-900/50 p-2 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-sm mb-8">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2">
              <input
                type="url"
                placeholder="https://yourwebsite.com"
                required
                disabled={loading}
                className="flex-1 bg-transparent px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-lg disabled:opacity-50"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center min-w-[180px]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : 'Run Free Audit'}
              </button>
            </form>
          </div>

          {error && <p className="text-red-400 mb-8 font-medium">{error}</p>}

          {/* Metrics Preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl">
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-white">100+</span>
              <span className="text-sm text-slate-500 uppercase tracking-widest font-semibold">Checkpoints</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-white">&lt; 30s</span>
              <span className="text-sm text-slate-500 uppercase tracking-widest font-semibold">Audit Time</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-white">2.4x</span>
              <span className="text-sm text-slate-500 uppercase tracking-widest font-semibold">Avg. Growth</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-white">GPT-4o</span>
              <span className="text-sm text-slate-500 uppercase tracking-widest font-semibold">AI Analysis</span>
            </div>
          </div>

          {/* Features Section */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mt-24 text-left">
            <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-colors group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform inline-block">📈</div>
              <h3 className="text-xl font-bold mb-3">Conversion (CRO)</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI-driven analysis of your CTAs, value prop, and trust signals to turn more visitors into buyers.
              </p>
            </div>
            <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-colors group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform inline-block">🔍</div>
              <h3 className="text-xl font-bold mb-3">Smart SEO</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Deep dive into on-page foundations, content quality, and technical health to boost rankings.
              </p>
            </div>
            <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-colors group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform inline-block">⚡</div>
              <h3 className="text-xl font-bold mb-3">Speed & Mobile</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Core Web Vitals and mobile responsiveness audit to ensure a flawless experience on every device.
              </p>
            </div>
          </div>
        </main>
      ) : (
        /* Report View */
        <main className="w-full max-w-4xl px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Audit Report</h2>
              <p className="text-slate-400">{url}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-indigo-400">{report.healthScore}</div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Health Score</div>
            </div>
          </div>

          <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-2xl mb-8">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <span>✨</span> Executive Summary
            </h3>
            <p className="text-slate-300 leading-relaxed">{report.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <span className="text-indigo-400">📈</span> Conversion (CRO)
              </h3>
              <ul className="space-y-4 text-sm">
                <li>
                  <span className="block text-slate-500 font-semibold uppercase text-xs mb-1">Value Prop</span>
                  <span className="text-slate-300">{report.cro.valueProp}</span>
                </li>
                <li>
                  <span className="block text-slate-500 font-semibold uppercase text-xs mb-1">CTA Audit</span>
                  <span className="text-slate-300">{report.cro.ctaAudit}</span>
                </li>
                <li>
                  <span className="block text-slate-500 font-semibold uppercase text-xs mb-1">Trust Signals</span>
                  <span className="text-slate-300">{report.cro.trustSignals}</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <span className="text-indigo-400">🔍</span> Search (SEO)
              </h3>
              <ul className="space-y-4 text-sm">
                <li>
                  <span className="block text-slate-500 font-semibold uppercase text-xs mb-1">Title Tag</span>
                  <span className="text-slate-300">{report.seo.titleTag}</span>
                </li>
                <li>
                  <span className="block text-slate-500 font-semibold uppercase text-xs mb-1">Meta Description</span>
                  <span className="text-slate-300">{report.seo.metaDescription}</span>
                </li>
                <li>
                  <span className="block text-slate-500 font-semibold uppercase text-xs mb-1">Header Hierarchy</span>
                  <span className="text-slate-300">{report.seo.h1Hierarchy}</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl md:col-span-2">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <span className="text-indigo-400">⚡</span> Performance
              </h3>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <div className="text-3xl font-bold text-white mb-1">{report.performance.score}/100</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Perf Score</div>
                </div>
                <div className="flex-[2]">
                  <span className="block text-slate-500 font-semibold uppercase text-xs mb-2">Recommendations</span>
                  <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                    {report.performance.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button 
              onClick={() => setReport(null)}
              className="text-slate-500 hover:text-white transition-colors text-sm font-medium"
            >
              ← Run another audit
            </button>
          </div>
        </main>
      )}

      {/* Social Proof (only on home) */}
      {!report && (
        <section className="w-full bg-slate-900/30 border-y border-slate-800 py-12">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">Trusted by 500+ businesses and agencies</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-30 grayscale hover:grayscale-0 transition-all">
              <div className="text-2xl font-black">STRIKE</div>
              <div className="text-2xl font-black italic">VENTURE</div>
              <div className="text-2xl font-black tracking-tighter">CLOUD9</div>
              <div className="text-2xl font-black">MOMENTUM</div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="w-full max-w-7xl px-6 py-12 mt-auto flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">AuditOwl</span>
          <span>© 2024 AuditOwl. All rights reserved.</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Twitter</a>
        </div>
      </footer>
    </div>
  )
}

export default App
