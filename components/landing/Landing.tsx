"use client";

// Public landing page, ported from the published Duely landing (scratchpad/landing). Styles: app/_landing/landing.css (scoped under .ld).
import { useEffect, useRef } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";

const ROWS: [string, string, string, string, string, string, string][] = [
  ["LE", "Lumen Eye Clinic", "Escalate: credit hold", "₱601,661", "65 days", "#FF8FB1", "#FF7A85"],
  ["MH", "Mercy Hills Hospital", "Call now · broke a promise", "₱1,071,287", "14 days", "#AB9FF2", "#FFC960"],
  ["NM", "Northpoint Medical Center", "Call now · no contact 14+ days", "₱1,317,250", "16 days", "#9FD8FF", "#FFC960"],
  ["SL", "San Lorenzo Medical Center", "Send reminder", "₱1,703,544", "27 days", "#7EE2B8", "#FFC960"],
  ["SA", "St. Agnes General Hospital", "Send reminder", "₱517,170", "9 days", "#FFB38A", "#FFE08A"],
  ["BO", "Brightsight Optical", "Send reminder", "₱119,950", "9 days", "#E2DFFE", "#FFE08A"],
  ["IO", "Iris Optical Gallery", "Deposit check 8 Sep", "₱289,060", "covered", "#9FD8FF", "#4ADE9A"],
];

