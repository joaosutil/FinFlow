'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardClient() {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [htmlReady, setHtmlReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const ensureSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = '/login';
        return;
      }

      window.FIN_TOKEN = data.session.access_token;
      window.FIN_USER = data.session.user?.id;

      await loadBodyMarkup();
      await loadChartScript();
      await loadDashboardScript();

      if (window.FIN_INIT) {
        window.FIN_INIT();
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    ensureSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.href = '/login';
        return;
      }
      window.FIN_TOKEN = session.access_token;
      window.FIN_USER = session.user?.id;
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const loadBodyMarkup = async () => {
    if (!containerRef.current) return;
    const response = await fetch('/finflow-body.html', { cache: 'no-store' });
    const bodyHtml = await response.text();
    containerRef.current.innerHTML = bodyHtml;
    setHtmlReady(true);
  };

  const loadChartScript = async () => {
    if (document.querySelector('script[data-chartjs]')) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';
      script.async = true;
      script.setAttribute('data-chartjs', 'true');
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const loadDashboardScript = async () => {
    if (document.querySelector('script[data-finflow]')) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/finflow.js';
      script.async = true;
      script.setAttribute('data-finflow', 'true');
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="dashboard-shell">
      <div className="logout-bar">
        <button className="logout-btn" onClick={handleLogout}>Sair</button>
      </div>
      {loading && <div className="auth-loading">Carregando seu painel…</div>}
      <div ref={containerRef} suppressHydrationWarning />
      {!htmlReady && <div className="auth-loading">Preparando interface…</div>}
    </div>
  );
}
