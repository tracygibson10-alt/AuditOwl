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
        <main className="w-full max-w-5xl px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full mb-4">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Free Mini-Audit Results</span>
              </div>
              <h2 className="text-4xl font-bold mb-2">Website Audit Report</h2>
              <p className="text-slate-400 font-mono text-sm">{url}</p>
            </div>
            <div className="flex gap-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <div className="text-center">
                <div className="text-4xl font-black text-indigo-400">{report.healthScore}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Health Score</div>
              </div>
              <div className="w-px h-10 bg-slate-800 self-center"></div>
              <div className="text-center">
                <div className="text-4xl font-black text-red-400">{report.criticalIssuesCount}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Critical</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600/20 to-cyan-600/10 border border-indigo-500/20 p-8 rounded-3xl mb-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl">🦉</div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>✨</span> Executive Summary
            </h3>
            <p className="text-slate-300 text-lg leading-relaxed max-w-3xl">{report.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* CRO Section */}
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-indigo-400">📈</span> Conversion (CRO)
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Value Prop Clarity</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${report.cro.valuePropClarity === 'Clear' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {report.cro.valuePropClarity}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm italic">"{report.cro.valuePropTeaser}"</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Primary CTA Check</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${report.cro.hasAboveFoldCTA ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {report.cro.hasAboveFoldCTA ? 'Found Above Fold' : 'Missing Above Fold'}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm">{report.cro.ctaAudit}</p>
                </div>
              </div>
            </div>

            {/* SEO Section */}
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-indigo-400">🔍</span> Basic SEO Health
              </h3>
              <div className="space-y-6 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Title Tag</span>
                  <span className="text-slate-200 font-semibold">{report.seo.titleTag}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">Meta Description</span>
                  <span className="text-slate-200 font-semibold">{report.seo.metaDescription}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400 font-medium">H1 Hierarchy</span>
                  <span className="text-slate-200 font-semibold">{report.seo.h1Check}</span>
                </div>
              </div>
            </div>

            {/* Performance Section */}
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl md:col-span-2">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-indigo-400">⚡</span> Performance & Mobile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-950/50 p-6 rounded-2xl text-center">
                   <div className="text-3xl font-bold text-white mb-1">{report.performance.loadTimeSec}s</div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Load Time</div>
                </div>
                <div className="bg-slate-950/50 p-6 rounded-2xl text-center">
                   <div className={`text-3xl font-bold mb-1 ${report.performance.isResponsive === 'Pass' ? 'text-green-400' : 'text-red-400'}`}>{report.performance.isResponsive}</div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mobile Responsive</div>
                </div>
                <div className="bg-slate-950/50 p-6 rounded-2xl text-center">
                   <div className={`text-3xl font-bold mb-1 ${report.performance.cwvTeaser.startsWith('Pass') ? 'text-green-400' : 'text-yellow-400'}`}>{report.performance.cwvTeaser.split(' ')[0]}</div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Core Web Vitals</div>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="bg-indigo-600 p-10 rounded-3xl text-center shadow-xl shadow-indigo-600/20">
            <h3 className="text-2xl font-bold mb-4">Want the full implementation roadmap?</h3>
            <p className="text-indigo-100 mb-8 max-w-2xl mx-auto text-lg">
              Get the $19 Full Deep-Dive Audit. Includes fix-it guides, detailed technical SEO, competitor benchmarking, and prioritized tasks.
            </p>
            <button className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black text-xl hover:scale-105 transition-transform">
              Get Full Audit - $19
            </button>
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
