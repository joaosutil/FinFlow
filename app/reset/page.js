'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ResetPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMessage('Defina uma nova senha abaixo.');
      }
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (password.length < 6) {
      setMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setMessage('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Senha atualizada com sucesso! Você já pode fazer login.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (error) {
      setMessage(error.message || 'Erro ao atualizar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">Nova Senha</div>
        <div className="auth-subtitle">Atualize sua senha com segurança</div>
        <form onSubmit={submit}>
          <label className="auth-label">Nova senha</label>
          <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <label className="auth-label">Confirmar senha</label>
          <input className="auth-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Atualizando...' : 'Salvar nova senha'}
          </button>
        </form>
        {message && <div className="auth-message">{message}</div>}
      </div>
    </div>
  );
}
