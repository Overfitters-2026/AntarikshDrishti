import React from 'react';
import { motion } from 'motion/react';
import { TEAM_MEMBERS } from '../data/team';
import { Terminal, Cpu, Satellite, Layers, Code2, ArrowUpRight } from 'lucide-react';

export const TeamSection: React.FC = () => {
  return (
    <section id="team" className="relative py-28 sm:py-36 bg-[#030712] border-t border-white/[0.08] overflow-hidden select-none">
      {/* Transparent Earth Background Overlay (Developer Section) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <img
          src="/assets/images/earth_studio_orbit_india_1790759562196.jpg"
          alt="Earth Orbital Background"
          className="w-full h-full object-cover object-center opacity-15 filter contrast-125 brightness-75 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/75 to-[#030712]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-transparent to-[#030712]" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#030712]/50 to-[#030712]" />
      </div>

      {/* Background Reticle Grid & Subtle Aerospace Ambience */}
      <div className="absolute inset-0 reticle-grid opacity-20 pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[300px] bg-cyan-950/15 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-16 sm:mb-20"
        >
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-widest uppercase mb-3">
            <Satellite className="w-4 h-4 text-cyan-400" />
            <span>Smart India Hackathon 2026 · Problem Statement 227</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tight leading-[1.08] text-balance">
            BUILT BY THE TEAM
          </h2>

          <p className="mt-4 text-xl sm:text-2xl font-display font-medium text-slate-300 leading-snug text-balance">
            Engineering, geospatial intelligence and AI working together.
          </p>

          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed font-sans max-w-2xl">
            A multidisciplinary engineering group combining deep remote sensing radiometric science, computer vision architecture, and distributed geospatial pipeline engineering.
          </p>
        </motion.div>

        {/* Premium Minimal Engineering Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEAM_MEMBERS.map((member, idx) => {
            const initials = member.name
              .split(' ')
              .map(n => n[0])
              .join('');

            return (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative p-6 sm:p-7 rounded-2xl bg-[#040711]/90 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-500/40 hover:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              >
                {/* Header Callout & Telemetry Code */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    {/* Minimal Geometric Callout Initials */}
                    <div className="w-11 h-11 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm group-hover:border-cyan-500/40 group-hover:scale-105 group-hover:text-cyan-300 transition-all shadow-[0_0_12px_rgba(6,182,212,0.1)]">
                      {initials}
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-[10px] text-slate-500 tracking-wider block">
                        ENGINEERING / 0{idx + 1}
                      </span>
                      <span className="font-mono text-[9px] text-cyan-400/80 uppercase">
                        ACTIVE CORE
                      </span>
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-display font-bold text-white group-hover:text-cyan-200 transition-colors leading-tight">
                    {member.name}
                  </h3>

                  {/* Role */}
                  <div className="text-xs font-mono text-cyan-400 font-medium mt-1 mb-3.5 leading-snug">
                    {member.role}
                  </div>

                  {/* Responsibility / Contribution */}
                  <p className="text-xs text-slate-300 leading-relaxed font-sans mb-6">
                    {member.contribution}
                  </p>
                </div>

                {/* Technology Focus */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Code2 className="w-3 h-3 text-cyan-400/80" />
                    <span>Technology Focus</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {member.technologies.map(tech => (
                      <span
                        key={tech}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-800 group-hover:border-cyan-500/20 transition-colors"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom System Architecture & Defense Alignment Ribbon */}
        <div className="mt-16 p-6 rounded-2xl bg-slate-950/70 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-white font-semibold">ANTARIKSH DRISHTI CORE DEV GROUP</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-slate-400 hidden sm:inline">ISRO &amp; MoES Problem Statement 227</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>MULTISPECTRAL EO</span>
            <span>SIAMESE X-ATTN</span>
            <span>STAC PYRAMIDS</span>
          </div>
        </div>

      </div>
    </section>
  );
};