export function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const pointer = { x: 0, y: 0 };
    let tx = 0, ty = 0, sy = window.scrollY, raf = 0, alive = true;
    const speeds = Array.from(root.querySelectorAll<HTMLElement>("[data-speed]"));
    const depths = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]"));
    const onMove = (e: PointerEvent) => { pointer.x = e.clientX / window.innerWidth - 0.5; pointer.y = e.clientY / window.innerHeight - 0.5; };
    const onScroll = () => { sy = window.scrollY; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    function parallax() {
      if (!alive) return;
      tx += (pointer.x - tx) * 0.06;
      ty += (pointer.y - ty) * 0.06;
      for (const el of speeds) {
        const r = el.getBoundingClientRect();
        const mid = r.top + r.height / 2 - window.innerHeight / 2;
        el.style.transform = `translate3d(0,${(mid * -parseFloat(el.dataset.speed || "0")).toFixed(1)}px,0)`;
      }
      for (const el of depths) {
        const d = parseFloat(el.dataset.depth || "0");
        el.style.transform = `translate3d(${(tx * d * 36).toFixed(1)}px,${(ty * d * 36 - sy * d * 0.12).toFixed(1)}px,0) rotate(${(tx * d * 3).toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(parallax);
    }
    if (!reduce) raf = requestAnimationFrame(parallax);

    let cleanupScene: (() => void) | null = null;
    import("./heroScene")
      .then(({ startHeroScene }) => {
        if (alive) cleanupScene = startHeroScene(canvas, canvas.parentElement as HTMLElement, pointer, reduce);
      })
      .catch(() => {});

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      cleanupScene?.();
    };
  }, []);

  const feed = ROWS.map((r, i) => (
    <div className="row" key={i}>
      <span className="av" style={{ background: r[5] }}>{r[0]}</span>
      <span className="t"><b>{r[1]}</b><small>{r[2]}</small></span>
      <span className="amt num">{r[3]}<small style={{ color: r[6] }}>{r[4]}</small></span>
    </div>
  ));

  return (
    <div className="ld" ref={rootRef}>
      <header className="nav">
        <div className="wrap">
          <div className="bar">
            <a className="logo" href="#top"><LogoMark size={30} />duely</a>
            <nav aria-label="Sections"><a href="#how">How it works</a><a href="#product">Product</a><a href="#teams">For teams</a></nav>
            <Link className="pill pill-ink" href="/login" style={{minHeight:"42px",padding:"0 18px"}}>Sign in</Link>
          </div>
        </div>
      </header>

      <main id="top">
      <section className="hero" aria-label="Introduction">
        <canvas ref={canvasRef} id="gl" aria-hidden="true"></canvas>
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">Collections, made friendly</span>
            <h1 style={{marginTop:"14px"}}>Get paid <em>before</em> it goes bad.</h1>
            <p className="lede">Duely tells your collectors who to chase, which checks to deposit and what to say. Every peso is checked by the rules engine before a message goes out.</p>
            <div className="ctas">
              <Link className="pill pill-ink" href="/login">Start today&apos;s list
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
              <a className="pill pill-soft" href="#product">See it in action</a>
            </div>
            <p className="note">Demo uses synthetic data for an ophthalmic distributor. Client names are fictional.</p>
          </div>
          <div className="floaters" aria-label="Examples from the app">
            <div className="fcard" data-depth="1.4" style={{left:"4%",top:"6%"}}>
              <span className="av" style={{background:"#FF8FB1"}}>LE</span>
              <span><b>Lumen Eye Clinic</b><small>Broke 25 Aug promise · score 75</small></span>
              <span className="chip" style={{background:"#AB9FF2",color:"#17131F"}}>Call now</span>
            </div>
            <div className="fcard" data-depth="2.2" style={{right:"0",top:"34%"}}>
              <span className="av" style={{background:"#9FD8FF"}}>IO</span>
              <span><b className="num">₱289,060 check</b><small>Iris Optical Gallery · deposit 8 Sep</small></span>
            </div>
            <div className="fcard" data-depth="0.9" style={{left:"10%",bottom:"16%"}}>
              <span className="av" style={{background:"#7EE2B8"}}>✓</span>
              <span><b>Reminder approved</b><small>San Lorenzo · 7 numbers verified</small></span>
            </div>
            <div className="fcard" data-depth="1.8" style={{right:"8%",bottom:"2%",background:"#fff",color:"#241B3A"}}>
              <span className="av" style={{background:"#AB9FF2"}}>AI</span>
              <span><b>&ldquo;Who should I call first?&rdquo;</b><small style={{color:"#5B5175"}}>Ask Duely anything</small></span>
            </div>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="track">
          <span>Who to chase</span><span>Which checks to deposit</span><span>What to say</span><span>When to escalate</span><span>Who broke a promise</span>
          <span>Who to chase</span><span>Which checks to deposit</span><span>What to say</span><span>When to escalate</span><span>Who broke a promise</span>
        </div>
      </div>

      <section className="stats" aria-label="Results on the demo data">
        <div className="wrap">
          <div className="stats-head">
            <h2>One upload. A whole month, sorted.</h2>
            <span className="eyebrow">Demo month ending 30 Sep 2026</span>
          </div>
          <div className="stat-grid">
            <div className="stat" data-speed="0.04"><span className="big num">27</span><p>clients ranked for follow-up, scored by rules you can read line by line.</p></div>
            <div className="stat" data-speed="0.08"><span className="big num">₱1.37M</span><p>flagged at risk early, up from ₱431,617 a month before.</p></div>
            <div className="stat" data-speed="0.12"><span className="big num">₱914,140</span><p>estimated bad debt against a ₱650,000 allowance. The CFO sees the gap on day one.</p></div>
            <div className="stat" data-speed="0.06"><span className="big num">86.9<span style={{fontSize:".5em"}}> days</span></span><p>days sales outstanding, tracked month over month with the reasons behind it.</p></div>
          </div>
        </div>
      </section>

      <section className="how" id="how" aria-label="How it works">
        <span className="orb" style={{width:"380px",height:"380px",background:"#AB9FF2",left:"-120px",top:"-80px"}} data-speed="-0.12"></span>
        <span className="orb" style={{width:"300px",height:"300px",background:"#FF8FB1",right:"-80px",bottom:"-60px"}} data-speed="0.1"></span>
        <div className="wrap" style={{position:"relative"}}>
          <span className="eyebrow">How it works</span>
          <h2 style={{marginTop:"12px"}}>Code does the maths. AI does the words. People decide.</h2>
          <div className="steps">
            <article className="step" data-speed="0.03"><span className="n">1</span><h3>Upload the exports</h3><p>Drop in the month-end files. Columns are matched for you, and dates that could mean two things get a quick question.</p><span className="tag">13 files · reconciled</span></article>
            <article className="step" data-speed="0.06"><span className="n">2</span><h3>Rules engine scores</h3><p>Aging, promises, bounced checks and limits become one priority score per client. No guessing.</p><span className="tag">Tested against expected results</span></article>
            <article className="step" data-speed="0.09"><span className="n">3</span><h3>Agents draft</h3><p>Claude writes the reminder in the right tone. A reviewer agent traces every number back to the engine.</p><span className="tag">Friendly · firm · final</span></article>
            <article className="step" data-speed="0.06"><span className="n">4</span><h3>Supervisor approves</h3><p>Nothing reaches a client without a person saying yes. Final notices go to top management.</p><span className="tag">Human in the loop</span></article>
            <article className="step" data-speed="0.03"><span className="n">5</span><h3>Collect and log</h3><p>Call, message, log the promise. A morning digest lands at 8:00 and reminders nudge you when checks are due.</p><span className="tag">Daily at 08:00</span></article>
          </div>
        </div>
      </section>

      <section className="stage" id="product" aria-label="Product">
        <div className="wrap stage-grid">
          <div>
            <span className="eyebrow">Your day, in your pocket</span>
            <h2 style={{marginTop:"12px"}}>Feels like a wallet. Works like a finance team.</h2>
            <p className="lede">Open the app and today&apos;s list is already waiting, ranked and explained. Ask the ledger a question and it answers from your own data, with its sources.</p>
            <div className="feat">
              <div><i><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B6CE0" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg></i><span><b>Today&apos;s list</b>Who to chase first, and why, in plain words.</span></div>
              <div><i><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B6CE0" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M21 12a8 8 0 1 1-3-6.2L21 4v5h-5" /></svg></i><span><b>Ask Duely</b>A chatbot that searches invoices, payments and notes, then shows where the answer came from.</span></div>
              <div><i><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B6CE0" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3" /><path d="M7 10h6" /></svg></i><span><b>Checks calendar</b>Post-dated checks lined up by deposit day, with bounced ones flagged.</span></div>
            </div>
          </div>
          <div className="scene">
            <div className="phone" data-speed="-0.05">
              <div className="screen">
                <div className="top"><small>Collecting Agent · overdue in your accounts</small><div className="bal num">₱5.6M</div><small style={{color:"#7EE2B8"}}>₱1.4M promised today · 56% of goal</small></div>
                <div className="acts">
                  <span><i><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AB9FF2" strokeWidth="2.2" aria-hidden="true"><path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg></i>Call</span>
                  <span><i><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AB9FF2" strokeWidth="2.2" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z" /></svg></i>Message</span>
                  <span><i><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AB9FF2" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></i>Log</span>
                  <span><i><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AB9FF2" strokeWidth="2.2" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 16.5v.5" /></svg></i>Ask</span>
                </div>
                <div className="feed"><div className="feed-track">{feed}{feed}</div></div>
              </div>
            </div>
            <div className="bubble" data-speed="0.14" style={{left:"0",top:"70px"}}><small>You asked</small>Who should I call first today?</div>
            <div className="bubble ai" data-speed="0.22" style={{right:"0",top:"200px"}}><small>Ask Duely</small>Start with Lumen Eye Clinic. They broke the <b className="num">₱230,000</b> promise due 25 Aug and a <b className="num">₱145,040</b> check hasn&apos;t been replaced.<div className="srcs"><span>Follow-up list</span><span>Contact log</span><span>Bounced checks</span></div></div>
            <div className="bubble" data-speed="0.1" style={{left:"4%",bottom:"40px"}}><small>Reviewer agent</small><span style={{color:"#17603A",fontWeight:"700"}}>✓ All 7 numbers match the engine</span></div>
          </div>
        </div>
      </section>

      <div className="marquee dark rev" aria-label="Built with">
        <div className="track">
          <span>Claude agents</span><span>RAG over your ledger</span><span>MCP tools</span><span>n8n morning digest</span><span>Supabase + pgvector</span><span>Deployed on Vercel</span><span>Row-level security</span><span>Human approval</span>
          <span>Claude agents</span><span>RAG over your ledger</span><span>MCP tools</span><span>n8n morning digest</span><span>Supabase + pgvector</span><span>Deployed on Vercel</span><span>Row-level security</span><span>Human approval</span>
        </div>
      </div>

      <section className="roles" id="teams" aria-label="Who it is for">
        <div className="wrap">
          <h2 style={{marginTop:"80px"}}>A seat for everyone who chases a peso.</h2>
          <div className="role-grid">
            <article className="role"><span className="em" style={{background:"#E2DFFE"}}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#241B3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg></span><h3>Collectors</h3><p>A ranked list, a call script and one-tap logging. Only your own clients.</p></article>
            <article className="role" style={{background:"#FFE3EC"}}><span className="em" style={{background:"#fff"}}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#241B3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l4 4 10-10" /></svg></span><h3>Supervisors</h3><p>Approve drafts in seconds with every number traced. Recommend holds.</p></article>
            <article className="role" style={{background:"#DDF7EA"}}><span className="em" style={{background:"#fff"}}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#241B3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 18l6-6 4 4 6-8" /><path d="M15 8h5v5" /></svg></span><h3>CFO</h3><p>One page: DSO, aging, expected inflow and bad debt against the allowance.</p></article>
            <article className="role" style={{background:"#FFEBDD"}}><span className="em" style={{background:"#fff"}}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#241B3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5" /><path d="M4 18h16" /></svg></span><h3>Admins</h3><p>Upload exports, fix column mappings and settle reconciliation questions.</p></article>
          </div>
        </div>
      </section>

      <section className="cta" aria-label="Get started">
        <span className="ring" style={{width:"520px",height:"520px",left:"-160px",top:"-200px"}} data-speed="0.08"></span>
        <span className="ring" style={{width:"380px",height:"380px",right:"-120px",bottom:"-160px"}} data-speed="-0.08"></span>
        <div className="wrap" style={{position:"relative"}}>
          <h2>Your list is ready when you are.</h2>
          <Link className="pill" href="/login" style={{minHeight:"56px",padding:"0 30px",fontSize:"17px",background:"#fff",color:"#1C1240"}}>Sign in to Duely</Link>
        </div>
      </section>
      </main>

      <footer><div className="wrap"><span>© 2026 Duely · AIM iMBA AI Tools final project</span><span>Demo data only. All client names and contacts are fictional.</span></div></footer>
    </div>
  );
}
