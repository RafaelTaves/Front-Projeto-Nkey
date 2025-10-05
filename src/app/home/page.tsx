'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '../hooks/use-require-auth';
import XlsxCard from '@/components/XlsxCard';

export default function Home() {
    const { checking, isAuthed } = useRequireAuth();

    if (checking) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Verificando sessão…
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="max-w-6xl mx-auto space-y-6">
                <Navbar />
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold bg-blue-600 bg-clip-text text-transparent">
                        Processador de Arquivos Xlsx
                    </h1>
                    <p className="text-slate-600 text-lg">
                        Faça upload tabelas e processe com IA
                    </p>
                </div>

                
                <XlsxCard />
            </div>
        </div>
    );
}
