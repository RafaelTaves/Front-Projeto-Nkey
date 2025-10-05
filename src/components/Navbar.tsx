// components/Navbar.tsx
'use client'; // Esta diretiva é crucial para usar hooks do lado do cliente como usePathname

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Importa usePathname do next/navigation

import { cn } from '@/lib/utils'; // Utilitário do shadcn/ui para concatenar classes

interface NavbarProps {
  // Não são necessárias props específicas para esta Navbar
}

const Navbar: React.FC<NavbarProps> = () => {
  // Use usePathname para obter o caminho atual da URL
  const pathname = usePathname();

  // Definição dos links de navegação
  const navLinks = [
    { name: 'Home', href: '/home' },
  ];

  async function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return (
    <nav className="bg-gradient-to-br p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Links principais (Home, Prompts) */}
        <div className="flex space-x-4">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              // Aplica classes dinamicamente com base no pathname atual
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-blue-600 text-white shadow-lg' // Estilo para aba ativa
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800' // Estilo para aba inativa
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Link de Logout (Exemplo) */}
        <div>
          {/* Use Link do 'next/link' para navegação */}
          <button
            onClick={handleLogout} // Ajuste esta rota para sua página ou função de logout
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              'bg-red-500 text-white hover:bg-red-600' // Estilo para o botão de logout
            )}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;