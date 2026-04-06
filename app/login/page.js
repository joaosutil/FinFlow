'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/';
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Conta criada! Verifique seu e-mail para confirmar.');
        setMode('login');
      }
    } catch (error) {
      setMessage(error.message || 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">FinFlow</div>
        <div className="auth-subtitle">Acesse seu painel financeiro</div>
        <form onSubmit={submit}>
          <label className="auth-label">E-mail</label>
          <input className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label className="auth-label">Senha</label>
          <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>
        {message && <div className="auth-message">{message}</div>}
        <button className="auth-link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Não tenho conta' : 'Já tenho conta'}
        </button>
      </div>
    </div>
  );
}
