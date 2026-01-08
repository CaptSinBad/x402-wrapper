import Link from 'next/link';
import { ArrowRight, CheckCircle2, Zap, Shield, BarChart3, Globe } from 'lucide-react';

export default function Home() {
	return (
		<div className="relative overflow-hidden">
			{/* Hero Section */}
			<section className="relative pt-24 pb-32 max-w-7xl mx-auto px-6">
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-20 pointer-events-none" />

				<div className="relative z-10 text-center max-w-3xl mx-auto">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-border mb-8">
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
							<span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
						</span>
						<span className="text-xs font-mono text-zinc-400">v2.0 Now Available</span>
					</div>

					<h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
						Payments for the <br />
						<span className="text-white">Next Generation</span>
					</h1>

					<p className="text-xl text-zinc-400 mb-10 leading-relaxed">
						Accept crypto payments, monetize APIs, and build commerce applications with the power of x402. Enterprise-grade infrastructure for serious developers.
					</p>

					<div className="flex items-center justify-center gap-4">
						<Link
							href="/signup"
							className="h-12 px-8 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-2 transition-all shadow-[0_0_20px_-5px_rgba(0,82,255,0.5)]"
						>
							Start Building <ArrowRight className="w-4 h-4" />
						</Link>
						<Link
							href="/login"
							className="h-12 px-8 rounded-lg bg-zinc-900 border border-border hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium flex items-center transition-all"
						>
							Documentation
						</Link>
					</div>
				</div>
			</section>

			{/* Grid Section */}
			<section className="max-w-7xl mx-auto px-6 pb-24">
				<div className="grid md:grid-cols-3 gap-6">
					{[
						{
							icon: Zap,
							title: "Instant Settlement",
							desc: "Get paid instantly. No holding periods. Automated withdrawals to your self-custody wallet."
						},
						{
							icon: Shield,
							title: "Enterprise Security",
							desc: "Built on Coinbase x402. Non-custodial by default. Your keys, your funds, your control."
						},
						{
							icon: BarChart3,
							title: "Real-time Insight",
							desc: "Deep analytics for every transaction. Track revenue, conversion rates, and customer behavior."
						}
					].map((feature, i) => (
						<div key={i} className="group p-6 rounded-xl bg-surface border border-border hover:border-zinc-700 transition-all hover:-translate-y-1">
							<div className="w-12 h-12 rounded-lg bg-zinc-900 border border-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
								<feature.icon className="w-6 h-6 text-zinc-400 group-hover:text-primary transition-colors" />
							</div>
							<h3 className="text-lg font-semibold text-zinc-100 mb-2">{feature.title}</h3>
							<p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
