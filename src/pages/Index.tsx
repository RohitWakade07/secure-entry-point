import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Target, BarChart3, ArrowRight } from "lucide-react";

const features = [
  { icon: BookOpen, title: "Topic-wise Practice", desc: "Practice questions organized by subject and topic with detailed explanations." },
  { icon: Target, title: "Mock Tests", desc: "Full-length timed mock tests that simulate the real GATE exam experience." },
  { icon: BarChart3, title: "Performance Analytics", desc: "Track your accuracy, speed, and identify weak areas with detailed insights." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>GATE Prep Pro</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 text-center lg:px-12 lg:py-32">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Free to get started
          </div>
          <h1
            className="mx-auto max-w-3xl text-4xl font-bold leading-tight lg:text-6xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Crack GATE with{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
              smart preparation
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Practice topic-wise questions, take mock tests, and get AI-powered insights to maximize your GATE score.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Start Practicing <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 lg:px-12">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-6 card-hover"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        © 2026 GATE Prep Pro. Built for aspiring engineers.
      </footer>
    </div>
  );
};

export default Index;
